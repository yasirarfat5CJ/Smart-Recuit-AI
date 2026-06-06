# Interview Prep AI

A student-focused MERN application for resume analysis and AI interview practice.

## Features

- PDF resume parsing and a transparent ATS readiness score
- Score breakdown across skills, projects, education, experience, and completeness
- Resume-grounded project, technical, and HR practice modes
- Typed answers and browser speech-to-text with an editable transcript
- Interview feedback, readiness rating, and practice history

## Run locally

Backend:

```bash
cd backend
npm install
node server.js
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Configure `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`
in `backend/.env`. Set `VITE_API_URL` in `frontend/.env`.
