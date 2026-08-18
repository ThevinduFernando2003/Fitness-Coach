import { getExercise } from "./catalog.js";
import { PLAN_SCHEMA_VERSION, type FitnessLevel, type PlanBlock, type TrackingMode, type UserProfile, type WorkoutPlan } from "./types.js";

type TemplateKey = "squat" | "push_up" | "lunge" | "plank" | "jumping_jack" | "crunch" | "mountain" | "downward_dog" | "warrior_ii" | "tree" | "cobra" | "chair" | "child" | "march_in_place";

function block(key: TemplateKey, overrides: Partial<PlanBlock> = {}): PlanBlock {
  const ex = getExercise(key)!;
  const base: PlanBlock = {
    exercise_key: key,
    sets: 1,
    rest_seconds: ex.defaultRest,
    success_metric: ex.successMetric,
    tracking_mode: (ex.visionSupported ? "hybrid" : "timer") as TrackingMode,
  };
  if (ex.successMetric === "reps") base.reps = ex.defaultReps;
  if (ex.successMetric === "hold_seconds") base.hold_seconds = ex.defaultHold;
  if (ex.successMetric === "work_seconds") base.work_seconds = ex.defaultWork;
  return { ...base, ...overrides };
}

function scaleLevel(level: FitnessLevel) {
  if (level === "advanced") return { sets: 1, reps: 4, hold: 10 };
  if (level === "intermediate") return { sets: 0, reps: 2, hold: 5 };
  return { sets: 0, reps: 0, hold: 0 };
}

function skipForInjury(key: string, injuries: string): boolean {
  const t = injuries.toLowerCase();
  if (!t) return false;
  if (/(knee|acl|meniscus)/.test(t) && ["lunge", "jumping_jack", "squat"].includes(key)) return true;
  if (/(wrist|shoulder)/.test(t) && ["push_up", "plank", "downward_dog"].includes(key)) return true;
  if (/(back|spine)/.test(t) && ["crunch", "cobra"].includes(key)) return true;
  return false;
}

function filterBlocks(blocks: PlanBlock[], injuries: string): PlanBlock[] {
  const kept = blocks.filter((b) => !skipForInjury(b.exercise_key, injuries));
  return kept.length ? kept : [block("mountain"), block("child")];
}

function applyLevel(blocks: PlanBlock[], level: FitnessLevel): PlanBlock[] {
  const s = scaleLevel(level);
  return blocks.map((b) => {
    const next = { ...b, sets: b.sets + s.sets };
    if (next.success_metric === "reps" && next.reps) next.reps = next.reps + s.reps;
    if (next.success_metric === "hold_seconds" && next.hold_seconds) next.hold_seconds = next.hold_seconds + s.hold;
    if (next.success_metric === "work_seconds" && next.work_seconds) next.work_seconds = next.work_seconds + s.hold;
    return next;
  });
}

function trimToDuration(blocks: PlanBlock[], durationMin: number): PlanBlock[] {
  const budget = Math.max(durationMin, 10) * 60;
  const out: PlanBlock[] = [];
  let used = 0;
  for (const b of blocks) {
    const work =
      b.success_metric === "reps"
        ? (b.reps ?? 8) * 4 * b.sets
        : (b.hold_seconds ?? b.work_seconds ?? 30) * b.sets;
    const rest = b.rest_seconds * b.sets;
    if (used + work + rest > budget && out.length >= 2) break;
    out.push(b);
    used += work + rest;
  }
  return out.length ? out : blocks.slice(0, 2);
}

export function generatePlan(profile: UserProfile): WorkoutPlan {
  const { goal, level, daysPerWeek, durationMin, injuries } = profile;
  const days = Math.min(Math.max(daysPerWeek, 1), 6);
  const slots = pickDays(days);

  const strength = applyLevel(
    filterBlocks([block("squat", { sets: 3 }), block("push_up", { sets: 3 }), block("plank", { sets: 2 })], injuries),
    level,
  );
  const strength2 = applyLevel(
    filterBlocks([block("lunge", { sets: 3 }), block("crunch", { sets: 3 }), block("plank", { sets: 2 })], injuries),
    level,
  );
  const yoga = applyLevel(
    filterBlocks(
      [
        block("mountain"),
        block("downward_dog"),
        block("warrior_ii", { sets: 2 }),
        block("tree", { sets: 2 }),
        block("cobra"),
        block("child"),
      ],
      injuries,
    ),
    level,
  );
  const cardio = applyLevel(
    filterBlocks(
      [block("jumping_jack", { sets: 3, success_metric: "work_seconds", work_seconds: 30, reps: undefined }), block("march_in_place", { sets: 2 })],
      injuries,
    ),
    level,
  );
  const mixedA = applyLevel(
    filterBlocks([block("squat", { sets: 3 }), block("push_up", { sets: 3 }), block("tree", { sets: 2 })], injuries),
    level,
  );

  const library: { name: string; blocks: PlanBlock[] }[] =
    goal === "mobility_yoga"
      ? [
          { name: "Yoga flow A", blocks: yoga },
          { name: "Yoga flow B", blocks: applyLevel(filterBlocks([block("mountain"), block("chair"), block("triangle", { sets: 2 }), block("child")], injuries), level) },
          { name: "Gentle holds", blocks: yoga.slice(0, 4) },
        ]
      : goal === "strength"
        ? [
            { name: "Lower + core", blocks: strength },
            { name: "Push + core", blocks: strength2 },
            { name: "Full body", blocks: mixedA },
          ]
        : goal === "fat_loss"
          ? [
              { name: "Cardio intervals", blocks: cardio },
              { name: "Strength circuit", blocks: strength },
              { name: "Mixed finisher", blocks: mixedA.concat(cardio.slice(0, 1)) },
            ]
          : [
              { name: "Strength + core", blocks: strength },
              { name: "Yoga mobility", blocks: yoga },
              { name: "Timer cardio", blocks: cardio },
            ];

  const sessions = slots.map((day, i) => {
    const tmpl = library[i % library.length];
    return {
      day_index: day,
      name: weekday(day) + " — " + tmpl.name,
      blocks: trimToDuration(tmpl.blocks, durationMin),
    };
  });

  return {
    schema_version: PLAN_SCHEMA_VERSION,
    name: `${capitalize(goal)} · ${level} · ${days} days`,
    source: "generated",
    goal,
    level,
    notes: "Rule-based plan. Rest and work times are part of follow-check.",
    sessions,
  };
}

function pickDays(n: number): number[] {
  const patterns: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
  };
  return patterns[n] ?? [0, 2, 4];
}

function weekday(i: number): string {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i] ?? "Day";
}

function capitalize(s: string): string {
  return s.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}
