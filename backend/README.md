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
GitHub's 100 MiB per-file limit. The venue CSV used by the backend should also
come from the project Google Drive link below. Treat that downloaded
`nyc_venues.csv` as the source-of-truth file for local backend data.

- [Download `zone_busyness_model.joblib`](https://drive.google.com/file/d/1RHxkjgwoizgeyL38fLv6jqO-wwo3w8Fk/view?usp=drive_link)
- [Download `nyc_venues.csv`](https://drive.google.com/file/d/1Qvf9MKXJcsHrKvoHapd2DTiNjz3epnnF/view?usp=sharing)

Keep the filenames unchanged and place them in the backend default data
location:

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
- `data-ml/models/nyc_venues.csv` must be the Google Drive version linked
  above. It is used in two places: `backend/app/seed_venues.py` imports its
  venue columns into PostgreSQL, and the runtime busyness flow reads
  `venue_id` plus `zone_id` from the same file.
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
resolve correctly. The backend package name is `backend.app` when commands are
run from the repository root.

1. Create and activate a virtual environment from the repository root.

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

3. Create a local PostgreSQL database.

```sql
CREATE DATABASE plugandwifi;
```

4. Create `backend/.env` with your local database settings.

```env
DATABASE_URL=postgresql+psycopg2://postgres:<password>@localhost:5432/plugandwifi
SECRET_KEY=replace_this_with_a_local_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
REMEMBER_ME_REFRESH_TOKEN_EXPIRE_DAYS=30
```

5. Download the Google Drive model and CSV described in
   [Busyness Model Artifacts](#busyness-model-artifacts). The CSV must be saved
   as `data-ml/models/nyc_venues.csv`; do not use an older local export from
   another folder.

6. Create the current database schema.

```bash
python -c "from backend.app.database import engine; from backend.app.models import Base; Base.metadata.create_all(bind=engine)"
```

For a brand-new database, this creates all tables and current columns from
`backend/app/models.py`. For an older database that already has tables, see
[Migration Scripts](#migration-scripts) before importing venue data.

7. Validate the venue CSV import. By default, the importer reads the Google
   Drive CSV from `data-ml/models/nyc_venues.csv`.

```bash
python -m backend.app.seed_venues
```

This dry run checks that the CSV contains the columns consumed by
`backend/app/seed_venues.py`, including `venue_id`, venue metadata,
transportation fields, normalized score fields, and pricing/rating fields.
The same CSV also contains `zone_id`, which is used at runtime by the busyness
diagnostic and prediction flow.

8. Import or update venue rows after the dry run looks correct.

```bash
python -m backend.app.seed_venues --apply
```

The importer upserts by `venue_id`, so rerunning it updates existing venue rows
instead of creating duplicates.

9. Start the API server from the repository root.

```bash
python -m uvicorn backend.app.main:app --reload --port 8080
```

Open `http://localhost:8080/docs` for Swagger UI.

### Migration Scripts

This project does not use Alembic. The files named `migrate_*.py` under
`backend/app/` are one-off PostgreSQL support scripts for databases that were
created before newer models and features were added.

For a brand-new local database, you do **not** need to run these migration
scripts. Run the schema creation command in [Local Setup](#local-setup), then
run `seed_venues`.

For an existing PostgreSQL database, `Base.metadata.create_all(...)` creates
missing tables but does not add missing columns to tables that already exist.
Run the dry-run form first:

```bash
python -m backend.app.migrate_user_roles
python -m backend.app.migrate_refresh_sessions
python -m backend.app.migrate_venue_state
python -m backend.app.migrate_venue_listing_fields
python -m backend.app.migrate_post_booking_reviews
```

If the dry-run output shows missing columns or tables, apply the migrations:

```bash
python -m backend.app.migrate_user_roles --apply
python -m backend.app.migrate_refresh_sessions --apply
python -m backend.app.migrate_venue_state --apply
python -m backend.app.migrate_venue_listing_fields --apply
python -m backend.app.migrate_post_booking_reviews --apply
```

What each script covers:

| Script | Required when |
| :--- | :--- |
| `migrate_user_roles.py` | Existing `users` table does not have `role`. |
| `migrate_refresh_sessions.py` | Existing DB does not have `refresh_sessions`. |
| `migrate_venue_state.py` | Existing `venues` table does not have `state`. |
| `migrate_venue_listing_fields.py` | Existing `venues` table is missing provider listing fields such as `seat_capacity`, `amenity_tags`, `rules_text`, accessibility flags, calls flag, or certification/friendly flags. |
| `migrate_post_booking_reviews.py` | Existing DB does not have `post_booking_reviews`, or that table is missing `comment`. |

These scripts expect PostgreSQL because they query `information_schema` and use
PostgreSQL-compatible `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements.
Do not run them against the SQLite test database.

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

To test an actual prediction, select a `venue_id` that exists in your local
Google Drive copy of `nyc_venues.csv`.

Windows PowerShell:

```powershell
Import-Csv data-ml\models\nyc_venues.csv | Select-Object -First 1 -ExpandProperty venue_id
```

macOS/Linux:

```bash
python -c "import csv; print(next(csv.DictReader(open('data-ml/models/nyc_venues.csv', encoding='utf-8-sig')))['venue_id'])"
```

Then use that value in the diagnostic request:

```text
http://localhost:8080/api/diagnostics/busyness?sample_venue_id=<venue_id_from_your_csv>
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

The host database must already exist before the container starts.

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

### Initialize data through Docker

The container starts the API, and importing data requires a second shell while
the container is running.

For a brand-new database, create the schema inside the container:

```bash
docker exec plugandwifi-backend python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

For an existing database, dry-run and then apply any required migration scripts:

```bash
docker exec plugandwifi-backend python -m app.migrate_user_roles
docker exec plugandwifi-backend python -m app.migrate_refresh_sessions
docker exec plugandwifi-backend python -m app.migrate_venue_state
docker exec plugandwifi-backend python -m app.migrate_venue_listing_fields
docker exec plugandwifi-backend python -m app.migrate_post_booking_reviews
```

```bash
docker exec plugandwifi-backend python -m app.migrate_user_roles --apply
docker exec plugandwifi-backend python -m app.migrate_refresh_sessions --apply
docker exec plugandwifi-backend python -m app.migrate_venue_state --apply
docker exec plugandwifi-backend python -m app.migrate_venue_listing_fields --apply
docker exec plugandwifi-backend python -m app.migrate_post_booking_reviews --apply
```

Then validate and import venues from the mounted CSV:

```bash
docker exec plugandwifi-backend python -m app.seed_venues
docker exec plugandwifi-backend python -m app.seed_venues --apply
```

After the container starts and the data is initialized, get a sample venue ID
from the mounted Google Drive CSV:

```bash
docker exec plugandwifi-backend python -c "import csv; print(next(csv.DictReader(open('/code/data-ml/models/nyc_venues.csv', encoding='utf-8-sig')))['venue_id'])"
```

Then verify with that value:

```text
http://localhost:8080/api/diagnostics/busyness?sample_venue_id=<venue_id_from_your_csv>
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
- `create_all` does not alter existing tables, so older databases may still need the one-off migration scripts listed above.
- Venue data comes from `data-ml/models/nyc_venues.csv` and is imported with `backend/app/seed_venues.py`.
- PostgreSQL is the intended local development target.
- Tests override the database with in-memory SQLite, so you can run the test suite without a PostgreSQL instance.

## Running Tests

The backend test suite uses pytest and FastAPI `TestClient`.

Install the backend dependencies first:

```bash
python -m pip install -r backend/requirements.txt
```

Run from the repository root:

```bash
python -m pytest backend/test
```

You can also run a single test file:

```bash
python -m pytest backend/test/test_main.py
```

Run one specific test by name:

```bash
python -m pytest backend/test/test_main.py -k "busyness"
```

Use verbose output when debugging failures:

```bash
python -m pytest backend/test -v
```

### Test database behavior

The tests do **not** use your local PostgreSQL database. At the top of
`backend/test/test_main.py`, the test process sets:

```env
DATABASE_URL=sqlite:///:memory:
SECRET_KEY=secret_key_for_testing
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

The test suite then overrides FastAPI's `get_db` dependency with an in-memory
SQLite session. This means:

- you do not need PostgreSQL running to execute pytest;
- you do not need to run the migration scripts before pytest;
- you do not need to run `seed_venues.py` before pytest;
- the tests create their own temporary schema and seed data;
- test data is discarded when the pytest process exits.

The busyness-related tests monkeypatch the model and CSV behavior where needed,
so they do not require the Google Drive `zone_busyness_model.joblib` artifact.

### Windows PowerShell note

If `pytest` is not found or script execution is restricted, prefer the module
form:

```powershell
python -m pytest backend/test
```

This avoids relying on a shell script shim.

The test suite covers a large part of the route behavior, including
authentication, bookings, favorites, refresh tokens, provider/admin access
control, chatbot recommendation behavior, and busyness-related flows.

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
