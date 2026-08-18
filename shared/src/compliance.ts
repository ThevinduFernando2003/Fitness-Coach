import type { BlockResultInput, ComplianceBand, ComplianceBreakdown } from "./types.js";

export function classifyRest(actualRest: number, plannedRest: number): "short" | "ok" | "long" {
  if (plannedRest <= 0) return "ok";
  const ratio = actualRest / plannedRest;
  if (ratio < 0.8) return "short";
  if (ratio > 1.2) return "long";
  return "ok";
}

function plannedMetric(block: BlockResultInput): number {
  if (block.successMetric === "reps") return Math.max(block.plannedReps * Math.max(block.plannedSets, 1), 1);
  if (block.successMetric === "hold_seconds") return Math.max(block.plannedHoldSeconds * Math.max(block.plannedSets, 1), 1);
  return Math.max(block.plannedWorkSeconds * Math.max(block.plannedSets, 1), 1);
}

function actualMetric(block: BlockResultInput): number {
  if (block.successMetric === "reps") return block.actualReps;
  if (block.successMetric === "hold_seconds") return block.actualHoldSeconds;
  return block.actualWorkSeconds;
}

export function complianceBand(score: number): ComplianceBand {
  if (score >= 80) return "followed";
  if (score >= 50) return "partial";
  return "off_plan";
}

export function scoreCompliance(blocks: BlockResultInput[]): ComplianceBreakdown {
  const n = blocks.length;
  if (n === 0) {
    return { completion: 0, volume: 0, rest: 0, order: 1, form: null, score: 0, band: "off_plan" };
  }

  const completion = blocks.filter((b) => !b.skipped).length / n;

  const volume =
    blocks.reduce((sum, b) => {
      if (b.skipped) return sum;
      return sum + Math.min(1, actualMetric(b) / plannedMetric(b));
    }, 0) / n;

  const restBlocks = blocks.filter((b) => !b.isLastBlock);
  const rest =
    restBlocks.length === 0
      ? 1
      : restBlocks.reduce((sum, b) => {
          if (b.skipped) return sum + 0;
          const planned = Math.max(b.plannedRestSeconds, 1);
          return sum + Math.max(0, 1 - Math.abs(b.actualRestSeconds - b.plannedRestSeconds) / planned);
        }, 0) / restBlocks.length;

  const performed = blocks.filter((b) => !b.skipped);
  let order = 1;
  if (performed.length >= 2) {
    const orders = performed.map((b) => b.order);
    const sorted = [...orders].sort((a, b) => a - b);
    const same = orders.every((v, i) => v === sorted[i]);
    if (!same) {
      let adjacentOnly = true;
      const expected = new Set(sorted);
      if (orders.some((o) => !expected.has(o))) adjacentOnly = false;
      const diffs = orders.filter((v, i) => v !== sorted[i]).length;
      adjacentOnly = adjacentOnly && diffs <= 2;
      order = adjacentOnly ? 0.7 : 0.4;
    }
  }

  const formScores = blocks.map((b) => b.formScoreAvg).filter((v): v is number => v != null);
  const form = formScores.length ? formScores.reduce((a, b) => a + b, 0) / formScores.length / 100 : null;

  let weights: { completion: number; volume: number; rest: number; order: number; form: number };
  if (form == null) {
    const total = 0.35 + 0.25 + 0.2 + 0.1;
    weights = {
      completion: 0.35 / total,
      volume: 0.25 / total,
      rest: 0.2 / total,
      order: 0.1 / total,
      form: 0,
    };
  } else {
    weights = { completion: 0.35, volume: 0.25, rest: 0.2, order: 0.1, form: 0.1 };
  }

  const score =
    100 *
    (weights.completion * completion +
      weights.volume * volume +
      weights.rest * rest +
      weights.order * order +
      weights.form * (form ?? 0));

  const rounded = Math.round(score * 10) / 10;
  return {
    completion: round4(completion),
    volume: round4(volume),
    rest: round4(rest),
    order,
    form,
    score: rounded,
    band: complianceBand(rounded),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
