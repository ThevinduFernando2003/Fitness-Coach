import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import { signToken } from "./auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email is required." });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      displayName: typeof displayName === "string" && displayName.trim() ? displayName.trim() : email.split("@")[0],
    },
  });
  const token = signToken({ id: user.id, email: user.email });
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await prisma.user.findUnique({ where: { email: String(email ?? "").toLowerCase() } });
  if (!user || typeof password !== "string") return res.status(401).json({ error: "Invalid email or password." });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  const token = signToken({ id: user.id, email: user.email });
  res.json({ token, user: publicUser(user) });
});

export function publicUser(user: {
  id: string;
  email: string;
  displayName: string;
  age: number | null;
  sex: string;
  heightCm: number | null;
  weightKg: number | null;
  level: string;
  goal: string;
  daysPerWeek: number;
  durationMin: number;
  equipment: string;
  injuries: string;
  disclaimerAcceptedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    age: user.age,
    sex: user.sex,
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    level: user.level,
    goal: user.goal,
    daysPerWeek: user.daysPerWeek,
    durationMin: user.durationMin,
    equipment: user.equipment,
    injuries: user.injuries,
    disclaimerAcceptedAt: user.disclaimerAcceptedAt,
    onboarded: Boolean(user.weightKg && user.disclaimerAcceptedAt),
  };
}
