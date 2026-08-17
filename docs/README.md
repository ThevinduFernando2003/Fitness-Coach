# AI Personal Trainer — Planning pack

This folder is the v1 planning pack for the sixth-semester **AI Personal Trainer** project (React, Node.js, computer vision, plan follow-check).

The repository is otherwise greenfield. Implement against these documents; do not expand the vision catalog until the timer and compliance engine work.

| Document | What it is |
|----------|------------|
| [01-PROJECT-PLAN.md](./01-PROJECT-PLAN.md) | Product principles, architecture, session state machine, modules, 14-week timeline, demo script |
| [02-FEASIBILITY-STUDY.md](./02-FEASIBILITY-STUDY.md) | TELOS feasibility, what to cut, risks, go/no-go |
| [03-SOFTWARE-REQUIREMENTS-SPEC.md](./03-SOFTWARE-REQUIREMENTS-SPEC.md) | Functional and non-functional requirements (FR / NFR), APIs, compliance formula |
| [examples/workout-plan.schema.json](./examples/workout-plan.schema.json) | Canonical plan JSON Schema (generate, upload, session, follow-check) |
| [examples/sample-plan.json](./examples/sample-plan.json) | Example week with rest times and hybrid/timer blocks |
| [examples/sample-plan.csv](./examples/sample-plan.csv) | Example upload file |

## Product in one sentence

A **plan-driven** coach: clocks always run, camera helps when it can, and the app scores whether the user followed work *and* rest.

## Suggested build order

1. Schema + catalog + auth  
2. Timer session (no camera)  
3. Follow-check report  
4. Plan generate + CSV upload  
5. MediaPipe overlay  
6. Yoga holds + gym counters  
7. Hybrid fallback  

## Non-negotiables

- Timer backup if the camera fails  
- Uploaded plans include `rest_seconds` and work/hold/reps  
- Post-session compliance is computed, not guessed  
- Calories = MET formula, labeled as estimates  
