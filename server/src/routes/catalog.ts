import { Router } from "express";
import { EXERCISES } from "@fitness-coach/shared";

export const catalogRouter = Router();

catalogRouter.get("/", (_req, res) => {
  res.json({ exercises: EXERCISES });
});
