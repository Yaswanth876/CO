# Lab Hub Local Deployment (Host PC + LAN)

## Overview

This project is configured for a **single Host PC** in a lab and browser-only access from faculty systems on the same LAN.

- Backend: Node.js + Express
- Database: SQLite file (`attainment.db`)
- Processing: Python scripts (`stage1_qp.py` to `stage4_attainment.py`)
- OCR: Tesseract binary on Host PC
- Storage: local `./uploads` and `./outputs`

## 1) Host PC Prerequisites

Install on the Host PC only:

1. Node.js LTS
2. Python 3.x
3. Tesseract OCR

Windows Tesseract example path:

`C:/Program Files/Tesseract-OCR/tesseract.exe`

## 2) Backend Setup

From `backend/`:

```powershell
npm install
pip install -r requirements.txt
```

Create `.env` from `.env.example` and verify:

```dotenv
SQLITE_DB_PATH=./attainment.db
PORT=5000
UPLOADS_DIR=./uploads
OUTPUTS_DIR=./outputs
PYTHON_STAGE_DIR=./python
PYTHON_BIN=python
# Optional when tesseract is not in PATH
# TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

Start backend:

```powershell
npm run dev
```

## 3) Frontend Setup

From `frontend/`:

```powershell
npm install
npm run dev
```

Vite is configured to serve on all network interfaces at port `3000`.

## 4) LAN Access

1. On Host PC, get local IP:

```powershell
ipconfig
```

2. Faculty opens browser at:

`http://<HOST_IP>:3000`

Example: `http://192.168.1.15:3000`

## 5) 3-Phase Workflow Persistence

Progress is persisted in `attainment.db` as faculty upload files in phases:

1. Phase 1: CAT1 QP + CAT1 Marks
2. Phase 2: CAT2 QP/Marks + ASS1 + ASS2
3. Phase 3: Terminal Marks + EP/ELA/Constraint inputs

The backend stores file paths in SQLite and reuses them across sessions.

## 6) Backup Strategy

To back up a semester:

1. Stop backend process.
2. Copy these artifacts to external storage:
   - `backend/attainment.db`
   - `backend/uploads/`
   - `backend/outputs/`

Restore by copying them back to the same paths.

## 7) Business Rules Confirmed in Processing

- Assignment normalization target: total 40
- Final attainment formula:

  `Final CO = (0.7 * Internal) + (0.3 * Terminal)`

## 8) Common Failure Modes

1. Python stage failure due to invalid Excel format.
2. Missing Tesseract binary for OCR in Stage 1.
3. Missing uploaded file path on disk.

The backend now returns detailed Python stderr in API errors to simplify troubleshooting.
