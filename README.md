# Dockwise

Dockwise is Meridian Logistics Properties' shared loading-dock appointment, courtyard queue, and visit-audit web application. It replaces emailed Excel sheets, guard-shack whiteboards, and supervisor phone calls with a single calendar and operational record for multi-tenant warehouses.

## Tech stack

- **Frontend**: Vite + React 18 + TypeScript, React Router, TanStack Query, Axios.
- **Backend**: Node 22 + NestJS 10 (TypeScript), TypeORM, JWT auth, class-validator.
- **Database**: SQLite via sql.js (pure-WASM, file-backed; no server required).
- **E2E**: Playwright.
- **Deploy**: Docker Compose (frontend nginx + backend).

## Repository layout

```
backend/    NestJS API (feature modules under src/modules)
frontend/   Vite + React SPA (feature pages under src/features)
e2e/        Playwright E2E specs (run in the Testing phase)
docker-compose.yml
```

## Prerequisites

- Node 22+
- npm 9+
- Docker + Docker Compose (for the containerized run)

## Run locally (development)

Start the backend (seeds demo data on first boot):

```bash
cd backend
npm install
npm run dev        # http://localhost:3001  (health: /api/health)
```

Start the frontend (proxies /api to the backend):

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Demo credentials

The seed creates these accounts (password for all: `DockwiseDemo!1`):

| Email | Role |
|---|---|
| `platform.admin@dockwise.example` | platform_admin |
| `site.admin@dockwise.example` | site_admin |
| `coordinator@dockwise.example` | site_coordinator |
| `gate@dockwise.example` | gate_officer |
| `tenant.admin@frostline.example` | tenant_admin |
| `booker@frostline.example` | tenant_booker |
| `dispatch@northstar.example` | carrier_dispatcher |

## Run with Docker Compose

```bash
docker compose up --build
# frontend: http://localhost:8080
# backend:  http://localhost:3001/api/health
```

## Tests

```bash
# Backend unit + API tests (Jest + Supertest, real SQLite)
cd backend && npm test

# Frontend unit tests (Vitest + Testing Library)
cd frontend && npm test

# E2E (Playwright; requires both servers running)
node frontend/node_modules/@playwright/test/cli.js test --config frontend/playwright.config.ts
```

## Environment

Each tier has its own `.env.example` documenting every variable with a dummy
value. Copy to `.env` for local dev. Never commit `.env`.

## License

Private and proprietary. © Meridian Logistics Properties. All rights reserved.
