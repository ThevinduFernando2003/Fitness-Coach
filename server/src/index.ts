import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { requireAuth } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { catalogRouter } from "./routes/catalog.js";
import { plansRouter } from "./routes/plans.js";
import { sessionsRouter } from "./routes/sessions.js";

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "fitness-coach" });
});

app.use("/api/auth", authRouter);
app.use("/api/me", requireAuth, meRouter);
app.use("/api/catalog", requireAuth, catalogRouter);
app.use("/api/plans", requireAuth, plansRouter);
app.use("/api/sessions", requireAuth, sessionsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
