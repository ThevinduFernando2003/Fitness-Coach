# Software Requirements Specification  
## AI Personal Trainer (Fitness-Coach)

**Version:** 1.0  
**Date:** 18 August 2026  
**Audience:** Development team, supervisors, examiners  
**Related:** [Project Plan](./01-PROJECT-PLAN.md), [Feasibility Study](./02-FEASIBILITY-STUDY.md)

---

## 1. Introduction

### 1.1 Purpose

This SRS specifies functional and non-functional requirements for the AI Personal Trainer: a web application that generates or imports workout plans, runs live sessions with computer-vision assistance and a timer backup, and checks whether the user followed the prescribed work and rest times.

### 1.2 Scope

**In scope (v1):**

- User accounts and fitness profile
- Exercise catalog
- Rule-based workout plan generation
- Manual plan builder
- Plan upload (JSON, CSV) including rest and work times
- Live session orchestrator with work timer, rest timer, and elapsed time
- Yoga assist: pose landmarks, closed-set pose recognition, hold timing, form cues
- Gym assist: closed-set repetition counting, basic form flags, calorie estimate (MET)
- Automatic and manual fallback from vision to timer
- Live and post-session follow-check (compliance)
- Session history and a simple dashboard

**Out of scope (v1):** native store apps, wearables, nutrition, social network, custom GPU-trained models as a runtime dependency, uploading raw video to the server by default, medical diagnosis.

### 1.3 Definitions

| Term | Meaning |
|------|---------|
| Plan | A named collection of sessions (usually a week) |
| Session | One workout: ordered blocks the user performs now |
| Block | One exercise prescription: sets × (reps or seconds) + rest |
| Work clock | Countdown or count-up while the user should be exercising |
| Rest clock | Countdown between sets or exercises |
| Tracking mode | `vision`, `timer`, or `hybrid` |
| Follow-check | Comparison of actual performance to the plan |
| Compliance score | Weighted 0–100 summary of follow-check |
| Landmark | A body keypoint from the pose model (e.g. left knee) |
| MET | Metabolic equivalent used for calorie estimation |

### 1.4 References

- Project plan and feasibility study in `/docs`
- Workout plan JSON Schema: `docs/examples/workout-plan.schema.json`
- MediaPipe Pose Landmarker documentation (runtime reference)

---

## 2. Overall description

### 2.1 Product perspective

Standalone web system: React client + Node.js API + relational database. Pose inference runs in the browser. The API never needs the video stream for v1.

### 2.2 User classes

| ID | Class | Description |
|----|--------|-------------|
| U1 | Athlete | Primary user; trains with plans and camera/timer |
| U2 | Guest demo | Optional: limited session without saving (stretch) |
| U3 | Admin | Seed catalog, not a public admin panel in v1 (developer via seed scripts) |

v1 implements U1 fully. U2 is optional.

### 2.3 Operating environment

- Desktop Chrome/Edge; Firefox best-effort
- Laptop or phone camera for vision mode
- Local development: HTTP localhost
- Deployed demo: HTTPS required for camera

### 2.4 Constraints

- Semester delivery (~14 weeks)
- No paid CV APIs required
- Video processed on device
- Not a medical device

### 2.5 Assumptions

- User can position a camera to see the full body for vision exercises
- User provides honest body-mass data for calorie estimates
- Uploaded plans use catalog keys or accept timer-only mapping

---

## 3. System features and functional requirements

Requirements are numbered **FR-x**. Priority: **M** must, **S** should, **C** could.

### 3.1 Account and profile

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-1 | M | User shall register with email and password. |
| FR-2 | M | User shall log in and receive a session (JWT or equivalent). |
| FR-3 | M | User shall create a profile: display name, age, sex, height, weight, fitness level, primary goal, training days per week, session duration preference, equipment (`none` / `home` / `gym`), optional injury notes. |
| FR-4 | M | User shall update profile fields that affect plans and calories. |
| FR-5 | S | User shall delete their account and associated plans/sessions. |
| FR-6 | M | Unauthenticated users shall not access plans or session APIs. |

### 3.2 Exercise catalog

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-10 | M | System shall maintain a catalog of exercises with: `key`, display name, discipline (`yoga` / `gym` / `other`), default `tracking_mode`, `success_metric` (`reps` / `hold_seconds` / `work_seconds`), default MET, optional cue text, whether vision is supported. |
| FR-11 | M | Catalog shall include at least the MVP vision set listed in the project plan (8 yoga + 6 gym/bodyweight). |
| FR-12 | M | Exercises not vision-supported shall default to `timer`. |

