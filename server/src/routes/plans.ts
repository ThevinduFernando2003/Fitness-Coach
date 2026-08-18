import { Router } from "express";
import {
  generatePlan,
  planFromCsv,
  planToCsv,
  validatePlan,
  type PlanSource,
  type UserProfile,
  type WorkoutPlan,
} from "@fitness-coach/shared";
import { prisma } from "../prisma.js";

export const plansRouter = Router();

plansRouter.get("/", async (req, res) => {
  const plans = await prisma.plan.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { sessions: { include: { blocks: { orderBy: { order: "asc" } } }, orderBy: { dayIndex: "asc" } } },
  });
  res.json({ plans: plans.map(toApiPlan) });
});

plansRouter.post("/generate", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found." });
  const profile: UserProfile = {
    displayName: user.displayName,
    age: user.age ?? undefined,
    sex: user.sex,
    heightCm: user.heightCm ?? undefined,
    weightKg: user.weightKg ?? undefined,
    level: user.level,
    goal: user.goal,
    daysPerWeek: user.daysPerWeek,
    durationMin: user.durationMin,
    equipment: user.equipment,
    injuries: user.injuries,
  };
  const generated = generatePlan(profile);
  const saved = await savePlan(req.user!.id, generated, "generated");
  res.status(201).json({ plan: toApiPlan(saved) });
});

plansRouter.post("/import", async (req, res) => {
  const confirmUnknown = Boolean(req.body?.confirmUnknown);
  const format = req.body?.format === "csv" ? "csv" : "json";
  let parsed;
  if (format === "csv") {
    if (typeof req.body?.csv !== "string") return res.status(400).json({ error: "csv text is required." });
    parsed = planFromCsv(req.body.csv, confirmUnknown);
  } else {
    const check = validatePlan(req.body?.plan, { allowUnknownKeys: confirmUnknown });
    if (!check.ok) return res.status(400).json({ error: "Invalid plan JSON.", details: check.errors });
    parsed = { plan: check.plan, errors: [], warnings: [], unknownKeys: [] };
  }
  if (parsed.errors.length) return res.status(400).json({ error: "Import failed.", details: parsed.errors });
  if (parsed.unknownKeys.length && !confirmUnknown) {
    return res.status(409).json({
      needsConfirmation: true,
      unknownKeys: parsed.unknownKeys,
      warnings: parsed.warnings,
      preview: parsed.plan,
    });
  }
  if (typeof req.body?.name === "string" && req.body.name.trim()) parsed.plan.name = req.body.name.trim();
  parsed.plan.source = "uploaded";
  const saved = await savePlan(req.user!.id, parsed.plan, "uploaded");
  res.status(201).json({ plan: toApiPlan(saved), warnings: parsed.warnings });
});

plansRouter.post("/", async (req, res) => {
  const check = validatePlan(req.body?.plan, { allowUnknownKeys: true });
  if (!check.ok) return res.status(400).json({ error: "Invalid plan.", details: check.errors });
  const source = (req.body?.source as PlanSource) || "built";
  const saved = await savePlan(req.user!.id, { ...check.plan, source }, source);
  res.status(201).json({ plan: toApiPlan(saved) });
});

plansRouter.get("/:id/export", async (req, res) => {
  const plan = await loadPlan(req.user!.id, req.params.id);
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  const api = toApiPlan(plan);
  if (req.query.format === "csv") {
    res.type("text/csv").send(planToCsv(api.workout));
    return;
  }
  res.json({ plan: api.workout });
});

plansRouter.get("/:id", async (req, res) => {
  const plan = await loadPlan(req.user!.id, req.params.id);
  if (!plan) return res.status(404).json({ error: "Plan not found." });
  res.json({ plan: toApiPlan(plan) });
});

plansRouter.put("/:id", async (req, res) => {
  const existing = await loadPlan(req.user!.id, req.params.id);
  if (!existing) return res.status(404).json({ error: "Plan not found." });
  const check = validatePlan(req.body?.plan, { allowUnknownKeys: true });
  if (!check.ok) return res.status(400).json({ error: "Invalid plan.", details: check.errors });
  await prisma.planSession.deleteMany({ where: { planId: existing.id } });
  const saved = await prisma.plan.update({
    where: { id: existing.id },
    data: {
      name: check.plan.name,
      notes: check.plan.notes ?? "",
      sessions: nestSessions(check.plan),
    },
    include: { sessions: { include: { blocks: { orderBy: { order: "asc" } } }, orderBy: { dayIndex: "asc" } } },
  });
  res.json({ plan: toApiPlan(saved) });
});

plansRouter.delete("/:id", async (req, res) => {
  const existing = await loadPlan(req.user!.id, req.params.id);
  if (!existing) return res.status(404).json({ error: "Plan not found." });
  await prisma.plan.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

async function loadPlan(userId: string, id: string) {
  return prisma.plan.findFirst({
    where: { id, userId },
    include: { sessions: { include: { blocks: { orderBy: { order: "asc" } } }, orderBy: { dayIndex: "asc" } } },
  });
}

async function savePlan(userId: string, plan: WorkoutPlan, source: PlanSource) {
  return prisma.plan.create({
    data: {
      userId,
      name: plan.name,
      source,
      goal: plan.goal,
      level: plan.level,
      notes: plan.notes ?? "",
      sessions: nestSessions(plan),
    },
    include: { sessions: { include: { blocks: { orderBy: { order: "asc" } } }, orderBy: { dayIndex: "asc" } } },
  });
}

function nestSessions(plan: WorkoutPlan) {
  return {
    create: plan.sessions.map((s) => ({
      dayIndex: s.day_index,
      name: s.name,
      blocks: {
        create: s.blocks.map((b, order) => ({
          order,
          exerciseKey: b.exercise_key,
          sets: b.sets,
          reps: b.reps ?? 0,
          workSeconds: b.work_seconds ?? 0,
          holdSeconds: b.hold_seconds ?? 0,
          restSeconds: b.rest_seconds,
          trackingMode: b.tracking_mode,
          successMetric: b.success_metric,
          notes: b.notes ?? "",
        })),
      },
    })),
  };
}

type PlanRow = Awaited<ReturnType<typeof savePlan>>;

export function toApiPlan(plan: PlanRow) {
  const workout: WorkoutPlan = {
    schema_version: "1.0",
    name: plan.name,
    source: plan.source,
    goal: plan.goal ?? undefined,
    level: plan.level ?? undefined,
    notes: plan.notes,
    sessions: plan.sessions.map((s) => ({
      day_index: s.dayIndex,
      name: s.name,
      blocks: s.blocks.map((b) => ({
        exercise_key: b.exerciseKey,
        sets: b.sets,
        reps: b.reps || undefined,
        work_seconds: b.workSeconds || undefined,
        hold_seconds: b.holdSeconds || undefined,
        rest_seconds: b.restSeconds,
        success_metric: b.successMetric,
        tracking_mode: b.trackingMode,
        notes: b.notes || undefined,
      })),
    })),
  };
  return {
    id: plan.id,
    createdAt: plan.createdAt,
    workout,
    sessions: plan.sessions.map((s) => ({
      id: s.id,
      dayIndex: s.dayIndex,
      name: s.name,
      blocks: s.blocks.map((b) => ({
        id: b.id,
        order: b.order,
        exerciseKey: b.exerciseKey,
        sets: b.sets,
        reps: b.reps,
        workSeconds: b.workSeconds,
        holdSeconds: b.holdSeconds,
        restSeconds: b.restSeconds,
        trackingMode: b.trackingMode,
        successMetric: b.successMetric,
        notes: b.notes,
      })),
    })),
  };
}
