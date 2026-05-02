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
from io import BytesIO
from PIL import Image

# DeepFace for face embedding extraction
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✅ DeepFace loaded successfully")
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("⚠️ DeepFace not installed. Face verification disabled. Run: pip install deepface tf-keras")

app = Flask(__name__)
# Allow all origins for mobile IP compatibility in development
CORS(app, resources={r"/*": {"origins": "*"}})

client = MongoClient(Config.MONGODB_URI)
db = client["interview_db"]
users_collection = db["user_details"]
face_collection = db["face_embeddings"]  # New collection for face data
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

# ============================================================
# FACE VERIFICATION HELPERS
# ============================================================
FACE_MODEL = "Facenet"  # 128-d embeddings, fast and accurate
FACE_DISTANCE_THRESHOLD = 0.40  # Cosine distance; lower = stricter

def decode_base64_image(base64_string):
    """Decode a base64 image string to a numpy array for OpenCV."""
    # Strip the data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    img_bytes = base64.b64decode(base64_string)
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    return np.array(img)

def extract_face_embedding(img_array):
    """Extract 128-d face embedding from an image using DeepFace."""
    if not DEEPFACE_AVAILABLE:
        return None, "DeepFace not installed"
    
    try:
        result = DeepFace.represent(
            img_path=img_array,
            model_name=FACE_MODEL,
            enforce_detection=True,
            detector_backend="opencv"
        )
        if result and len(result) > 0:
            return result[0]["embedding"], None
        return None, "No face detected in image"
    except Exception as e:
        return None, str(e)

def cosine_distance(emb1, emb2):
    """Calculate cosine distance between two embedding vectors."""
    a = np.array(emb1)
    b = np.array(emb2)
    return 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# ============================================================
# FACE VERIFICATION ENDPOINTS
# ============================================================

@app.route('/enroll_face', methods=['POST'])
def enroll_face():
    """Enroll a user's face — extract embedding and store in MongoDB."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        face_image = data.get('face_image')  # base64 string
        
        if not user_id or not face_image:
            return jsonify({"success": False, "error": "user_id and face_image are required"}), 400
        
        if not DEEPFACE_AVAILABLE:
            return jsonify({"success": False, "error": "DeepFace not installed on server"}), 500
        
        # Decode image
        img_array = decode_base64_image(face_image)
        
        # Extract embedding
        embedding, error = extract_face_embedding(img_array)
        if error:
            return jsonify({"success": False, "error": f"Face processing failed: {error}"}), 400
        
        # Store in MongoDB (upsert — update if exists, insert if not)
        face_collection.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "embedding": embedding,
                "enrolled_at": datetime.now(),
                "updated_at": datetime.now()
            }},
            upsert=True
        )
        
        print(f"✅ Face enrolled for user: {user_id}")
        return jsonify({"success": True, "message": "Face enrolled successfully"})
    
    except Exception as e:
        print(f"❌ Face enrollment error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/verify_face', methods=['POST'])
def verify_face():
    """Verify a user's face against their stored embedding."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        face_image = data.get('face_image')  # base64 string
        
        if not user_id or not face_image:
            return jsonify({"success": False, "error": "user_id and face_image are required"}), 400
        
        if not DEEPFACE_AVAILABLE:
            return jsonify({"success": False, "error": "DeepFace not installed on server"}), 500
        
        # Get stored embedding
        stored = face_collection.find_one({"user_id": user_id})
        if not stored:
            return jsonify({
                "success": False, 
                "verified": False,
                "error": "No face enrolled for this user"
            }), 404
        
        # Decode live image
        img_array = decode_base64_image(face_image)
        
        # Extract live embedding
        live_embedding, error = extract_face_embedding(img_array)
        if error:
            return jsonify({
                "success": False,
                "verified": False,
                "error": f"Face processing failed: {error}"
            }), 400
        
        # Compare embeddings using cosine distance
        distance_val = cosine_distance(stored["embedding"], live_embedding)
        verified = bool(distance_val < FACE_DISTANCE_THRESHOLD)
        confidence = float(round(max(0, 1 - distance_val), 4))
        
        print(f"{'✅' if verified else '❌'} Face verification for {user_id}: distance={distance_val:.4f}, confidence={confidence}, threshold={FACE_DISTANCE_THRESHOLD}")
        
        return jsonify({
            "success": True,
            "verified": verified,
            "confidence": confidence,
            "distance": float(round(distance_val, 4))
        })
    
    except Exception as e:
        print(f"❌ Face verification error: {e}")
        return jsonify({"success": False, "verified": False, "error": str(e)}), 500


@app.route('/face_status/<user_id>', methods=['GET'])
def face_status(user_id):
    """Check if a user has enrolled their face."""
    try:
        stored = face_collection.find_one({"user_id": user_id})
        enrolled = stored is not None
        return jsonify({
            "success": True,
            "enrolled": enrolled,
            "enrolled_at": stored["enrolled_at"].isoformat() if enrolled else None
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


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
            "Return a JSON object with this exact structure: "
            "{\"questions\": [{\"question\": \"...\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], \"answer\": \"A\"}]}. "
            "The 'answer' must be the single uppercase letter (A, B, C, or D) corresponding to the correct option."
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