### 3.3 Plan generation

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-20 | M | Given a complete profile, the system shall generate a weekly plan of sessions matching days/week and duration. |
| FR-21 | M | Generated blocks shall include exercise key, sets, reps and/or work_seconds, rest_seconds, and tracking_mode. |
| FR-22 | M | Generator shall prefer catalog exercises compatible with stated equipment and shall avoid exercises listed in injury notes when a mapping exists (e.g. skip jump squats if “knee pain”). |
| FR-23 | S | User shall regenerate a plan without deleting session history. |
| FR-24 | C | Optional LLM may fill the same schema; invalid JSON shall be rejected. |

### 3.4 Plan builder and upload

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-30 | M | User shall create and edit a plan in the UI (add/remove/reorder blocks, edit sets, reps, work_seconds, rest_seconds). |
| FR-31 | M | User shall upload a plan as JSON conforming to the published schema. |
| FR-32 | M | User shall upload a plan as CSV with headers: `day, session_name, exercise_key, mode, sets, reps, work_seconds, hold_seconds, rest_seconds, notes`. Unused metric columns shall be `0`. |
| FR-33 | M | Upload shall be validated before save. Missing required timing fields shall be rejected with row-level errors. |
| FR-34 | M | Unknown `exercise_key` shall not abort the whole file; those rows shall import as timer-only **after user confirmation**, with a warning list. |
| FR-35 | M | User shall preview parsed sessions (including rest times) before confirming import. |
| FR-36 | S | User shall download a plan as JSON or CSV (round-trip). |

### 3.5 Live session — orchestrator and timers

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-40 | M | User shall start a session from a chosen plan day/session. |
| FR-41 | M | System shall show **work remaining**, **rest remaining**, **elapsed session time**, current exercise name, set index, and next exercise. |
| FR-42 | M | Work clock shall follow the block’s `success_metric`: countdown `work_seconds` / `hold_seconds`, or count-up while reps accrue. |
| FR-43 | M | When a set completes, the rest clock shall start from `rest_seconds`. When rest completes, the next set or next block shall begin (auto-advance, with a 3-second optional “get ready” — S). |
| FR-44 | M | User shall pause and resume; both work and rest clocks shall freeze while paused. |
| FR-45 | M | User shall skip a set or block; the skip shall be recorded for follow-check. |
| FR-46 | M | User shall end the session early; a partial report shall be saved. |
| FR-47 | M | Timers shall use a monotonic clock (`performance.now` or equivalent) so background tab drift is minimized; remaining error over 10 minutes shall be &lt; 1 second when the tab is visible. |
| FR-48 | S | Optional spoken cues: “rest”, “next: squat”, rep count. Visual cues remain primary. |

### 3.6 Timer backup and hybrid tracking

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-50 | M | If camera permission is denied or no device exists, the session shall still run entirely on timers. |
| FR-51 | M | If pose confidence stays below threshold for **5 seconds** during a vision block, tracking_mode for that set shall switch to `timer` and the user shall be notified. |
| FR-52 | M | User shall manually switch a block to timer or retry camera during rest. |
| FR-53 | M | Blocks tagged `timer` in the catalog/plan shall never require a camera. |
| FR-54 | M | Fallback events shall be stored (`timer_fallback`) for the report. |

### 3.7 Yoga Assist

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-60 | M | With camera permission, the client shall estimate body landmarks and overlay a skeleton on the video. |
| FR-61 | M | System shall classify the current pose among the yoga catalog when the user is in a yoga block (or show “unknown / adjust”). |
| FR-62 | M | System shall compute a form score by comparing joint angles to a reference template. |
| FR-63 | M | If an angle error exceeds 15°, the UI shall show a specific cue (e.g. “bend front knee more”). |
| FR-64 | M | Hold timer shall increment only while the classified pose matches the prescribed pose **and** form score ≥ configured minimum (default 60%). |
| FR-65 | M | If the user leaves the pose, hold accumulation shall pause; the work clock (wall time for the block) may still run as configured (default: wall work clock continues, hold pauses — show both). |
| FR-66 | S | Guided list of asanas from the plan with next-pose preview. |

