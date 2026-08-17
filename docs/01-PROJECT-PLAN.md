# AI Personal Trainer — Full Project Plan

**Project:** AI Personal Trainer (Fitness-Coach)  
**Type:** Sixth-semester academic project  
**Stack:** React, Node.js, computer vision (pose landmarks), timer-backed session engine  
**Status:** Greenfield (repository currently contains license only)  
**Date:** 18 August 2026

---

## 1. Purpose

Build a web app that acts as a **coach during the workout**, not only a catalog of exercises.

The product must:

1. Generate or accept a fitness plan (sets, reps, hold times, rest times).
2. Run the session with a **live timer always on**.
3. Use the camera for yoga pose feedback and gym rep counting **when reliable**.
4. Fall back to the timer when the camera fails, lighting is poor, or the exercise is not in the vision catalog.
5. After each block, **check whether the user followed the plan** (exercise order, volume, rest, duration).

The marketing vision (yoga guru, gym spotter, calorie estimates) is the north star. This plan scopes that vision into something a sixth-semester team can actually ship.

---

## 2. Problem statement

Typical fitness apps tell the user *what* to do. They do not know *whether* it was done.

| Gap today | What this project does |
|-----------|------------------------|
| Manual rep counting | Vision-based counters for a small, proven exercise set |
| Static yoga videos | Live keypoint feedback vs a target pose |
| Plans live in notes or PDFs | Structured plans with rest and work intervals |
| No proof of adherence | Session log vs prescribed plan → compliance score |
| Camera-only apps break in bad light | Timer is the always-available backup |

---

## 3. Product principles

1. **Timer is the backbone.** Computer vision is an enhancer, not a single point of failure.
2. **Plans are first-class data.** Every session is an instance of a plan (generated, built, or uploaded).
3. **Follow-check is automatic.** The app compares actual vs prescribed after every exercise and at session end.
4. **Honesty over hype.** Calorie numbers use MET tables + user body data, not a fake “ML from pixels” claim.
5. **Safety first.** Not a medical device. Disclaimer, skip controls, and no form advice for contraindicated conditions.

---

## 4. Users and goals

| Persona | Goal | How the app helps |
|---------|------|-------------------|
| Beginner at home | Learn form, not skip rest | Yoga assist + rest timers + compliance |
| Gym / bodyweight user | Count reps and finish the plan | Gym assist + rest clock + volume check |
| Planner (self-coach) | Bring an existing program in | Upload / builder with rest and work times |
| Evaluator (lecturer) | See a complete, demoable system | Auth → plan → live session → report |

Out of scope for v1: live human trainer, wearables, nutrition logging, social feed, native iOS/Android stores.

---

## 5. Feature map

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Personal Trainer                      │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Plans       │  Session     │  Vision      │  Follow-check      │
│  generate    │  orchestrator│  yoga poses  │  live vs plan      │
│  upload      │  work timer  │  gym reps    │  rest discipline   │
│  build       │  rest timer  │  form cues   │  session report    │
│  catalog     │  fallback    │  calories*   │  history           │
└──────────────┴──────────────┴──────────────┴────────────────────┘
 *calories = MET × body mass × time (optionally adjusted by completed volume)
