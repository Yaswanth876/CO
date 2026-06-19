# Render Deployment Report

## Minimal Changes Made

- Kept SQLite and the existing Express architecture.
- Made database, upload, and output paths resolve from the backend directory instead of the current working directory.
- Kept `PORT` support for Render.
- Added Render-specific CORS support through `CORS_ORIGIN` and `FRONTEND_URL`.
- Added a Python dependency file for Render build-time installation.
- Created a `render.yaml` service definition for the free tier, using a Python virtual environment to avoid PIP environment errors.
- Removed OCR dependencies (`pytesseract` and `Pillow`) from `requirements.txt` and wrapped OCR imports in `try/except` in Python scripts to gracefully disable OCR.

## Required Environment Variables

- `NODE_ENV=production`
- `JWT_SECRET=<strong secret>`
- `SQLITE_DB_PATH=./attainment.db`
- `UPLOADS_DIR=./uploads`
- `OUTPUTS_DIR=./outputs`
- `PYTHON_STAGE_DIR=./`
- `PYTHON_BIN=./venv/bin/python`
- `CORS_ORIGIN=<frontend render URL>` or `FRONTEND_URL=<frontend render URL>`

## Required Files Added

- `backend/requirements.txt`
- `render.yaml`
- `backend/RENDER_DEPLOYMENT_REPORT.md`

## Render Settings

- Build Command: `npm install && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt`
- Start Command: `npm start`
- Health Check Path: `/api/health`

## Deployment Steps

1. Push the branch to GitHub.
2. Create a new Render Web Service from the repository.
3. Use `render.yaml` (Render will detect it automatically) or enter the same build/start settings manually.
4. Set `CORS_ORIGIN` to the deployed frontend URL.
5. Set `JWT_SECRET` (auto-generated if using render.yaml).
6. Deploy and verify `/api/health`.
7. Test login, upload, and one processing flow.

## Remaining Risks and Limitations

- SQLite on Render free tier is not a durable production database; data can be lost on redeploy or instance reset.
- File uploads and generated outputs are stored locally inside the service filesystem, so they are also ephemeral on free tier.
- The current workflow supports DOCX/XLSX/XLS only; PDF upload support is not fully implemented for processing.