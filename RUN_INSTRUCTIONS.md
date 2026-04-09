# Run Instructions

## Prerequisites
- Node.js 18+
- npm
- Python 3.8+
- Tesseract OCR installed and available in PATH

## 1) Backend Setup and Run
From `backend`:

```powershell
npm install
```

Make sure `backend/.env` exists with at least:

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

If Tesseract is not in PATH on Windows, add this in `.env`:

```env
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

Run backend:

```powershell
npm start
```

Backend API health URL:
`http://localhost:5000/api/health`

## 2) Frontend Setup and Run
From `frontend`:

```powershell
npm install
npm run dev
```

Frontend URL:
`http://localhost:5173`

The frontend calls backend on port `5000` by default.

## 3) Start Order
1. Start backend first.
2. Start frontend second.
3. Open frontend URL in browser.