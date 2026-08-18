-- CreateEnum
CREATE TYPE "FitnessLevel" AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE "Goal" AS ENUM ('consistency', 'strength', 'fat_loss', 'mobility_yoga', 'mixed');
CREATE TYPE "Equipment" AS ENUM ('none', 'home', 'gym');
CREATE TYPE "Sex" AS ENUM ('female', 'male', 'other', 'unspecified');
CREATE TYPE "PlanSource" AS ENUM ('generated', 'uploaded', 'built');
CREATE TYPE "Discipline" AS ENUM ('yoga', 'gym', 'other');
CREATE TYPE "TrackingMode" AS ENUM ('vision', 'timer', 'hybrid');
CREATE TYPE "SuccessMetric" AS ENUM ('reps', 'hold_seconds', 'work_seconds');
CREATE TYPE "RestClass" AS ENUM ('short', 'ok', 'long');
CREATE TYPE "SessionStatus" AS ENUM ('complete', 'abandoned');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "age" INTEGER,
    "sex" "Sex" NOT NULL DEFAULT 'unspecified',
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "level" "FitnessLevel" NOT NULL DEFAULT 'beginner',
    "goal" "Goal" NOT NULL DEFAULT 'mixed',
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "equipment" "Equipment" NOT NULL DEFAULT 'none',
    "injuries" TEXT NOT NULL DEFAULT '',
    "disclaimerAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Exercise" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "trackingMode" "TrackingMode" NOT NULL,
    "successMetric" "SuccessMetric" NOT NULL,
    "met" DOUBLE PRECISION NOT NULL,
    "visionSupported" BOOLEAN NOT NULL,
    "defaultReps" INTEGER NOT NULL DEFAULT 0,
    "defaultHold" INTEGER NOT NULL DEFAULT 0,
    "defaultWork" INTEGER NOT NULL DEFAULT 0,
    "defaultRest" INTEGER NOT NULL DEFAULT 30,
    "cues" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "PlanSource" NOT NULL,
    "goal" "Goal",
    "level" "FitnessLevel",
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanSession" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "PlanSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanBlock" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "exerciseKey" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "workSeconds" INTEGER NOT NULL DEFAULT 0,
    "holdSeconds" INTEGER NOT NULL DEFAULT 0,
    "restSeconds" INTEGER NOT NULL,
    "trackingMode" "TrackingMode" NOT NULL,
    "successMetric" "SuccessMetric" NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PlanBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planSessionId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "complianceScore" DOUBLE PRECISION NOT NULL,
    "kcalEstimate" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "trackingSummary" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlockResult" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "planBlockId" TEXT,
    "exerciseKey" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "actualReps" INTEGER NOT NULL DEFAULT 0,
    "actualWorkSeconds" INTEGER NOT NULL DEFAULT 0,
    "actualHoldSeconds" INTEGER NOT NULL DEFAULT 0,
    "actualRestSeconds" INTEGER NOT NULL DEFAULT 0,
    "restClass" "RestClass",
    "trackingModeUsed" "TrackingMode" NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "formScoreAvg" DOUBLE PRECISION,
    "fallbackOccurred" BOOLEAN NOT NULL DEFAULT false,
    "plannedReps" INTEGER NOT NULL DEFAULT 0,
    "plannedWorkSeconds" INTEGER NOT NULL DEFAULT 0,
    "plannedHoldSeconds" INTEGER NOT NULL DEFAULT 0,
    "plannedRestSeconds" INTEGER NOT NULL DEFAULT 0,
    "plannedSets" INTEGER NOT NULL DEFAULT 1,
    "successMetric" "SuccessMetric" NOT NULL,
    CONSTRAINT "BlockResult_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanSession" ADD CONSTRAINT "PlanSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlanSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_planSessionId_fkey" FOREIGN KEY ("planSessionId") REFERENCES "PlanSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlockResult" ADD CONSTRAINT "BlockResult_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockResult" ADD CONSTRAINT "BlockResult_planBlockId_fkey" FOREIGN KEY ("planBlockId") REFERENCES "PlanBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
