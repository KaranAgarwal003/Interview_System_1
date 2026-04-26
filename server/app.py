from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import numpy as np
import cv2
from ultralytics import YOLO
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from config import Config
import base64
import time

app = Flask(__name__)
# Allow all origins for mobile IP compatibility in development
CORS(app, resources={r"/*": {"origins": "*"}})

client = MongoClient(Config.MONGODB_URI)
db = client["interview_db"]
users_collection = db["user_details"]
os.makedirs("screenshots", exist_ok=True)

# Shared YOLO model
model = YOLO('yolov8n.pt')

# Frame cache for Mobile Shield Feed
last_mobile_frames = {}

api_key = Config.GROQ_API_KEY
GEN_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "IntervueAI Flask API is Online"})

@app.route('/generate-question', methods=['POST'])
def generate_question():
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        prompt = f"Generate one question for the subject: {subject}"
        res = requests.post(GEN_URL, json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}]
        }, headers=GROQ_HEADERS)
        result = res.json()
        question = result.get('choices', [{}])[0].get('message', {}).get('content', 'No question generated.')
        return jsonify({'question': question})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/evaluate-answer', methods=['POST'])
def evaluate_answer():
    try:
        data = request.get_json()
        question = data.get('question', '')
        answer = data.get('answer', '')
        prompt = (
            f"Evaluate the following answer for the given question on a scale of 0 to 10.\n\n"
            f"Question: {question}\n"
            f"Answer: {answer}\n\n"
            f"Only respond with a number from 0 to 10."
        )
        res = requests.post(GEN_URL, json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}]
        }, headers=GROQ_HEADERS)
        result = res.json()
        evaluation = result.get('choices', [{}])[0].get('message', {}).get('content', '5').strip().lower()
        return jsonify({'evaluation': evaluation})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-mcq', methods=['POST'])
def generate_mcq():
    import json as _json
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        prompt = (
            f"Generate exactly 5 multiple choice questions about: {subject}. "
            "Return a JSON object with key \"questions\" containing an array of 5 items."
        )
        res = requests.post(GEN_URL, json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }, headers=GROQ_HEADERS)
        result = res.json()
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '{}')
        parsed = _json.loads(content)
        return jsonify({'questions': parsed.get('questions', [])})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect_faces', methods=['POST'])
def detect_faces():
    file = request.files['image']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    results = model.predict(source=frame, conf=0.5, verbose=False)
    faces = [d for d in results[0].boxes if int(d.cls[0]) == 0]
    return jsonify({'count': len(faces)})

@app.route('/detect_phone', methods=['POST'])
def detect_phone():
    file = request.files['image']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    results = model.predict(source=frame, conf=0.6, verbose=False)
    phone_detected = any(int(d.cls[0]) == 67 for d in results[0].boxes)
    if phone_detected:
        print(f"!!! ALERT: Phone Detected with high confidence (Session: {request.form.get('session_id')}) !!!")
    
    # Dual-Stream logic: If it's from mobile shield, process and cache the annotated frame
    if request.form.get("is_mobile") == "true":
        session_id = request.form.get("session_id", "default")
        
        # Encode to Base64 to send to laptop UI (No drawing/outlines)
        _, buffer = cv2.imencode('.jpg', frame)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        last_mobile_frames[session_id] = {
            "image": img_base64,
            "timestamp": time.time(),
            "phone_detected": phone_detected,
            "face_count": len([d for d in results[0].boxes if int(d.cls[0]) == 0])
        }

    return jsonify({'phone_detected': phone_detected})

@app.route('/get_mobile_frame/<session_id>', methods=['GET'])
def get_mobile_frame(session_id):
    frame_data = last_mobile_frames.get(session_id)
    if not frame_data:
        return jsonify({"error": "Waiting for mobile connection..."}), 404
    
    # Check for stale frames (offline)
    if time.time() - frame_data["timestamp"] > 10:
        return jsonify({"error": "Mobile Shield Offline"}), 404
        
    return jsonify(frame_data)

@app.route("/modify_details", methods=["POST"])
def modify_details():
    try:
        screenshot = request.files.get("screenshot")
        screenshot_filename = None
        if screenshot:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            screenshot_filename = f"screenshots/interview_{timestamp}.jpg"
            screenshot.save(screenshot_filename)
        session_data = {
            "timestamp": datetime.now(),
            "screenshot_path": screenshot_filename,
            "status": "started"
        }
        users_collection.insert_one(session_data)
        return jsonify({"message": "Interview session started successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Flask AI Server starting on port {Config.FLASK_PORT}")
    app.run(debug=Config.DEBUG, port=Config.FLASK_PORT, host='0.0.0.0')