```

### 5.1 Yoga Assist

- Webcam + pose landmarks (33-point skeleton).
- Classify a **closed set** of asanas from joint angles (not “any yoga pose in the world”).
- Compare current angles to a reference template → form score + cue (“straighten left knee”).
- **Hold timer** for the prescribed seconds. Vision confirms the pose is held; if landmarks drop, the hold timer **pauses** and the work clock still runs.
- Guided session = plan of poses with hold + rest.

### 5.2 Gym Assist

- Rep counting via a **state machine** on a primary joint angle (e.g. squat: hip/knee flexion → extension).
- Supported MVP set: squat, push-up, lunge, jumping jack, sit-up/crunch, plank (hold, not reps).
- Verbal/on-screen count, lockout detection, cheap form flags (depth, elbow bend).
- Calorie estimate after the set using MET for that exercise, user weight, and **actual work time**.

### 5.3 Timer as backup (“times going”)

The session always shows:

| Clock | Meaning |
|-------|---------|
| Work remaining | Countdown for the current set/hold (from the plan) |
| Rest remaining | Countdown between sets/exercises |
| Elapsed session | Total time since Start |
| Set / exercise index | e.g. Squat 3/4 · Exercise 5/12 |

**Vision mode** still uses these clocks. **Timer mode** uses them as the only coach.

Automatic fallback to timer-only when:

- Camera permission denied or device has no camera.
- Pose confidence below threshold for N consecutive seconds.
- Exercise is tagged `tracking: timer_only` in the catalog (e.g. dumbbell curl, treadmill).
- User taps **Use timer**.

Manual override: user can force timer or retry camera at any rest break.

### 5.4 Workout plan generation

From onboarding (goal, level, days/week, duration, equipment: none / home / gym, injuries):

- Rule-based generator (v1 — reliable for a semester).
- Optional LLM rewrite later (v2) with the same JSON schema so the rest of the app does not change.

Output: a week of sessions. Each session is a list of **blocks** (see schema in `docs/examples/workout-plan.schema.json`).

### 5.5 Upload a fitness plan

User uploads JSON or CSV (Excel export as CSV). Required columns:

`day, session_name, exercise_key, mode, sets, reps, work_seconds, rest_seconds, notes`

- Validate against the exercise catalog.
- Unknown `exercise_key` → import as **timer-only** with a warning (user can remap).
- Preview → confirm → save as a plan the session engine can run.

In-app **plan builder** is the same schema without a file.

### 5.6 Follow-check (are they following?)

**During the session (live):**

- Highlight current vs next exercise.
- Show prescribed vs actual reps / hold seconds.
- Flag rest: too short / on target / too long (grace window, e.g. ±20%).
- Skip, swap, or pause — all recorded as deviations.

**After the session (report):**

| Metric | How it is computed |
|--------|--------------------|
| Completion | Finished exercises / planned exercises |
| Volume adherence | Actual reps (or hold seconds) / prescribed, capped so overshoot does not hide skips |
| Rest discipline | 1 − mean(\|actual_rest − planned_rest\| / planned_rest), clamped 0–1 |
| Order fidelity | Penalty if exercises were skipped or reordered |
| Form quality | Mean vision form score when camera was used; omitted for timer-only sets |
| Overall compliance | Weighted blend (default: 35% completion, 25% volume, 20% rest, 10% order, 10% form) |

Status per block: `followed` | `partial` | `skipped` | `timer_fallback` | `modified`.

---

## 6. Recommended architecture

Prefer **on-device pose** in the browser. Sending live video to Node/OpenCV is slower, costlier, and worse for privacy.

```
┌────────────── React (Vite + TypeScript) ──────────────┐
│  Pages: Auth, Onboarding, Plans, Live Session, Report │
│  SessionOrchestrator  →  TimerEngine  →  UI clocks    │
│  PoseWorker (MediaPipe WASM) → PoseClassifier/Counter │
│  ComplianceTracker (actual vs plan events)            │
└──────────────┬────────────────────────────────────────┘
               │ REST JSON (plans, sessions, users)
┌──────────────▼──────── Node.js (Express) ─────────────┐
│  Auth JWT · Plan CRUD · Session ingest · Reports      │
│  Plan generator (rules) · Catalog · Upload parser     │
└──────────────┬────────────────────────────────────────┘
               │
         PostgreSQL (or MongoDB)
```

| Layer | Choice | Why |
|-------|--------|-----|
| UI | React + TypeScript | Course stack, fast session UI |
| Pose | MediaPipe Pose Landmarker in a Web Worker | Real-time, no GPU server |
| API | Node.js + Express | Course stack, plan/session APIs |
| DB | PostgreSQL | Relational plans, sessions, compliance |
| Optional later | Python + OpenCV | Offline research / extra classifier — not on the live path for v1 |

---

## 7. Session state machine

This is the heart of the product. Vision and timer are **adapters** under the same states.

```
IDLE
  → load plan → READY
READY
  → user Start → BLOCK_WORK
BLOCK_WORK
  → prescribed volume or work_seconds done → BLOCK_REST
  → user Skip → record skip → next block or COMPLETE
  → landmarks lost → still in BLOCK_WORK, tracking_mode = timer
BLOCK_REST
  → rest_seconds elapsed (or user “Next”) → next BLOCK_WORK or COMPLETE
