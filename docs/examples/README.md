# Plan file examples

These files are the contract between **generate**, **builder**, **upload**, the **session engine**, and **follow-check**. If a field is not in the schema, the timer cannot enforce it.

| File | Use |
|------|-----|
| `workout-plan.schema.json` | Validate JSON uploads and generator output |
| `sample-plan.json` | Human-readable week (strength, yoga, timer cardio) |
| `sample-plan.csv` | Same idea as a spreadsheet export |

## CSV → JSON mapping

| CSV column | JSON field | Notes |
|------------|------------|--------|
| `day` | `sessions[].day_index` | 0 = Monday … 6 = Sunday |
| `session_name` | `sessions[].name` | Rows with the same `day` + name merge into one session |
| `exercise_key` | `blocks[].exercise_key` | Must match catalog, or import as timer after confirm |
| `mode` | `blocks[].tracking_mode` | `vision` / `timer` / `hybrid` |
| `sets` | `blocks[].sets` | Integer ≥ 1 |
| `reps` | `blocks[].reps` | `0` if not a rep exercise |
| `work_seconds` | `blocks[].work_seconds` | Timed work; `0` if unused |
| `hold_seconds` | `blocks[].hold_seconds` | Yoga/plank holds; `0` if unused |
| `rest_seconds` | `blocks[].rest_seconds` | Rest after the set — **required for follow-check** |
| `notes` | `blocks[].notes` | Optional |

Importer sets `success_metric` to `reps` if `reps > 0`, else `hold_seconds` if `hold_seconds > 0`, else `work_seconds`. Exactly one of those three must be &gt; 0.

## Follow-check uses these times

During a session the engine records actual work, hold, reps, and rest. The report compares them to these prescribed values. If `rest_seconds` is missing, upload must fail validation — otherwise “is the user following rest?” cannot be answered.
