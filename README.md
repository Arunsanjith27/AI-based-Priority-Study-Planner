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
