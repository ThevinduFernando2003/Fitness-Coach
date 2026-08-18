import { describe, expect, it } from "vitest";
import { estimateKcal, sessionKcal } from "./calories.js";
import { classifyRest, scoreCompliance } from "./compliance.js";
import { generatePlan } from "./generator.js";
import { planFromCsv } from "./csv.js";
import type { BlockResultInput } from "./types.js";

function block(partial: Partial<BlockResultInput> & Pick<BlockResultInput, "order">): BlockResultInput {
  return {
    exerciseKey: "squat",
    skipped: false,
    actualReps: 8,
    actualWorkSeconds: 40,
    actualHoldSeconds: 0,
    actualRestSeconds: 45,
    plannedReps: 8,
    plannedWorkSeconds: 0,
    plannedHoldSeconds: 0,
    plannedRestSeconds: 45,
    plannedSets: 1,
    successMetric: "reps",
    trackingModeUsed: "timer",
    fallbackOccurred: false,
    formScoreAvg: null,
    isLastBlock: false,
    ...partial,
  };
}

describe("scoreCompliance", () => {
  it("scores a perfect timer session near 100", () => {
    const r = scoreCompliance([
      block({ order: 0 }),
      block({ order: 1, exerciseKey: "push_up", actualReps: 6, plannedReps: 6, isLastBlock: true, actualRestSeconds: 0, plannedRestSeconds: 0 }),
    ]);
    expect(r.band).toBe("followed");
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("drops score when blocks are skipped and rest is long", () => {
    const r = scoreCompliance([
      block({ order: 0, actualRestSeconds: 135, plannedRestSeconds: 45 }),
      block({ order: 1, skipped: true, actualReps: 0, isLastBlock: true }),
    ]);
    expect(r.completion).toBe(0.5);
    expect(r.band).not.toBe("followed");
    expect(r.score).toBeLessThan(80);
  });
});

describe("classifyRest", () => {
  it("flags ±20% window", () => {
    expect(classifyRest(45, 45)).toBe("ok");
    expect(classifyRest(30, 45)).toBe("short");
    expect(classifyRest(60, 45)).toBe("long");
  });
});

describe("estimateKcal", () => {
  it("matches MET formula for 70kg / 2 minutes / MET 5", () => {
    // 5 * 3.5 * 70 / 200 * 2 = 12.25 → 12.3
    expect(estimateKcal(5, 70, 120)).toBe(12.3);
    expect(sessionKcal([{ met: 5, workSeconds: 120 }], 70)).toBe(12.3);
  });
});

describe("planFromCsv", () => {
  it("parses a valid row and lists unknown keys", () => {
    const csv = `day,session_name,exercise_key,mode,sets,reps,work_seconds,hold_seconds,rest_seconds,notes
0,Monday Strength,squat,hybrid,3,8,0,0,45,Side camera
4,Friday Cardio,unknown_move,timer,2,0,45,0,20,x
`;
    const parsed = planFromCsv(csv);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.unknownKeys).toContain("unknown_move");
    expect(parsed.plan.sessions).toHaveLength(2);
  });

  it("rejects missing rest column", () => {
    const csv = `day,session_name,exercise_key,mode,sets,reps,work_seconds,hold_seconds,notes
0,A,squat,timer,1,8,0,0,hi
`;
    const parsed = planFromCsv(csv);
    expect(parsed.errors.some((e) => e.field === "rest_seconds")).toBe(true);
  });
});

describe("generatePlan", () => {
  it("emits schema 1.0 with rest times", () => {
    const plan = generatePlan({
      displayName: "Test",
      sex: "unspecified",
      level: "beginner",
      goal: "mixed",
      daysPerWeek: 3,
      durationMin: 30,
      equipment: "none",
      injuries: "",
    });
    expect(plan.schema_version).toBe("1.0");
    expect(plan.sessions).toHaveLength(3);
    expect(plan.sessions.every((s) => s.blocks.every((b) => typeof b.rest_seconds === "number"))).toBe(true);
  });
});