PAUSED (from WORK or REST)
COMPLETE → write session + compliance report
ABANDONED → partial report
```

Each block in the plan has:

- `tracking_mode`: `vision` | `timer` | `hybrid` (vision if possible, else timer)
- `success_metric`: `reps` | `hold_seconds` | `work_seconds`

---

## 8. Exercise catalog (MVP)

Vision-backed (hybrid):

| key | type | success metric | primary signal |
|-----|------|----------------|----------------|
| squat | gym | reps | knee/hip angle cycle |
| push_up | gym | reps | elbow angle cycle |
| lunge | gym | reps | front-knee angle |
| jumping_jack | gym | reps | wrist/ankle spread |
| crunch | gym | reps | torso angle |
| plank | gym / yoga | hold_seconds | body line + hold |
| mountain | yoga | hold_seconds | posture template |
| downward_dog | yoga | hold_seconds | template |
| warrior_ii | yoga | hold_seconds | template |
| tree | yoga | hold_seconds | template |
| cobra | yoga | hold_seconds | template |
| chair | yoga | hold_seconds | template |
| triangle | yoga | hold_seconds | template |
| child | yoga | hold_seconds | template |

Everything else: `timer` with `work_seconds` + `rest_seconds`.

---

## 9. Calorie estimation (honest method)

Do **not** train a neural net to “see calories.” That is not defensible in a viva.

Use the standard MET method:

```
kcal = MET × 3.5 × weight_kg / 200 × minutes_worked
```

- MET comes from the catalog (e.g. bodyweight squat ~5.0, hatha yoga ~2.5, plank ~3.8).
- `minutes_worked` is **actual work time** from the timer (rest excluded).
- Optional v1.1: scale by `min(1, actual_reps / planned_reps)` so skipped volume reduces calories.

Show the formula in the UI so evaluators see it is engineered, not magicked.

---

## 10. Module breakdown (work packages)

| ID | Module | Deliverable |
|----|--------|-------------|
| M0 | Repo, Vite React, Express, DB, CI scripts | Runnable hello-world + API health |
| M1 | Auth + profile (age, sex, height, weight, level, goal) | Register / login / me |
| M2 | Exercise catalog + plan JSON schema | Seed data |
| M3 | Plan generator (rules) + plan builder UI | Create week plan |
| M4 | Plan upload (CSV/JSON) + validation | Import flow |
| M5 | TimerEngine + SessionOrchestrator (no camera) | Full timed workout |
| M6 | ComplianceTracker + session report | Follow-check without vision |
| M7 | MediaPipe worker + skeleton overlay | Live landmarks |
| M8 | Yoga classifier + cues + hold timer | Yoga Assist demo |
| M9 | Gym rep state machines | Gym Assist demo |
| M10 | Hybrid fallback (vision ↔ timer) | Robust live session |
| M11 | Dashboard / history | Past sessions + trends |
| M12 | Disclaimer, settings, docs, demo script | Submission-ready |

**Critical path:** M2 → M5 → M6. Vision (M7–M10) layers on top. If vision slips, the timed plan + follow-check is still a complete product.

---

## 11. Timeline (14 weeks)

Assume one semester, ~14 working weeks.

| Week | Focus | Exit criteria |
|------|--------|----------------|
| 1 | M0 setup, schema, this spec frozen | Both apps run locally |
| 2 | M1 auth + profile | User can log in |
| 3 | M2–M3 catalog + generator | A plan exists in DB |
| 4 | M4 upload + builder | CSV import works |
| 5 | M5 timer session | Full workout with rest clocks |
| 6 | M6 compliance report | Score matches a scripted session |
| 7 | M7 pose overlay | Skeleton on webcam |
| 8 | M8 two yoga poses + holds | Tree + downward dog demo |
| 9 | M8 remaining yoga set | 8 asanas classified |
| 10 | M9 squat + push-up counters | Counts within ±1 on 10 reps |
| 11 | M9 other gym moves + calories | MET shown on report |
| 12 | M10 fallback + polish | Camera off still completes plan |
| 13 | M11 dashboard, bug bash | Demo path under 8 minutes |
| 14 | M12 report, viva slides, freeze | Tagged release |

Buffer: if vision is late, **cut yoga to 4 poses and gym to squat + push-up + plank**. Do not cut timer or compliance.

---

## 12. Team roles (suggested)

| Role | Owns |
|------|------|
| Backend | Auth, plans, upload parser, session ingest, generator |
| Frontend / session | Orchestrator, timers, plan UI, reports |
| Vision | MediaPipe, classifiers, counters, overlay |
| QA / docs | Test cases, demo script, SRS traceability |

Even if one person builds it, treat these as **workstreams** so nothing is “we’ll add follow-check later.”

---

## 13. Testing strategy

| Layer | What to test |
|-------|----------------|
| Unit | Timer ticks, rest math, compliance weights, CSV parser, MET calories |
| Vision | Recorded videos: 10-rep squat, 10 push-ups, 20s tree pose (pass/fail table) |
| E2E | Login → generate plan → run timer session without camera → report saved |
| Fallback | Start with camera, cover lens, confirm switch to timer and session still completes |
| Upload | Valid CSV, missing columns, unknown exercise, rest_seconds = 0 |

Acceptance targets (demo):

- Timer drift &lt; 1 s over a 10-minute session.
- Squat/push-up count error ≤ 1 rep in good lighting, side or 45° camera.
- Yoga hold: pose recognized within 2 s; form cues appear when knee/elbow off by &gt; 15°.
- Compliance: scripted skip + long rest produces `partial` / rest warning, not 100%.

---

## 14. Demo script (viva)

1. Register, enter 70 kg, beginner, “build consistency”, 3 days/week.
2. Generate a plan. Show rest and work times on a day.
3. Upload a tiny CSV that overrides Tuesday.
4. Start session **with camera**: 8 squats. Show count + work clock.
5. Cover camera → auto timer fallback → finish the set on the clock.
6. Rest timer runs 30 s; wait extra → rest flagged long.
7. Skip last exercise.
8. Open report: volume, rest discipline, skipped item, calories, overall score.

That single path proves every extra requirement you asked for.

---

## 15. What we will not build in v1

- Custom trained CNN from scratch for “all sports.”
- Server-side live OpenCV on raw video.
- Medical diagnosis, injury prediction, dietitian AI.
- Wearable HR integration.
- Multi-user live class.
- Native mobile stores (responsive web + camera is enough).

These can appear in the report as **future work**.

---

## 16. Success definition

The project is a success if a user can:

1. Get or upload a plan with **work and rest times**.
2. Be coached through it with **clocks always running**.
3. Get vision help on the MVP exercise set.
4. Finish without a camera via **timer backup**.
5. See a report that **truthfully** says whether they followed the plan.

That is the product. Everything else is polish.
