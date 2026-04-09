# CO Attainment Automation System

End-to-end full-stack application for automating Course Outcome (CO) attainment processing and report generation.

This repository contains:
- An Express + SQLite backend API
- A React + Vite frontend
- Python processing scripts for multi-stage CO report generation

## Repository Structure

```text
CO/
├── backend/      # Express API + Sequelize models + Python orchestration
├── frontend/     # React (Vite) user interface
├── data/         # Supporting data and notes
└── RUN_INSTRUCTIONS.md
```

## Tech Stack

- Frontend: React, Vite, Tailwind, Framer Motion
- Backend: Node.js, Express, Sequelize, SQLite
- Processing: Python (pandas/openpyxl/docx pipeline), Tesseract OCR
- Auth: JWT

## Prerequisites

Install these before running the project:
- Node.js 18+
- npm
- Python 3.8+
- Tesseract OCR (must be installed and accessible)

Windows Tesseract installer:
- https://github.com/UB-Mannheim/tesseract/wiki

## Quick Start

### 1) Backend Setup

```powershell
cd backend
npm install
pip install -r requirements.txt
Copy-Item .env.example .env
```

Update `backend/.env` as needed. Minimum useful values:

```env
SQLITE_DB_PATH=./attainment.db
PORT=5000
NODE_ENV=development
JWT_SECRET=change_this_secret
UPLOADS_DIR=./uploads
OUTPUTS_DIR=./outputs
PYTHON_STAGE_DIR=./python
PYTHON_BIN=python
```

If Tesseract is not in your PATH on Windows, add:

```env
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

Start backend:

```powershell
npm start
```

Health check:
- http://localhost:5000/api/health

### 2) Frontend Setup

In a new terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend defaults to backend `http://<host>:5000`.
You can override with:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Open:
- http://localhost:5173

### 3) Start Order

1. Start backend (`backend`)
2. Start frontend (`frontend`)
3. Open frontend in browser

## Default Development Login

- Email: any valid `@tce.edu` email
- Password: `tce123`

The frontend will register/login automatically in dev flow if needed.

## High-Level Workflow

1. Create/select a subject
2. Upload files for each processing phase
3. Trigger processing:
- Phase 1: Question paper parsing and marks injection base
- Phase 2: Consolidation into master template
- Phase 3: Final report generation with terminal marks and attainment metrics
4. Download generated outputs from reports

## API Overview

Base URL:
- `http://localhost:5000`

Key route groups:
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/subjects`
- `POST /api/phase1/*`
- `POST /api/phase2/*`
- `POST /api/phase3/*`
- `GET /api/reports/*`
- `GET/PUT /api/configuration/:subjectId`

Most routes (except auth + health) require Bearer token auth.

## Processing Stages (Python)

Main scripts in `backend/`:
- `stage1_qp.py`: parse question paper structure
- `stage2_marks.py`: inject student marks
- `stage3_consolidate.py`: merge CAT/ASS files into template
- `stage4_attainment.py`: compute final attainment outputs

These are called by the backend and exchange JSON status payloads.

## Useful Commands

Backend:

```powershell
cd backend
npm run dev
npm start
```

Frontend:

```powershell
cd frontend
npm run dev
npm run build
npm run preview
```

## Documentation

For more details, see:
- `RUN_INSTRUCTIONS.md`
- `backend/README.md`
- `backend/API_DOCUMENTATION.md`
- `backend/SETUP_GUIDE.md`
- `frontend/README.md`

## Troubleshooting

- Backend fails on OCR tasks:
  - Verify Tesseract installation and `TESSERACT_CMD`.
- Frontend cannot reach API:
  - Ensure backend is running on port 5000.
  - Check `VITE_API_BASE_URL` in `frontend/.env`.
- Python stage errors:
  - Reinstall `backend/requirements.txt` in the active Python environment.
- Auth failures:
  - Confirm JWT secret is set and backend restarted after `.env` changes.
