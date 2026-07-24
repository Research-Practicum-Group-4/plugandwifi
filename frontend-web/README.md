# Plug & Wifi Web Frontend

This directory contains the main web frontend for Plug & Wifi. It is a React + TypeScript + Vite application used to prototype and implement the user-facing booking experience, venue discovery flows, and provider/admin interfaces.

The frontend is in active development. It already includes substantial route coverage and mock-data support, but it should still be treated as a project-stage application rather than a polished production frontend.

## Current Scope

- landing and discovery flows
- venue search and venue detail pages
- saved places and booking flows
- login and signup
- provider dashboard, registration, and offer-space pages
- admin dashboard and moderation pages
- mock and real API integration modes

## Stack

| Area | Current choice |
| :--- | :--- |
| Framework | React 18 |
| Language | TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| UI primitives | Radix UI |
| Maps/data viz | Google Maps, Leaflet, Recharts |
| Testing | Vitest, Testing Library |

## Project Layout

```text
frontend-web/
├── src/
│   ├── app/
│   │   ├── components/      # shared UI, layout, route guards
│   │   ├── contexts/        # auth and favorites state
│   │   ├── data/            # local app data
│   │   ├── pages/           # route pages
│   │   ├── utils/           # enrichment and distance helpers
│   │   ├── App.tsx
│   │   └── routes.tsx
│   ├── services/            # API layer with mock/real switching
│   ├── styles/              # theme, fonts, globals, tailwind entry
│   ├── test/                # Vitest setup and app tests
│   └── types/               # shared API/data types
├── public/
├── guidelines/
├── package.json
├── vite.config.ts
└── .env.example
```

## Prerequisites

- Node.js 18+ recommended
- npm

## Install

```bash
cd frontend-web
npm install
```

## Environment Modes

The app supports mock mode and API-connected modes through Vite env files.

Base variables:

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8000/api
```

Common profiles:

| Scenario | Command | Expected env file | Meaning |
| :--- | :--- | :--- | :--- |
| Mock development | `npm run dev` or `npm run dev:mock` | `.env.development.mock` | frontend-only work with mocked data |
| Local API integration | `npm run dev:local` | `.env.development.local` | connect to a locally running backend |
| Remote API integration | `npm run dev:real` | `.env.development.real` | connect to a deployed backend |
| Production build | `npm run build` | `.env.production` | compile static assets with production env values |

You can use [`.env.example`](D:/05_UCD/Research%20Practicum/github%20repositry/plugandwifi/frontend-web/.env.example) as the template.

## Local Development

For mock-only development:

```bash
npm run dev
```

For local backend integration:

1. Create `.env.development.local`
2. Set:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000/api
```

3. Start the app:

```bash
npm run dev:local
```

By default Vite serves the app at `http://localhost:5173`.

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | start Vite in mock mode |
| `npm run dev:mock` | same as `dev` |
| `npm run dev:local` | start Vite against a local backend |
| `npm run dev:real` | start Vite against a remote backend |
| `npm run build` | production build |
| `npm run preview` | preview the built app locally |
| `npm run lint` | run ESLint |
| `npm run test` | run Vitest once |
| `npm run test:watch` | run Vitest in watch mode |
| `npm run test:coverage` | generate coverage output |

## Testing

Run from `frontend-web/`:

```bash
npm run test
```

Current tests cover frontend behavior such as mock API integration, venue enrichment helpers, and page-level rendering flows.

## Notes For Team Development

- The API layer switches between mock and real behavior in `src/services/api.ts`.
- If local API calls fail, check that your env mode matches the backend port you are actually running.
- Some assets and generated UI pieces reflect iterative design/prototyping work, so structure and polish are not fully uniform yet.
