# Plug & Wifi Backend

This directory contains the FastAPI backend for Plug & Wifi. It provides the API layer for authentication, venue discovery, booking flows, favorites, provider/admin actions, and the busyness-based recommendation features used by the project.

This backend is best treated as an active project service, not a finished production reference. The codebase includes core business flows, test coverage for many routes, and supporting scripts for local data and schema updates.

## Current Responsibilities

- user signup, login, refresh token rotation, and logout
- venue listing, venue detail, and availability endpoints
- favorites and user booking history
- booking creation, mock payment confirmation, and cancellation
- provider dashboard and venue slot management
- admin venue suspension and dashboard summary endpoints
- busyness diagnostics and suitability scoring support
- chatbot recommendation endpoint backed by search parameter extraction

## Stack

| Area | Current choice |
| :--- | :--- |
| API framework | FastAPI |
| Validation | Pydantic |
| ORM | SQLAlchemy |
| Database | PostgreSQL in normal development, SQLite in tests |
| Auth | JWT access tokens plus refresh token sessions |
| ML/data integration | pandas, scikit-learn, joblib |
| Test tooling | pytest, FastAPI TestClient, httpx |

## Project Layout

```text
backend/
├── app/
│   ├── main.py              # FastAPI app and route handlers
│   ├── database.py          # DB engine and session setup
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Request/response schemas
│   ├── auth.py              # Password hashing and JWT helpers
│   ├── rbac.py              # Current-user and role guards
│   ├── refresh_tokens.py    # Refresh-session lifecycle helpers
│   ├── seed_*.py            # Local seed scripts
│   └── migrate_*.py         # One-off migration/support scripts
├── test/
│   └── test_main.py         # API and business-logic tests
├── requirements.txt
├── Dockerfile
└── DATABASE.md
```

## Prerequisites

- Python 3.10+ is recommended
- PostgreSQL for normal local development
- a virtual environment

## Environment Variables

Create `backend/.env` before running the API locally.

```env
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/plugandwifi
SECRET_KEY=replace_this_with_a_local_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Optional database pool tuning:

```env
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=5
DB_POOL_RECYCLE=1800
DB_POOL_TIMEOUT=30
DB_CONNECT_TIMEOUT=10
DB_KEEPALIVES_IDLE=30
DB_KEEPALIVES_INTERVAL=10
DB_KEEPALIVES_COUNT=5
```

Optional feature/config variables used by specific flows:

```env
FREE_CANCELLATION_HOURS=24
GEMINI_MODEL=gemini-3.1-flash-lite
BUSYNESS_MODEL_PATH=data-ml/models/zone_busyness_model.joblib
BUSYNESS_VENUES_CSV=data-ml/models/nyc_venues.csv
```

## Local Setup

1. Move into the backend directory.

```bash
cd backend
```

2. Create and activate a virtual environment.

```bash
python -m venv .venv
.venv\Scripts\activate
```

3. Install dependencies.

```bash
pip install -r requirements.txt
```

4. Create `backend/.env` with your local database settings.

5. Start the API server.

```bash
uvicorn app.main:app --reload --port 8080
```

Open `http://localhost:8080/docs` for Swagger UI.

## Database Notes

- The app requires `DATABASE_URL`; it will fail at startup if that variable is missing.
- SQLAlchemy tables are created on startup through `Base.metadata.create_all(bind=engine)`.
- PostgreSQL is the intended local development target.
- Tests override the database with in-memory SQLite, so you can run the test suite without a PostgreSQL instance.

## Running Tests

Run from `backend/`:

```bash
pytest
```

The test suite covers a large part of the route behavior, including authentication, bookings, favorites, refresh tokens, provider/admin access control, and busyness-related flows.

## Useful Endpoints

| Endpoint | Purpose |
| :--- | :--- |
| `/docs` | Swagger UI |
| `/api/ping` | lightweight health check |
| `/api/health` | DB connectivity health check |
| `/api/diagnostics/busyness` | model and CSV readiness check |
| `/api/venues` | venue search/listing |
| `/api/venues/{venue_id}` | venue detail |
| `/api/bookings` | booking creation |
| `/api/auth/login` | login |
| `/api/auth/refresh` | refresh token rotation |

## Notes For Team Development

- This service mixes core API behavior with some experimental recommendation features.
- Several migration and seeding scripts are kept in `app/` as project support utilities rather than as a formal migration framework.
- If you are integrating with `frontend-web`, make sure the frontend `VITE_API_BASE_URL` matches the port you run locally.
