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

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

client = MongoClient(Config.MONGODB_URI)
db = client["interview_db"]
users_collection = db["user_details"]
os.makedirs("screenshots", exist_ok=True)

model = YOLO('yolov8n.pt')

api_key = Config.GROQ_API_KEY

GEN_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

@app.route('/hello', methods=['GET'])
def hello():
    print("Hello from Flask!")  # prints in Flask console
    return jsonify({"message": "Hello from Flask API"})  # response to React

@app.route('/generate-question', methods=['POST'])
def generate_question():
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        prompt = f"Generate one question for the subject: {subject}"
        print(f"Requesting question for subject: {subject}")
        res = requests.post(GEN_URL, json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}]
        }, headers=GROQ_HEADERS)
        
        print(f"Groq API Status Code: {res.status_code}")
        print(f"Groq API Raw Response: {res.text}")
        result = res.json()
        
        if 'error' in result:
            print(f"Groq API Error: {result['error']}")
            return jsonify({'error': result['error'].get('message', 'Unknown error')}), 500
        
        question = result.get('choices', [{}])[0].get('message', {}).get('content', 'No question generated.')
        print("Generated Question:", question)
        return jsonify({'question': question})
    except Exception as e:
        print(f"Exception in generate_question: {e}")
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
            f"Only respond with a number from 0 to 10, no explanation. "
            f"Give a score based on the relevance and correctness of the answer, and be lenient in evaluation."
        )

        res = requests.post(GEN_URL, json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}]
        }, headers=GROQ_HEADERS)

        print(f"Groq Evaluate Status: {res.status_code}")
        print(f"Groq Evaluate Raw: {res.text}")
        result = res.json()

        if 'error' in result:
            print(f"Groq API Error: {result['error']}")
            return jsonify({'error': result['error'].get('message', 'Unknown error')}), 500

        evaluation = result.get('choices', [{}])[0].get('message', {}).get('content', 'invalid').strip().lower()
        return jsonify({'evaluation': evaluation})
    except Exception as e:
        print(f"Exception in evaluate_answer: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate-mcq', methods=['POST'])
def generate_mcq():
    import re, json as _json
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        # Use JSON mode so Groq guarantees valid JSON output
        prompt = (
            f"Generate exactly 5 multiple choice questions about: {subject}. "
            "Return a JSON object with key \"questions\" containing an array of 5 items. "
            "Each item must have: \"question\" (string), \"options\" (array of exactly 4 strings "
            "like [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"]), and \"answer\" (single letter A/B/C/D). "
            "Example item: {\"question\":\"What is 2+2?\","
            "\"options\":[\"A. 3\",\"B. 4\",\"C. 5\",\"D. 6\"],\"answer\":\"B\"}"
        )
        res = requests.post(GEN_URL, json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }, headers=GROQ_HEADERS)
        result = res.json()
        if 'error' in result:
            return jsonify({'error': result['error'].get('message', 'Unknown error')}), 500
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '{}')
        parsed = _json.loads(content)
        questions = parsed.get('questions', [])
        return jsonify({'questions': questions})
    except Exception as e:
        print(f"Exception in generate_mcq: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/detect_faces', methods=['POST'])
def detect_faces():
    file = request.files['image']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    results = model.predict(source=frame, conf=0.3, verbose=False)
    faces = [d for d in results[0].boxes if int(d.cls[0]) == 0]

    return jsonify({'count': len(faces)})


@app.route('/detect_phone', methods=['POST'])
def detect_phone():
    file = request.files['image']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    results = model.predict(source=frame, conf=0.3, verbose=False)
    phone_detected = any(int(d.cls[0]) == 67 for d in results[0].boxes)
    return jsonify({'phone_detected': phone_detected})


@app.route("/modify_details", methods=["POST"])
def modify_details():
    try:
        print("Received request to start interview session")

        # Save screenshot if it exists
        screenshot = request.files.get("screenshot")
        screenshot_filename = None
        if screenshot:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            screenshot_filename = f"screenshots/interview_{timestamp}.jpg"
            screenshot.save(screenshot_filename)

        # Save interview session info to MongoDB
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
    # Run Flask on port 5001 to avoid conflict with Express (port 5000)
    print(f"Flask AI Server starting on port {Config.FLASK_PORT}")
    app.run(debug=Config.DEBUG, port=Config.FLASK_PORT, host='0.0.0.0')
