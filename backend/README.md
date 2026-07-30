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
GEMINI_API_KEY=CHANGE_ME
GEMINI_MODEL=gemini-3.1-flash-lite
BUSYNESS_MODEL_PATH=data-ml/models/zone_busyness_model.joblib
BUSYNESS_VENUES_CSV=data-ml/models/nyc_venues.csv
```

## Busyness Model Artifacts

The trained Joblib artifact is not stored in this repository because it exceeds
GitHub's 100 MiB per-file limit. Download the final ML artifacts from Google
Drive before starting the backend:

- [Download `zone_busyness_model.joblib`](https://drive.google.com/file/d/1RHxkjgwoizgeyL38fLv6jqO-wwo3w8Fk/view?usp=drive_link)
- [Download `nyc_venues.csv`](https://drive.google.com/file/d/1Qvf9MKXJcsHrKvoHapd2DTiNjz3epnnF/view?usp=sharing)

Keep the filenames unchanged and place them in:

```text
plugandwifi/
├── backend/
├── data-ml/
│   ├── models/
│   │   ├── zone_busyness_model.joblib
│   │   └── nyc_venues.csv
│   └── src/
│       └── zone_busyness_predictor.py
└── ...
```

All three items are required:

- `zone_busyness_model.joblib` is the trained model artifact.
- `nyc_venues.csv` provides the venue-to-zone mapping and must contain at least
  the `venue_id` and `zone_id` columns.
- `data-ml/src/zone_busyness_predictor.py` loads the artifact and implements
  `predict_many(...)`; it is already versioned in the repository.

The default environment-variable values shown above are correct when the API is
started from the **repository root**. The backend also checks for
`data-ml/src` using a repository-root-relative path, so starting it from
`backend/` would prevent the predictor module from being found.

> A Joblib file can execute Python code while being loaded. Only load the
> artifact provided by the Plug & Wifi project team.

### How the backend uses the model

During FastAPI startup, the lifespan handler attempts to load both the predictor
and venue CSV. Each object is cached after its first successful load.

For venue-list, venue-detail, suitability-sorting, and chatbot recommendation
requests, the backend:

1. maps each `venue_id` to a `zone_id` using `nyc_venues.csv`;
2. infers the nearest known zone from latitude and longitude when a venue has
   no direct mapping;
3. calls `predictor.predict_many(...)` for uncached zone/date/hour
   combinations;
4. caches the returned `busyness_score` and `busyness_label`; and
5. includes the prediction in API responses and suitability scoring.

If the model, CSV, predictor source, or prediction call is unavailable, the API
continues running but returns `null` for `busyness_score` and
`busyness_label`. Use the dedicated diagnostic endpoint below; database health
alone does not confirm ML readiness.

## Local Setup

Run the application from the repository root so that the `data-ml/...` paths
resolve correctly.

1. Create and activate a virtual environment.

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

2. Install dependencies.

```bash
python -m pip install -r backend/requirements.txt
```

3. Create `backend/.env` with your local database settings.

4. Download and place the two files described in
   [Busyness Model Artifacts](#busyness-model-artifacts).

5. Start the API server from the repository root.

```bash
python -m uvicorn backend.app.main:app --reload --port 8080
```

Open `http://localhost:8080/docs` for Swagger UI.

### Verify the model integration

After starting the API, open:

```text
http://localhost:8080/api/diagnostics/busyness
```

A ready integration should report:

```json
{
  "status": "ready",
  "model_exists": true,
  "venues_csv_exists": true,
  "predictor_loaded": true,
  "venues_csv_loaded": true,
  "missing_columns": []
}
```

To test an actual prediction, select a `venue_id` that exists in
`nyc_venues.csv` and request:

```text
http://localhost:8080/api/diagnostics/busyness?sample_venue_id=osm_357620442
```

Confirm that `sample.zone_id` is not `null` and
`sample.prediction_ready` is `true`.

If the status is `not_ready`, check that:

