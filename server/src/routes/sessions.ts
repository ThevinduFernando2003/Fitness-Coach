import { Router } from "express";
import {
  classifyRest,
  getExercise,
  scoreCompliance,
  sessionKcal,
  type BlockResultInput,
  type SessionStatus,
  type TrackingMode,
} from "@fitness-coach/shared";
import { prisma } from "../prisma.js";

export const sessionsRouter = Router();

sessionsRouter.get("/", async (req, res) => {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { blockResults: { orderBy: { order: "asc" } }, planSession: true },
  });
  res.json({ sessions: sessions.map(toApiSession) });
});

sessionsRouter.get("/:id", async (req, res) => {
  const session = await prisma.workoutSession.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { blockResults: { orderBy: { order: "asc" } }, planSession: true },
  });
  if (!session) return res.status(404).json({ error: "Session not found." });
  res.json({ session: toApiSession(session) });
});

sessionsRouter.post("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found." });
  const body = req.body ?? {};
  const blocks = Array.isArray(body.blocks) ? body.blocks : [];
  if (!blocks.length) return res.status(400).json({ error: "blocks are required." });

  const inputs: BlockResultInput[] = blocks.map((b: Record<string, unknown>, i: number) => ({
    exerciseKey: String(b.exerciseKey ?? ""),
    order: Number(b.order ?? i),
    skipped: Boolean(b.skipped),
    actualReps: num(b.actualReps),
    actualWorkSeconds: num(b.actualWorkSeconds),
    actualHoldSeconds: num(b.actualHoldSeconds),
    actualRestSeconds: num(b.actualRestSeconds),
    plannedReps: num(b.plannedReps),
    plannedWorkSeconds: num(b.plannedWorkSeconds),
    plannedHoldSeconds: num(b.plannedHoldSeconds),
    plannedRestSeconds: num(b.plannedRestSeconds),
    plannedSets: Math.max(num(b.plannedSets), 1),
    successMetric: (b.successMetric as BlockResultInput["successMetric"]) ?? "reps",
    trackingModeUsed: (b.trackingModeUsed as TrackingMode) ?? "timer",
    fallbackOccurred: Boolean(b.fallbackOccurred),
    formScoreAvg: b.formScoreAvg == null ? null : Number(b.formScoreAvg),
    isLastBlock: i === blocks.length - 1,
  }));

  const compliance = scoreCompliance(inputs);
  const kcalBlocks = inputs.map((b) => ({
    met: getExercise(b.exerciseKey)?.met ?? 3.5,
    workSeconds: b.skipped ? 0 : b.actualWorkSeconds || b.actualHoldSeconds,
  }));
  const kcal = sessionKcal(kcalBlocks, user.weightKg ?? 70);
  const status: SessionStatus = body.status === "abandoned" ? "abandoned" : "complete";

  const created = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      planSessionId: typeof body.planSessionId === "string" ? body.planSessionId : null,
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      endedAt: body.endedAt ? new Date(body.endedAt) : new Date(),
      status,
      complianceScore: compliance.score,
      kcalEstimate: kcal,
      note: typeof body.note === "string" ? body.note : "",
      trackingSummary: JSON.stringify(compliance),
      blockResults: {
        create: inputs.map((b, i) => ({
          planBlockId: typeof blocks[i]?.planBlockId === "string" ? (blocks[i].planBlockId as string) : null,
          exerciseKey: b.exerciseKey,
          order: b.order,
          actualReps: b.actualReps,
          actualWorkSeconds: b.actualWorkSeconds,
          actualHoldSeconds: b.actualHoldSeconds,
          actualRestSeconds: b.actualRestSeconds,
          restClass: b.isLastBlock ? null : classifyRest(b.actualRestSeconds, b.plannedRestSeconds),
          trackingModeUsed: b.trackingModeUsed,
          skipped: b.skipped,
          formScoreAvg: b.formScoreAvg,
          fallbackOccurred: b.fallbackOccurred,
          plannedReps: b.plannedReps,
          plannedWorkSeconds: b.plannedWorkSeconds,
          plannedHoldSeconds: b.plannedHoldSeconds,
          plannedRestSeconds: b.plannedRestSeconds,
          plannedSets: b.plannedSets,
          successMetric: b.successMetric,
        })),
      },
    },
    include: { blockResults: { orderBy: { order: "asc" } }, planSession: true },
  });

  res.status(201).json({ session: toApiSession(created), compliance });
});

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toApiSession(session: {
  id: string;
  startedAt: Date;
  endedAt: Date;
  status: string;
  complianceScore: number;
  kcalEstimate: number;
  note: string;
  trackingSummary: string;
  planSession: { id: string; name: string; dayIndex: number } | null;
  blockResults: Array<{
    id: string;
    exerciseKey: string;
    order: number;
    actualReps: number;
    actualWorkSeconds: number;
    actualHoldSeconds: number;
    actualRestSeconds: number;
    restClass: string | null;
    trackingModeUsed: string;
    skipped: boolean;
    formScoreAvg: number | null;
    fallbackOccurred: boolean;
    plannedReps: number;
    plannedWorkSeconds: number;
    plannedHoldSeconds: number;
    plannedRestSeconds: number;
    plannedSets: number;
    successMetric: string;
  }>;
}) {
  let breakdown = null;
  try {
    breakdown = JSON.parse(session.trackingSummary);
  } catch {
    breakdown = null;
  }
  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: session.status,
    complianceScore: session.complianceScore,
    kcalEstimate: session.kcalEstimate,
    note: session.note,
    breakdown,
    planSession: session.planSession,
    blocks: session.blockResults,
  };
}
