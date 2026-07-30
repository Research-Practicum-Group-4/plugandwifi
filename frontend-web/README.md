# Plug & Wifi Web Frontend

This directory contains the browser frontend for Plug & Wifi. It is a Vite,
React, and TypeScript application for venue discovery, booking, saved places,
provider tools, admin workflows, and chatbot-assisted recommendations.

The frontend can run in mock mode without a backend, or in real mode against
the FastAPI backend under `backend/`.

## Current Responsibilities

- home and search experience for flexible workspace venues
- venue detail, availability, checkout, booking confirmation, and booking history
- login, signup, protected user routes, and local auth persistence
- saved places and favorites
- provider registration, offer-space flow, dashboard, arrivals, and booking completion
- admin dashboard, pending venue applications, review moderation, and taxonomy pages
- chatbot recommendation UI backed by the backend recommendation endpoint
- Google Maps venue map rendering when `VITE_GOOGLE_MAPS_API_KEY` is configured
- mock API mode for frontend-only development and tests

## Stack

| Area | Current choice |
| :--- | :--- |
| Build tool | Vite |
| UI framework | React 18 |
| Language | TypeScript |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4, Radix UI primitives, local theme CSS |
| HTTP client | axios |
| Maps | `@vis.gl/react-google-maps` |
| Icons | lucide-react |
| Test tooling | Vitest, Testing Library, jsdom |
| Production serving | static Vite build, nginx in Docker |

## Project Layout

```text
frontend-web/
|-- index.html
|-- package.json
|-- package-lock.json
|-- vite.config.ts
|-- tsconfig.json
|-- eslint.config.js
|-- Dockerfile
|-- .env.example
|-- public/
|   |-- favicon.svg
|   `-- icons.svg
`-- src/
    |-- main.tsx
    |-- services/
    |   `-- api.ts
    |-- types/
    |   `-- api.ts
    |-- styles/
    |   |-- index.css
    |   |-- globals.css
    |   |-- theme.css
    |   `-- tailwind.css
    |-- test/
    |   |-- setup.ts
    |   `-- *.test.tsx
    `-- app/
        |-- App.tsx
        |-- routes.tsx
        |-- contexts/
        |-- components/
        |   |-- layouts/
        |   `-- ui/
        |-- data/
        |-- pages/
        |   |-- auth/
        |   |-- admin/
        |   |-- provider/
        |   `-- *.tsx
        `-- utils/
```

## Prerequisites

- Node.js 20 is recommended because the Docker build uses `node:20-alpine`.
- npm 9+.
- The backend is only required for real API mode. Mock mode works without
  PostgreSQL or the backend service.

The project includes `.npmrc` with `legacy-peer-deps=true` to keep dependency
installation stable with the current Radix, React, and UI package versions.

## Environment Variables

Copy `frontend-web/.env.example` to an environment file that matches the mode
you want to run.

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_MAPS_API_KEY=CHANGE_ME
```

| Variable | Purpose |
| :--- | :--- |
| `VITE_USE_MOCK` | When `true`, `src/services/api.ts` returns local mock data instead of calling the backend. |
| `VITE_API_BASE_URL` | Backend API base URL used when `VITE_USE_MOCK=false`. The local backend default is `http://localhost:8080/api`. |
| `VITE_GOOGLE_MAPS_API_KEY` | Required for Google Maps rendering in `MapView`. Other pages can still run if it is empty. |

Vite reads these variables at dev-server startup and at build time. Restart the
dev server after changing any `.env*` file.

## Local Setup

Run these commands from `frontend-web/`.

1. Install dependencies.

```bash
npm install
```

2. Choose mock mode or real backend mode.

Mock mode is the fastest frontend-only path:

```bash
cp .env.example .env.development.mock
```

Set:

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api
VITE_GOOGLE_MAPS_API_KEY=
```

Start the Vite dev server:

```bash
npm run dev
```

`npm run dev` and `npm run dev:mock` both use Vite mode
`development.mock`.

For real local backend integration, create `frontend-web/.env.development.local`:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_MAPS_API_KEY=CHANGE_ME
```

Then make sure the backend is running from the repository root:

```bash
python -m uvicorn backend.app.main:app --reload --port 8080
```

Start the frontend in local real mode:

```bash
npm run dev:local
```

Open:

```text
http://localhost:5173
```

The backend already allows CORS from `http://localhost:5173` and
`http://127.0.0.1:5173`.

## Environment Modes

