# Plug & Wifi

Plug & Wifi is a monorepo for a flexible workspace discovery project developed in a research and prototyping context. The repository combines the main user-facing apps with the backend API and the data/ML experiments that support venue quality, ranking, and busyness-related features.

The current codebase is best understood as an active course/project workspace rather than a finished production system. Some areas are more complete than others, and several directories reflect parallel workstreams from different team members.

## What Is In This Repo

- `frontend-web/` contains the main web application built with React, TypeScript, Vite, and Tailwind CSS.
- `frontend-mobile/` contains the React Native mobile app prototype for Android and iOS.
- `backend/` contains the FastAPI backend, authentication logic, booking flows, role-based access control, and database models.
- `data-ml/` contains data collection, cleaning, feature engineering, and prediction scripts used for venue scoring and busyness modelling.
- `data/` stores raw data assets used by the data pipeline.
- `docs/` contains project artefacts, planning notes, meeting records, and research materials.

## Current Scope

The repository currently supports work in these areas:

- Venue discovery and detail views
- User authentication and favorites
- Booking and mock payment flows
- Provider and admin dashboard features
- Mobile and web interface prototypes
- Data exploration and ML experiments for venue suitability and busyness prediction

## Tech Stack

| Area | Current stack |
| :--- | :--- |
| Web frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Mobile frontend | React Native |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL via `psycopg2` |
| Data / ML | Python, pandas, scikit-learn, joblib |
| Testing | Vitest, Jest, pytest |
| Containers | Dockerfiles for web and backend |

## Repository Notes

- This is a monorepo, but each major service is developed somewhat independently.
- The root README is intentionally lightweight; service-specific setup lives in each subdirectory README where available.
- The web and backend directories are the most directly documented parts of the repo right now.
- The mobile and data/ML areas include working code, but some documentation and structure are still uneven.

## Getting Started

Choose the part of the system you want to work on, then follow its local setup instructions:

- `frontend-web/README.md`
- `backend/README.md`
- `frontend-mobile/README.md`

Typical workflow:

1. Clone the repository.
2. Move into the relevant subproject directory.
3. Install that subproject's dependencies.
4. Run the local development server or app from that directory.

## Suggested Use Of This Repo

This repository is most suitable for:

- team development during the project lifecycle
- demonstrating the product concept and technical approach
- experimenting with venue data and ranking models
- iterating on web/mobile UX and backend booking logic

It should not be treated as a polished production deployment reference without checking the current state of each subproject first.
