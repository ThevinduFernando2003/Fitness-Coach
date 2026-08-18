import { getExercise } from "./catalog.js";
import { PLAN_SCHEMA_VERSION, type PlanBlock, type WorkoutPlan } from "./types.js";

export type ValidateResult = { ok: true; plan: WorkoutPlan } | { ok: false; errors: string[] };

const MODES = new Set(["vision", "timer", "hybrid"]);
const METRICS = new Set(["reps", "hold_seconds", "work_seconds"]);

export function validatePlan(input: unknown, opts?: { allowUnknownKeys?: boolean }): ValidateResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { ok: false, errors: ["Plan must be a JSON object."] };
  const p = input as Record<string, unknown>;
  if (p.schema_version !== PLAN_SCHEMA_VERSION) errors.push(`schema_version must be "${PLAN_SCHEMA_VERSION}".`);
  if (typeof p.name !== "string" || !p.name.trim()) errors.push("name is required.");
  if (!Array.isArray(p.sessions) || p.sessions.length < 1) errors.push("sessions must be a non-empty array.");
  const sessions = Array.isArray(p.sessions) ? p.sessions : [];
  sessions.forEach((s, si) => {
    if (!s || typeof s !== "object") {
      errors.push(`sessions[${si}] is invalid.`);
      return;
    }
    const sess = s as Record<string, unknown>;
    const day = sess.day_index;
    if (typeof day !== "number" || day < 0 || day > 6) errors.push(`sessions[${si}].day_index must be 0–6.`);
    if (typeof sess.name !== "string" || !sess.name.trim()) errors.push(`sessions[${si}].name is required.`);
    if (!Array.isArray(sess.blocks) || sess.blocks.length < 1) {
      errors.push(`sessions[${si}].blocks must be a non-empty array.`);
      return;
    }
    (sess.blocks as unknown[]).forEach((b, bi) => validateBlock(b, `sessions[${si}].blocks[${bi}]`, errors, opts));
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, plan: input as WorkoutPlan };
}

function validateBlock(
  raw: unknown,
  path: string,
  errors: string[],
  opts?: { allowUnknownKeys?: boolean },
): void {
  if (!raw || typeof raw !== "object") {
    errors.push(`${path} is invalid.`);
    return;
  }
  const b = raw as PlanBlock;
  if (typeof b.exercise_key !== "string" || !b.exercise_key) errors.push(`${path}.exercise_key is required.`);
  else if (!getExercise(b.exercise_key) && !opts?.allowUnknownKeys) {
    errors.push(`${path}.exercise_key "${b.exercise_key}" is not in the catalog.`);
  }
  if (typeof b.sets !== "number" || b.sets < 1) errors.push(`${path}.sets must be ≥ 1.`);
  if (typeof b.rest_seconds !== "number" || b.rest_seconds < 0) errors.push(`${path}.rest_seconds is required.`);
  if (!METRICS.has(b.success_metric)) errors.push(`${path}.success_metric is invalid.`);
  if (!MODES.has(b.tracking_mode)) errors.push(`${path}.tracking_mode is invalid.`);
  if (b.success_metric === "reps" && !(typeof b.reps === "number" && b.reps >= 1)) {
    errors.push(`${path}.reps must be ≥ 1 when success_metric is reps.`);
  }
  if (b.success_metric === "hold_seconds" && !(typeof b.hold_seconds === "number" && b.hold_seconds >= 1)) {
    errors.push(`${path}.hold_seconds must be ≥ 1 when success_metric is hold_seconds.`);
  }
  if (b.success_metric === "work_seconds" && !(typeof b.work_seconds === "number" && b.work_seconds >= 1)) {
    errors.push(`${path}.work_seconds must be ≥ 1 when success_metric is work_seconds.`);
  }
}
