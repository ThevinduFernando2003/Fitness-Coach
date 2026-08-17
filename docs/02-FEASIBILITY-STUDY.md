# AI Personal Trainer — Feasibility Study

**Project:** AI Personal Trainer (Fitness-Coach)  
**Method:** TELOS (Technical, Economic, Legal, Operational, Schedule) plus risk register  
**Recommendation:** **Go**, with a constrained MVP (timer-first, vision on a closed exercise set)  
**Date:** 18 August 2026

---

## 1. Executive recommendation

The original pitch (React + Node + OpenCV + deep learning + unlimited pose recognition + ML calorie burn) is **only partly feasible** in one semester if taken literally.

A **feasible** product is:

- React + Node.js + PostgreSQL
- On-device MediaPipe pose (not a live OpenCV video server)
- Rule-based plan generation + file upload
- Always-on work/rest timers
- Follow-check (actual vs plan)
- Vision for a **fixed catalog** of yoga poses and bodyweight lifts
- Calories from **MET × body mass × time**

This is still an AI/CV project suitable for a sixth-semester viva. It is also demoable if the webcam fails.

**Decision:** Proceed. Do not proceed with custom GPU training as a dependency for the live demo.

---

## 2. What was asked vs what is feasible

| Pitch item | Literal reading | Feasible v1 |
|------------|-----------------|-------------|
| Yoga pose recognition | Any asana | 8–12 templates from landmarks + angles |
| Guided yoga + voice | Full TTS guru | On-screen cues + browser `speechSynthesis` |
| Gym object detection | Detect people/objects with YOLO | Pose landmarks + joint-angle state machine (more accurate for reps) |
| Rep counting | All gym machines | 5–6 bodyweight moves, side/45° camera |
| ML calorie burn | Model from video | MET formula; optional volume scaling |
| Camera integration | Required | Required for vision; **timer backup** if camera fails |
| Workout plan + follow-check | (your add-on) | Fully feasible; this should be the core |
| Plan upload with rest times | (your add-on) | Fully feasible (JSON/CSV) |

Object detection is the wrong primary tool for “is this a squat rep.” Pose estimation is the right tool. Using YOLO would add complexity without improving counting. The report can still discuss object detection as related work.

---

## 3. Technical feasibility

### 3.1 Frontend (high)

React + TypeScript + Vite is standard. The hard UI is the **live session**: overlay canvas, clocks, current exercise, compliance chips. This is well within a semester if the session is a dedicated module (see project plan M5).

### 3.2 Backend (high)

Node.js only needs:

- Auth
- User profile (for MET calories)
- Plan CRUD, generate, upload parse
- Session event ingest and report storage

No real-time video processing on the server in v1. That removes GPU hosting from the critical path.

### 3.3 Computer vision (medium — the main risk)

| Approach | Feasibility | Notes |
|----------|-------------|--------|
| MediaPipe Pose in browser | **High** | WASM, 30 FPS on a laptop, privacy-friendly |
| TensorFlow.js MoveNet | High | Alternative if MediaPipe packaging is painful |
| Python OpenCV + server WebRTC | Low for v1 | Latency, hosting, NAT, CPU |
| Train custom CNN from scratch | Low | Data, labels, GPU, time |
| Angle templates + small classifier | **High** | Best fit for yoga set |
| YOLO object detection for reps | Low value | Extra model, worse for form |

**Pose classification:** For a closed set, joint-angle rules beat a half-trained neural net. A tiny k-NN or logistic model on angles is optional extra credit.

**Rep counting:** Proven student-project pattern: hysteresis on one angle (down threshold / up threshold). Failure modes: side-on vs front-on camera, occlusion, fast reps, baggy clothes. Mitigation: onboarding overlay (“place camera 45°, full body in frame”) + timer fallback.

**Lighting / webcam:** Built-in laptop cameras are enough for a demo. Phone browsers work if `getUserMedia` is served over HTTPS (or localhost).

### 3.4 Plan generation (high)

Rule-based:

- Goal → template split (strength / yoga / mixed)
- Level → sets, rest, complexity
- Days/week → which days get sessions
- Duration → trim accessory blocks

LLM generation is **optional**. If used, the model must emit the **same JSON schema**; never parse free text into the timer. Feasible as a stretch goal, not a gate.

### 3.5 Follow-check (high)

This is deterministic software:

```
for each planned block:
  compare actual reps/hold/work_seconds
  compare actual rest_seconds
  record skip / reorder / mode (vision|timer)
→ weighted score
```

No research risk. Highest academic clarity for “did they follow the plan.”

### 3.6 Timer backup (high)

`requestAnimationFrame` or a single `setInterval` with `performance.now()` drift correction. Pause must freeze work and rest independently. Feasible in days, not weeks.

### 3.7 Overall technical score

**Feasible (7.5 / 10)** if vision catalog is frozen early.  
**Not feasible (4 / 10)** if the team waits on custom deep-learning training or live server-side OpenCV.

---

## 4. Economic feasibility

| Item | Student cost |
|------|----------------|
| React / Node / PostgreSQL / MediaPipe | Free |
| Hosting (optional): Render / Railway / Vercel + DB | $0–15 / month |
| Domain | Optional |
| Webcam | Already owned |
| GPU cloud for training | **Avoid** ($50–200+ wasted) |
| Commercial pose APIs | Not needed |

