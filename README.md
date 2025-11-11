# Sigma merged workspace

This repo consolidates the two projects into a single, easy-to-run workspace:

- `sigma-fix/` — the modular, polished frontend (Vite + React + SigmaJS)
- `sigma-prototype/` — the backend (FastAPI) with the extra memory capacity endpoint

The root adds scripts to run both together.

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (FastAPI/uvicorn)

## Backend setup

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r sigma-prototype/backend/requirements.txt
```

Run backend alone (optional):

```bash
uvicorn sigma-prototype.backend.api:app --reload --host 127.0.0.1 --port 8000
```

## Frontend setup

From the repo root:

```bash
cd sigma-fix/frontend
npm install
```

Run frontend alone (optional). It uses VITE_API_URL to reach the backend; the root scripts set this to http://127.0.0.1:8000 for you:

```bash
VITE_API_URL=http://127.0.0.1:8000 npm run dev
```

## Run both together

From the repo root:

```bash
npm install   # installs root dev tools (concurrently)
npm run dev   # starts FastAPI on :8000 and Vite on :5173
```

The frontend dev server will be available at http://127.0.0.1:5173 and will talk to the backend at http://127.0.0.1:8000.

## Notes

- Frontend is sourced from `sigma-fix` (more modular components).
- Backend is sourced from `sigma-prototype` (includes `/memory_capacity_test`).
- You can switch the API target by editing `sigma-fix/frontend/.env.development` or overriding `VITE_API_URL` when running.

## Next steps (optional)

- Unify remaining pages/components between the two frontends if needed.
- Port the capacity test UI from the prototype into the `sigma-fix` frontend.
- Add a Docker Compose for one-command up.