1. both downloaded files use the expected filenames and paths;
2. the API was started from the repository root;
3. `data-ml/src/zone_busyness_predictor.py` exists;
4. the CSV contains `venue_id` and `zone_id`;
5. the installed Python and ML package versions match `requirements.txt`; and
6. the model artifact is the final version compatible with the current
   predictor source.

## Docker Workflow

The backend Dockerfile is designed to be built from the **repository root**:

```bash
docker build -f backend/Dockerfile -t plugandwifi-backend .
```

The repository root must be the Docker build context because the Dockerfile
copies files from both `backend/` and `data-ml/src/`.

### What the Dockerfile does

The image build follows these steps:

1. starts from `python:3.10-slim`;
2. sets `/code` as the container working directory;
3. copies `backend/requirements.txt` first and installs the Python dependencies;
4. copies the backend application into `/code`;
5. copies `data-ml/src/` into `/code/data-ml/src/`; and
6. starts FastAPI with:

```text
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
```

Copying the requirements file before the application source allows Docker to
reuse the dependency-installation layer when the source code changes but
`requirements.txt` does not.

The large model and CSV are intentionally **not copied into the image**. Before
running the container locally, download both files from the links in
[Busyness Model Artifacts](#busyness-model-artifacts) and place them in
`data-ml/models/`. The directory is then mounted into the container as
read-only.

### Run the container locally

Create `backend/.env` as described in
[Environment Variables](#environment-variables). Because `localhost` inside a
container refers to the container itself, use a database hostname reachable
from Docker. On Docker Desktop, a PostgreSQL server running on the host can
normally be reached with:

```env
DATABASE_URL=postgresql://postgres:<password>@host.docker.internal:5432/plugandwifi
```

macOS/Linux:

```bash
docker run --rm \
  --name plugandwifi-backend \
  --env-file backend/.env \
  -e BUSYNESS_MODEL_PATH=/code/data-ml/models/zone_busyness_model.joblib \
  -e BUSYNESS_VENUES_CSV=/code/data-ml/models/nyc_venues.csv \
  -p 8080:8080 \
  --mount type=bind,source="$(pwd)/data-ml/models",target=/code/data-ml/models,readonly \
  plugandwifi-backend
```

Windows PowerShell:

```powershell
docker run --rm `
  --name plugandwifi-backend `
  --env-file backend/.env `
  -e BUSYNESS_MODEL_PATH=/code/data-ml/models/zone_busyness_model.joblib `
  -e BUSYNESS_VENUES_CSV=/code/data-ml/models/nyc_venues.csv `
  -p 8080:8080 `
  --mount "type=bind,source=$($PWD.Path)\data-ml\models,target=/code/data-ml/models,readonly" `
  plugandwifi-backend
```

If Docker Engine is running directly on Linux and PostgreSQL is on the same
host, add the following option and continue using `host.docker.internal` in
`DATABASE_URL`:

```text
--add-host=host.docker.internal:host-gateway
```

After the container starts, verify:

```text
http://localhost:8080/api/diagnostics/busyness?sample_venue_id=osm_357620442
```

The diagnostic response should report that the model, CSV, predictor, and venue
mapping are loaded, and that the sample prediction is ready.

### Cloud deployment behavior

The same image can be used for Cloud Run. The Dockerfile itself does not
download or embed the ML artifacts. In the deployed service, the model storage
is mounted by the platform at runtime, and the following environment variables
must point to the mounted files:

```env
BUSYNESS_MODEL_PATH=/mnt/busyness-models/busyness/zone_busyness_model.joblib
BUSYNESS_VENUES_CSV=/mnt/busyness-models/busyness/nyc_venues.csv
```

This keeps the container image small and allows the model artifacts to be
updated independently from the backend source image.

## Database Notes

- The app requires `DATABASE_URL`; it will fail at startup if that variable is missing.
- SQLAlchemy tables are created on startup through `Base.metadata.create_all(bind=engine)`.
- PostgreSQL is the intended local development target.
- Tests override the database with in-memory SQLite, so you can run the test suite without a PostgreSQL instance.

## Running Tests

Run from the repository root:

```bash
python -m pytest backend/test
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
