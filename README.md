# AI-Assisted Priority-Based Study Planner

A full-stack web application that helps students create AI-powered, priority-based study plans.

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | React 19 + Vite 8             |
| Backend   | Node.js + Express 5           |
| Database  | MongoDB + Mongoose            |
| Testing   | Jest + Supertest + MongoMemoryServer |

## Project Structure

```
AI based study planner/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/      # Validation middleware
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # Express routes
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Entry point
│   ├── tests/               # Test suites
│   ├── .env                 # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx          # Root component
│   │   ├── App.css
│   │   ├── index.css        # Design system
│   │   └── main.jsx         # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # Edit with your MongoDB URI
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies API requests to `http://localhost:5000`.

### Running Tests

```bash
cd backend
npm test                # Run all tests
npm run test:coverage   # Run with coverage report
```

Tests use an in-memory MongoDB instance — no external database required.

## Implemented Features

- **AISP-1: Student Registration** — Create a student account with name, email, and password. Includes full validation, duplicate email prevention, and secure password hashing (bcrypt).
- **AISP-2: Student Login** — JWT-based authentication returning a signed token used for all protected routes.
- **AISP-3: Semester Management** — Create semesters scoped to the authenticated student, with validation for name and nested subjects.
- **AISP-4: Subject Management** — Add, update, and delete subjects (with code, credits 0.5–20, and topics) within a student's semester.
- **AISP-5: Syllabus Upload** — Upload a PDF/TXT syllabus (max 10MB) behind authentication; text is extracted and persisted, linked to the uploading student.
- **AISP-6: Syllabus Text Extraction** — Server-side extraction of readable text from uploaded syllabi (PDF via `pdf-parse`, TXT directly).
- **AISP-7: AI Syllabus Analysis** — Analyze an uploaded syllabus with a **local** AI model (Ollama + Qwen2.5) to produce a structured subject/topics outline, then apply it to a chosen semester. No external API and no per-call cost — the model runs on your own machine via [Ollama](https://ollama.com). The analyzer uses Ollama's JSON-schema `format` option so output is always schema-locked and parseable, and results are normalized to the existing `subjectSchema` constraints.

### AI Syllabus Analysis — Setup

The analyze feature calls a local Ollama server, so there is no cloud dependency or API key.

```bash
# 1. Install Ollama: https://ollama.com
# 2. Start the server (run in its own terminal):
ollama serve

# 3. Pull a model (Qwen2.5-instruct is recommended for clean structured output):
ollama pull qwen2.5:7b-instruct
# Use qwen2.5:3b-instruct on lighter machines.
```

Configure the model in `backend/.env` (see `.env.example`):

```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_TIMEOUT=120000
```

Then upload a syllabus and click **Analyze with AI** to review the suggested topics and add them to a semester.
