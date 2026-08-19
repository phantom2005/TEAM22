# AI Incident RCA Assistant

![CI](https://github.com/VinVorteX/TEAM22_fork/actions/workflows/ci.yml/badge.svg)
![Docker Build](https://github.com/VinVorteX/TEAM22_fork/actions/workflows/docker-build.yml/badge.svg)

An AI-powered Root Cause Analysis engine for IT incidents. Paste an error log or incident description and get an instant RCA backed by RAG retrieval over historical tickets and LLM generation via Groq.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Lucide Icons |
| Backend | FastAPI, SQLAlchemy (async), SQLite / PostgreSQL |
| RAG | FAISS, sentence-transformers (`all-MiniLM-L6-v2`) |
| LLM | Groq (`llama-3.1-8b-instant`) |
| Tests | pytest, pytest-asyncio, httpx |
| Containerisation | Docker, Docker Compose, nginx |

---

## Project Structure

```
TEAM22_fork/
├── src/                        # React frontend
│   ├── api.js                  # Centralised API client
│   ├── App.js
│   └── components/
│       ├── Dashboard.jsx       # Main app — RCA tab + Chatbot tab
│       ├── FeedbackAndMetrics.jsx
│       ├── Login.jsx
│       └── Signup.jsx
├── Dockerfile                  # Frontend multi-stage build (Node → nginx)
├── nginx.conf                  # nginx SPA config + /api proxy
├── docker-compose.yml          # PostgreSQL + backend + frontend
├── .env.docker.example         # Docker env template
├── .github/workflows/
│   ├── ci.yml                  # Run pytest on push/PR
│   └── docker-build.yml        # Verify Docker build on push/PR
└── backend/
    ├── Dockerfile              # Backend container (Python 3.12-slim)
    ├── app/
    │   ├── api/                # Route handlers (thin)
    │   │   ├── analysis.py     # POST /analyze, GET /analysis/{id}
    │   │   ├── datasets.py     # POST /datasets/upload, GET /datasets
    │   │   ├── incidents.py    # GET /incidents, GET /incidents/{id}
    │   │   ├── feedback.py     # POST /feedback
    │   │   └── system.py       # GET /analytics, GET /health
    │   ├── services/           # Business logic
    │   │   ├── retrieval_service.py   # FAISS index + similarity search
    │   │   ├── rca_service.py         # Groq LLM + prompt builder
    │   │   ├── dataset_service.py     # CSV/JSON ingestion
    │   │   └── analytics_service.py  # DB aggregations
    │   ├── models/             # SQLAlchemy ORM models
    │   ├── schemas/            # Pydantic request/response schemas
    │   ├── core/               # Config, database, logging
    │   └── main.py             # FastAPI app entry point
    ├── tests/
    │   ├── conftest.py
    │   └── test_api.py         # 9 tests — all endpoints
    ├── requirements.txt
    └── .env.example
```

---

## Request Flow

```
POST /api/analyze
       │
       ▼
  API layer (analysis.py)
       │
       ├──▶ retrieval_service  →  FAISS cosine similarity search
       │                               │
       │                         top-K similar incidents
       │
       ├──▶ rca_service        →  Groq LLM (llama-3.1-8b-instant)
       │                               │
       │                         structured JSON: summary, root_cause,
       │                         resolution, confidence, evidence
       │
       └──▶ persist Analysis to DB  →  return AnalyzeResponse
```

---

## Setup

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set your GROQ_API_KEY
```

**.env** (minimum required):
```env
GROQ_API_KEY=gsk_your-key-here
DATABASE_URL=sqlite+aiosqlite:///./rca.db
CORS_ORIGINS=http://localhost:3000
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

```bash
# Start the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: `http://localhost:8000/docs`

### 2. Frontend

```bash
# From project root
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/datasets/upload` | Upload CSV/JSON of historical incidents |
| `GET` | `/api/datasets` | List all uploaded datasets |
| `GET` | `/api/incidents` | Paginated list of historical incidents |
| `GET` | `/api/incidents/{id}` | Get a single incident |
| `POST` | `/api/analyze` | **Core endpoint** — run RCA on an incident |
| `GET` | `/api/analysis/{id}` | Retrieve a past analysis |
| `POST` | `/api/feedback` | Submit accuracy feedback |
| `GET` | `/api/analytics` | Live metrics and stats |
| `GET` | `/api/health` | Health + readiness check |

### POST /api/analyze

Request:
```json
{
  "incident_description": "Production payment API returning HTTP 502 errors during peak hours"
}
```

Response:
```json
{
  "id": "uuid",
  "summary": "...",
  "root_cause": "...",
  "resolution": "...",
  "confidence": 0.91,
  "evidence": ["..."],
  "similar_incidents": [
    {
      "id": "uuid",
      "ticket_id": "INC-101",
      "title": "...",
      "score": 0.88,
      "root_cause": "...",
      "resolution": "..."
    }
  ],
  "status": "completed",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Dataset CSV Format

Upload historical incidents via `POST /api/datasets/upload`. Required columns:

```
ticket_id, title, description, root_cause, resolution, category, severity
```

Column names are flexible — `root_cause`, `rootcause`, `cause` are all accepted.
`title` is optional — if missing, it is auto-generated from the first 80 characters of `description`.

---

## Docker (PostgreSQL)

### Quick start

```bash
# 1. Create your env file with your Groq key
cp .env.docker.example .env.docker
# Edit .env.docker — set GROQ_API_KEY=gsk_your-key-here

# 2. Build and start all services
docker compose --env-file .env.docker up --build
```

That starts:
- `db` — PostgreSQL 16 on port `5432`
- `backend` — FastAPI on port `8000` (waits for DB to be healthy)
- `frontend` — React + nginx on port `80` (waits for backend to be healthy)

Open `http://localhost` — the app is live.
Open `http://localhost:8000/docs` — Swagger UI.

### Useful commands

```bash
# Run in background
docker compose --env-file .env.docker up -d

# View logs
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and wipe the database volume
docker compose down -v

# Rebuild after code changes
docker compose --env-file .env.docker up --build
```

### Services

| Service | URL | Notes |
|---|---|---|
| Frontend | `http://localhost` | React app via nginx |
| Backend | `http://localhost:8000` | FastAPI direct access |
| Swagger UI | `http://localhost:8000/docs` | API docs |
| PostgreSQL | `localhost:5432` | DB: `rca_db`, user: `rca_user` |

---

## Running Tests

```bash
cd backend
pytest -v
```

Expected output: **9 passed** covering health, analytics, analyze, feedback, and full end-to-end flow.

---

## Notes

- **No Groq key?** The app still works — it falls back to a deterministic mock RCA using the top retrieved incident.
- **Empty index?** Upload a dataset CSV first to populate the FAISS index. Without it, RAG retrieval returns no results and the LLM has no historical context.
- **FAISS persistence** — the index is saved to disk on the `uploads_data` Docker volume and reloaded on restart, so re-embedding is only triggered when new data is uploaded.
- **Database** defaults to SQLite for development. Swap `DATABASE_URL` to a PostgreSQL connection string for production.
- **Do not use `docker compose down -v`** unless you want to wipe the database and uploads volume. Use `docker compose down` to just stop the containers.