### 3.8 Gym Assist

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-70 | M | For vision gym blocks, the system shall count repetitions using a joint-angle state machine with hysteresis (up/down thresholds). |
| FR-71 | M | The on-screen count shall update within one frame of a completed rep (perceived instant). |
| FR-72 | M | A set shall complete when actual reps ≥ prescribed reps **or** the user taps complete. |
| FR-73 | S | Basic form flags: e.g. squat depth not reached; push-up elbows not bent enough — shown as warnings, not blocking the count if a full cycle is detected (document the rule per exercise). |
| FR-74 | M | Plank shall use hold_seconds like yoga, not reps. |
| FR-75 | M | After each session, calories shall be estimated with `kcal = MET × 3.5 × weight_kg / 200 × minutes_worked` using catalog MET and **actual work time excluding rest**. |
| FR-76 | S | Calories per block listed on the report. |
| FR-77 | M | UI shall label calories as **estimate**, not measurement. |

### 3.9 Follow-check (live and post-session)

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-80 | M | During a block, UI shall show prescribed vs actual (reps or seconds). |
| FR-81 | M | Rest shall be classified: `short` if actual_rest &lt; 80% of planned, `ok` if 80–120%, `long` if &gt; 120% (configurable). |
| FR-82 | M | Live rest status shall be visible on the rest clock. |
| FR-83 | M | At session end the system shall persist a report: per-block planned vs actual, tracking mode, skips, rest class, form average if any, calories, overall compliance 0–100. |
| FR-84 | M | Default compliance weights: completion 35%, volume 25%, rest 20%, order 10%, form 10%. If no vision data, form weight shall redistribute proportionally to the other four. |
| FR-85 | M | Overall status bands: 0–49 `off_plan`, 50–79 `partial`, 80–100 `followed` (labels in UI). |
| FR-86 | M | Skipped blocks shall count as 0 volume for that block and reduce completion. |
| FR-87 | S | User shall add a short session note. |
| FR-88 | M | User shall open any past report from history. |

### 3.10 Dashboard and history

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-90 | M | Dashboard shall list upcoming plan session and last 5 session scores. |
| FR-91 | S | Simple weekly chart: compliance scores and minutes trained. |
| FR-92 | S | Totals: sessions completed, estimated calories (week). |

### 3.11 Safety and UX copy

| ID | Pri | Requirement |
|----|-----|-------------|
| FR-100 | M | First-run and session start shall show a health disclaimer the user must acknowledge once per account. |
| FR-101 | M | Camera onboarding shall show framing instructions (full body, 45° or side, lighting). |
| FR-102 | S | Low landmark confidence shall show “We can’t see you clearly — using timer”. |

---

## 4. External interfaces

### 4.1 User interfaces (minimum screens)

1. Register / Login  
2. Onboarding profile  
3. Dashboard  
4. Plans list / generate / builder  
5. Upload + validation preview  
6. Live session (video + overlay + clocks + compliance chips)  
7. Session report  
8. History  
9. Settings (profile, camera test, disclaimer)

### 4.2 API (logical)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET/PUT | `/api/me` | Profile |
| GET | `/api/catalog` | Exercises |
| POST | `/api/plans/generate` | Generate week |
| GET/POST | `/api/plans` | List / create |
| GET/PUT/DELETE | `/api/plans/:id` | CRUD |
| POST | `/api/plans/import` | JSON/CSV import |
| GET | `/api/plans/:id/export` | Export |
| POST | `/api/sessions` | Start / save completed session + events |
| GET | `/api/sessions` | History |
| GET | `/api/sessions/:id` | Report |

Exact paths may change; resources shall not.

### 4.3 Plan schema

Canonical JSON Schema lives at `docs/examples/workout-plan.schema.json`. All generators, builders, and importers shall emit/accept it.

### 4.4 Camera

- `getUserMedia({ video: true })`
- Pose model loaded from local or CDN assets
- No video bytes in REST payloads (v1)

---

## 5. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | Pose overlay ≥ 20 FPS on a mid-range laptop with other UI visible. |
| NFR-2 | Performance | API p95 &lt; 300 ms on local LAN for CRUD excluding import of huge files. |
| NFR-3 | Accuracy | Squat and push-up counts within ±1 of ground truth for 10 controlled reps, good light, 45° camera (documented test videos). |
| NFR-4 | Accuracy | Yoga pose among catalog: top-1 correct when held 3 s in template stance (per-pose test sheet). |
| NFR-5 | Reliability | Session completes with no camera; no uncaught exception on permission deny. |
| NFR-6 | Usability | Primary clocks readable from 2 m (large type). One tap pause/skip. |
| NFR-7 | Security | Passwords hashed (bcrypt/argon2); JWT secret not in client; HTTPS in production. |
| NFR-8 | Privacy | Default: no raw video stored. Logs are counts, times, optional landmark snapshots only if debug flag. |
| NFR-9 | Accessibility | Keyboard pause/skip; captions for spoken cues; color not the only rest-status signal. |
| NFR-10 | Maintainability | TypeScript on client; documented catalog and schema. |
| NFR-11 | Portability | Windows and macOS dev; Chromium browsers for the graded demo. |
| NFR-12 | Honesty | Calorie UI always says “estimated”. |

