# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A MERN + Flask interview system with AI-powered question generation, answer evaluation, and real-time proctoring (face/phone detection via YOLOv8). Dual backend architecture: Express.js handles auth/user management, Flask handles all AI features via Groq API.

## Commands

### Install
```bash
npm run install:all          # Install Node deps for express + client
cd server && pip install -r requirements.txt
```

### Run (3 services required)
```bash
# All at once (requires concurrently)
npm run start:all

# Or individually:
cd express && npm run dev     # Express backend — port 5000
cd server && python app.py   # Flask AI backend — port 5001
cd client && npm run dev     # React frontend — port 5173
```

### Lint & Build
```bash
cd client && npm run lint    # ESLint
cd client && npm run build   # Production build → dist/
```

### Health checks
```bash
curl http://localhost:5000/api/health
curl http://localhost:5001/hello
curl http://localhost:5000/api/test-groq   # Verify Groq API key
```

## Environment Setup

**`express/config.env`**:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview_system
JWT_SECRET=<secret>
JWT_EXPIRE=7d
GROQ_API_KEY=<key>
```

**`server/.env`**:
```
FLASK_PORT=5001
GROQ_API_KEY=<key>
MONGODB_URI=mongodb://localhost:27017/interview_db
```

**`client/.env`** (optional — defaults are hardcoded in `src/config/api.js`):
```
VITE_EXPRESS_API_URL=http://localhost:5000/api
VITE_FLASK_API_URL=http://localhost:5001
```

## Architecture

### Services
| Service | Port | Stack | Purpose |
|---------|------|-------|---------|
| Express backend | 5000 | Node/Express/Mongoose | Auth, user mgmt, proxies interview requests to Flask |
| Flask backend | 5001 | Python/Flask/Ultralytics | Groq LLM calls, YOLOv8 face/phone detection |
| React frontend | 5173 | React 19/Vite/Tailwind | Interview UI with webcam proctoring |

### Request Flow
- Auth (register/login/password reset) → Express only
- Interview question generation / answer evaluation → Express forwards to Flask → Groq API (`llama-3.1-8b-instant`)
- Proctoring frames → Flask directly → YOLOv8 (`yolov8n.pt`)

### Key Express files
- `express/server.js` — entry point, middleware, CORS (localhost:3000 + 5173), rate limiting (100 req/15min global, 5/15min for auth)
- `express/routes/auth.js` + `controllers/authController.js` — JWT auth, bcrypt (12 rounds), 5-attempt lockout → 2hr ban
- `express/routes/interview.js` + `controllers/interviewController.js` — proxies Groq requests
- `express/models/User.js` — Mongoose schema with built-in validation, lockout logic, and password comparison
- `express/middleware/auth.js` — JWT verification

### Key Flask files
- `server/app.py` — all AI endpoints: `/generate-question`, `/evaluate-answer`, `/detect_faces`, `/detect_phone`, `/modify_details`
- `server/yolov8n.pt` — pre-trained YOLOv8 nano model (gitignored, must be present locally)

### Key React files
- `client/src/App.jsx` — router with protected routes
- `client/src/context/AuthContext.jsx` — global auth state via `useReducer`
- `client/src/utils/axios.js` — Axios instance with auth interceptors
- `client/src/config/api.js` — API base URLs for both backends
- `client/src/components/InterviewSystem.jsx` — interview UI with webcam, question/answer flow
- `client/src/components/auth/` — Login, Register, ForgotPassword, ResetPassword, ProtectedRoute

## Key Behaviors & Constraints

- The Express backend **does not** directly call Groq or YOLOv8 — it proxies those requests to Flask on port 5001.
- JWT tokens are stored in localStorage on the client and sent as `Authorization: Bearer <token>` headers.
- The `yolov8n.pt` model file is gitignored. If missing, Flask will error on face/phone detection endpoints.
- Password requirements: min 6 chars, 1 uppercase, 1 lowercase, 1 number (enforced via express-validator and react-hook-form).
- MongoDB uses two separate databases: `interview_system` (Express) and `interview_db` (Flask).
