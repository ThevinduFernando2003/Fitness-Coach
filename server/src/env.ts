import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env") });
config({ path: path.resolve(here, "../.env") });

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://fitness:fitness@localhost:5432/fitness_coach?schema=public",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
