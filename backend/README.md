# Plug&WiFi Backend API

Welcome to the backend infrastructure of **Plug&WiFi**, a high‑performance space‑sharing reservation engine. This platform manages user identity, geospatial verification, contiguous seating allocations, and real‑time venue booking logic.

---

## 🛠️ Technology Stack

- **Core Framework**: FastAPI – modern, high‑performance web framework for Python 3.12, using Pydantic for data validation and automatic OpenAPI generation.
- **Database Engine**: PostgreSQL – production‑grade relational database (Google Cloud SQL) handling transactional bounds and secure user data.
- **ORM**: SQLAlchemy – maps Python models to relational schemas and manages transaction pools.
- **Authentication**: JWT (HS256) via `OAuth2PasswordBearer` – stateless, cryptographically signed tokens.
- **Geospatial Computation**: Native Haversine Formula implementation for distance calculations.

---

## 💻 Local Development Setup

### 1. Prerequisites

Ensure a local PostgreSQL instance is installed and reachable on port `5432` (or configure your preferred provider).

### 2. Environment Configuration (`.env`)

Create a `.env` file in the `backend` root:

```env
# Format: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>
DATABASE_URL=postgresql://postgres:<YOUR_LOCAL_DB_PASSWORD>@localhost:5432/plugandwifi

# Strong secret key for development
SECRET_KEY=<INSERT_YOUR_LOCAL_SECRET_KEY_HERE>

ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 3. Virtual Environment & Dependencies

```bash
# Activate virtual environment
source .venv/Scripts/activate   # Bash / MINGW64
# or
.venv\Scripts\activate          # CMD / PowerShell

# Install dependencies
pip install -r requirements.txt
```

### 4. Database Schema Mapping

On startup the code runs:

```python
Base.metadata.create_all(bind=engine)
```

This creates missing tables in the configured database.

### 5. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8080
```

Visit `http://localhost:8080` (Swagger UI at `/docs`).

---

## 🚦 Monitoring Endpoints

### Startup Probe: `/api/ping`
- **Method**: GET
- **Response**: `{"status": "healthy"}`
- **Use**: Cloud Run startup probe – lightweight health check without DB access.

### System Health: `/api/health`
- **Method**: GET
- **Response**: Performs a `SELECT 1` via SQLAlchemy; returns 200 if DB is reachable, otherwise 500.
- **Use**: Continuous health monitoring and CI/CD gatekeeping.

---

## 🚀 CI/CD Pipeline Architecture

```
[ Git Push ] → [ Cloud Build ] → [ Build Image ] → [ Push Artifact Registry ]
                                           │
[ Active Traffic ] ← [ Fail: Rollback ] ← [ Smoke Test ] ← [ Deploy Cloud Run ]
                                           │
                                           └──→ [ Pass: Route Production ]
```

**Automated Steps**
1. **Build** – Cloud Build builds Docker image using `backend/Dockerfile` with `--no-cache`.
2. **Push** – Image pushed to Google Artifact Registry, tagged with `$COMMIT_SHA`.
3. **Deploy** – Updates Cloud Run service in `europe-west4`, initial delay 2 s targeting `/api/ping`.
4. **Smoke Test** – Cloud Build runs a curl script against `https://api.plugandwifi.xyz/api/health`.
   - **Success** (200 OK) → Traffic switched to new revision.
   - **Failure** (non‑200/timeout) → Build aborts, rollback to previous stable revision.
