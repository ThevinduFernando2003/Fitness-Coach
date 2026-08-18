# Implementation status and runbook

**Date:** 18 August 2026  
**Code status:** v1 implemented (timer backbone, plans, follow-check, on-device vision)

This document tracks how the frozen SRS maps onto the repo. Planning docs in this folder remain the source of requirements; this file records what shipped.

## How to run

Requires Node.js 20+ and Docker Desktop (PostgreSQL).

```powershell
Copy-Item .env.example .env
Copy-Item .env.example server/.env
npm install
npm run db:setup
npm run test
npm run dev
```

- UI: http://localhost:5173
- API health: http://localhost:4000/api/health

Do not commit `.env`. Video stays in the browser; the API stores counts, times, and scores only.

## Layout

| Path | Role |
|------|------|
| `shared/` | Catalog, plan schema, CSV/JSON import, `scoreCompliance`, MET calories, rule generator |
| `server/` | Express + Prisma + JWT (`/api/auth`, `/api/me`, `/api/catalog`, `/api/plans`, `/api/sessions`) |
| `client/` | React session UI, clocks, plan builder/import, MediaPipe overlay |
| `docker-compose.yml` | PostgreSQL 16 |

## Module checklist (from project plan)

| ID | Module | Status |
|----|--------|--------|
| M0 | Workspaces, Vite, Express, Postgres | Done |
| M1 | Auth + profile + disclaimer | Done |
| M2 | Exercise catalog + plan schema | Done |
| M3 | Rule generator + plan builder | Done |
| M4 | CSV/JSON upload + validation | Done |
| M5 | TimerEngine + session orchestrator | Done |
| M6 | Follow-check report (server-scored) | Done |
| M7 | MediaPipe skeleton overlay | Done |
| M8 | Yoga templates + hold timer | Done |
| M9 | Gym rep state machines + MET kcal | Done |
| M10 | Hybrid fallback (5s / deny / Use timer) | Done |
| M11 | Dashboard + history | Done |
| M12 | Disclaimer, settings, runbook | Done |

## Demo path

1. Register → onboarding (70 kg, beginner, mixed, 3 days, accept disclaimer)
2. Generate a plan **or** build one **or** import `docs/examples/sample-plan.csv`
3. Start a session — work/rest/elapsed clocks always run
4. Cover the camera → banner switches to timer; finish the set
5. Over-rest or skip → report is `partial` / `off_plan`, not 100%
6. Report shows MET calorie **estimate** and rest class

## Tests

```powershell
npm test
```

Covers compliance golden cases, MET fixture (70 kg × 2 min × MET 5 = 12.3 kcal), CSV validation, and generator schema 1.0.
