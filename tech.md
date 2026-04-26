# Technical Overview - AI Interview System

This document provides a brief explanation of how the code is structured and how the different components interact.

## 🏗️ Architecture: The Dual-Backend Strategy

The system is split into three main parts. This separation allows us to use the best tool for each job:

1.  **Frontend (React + Vite)**: The user interface. It communicates with *both* backends simultaneously.
2.  **Core Backend (Node.js/Express)**: Handles "business logic" (Authentication, User Profiles, Database management).
3.  **AI Backend (Python/Flask)**: Handles "heavy lifting" (Computer Vision, Large Language Models, Monitoring).

---

## 💻 Code Breakdown

### 1. Core Backend (`express/`)
- **`server.js`**: The entry point. Configures security (Helmet, CORS) and connects to MongoDB.
- **`controllers/authController.js`**:
    - **Logic**: Uses JWT (JSON Web Tokens) for secure sessions.
    - **Security**: Hashes passwords with `bcrypt` and implements account lockouts after too many failed attempts.
- **`models/User.js`**: Defines how user data is stored in MongoDB.

### 2. AI Backend (`server/`)
- **`app.py`**: The main Flask server.
- **Monitoring (`detect_faces`, `detect_phone`)**:
    - Uses **YOLOv8** (You Only Look Once) via the `ultralytics` library.
    - Analyzes frames from the camera to ensure the user is alone and not using a phone.
- **Intelligence (`generate-question`, `evaluate-answer`)**:
    - Connects to the **Groq API** (running Llama 3.1).
    - Generates dynamic interview questions and provides instant scores for answers.

### 3. Frontend (`client/`)
- **`src/context/AuthContext.jsx`**: Global state for user login status.
- **`src/components/InterviewSystem.jsx`**:
    - **Camera Logic**: Uses `navigator.mediaDevices` to access the webcam.
    - **Dual-Fetch**: Sends images to the Flask server (port 5001) for monitoring while sending text to the Express server (port 5000) for history.

---

## 🛠️ Infrastructure & Data Flow

1.  **Database**: MongoDB stores your login info and records of your interview sessions (including paths to screenshots for security checks).
2.  **Environment**: 
    - Configuration is centralized in `.env` files.
    - API keys (Groq/Gemini) are kept secret on the server-side.
3.  **Startup**: The root `package.json` contains a script `"start:all"`. It uses `concurrently` to run the following in parallel:
    - `npm run start:express`
    - `npm run start:flask`
    - `npm run start:client`

---

## 🚀 Why this works?
- **Speed**: Flask handles the AI processing without slowing down the user's login session.
- **Security**: Express ensures that only logged-in users can access the AI features.
- **Intelligence**: YOLOv8 provides real-time "proctoring" (anti-cheating) while Llama 3 handles the conversation.
