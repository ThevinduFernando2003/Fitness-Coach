import { Router } from "express";
import { prisma } from "../prisma.js";
import { publicUser } from "./auth.js";

export const meRouter = Router();

meRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

meRouter.put("/", async (req, res) => {
  const b = req.body ?? {};
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      displayName: str(b.displayName),
      age: int(b.age),
      sex: enumOr(b.sex, ["female", "male", "other", "unspecified"]),
      heightCm: num(b.heightCm),
      weightKg: num(b.weightKg),
      level: enumOr(b.level, ["beginner", "intermediate", "advanced"]),
      goal: enumOr(b.goal, ["consistency", "strength", "fat_loss", "mobility_yoga", "mixed"]),
      daysPerWeek: int(b.daysPerWeek),
      durationMin: int(b.durationMin),
      equipment: enumOr(b.equipment, ["none", "home", "gym"]),
      injuries: typeof b.injuries === "string" ? b.injuries : undefined,
      disclaimerAcceptedAt: b.acceptDisclaimer === true ? new Date() : undefined,
    },
  });
  res.json({ user: publicUser(user) });
});

function str(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function int(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function enumOr<T extends string>(v: unknown, allowed: T[]): T | undefined {
  return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : undefined;
}