**Conclusion:** Economically feasible with near-zero budget. Do not make paid APIs a requirement.

---

## 5. Legal and ethical feasibility

| Issue | Handling |
|-------|----------|
| Camera = biometric-ish data | Process **on device**; do not upload video by default |
| Session logs | Store landmarks summary / counts, not raw video, unless user opts in for debug |
| Health claims | Prominent disclaimer: not medical advice; consult a professional |
| Injury | Collect injury flags; exclude unsafe moves in generator |
| Copyright of yoga names | Use common English names; no branded program names |
| Third-party models | MediaPipe license is permissive; keep attribution in README |
| GDPR-style | Account delete; no selling of pose data |

**Conclusion:** Feasible if video stays local and disclaimers are in the UI and report.

This is **not** a medical device. Do not claim diagnosis, rehab, or guaranteed calorie accuracy.

---

## 6. Operational feasibility

| Need | Reality |
|------|---------|
| User has a webcam or phone camera | Typical for the target demo |
| Space to step back | Must be in onboarding copy |
| Lighting | Demo room must be lit; app should warn on low confidence |
| Instructor / user follows UI | Rest timers and large type help |
| Team skills | React + Node expected; CV is learnable via MediaPipe docs |
| Deployment for viva | Localhost demo is enough; hosted demo is nicer |

**Operational risk:** Examiner laptop has no camera or blocks `getUserMedia`. **Timer backup makes the demo still work.** That is why the extra requirement is not optional — it is operational insurance.

---

## 7. Schedule feasibility

Typical sixth-semester window: **12–14 weeks**, 2–4 students (or 1 with a narrow MVP).

| Scope | Weeks | Verdict |
|-------|-------|---------|
| Timer + plans + upload + follow-check only | 6–8 | Very safe |
| Above + 2 yoga poses + squat/push-up | 10–12 | Safe |
| Full catalog in the project plan | 14 | Tight but doable |
| Custom DL training + live OpenCV server + mobile apps | 14 | **Not feasible** |

**Schedule score:** Feasible if the critical path is M2 → M5 → M6 (schema → timer session → compliance) and vision is parallel after week 6.

---

## 8. Alternative analysis

| Option | Pros | Cons | Choose? |
|--------|------|------|---------|
| A. Vision-only coach | Matches the original poster | Dies without camera; weak on rest/plans | No |
| B. Timer-only workout app | Easy | Weak CV story for the course | No (as final) |
| C. **Hybrid: plans + timer backbone + vision overlay** | Demo-proof, matches your extra notes | Must design one orchestrator | **Yes** |
| D. Native Android + Python CV | “More serious” CV | Two platforms, poor React story | No for v1 |

Option C is the only one that satisfies the original CV pitch **and** “timer as backup / upload plan / check following.”

---

## 9. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Pose count wrong in viva | M | H | Good lighting, 45° camera guide, ±1 rep tolerance, timer fallback |
| R2 | MediaPipe bundle / WASM issues | M | M | Spike in week 1; MoveNet as backup |
| R3 | Scope creep (“all gym exercises”) | H | H | Frozen catalog; unknown upload → timer_only |
| R4 | Calorie claims challenged | M | M | Show MET formula on screen |
| R5 | No camera on demo PC | M | H | Timer path in demo script first |
| R6 | Team splits UI and never integrates session | H | H | Vertical slice week 5: one timed squat set saved to DB |
| R7 | CSV upload edge cases | M | L | Schema validation + preview |
| R8 | Browser autoplay voice blocked | M | L | Visual cues primary; TTS optional |
| R9 | Privacy concern from lecturers | L | M | No video upload; architecture diagram in report |
| R10 | One member owns all CV and gets stuck | M | H | Timer product is independently shippable |

---

## 10. Resource requirements

### 10.1 Hardware

- Development PCs with webcam
- Phone for secondary browser test (HTTPS or localhost)
- Tripod or stack of books for camera height (demo)

### 10.2 Software

- Node.js LTS, Git, VS Code / Cursor
- PostgreSQL (local Docker or installer)
- Chrome or Edge (best `getUserMedia` + WASM)

### 10.3 Skills to acquire (week 1–2 spike)

- MediaPipe Pose Landmarker in JS
- Canvas overlay of landmarks
- Basic trigonometry on joints (dot product → angle)

No need for a full OpenCV course if live inference stays in the browser.

---

## 11. Cost-benefit (academic)

**Costs:** 14 weeks of engineering, a webcam, hosting optional.

**Benefits:**

- Clear software-engineering story (state machine, schema, compliance).
- Clear AI/CV story (landmarks, classification, counting).
- Unique angle vs generic “fitness CRUD app”: **did the user follow the plan, including rest.**
- Resilient demo.

**Benefit exceeds cost** under Option C.

---

## 12. Feasibility conclusions

| Dimension | Rating | Comment |
|-----------|--------|---------|
| Technical | Feasible with constraints | MediaPipe + rules; no custom GPU net |
| Economic | Feasible | Near-zero cost |
| Legal | Feasible with disclaimers | On-device video |
| Operational | Feasible | Timer saves the no-camera case |
| Schedule | Feasible if catalog is frozen | Cut poses before cutting follow-check |

**Final statement:** The project is feasible as a **plan-driven hybrid coach**. It is not feasible as an unbounded computer-vision research project in the same semester. Freeze the catalog, ship the timer and compliance engine first, then add vision on top.
