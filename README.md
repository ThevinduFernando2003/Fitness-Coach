# AI Personal Trainer

Plan-driven fitness coach: **React** + **Node.js** + on-device pose. Clocks always run. The camera helps when it can. After each workout the app scores whether you followed **work and rest**.

Planning pack: [docs/README.md](./docs/README.md)

## What you can do

- Register, set body data, accept the health disclaimer
- Generate a week plan, or upload CSV/JSON with rest times
- Run a live session with work / rest / elapsed clocks
- Yoga pose holds and gym rep counting (MediaPipe in the browser)
- Automatic **timer fallback** if the camera is denied or pose is lost for 5 seconds
- Follow-check report (completion, volume, rest discipline, estimated kcal)

Calories use `MET × 3.5 × kg / 200 × minutes worked` and are labeled as estimates. Video never leaves the device.

## Run locally

Requires Node.js 20+ and Docker (for PostgreSQL).

```bash
cp .env.example .env
cp .env.example server/.env
npm install
npm run db:setup
npm run test
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000/api/health

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
Copy-Item .env.example server/.env
npm install
npm run db:setup
npm run dev
```

`db:setup` starts Postgres, runs Prisma migrations, and seeds the exercise catalog.

## Demo path

1. Register (example: 70 kg, beginner, mixed, 3 days/week)
2. Generate a plan, [build one](http://localhost:5173/plans/new), or import [docs/examples/sample-plan.csv](docs/examples/sample-plan.csv)
3. Start Monday — clocks count even with the camera covered
4. Skip or over-rest to see a non-perfect follow-check score
