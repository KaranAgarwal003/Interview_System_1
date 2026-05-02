# IntervueAI: Next-Gen AI Interview & Proctoring Platform

![IntervueAI](https://img.shields.io/badge/Status-Active-brightgreen) ![MERN Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20Python%2FFlask-blue) ![AI Integration](https://img.shields.io/badge/AI-Groq%20Llama%203.1%20%7C%20YOLOv8%20%7C%20DeepFace-orange)

A comprehensive, state-of-the-art interview system built with a **MERN stack** core and a **Python/Flask AI microservice**. This platform features secure user authentication, AI-powered dynamic question generation, real-time candidate evaluation, and an advanced 360° anti-cheating proctoring system using deep learning.

---

## 🚀 Key Features

### 1. Identity Verification (DeepFace Integration)
- **Zero-Spoofing Login**: Users enroll their faces during registration. 128-d facial embeddings are extracted using the **Facenet** model via the `deepface` library.
- **High-Precision Matching**: Employs mathematical cosine distance (threshold < 0.40) to compare live webcam feeds against stored embeddings in MongoDB.
- **Persistent Biometrics**: Secures the interview process by ensuring the person taking the interview matches the registered user.

### 2. 360° Mobile Shield (Dual-Camera Proctoring)
- **Side-by-Side Monitoring**: Captures feeds from both the primary laptop webcam and a secondary mobile device stream simultaneously.
- **Real-Time Stream Processing**: Mobile frames are streamed to the Flask server, cached, and synchronized with the React frontend for a comprehensive "Pro Control Room" view.

### 3. Deep Learning Cheat Detection
- **YOLOv8 Computer Vision**: Utilizes the `ultralytics` YOLOv8 nano (`yolov8n.pt`) model for high-speed, lightweight inference.
- **Multi-Face & Object Tracking**: Instantly flags sessions if multiple faces (class `0`) are detected or if a cell phone (class `67`) appears in either the primary or secondary camera feeds.

### 4. AI Interview Engine (LLM Integration)
- **Dynamic Question Generation**: Leverages the **Groq API (Llama-3.1-8b-instant)** to generate contextual, subject-specific interview questions on the fly.
- **Automated Answer Evaluation**: AI evaluates user responses in real-time, assigning a score from 0-10 based on accuracy, depth, and relevance.
- **Adaptive MCQs**: Generates strict JSON-formatted multiple-choice questions for technical screening.

### 5. Robust Core Architecture
- **JWT-Based Authentication**: Secure stateless sessions with bcrypt password hashing.
- **Role-Based Access & Security**: Includes account lockout mechanisms, rate limiting (Express Rate Limit), and Helmet for HTTP header security.

---

## 🏗️ System Architecture

The project utilizes a **Dual-Backend Strategy** for optimal performance, separating business logic from CPU-bound AI processing.

```mermaid
graph TD
    UI[React Frontend (Vite)] -->|Auth & DB| Express[Express.js Node Backend]
    UI -->|Webcam & Deep Learning| Flask[Python Flask Microservice]
    Express <--> Mongo[(MongoDB)]
    Flask <--> Mongo
    Flask <--> Groq[Groq API / LLMs]
    Flask <--> DeepFace[DeepFace / Facenet]
    Flask <--> YOLO[YOLOv8 Model]
```

### 1. Frontend (`client/`)
- **React 19 & Vite**: Ultra-fast hot module replacement and modern React hooks.
- **Component Architecture**: Modular UI with `AuthContext` for state management, dual-camera HUDs (`Camera.jsx`, `SecondEye.jsx`), and responsive design via Tailwind CSS.

### 2. Core Backend (`express/`)
- **Node.js & Express**: Handles API routing, database mutations, and application state.
- **MongoDB & Mongoose**: Stores user profiles, session histories, and encrypted credentials.

### 3. AI Microservice (`server/`)
- **Python & Flask**: Dedicated to asynchronous, CPU/GPU heavy tasks.
- **Computer Vision Pipeline**: Processes Base64 and byte-buffer image streams via OpenCV (`cv2`) and NumPy before feeding into DeepFace/YOLOv8.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: v18.x or higher
- **Python**: 3.9+ (3.10 recommended)
- **MongoDB**: v5.0+ (Running locally or via MongoDB Atlas)
- **Git**: For version control

---

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Interview_System_1
```

### 2. Configure Environment Variables
You must set up `.env` files for both backend services.

**Express Backend (`express/.env`):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview_db
JWT_SECRET=your_super_secret_key_12345
```

**Flask AI Service (`server/.env`):**
```env
FLASK_PORT=5001
MONGODB_URI=mongodb://localhost:27017/interview_db
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Install Dependencies

**A. Core Backend (Express)**
```bash
cd express
npm install
cd ..
```

**B. Frontend (React)**
```bash
cd client
npm install
cd ..
```

**C. AI Microservice (Flask)**
```bash
cd server
python -m venv venv
# Activate venv:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
# Alternatively manually install:
pip install flask flask-cors pymongo requests python-dotenv numpy opencv-python ultralytics deepface tf-keras pillow
cd ..
```

### 4. Run the System

To initialize the entire infrastructure concurrently, use the root package script:

```bash
npm install # if concurrently is not installed in root
npm run start:all
```
*This command parallelizes the startup of the Express server (port 5000), Flask server (port 5001), and Vite frontend (port 5173).*

---

## 🗂️ Detailed Project Structure

```text
Interview_System_1/
├── client/                      # React SPA
│   ├── src/
│   │   ├── components/          # Reusable UI elements (auth, layout)
│   │   ├── component/           # Feature components (Camera.jsx, SecondEye.jsx)
│   │   ├── context/             # Global Context providers (AuthContext.jsx)
│   │   ├── App.jsx              # Application router
│   │   └── main.jsx             # React entry point
│   ├── vite.config.js           # Vite bundler configuration
│   └── package.json
├── express/                     # Primary Node.js Backend
│   ├── controllers/             # Business logic (authController.js)
│   ├── models/                  # Mongoose Schemas (User.js)
│   ├── routes/                  # Express route definitions
│   ├── server.js                # App entry point
│   └── package.json
├── server/                      # Python AI Microservice
│   ├── app.py                   # Main Flask API and ML inference logic
│   ├── config.py                # Environment configuration loader
│   ├── yolov8n.pt               # YOLOv8 nano model weights
│   └── requirements.txt         # Python dependencies
├── package.json                 # Root script runner (start:all)
└── README.md                    # Project Documentation
```

---

## 📡 API Endpoints Overview

### AI Microservice (`Flask - Port 5001`)

**Face Biometrics**
- `POST /enroll_face` - Extracts and stores a 128-d face embedding into MongoDB.
- `POST /verify_face` - Compares live webcam capture against stored embedding via Cosine distance.
- `GET /face_status/<user_id>` - Checks enrollment status.

**Proctoring & Vision**
- `POST /detect_faces` - YOLOv8 inference for face counting (Class 0).
- `POST /detect_phone` - YOLOv8 inference for mobile device detection (Class 67).
- `GET /get_mobile_frame/<session_id>` - Polls the cached frames for the Mobile Shield frontend display.

**LLM Intelligence**
- `POST /generate-question` - Fetches contextual questions from Llama-3.1 via Groq.
- `POST /evaluate-answer` - Grades candidate answers natively from 0-10.
- `POST /generate-mcq` - Forces JSON structure return for multiple choice questions.

### Core Backend (`Express - Port 5000`)

**Authentication**
- `POST /api/auth/register` - Registers user and hashes password.
- `POST /api/auth/login` - Validates credentials and issues JWT HTTP-only cookie.
- `GET /api/auth/me` - Validates JWT and returns active session data.

---

## 🚨 Security & Best Practices

1. **Biometric Data**: Face embeddings are represented as mathematical vectors, not raw images, ensuring privacy.
2. **Stateless Scalability**: The Python backend holds temporary stream caches (`last_mobile_frames`) but is otherwise stateless, allowing horizontal scaling.
3. **CORS Enforcement**: Cross-Origin Resource Sharing is strictly mapped between ports 5000, 5001, and 5173.

## 🤝 Contributing
Contributions are welcome. Please ensure your code adheres to standard React guidelines and Python PEP-8 formats. Run local tests before opening a pull request.

## 📄 License
This project is licensed under the MIT License.