| Scenario | Command | Vite mode | Expected env file | Backend required |
| :--- | :--- | :--- | :--- | :--- |
| Mock development | `npm run dev` or `npm run dev:mock` | `development.mock` | `.env.development.mock` | No |
| Local backend development | `npm run dev:local` | `development.local` | `.env.development.local` | Yes, usually `http://localhost:8080/api` |
| Remote backend development | `npm run dev:real` | `development.real` | `.env.development.real` | Yes, remote API |
| Production build | `npm run build` | `production` | `.env.production` | Build-time API URL required |

Only `.env.example` is intended to be shared. Real `.env*` files are ignored by
`frontend-web/.gitignore`.

## Backend Integration Notes

- `src/services/api.ts` decides between mock and real behavior with
  `import.meta.env.VITE_USE_MOCK`.
- Real requests use an axios instance with `baseURL = VITE_API_BASE_URL`.
- Authenticated requests attach `localStorage["access_token"]` as a Bearer
  token.
- A backend `401` clears `access_token` and `user_profile`, then redirects to
  `/login`.
- Mock mode includes demo accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| User | `user2@example.com` | `00000000` |
| Provider | `user3@example.com` | `00000000` |
| Admin | `admin@example.com` | `00000000` |

When using real backend mode, create real users through the signup flow or the
backend API. Mock demo credentials are not backend database users.

## Docker Workflow

The frontend Dockerfile is designed to be built from the `frontend-web/`
directory:

```bash
cd frontend-web
docker build -t plugandwifi-frontend .
```

### What the Dockerfile does

The image build follows these steps:

1. starts from `node:20-alpine`;
2. installs dependencies with `npm ci --legacy-peer-deps`;
3. accepts Vite build arguments;
4. builds the static app into `/app/dist`;
5. copies the build output into an nginx image; and
6. serves the app on container port `80` with React Router fallback to
   `index.html`.

The Vite environment variables are baked into the JavaScript bundle at build
time. Pass the target API URL when building the image.

Build for a local backend running on the host:

```bash
docker build \
  --build-arg VITE_USE_MOCK=false \
  --build-arg VITE_API_BASE_URL=http://localhost:8080/api \
  --build-arg VITE_GOOGLE_MAPS_API_KEY=CHANGE_ME \
  -t plugandwifi-frontend .
```

On Docker Desktop, if the browser loads the site from the container but the API
is on the host, `localhost` still means the user's machine from the browser's
point of view. `http://localhost:8080/api` is correct for local browser testing.

Run the container:

```bash
docker run --rm --name plugandwifi-frontend -p 5173:80 plugandwifi-frontend
```

Open:

```text
http://localhost:5173
```

For a deployed backend, build with the deployed API URL instead:

```bash
docker build \
  --build-arg VITE_USE_MOCK=false \
  --build-arg VITE_API_BASE_URL=https://api.plugandwifi.xyz/api \
  --build-arg VITE_GOOGLE_MAPS_API_KEY=CHANGE_ME \
  -t plugandwifi-frontend .
```

## Available Scripts

Run from `frontend-web/`.

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start Vite in mock mode. |
| `npm run dev:mock` | Start Vite in mock mode. |
| `npm run dev:local` | Start Vite using `.env.development.local`. |
| `npm run dev:real` | Start Vite using `.env.development.real`. |
| `npm run build` | Build static production files into `dist/`. |
| `npm run preview` | Preview the built `dist/` output locally. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Run Vitest with coverage. |

## Running Tests

Run from `frontend-web/`:

```bash
npm run test
```

The current tests cover mock API behavior, homepage rendering, chatbot UI
behavior, venue enrichment utilities, and API contract assumptions.

Run lint separately:

```bash
npm run lint
```

## Useful Routes

| Route | Purpose |
| :--- | :--- |
| `/` | home and discovery entry point |
| `/search` | venue search and filtering |
| `/venue/:id` | venue detail |
| `/checkout` | authenticated checkout |
| `/booking-confirmation` | booking confirmation |
| `/saved` | authenticated saved places |
| `/bookings` | authenticated user booking history |
| `/login` | login |
| `/signup` | signup |
| `/provider/register` | provider registration |
| `/provider/dashboard` | provider dashboard |
| `/provider/offer-space` | provider venue submission |
| `/admin` | admin dashboard |
| `/admin/applications` | pending venue applications |
| `/admin/reviews` | review moderation |
| `/admin/taxonomy` | taxonomy management |

## Notes For Team Development

- Use mock mode when working on UI behavior that does not require backend state.
- Use `npm run dev:local` when validating real authentication, bookings,
  favorites, provider actions, admin actions, and busyness-backed venue data.
- Keep local API keys and machine-specific API URLs in ignored `.env*` files.
- If `frontend-web` talks to `backend`, make sure the backend README local setup
  has been completed, including PostgreSQL schema creation and venue CSV import.