---

## 6. Data requirements (logical model)

**User:** identity, profile fields, disclaimerAcceptedAt  

**Exercise:** catalog fields in FR-10  

**Plan:** id, userId, name, source (`generated` / `uploaded` / `built`), createdAt  

**PlanSession:** planId, dayIndex, name  

**PlanBlock:** sessionId, order, exerciseKey, sets, reps, workSeconds, restSeconds, trackingMode, notes  

**WorkoutSession:** userId, planSessionId, startedAt, endedAt, status (`complete` / `abandoned`), complianceScore, kcalEstimate, trackingSummary  

**BlockResult:** workoutSessionId, planBlockId, actualReps, actualWorkSeconds, actualHoldSeconds, actualRestSeconds, restClass, trackingModeUsed, skipped, formScoreAvg, fallbackOccurred  

**SessionEvent (optional audit):** timestamp, type (`rep` / `pose_enter` / `fallback` / `skip` / `pause`)

---

## 7. Compliance scoring (normative)

Let each planned block *i* have weight 1.

- **Completion** = (blocks not skipped) / (blocks planned).  
- **Volume** for block *i* = min(1, actual_metric / planned_metric); skipped → 0. Session volume = mean over blocks.  
- **Rest** for block *i* = max(0, 1 − |actual_rest − planned_rest| / max(planned_rest, 1)). Ignore rest after the last block. Session rest = mean.  
- **Order** = 1 if performed order matches plan among non-skipped blocks, else 0.7 if only swaps of adjacent blocks, else 0.4 if any other reorder.  
- **Form** = mean of available form scores / 100, or omitted.

```
score = 100 * (0.35*completion + 0.25*volume + 0.20*rest + 0.10*order + 0.10*form)
```

If form omitted, renormalize the four remaining weights to sum to 1.

This formula is **normative for v1** so QA can unit-test it.

---

## 8. Use cases (brief)

**UC-1 Generate and follow with camera**  
Athlete onboards → generate plan → start today’s session → camera counts squats → rest clock → next block → report shows `followed`.

**UC-2 Upload plan and timer-only**  
Athlete uploads CSV with rest times → confirms unknown row as timer → runs session without camera → report compares actual rest vs CSV rest.

**UC-3 Fallback mid-set**  
During push-ups, lighting fails → after 5 s switch to timer → athlete finishes remaining work on the clock → report marks `timer_fallback`, volume still counted via timer completion.

**UC-4 Not following**  
Athlete skips two blocks and rests 3× prescribed → report `off_plan` or `partial`, rest `long`, completion reduced.

---

## 9. Quality assurance mapping

| Requirement cluster | Test idea |
|---------------------|-----------|
| FR-31–35 | Golden CSV + invalid CSV fixtures |
| FR-40–47 | Simulated clock in unit tests |
| FR-50–54 | E2E with camera mocked denied |
| FR-60–65 | Recorded video clips |
| FR-70–75 | Recorded 10-rep clips + MET fixture (70 kg, 2 min work) |
| FR-80–86 | Scripted BlockResult JSON → expected score |

---

## 10. Traceability to the original brief

| Brief theme | SRS |
|-------------|-----|
| Yoga pose recognition | FR-60–66 |
| Guided yoga | FR-40, FR-66 |
| Gym rep counting | FR-70–74 |
| Calorie estimation | FR-75–77 |
| React + Node | §2.1, §4.2 |
| Camera | FR-50, FR-60, FR-101 |
| Timer backup | FR-41–54 |
| Generate workout plan | FR-20–24 |
| Upload plan with rest/times | FR-30–36 |
| Check user is following | FR-80–88 |

---

## 11. Open points (resolved defaults)

| Topic | Default for v1 |
|-------|----------------|
| Database | PostgreSQL |
| Auth | JWT |
| Voice | Optional Web Speech API |
| Guest mode | Not required |
| Mobile native | No |
| Server OpenCV | No on live path |
| LLM plans | Could (FR-24), not must |

Changes to these defaults require an SRS revision note, not silent drift.
