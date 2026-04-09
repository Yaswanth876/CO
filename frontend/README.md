# Frontend

React + Vite frontend for the CO Attainment system.

## Setup

1. Install dependencies:
	```bash
	npm install
	```
2. Configure environment:
	- create `.env` from `.env.example`
	- set `VITE_API_BASE_URL=http://127.0.0.1:8000`
3. Start dev server:
	```bash
	npm run dev
	```

## Login Mode

- Dev login accepts any `@tce.edu` email.
- Password: `tce123`.

## Expected Backend

Frontend expects the FastAPI backend from `../backend/app.py` to be running on port `8000`.
