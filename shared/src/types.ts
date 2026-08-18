export const PLAN_SCHEMA_VERSION = "1.0" as const;

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Goal = "consistency" | "strength" | "fat_loss" | "mobility_yoga" | "mixed";
export type Equipment = "none" | "home" | "gym";
export type Sex = "female" | "male" | "other" | "unspecified";
export type PlanSource = "generated" | "uploaded" | "built";
export type Discipline = "yoga" | "gym" | "other";
export type TrackingMode = "vision" | "timer" | "hybrid";
export type SuccessMetric = "reps" | "hold_seconds" | "work_seconds";
export type RestClass = "short" | "ok" | "long";
export type SessionStatus = "complete" | "abandoned";
export type ComplianceBand = "off_plan" | "partial" | "followed";

export type Exercise = {
  key: string;
  name: string;
  discipline: Discipline;
  trackingMode: TrackingMode;
  successMetric: SuccessMetric;
  met: number;
  visionSupported: boolean;
  defaultReps: number;
  defaultHold: number;
  defaultWork: number;
  defaultRest: number;
  cues: string;
};

export type PlanBlock = {
  exercise_key: string;
  sets: number;
  reps?: number;
  work_seconds?: number;
  hold_seconds?: number;
  rest_seconds: number;
  success_metric: SuccessMetric;
  tracking_mode: TrackingMode;
  notes?: string;
};

export type PlanSession = {
  day_index: number;
  name: string;
  blocks: PlanBlock[];
};

export type WorkoutPlan = {
  schema_version: typeof PLAN_SCHEMA_VERSION;
  name: string;
  source?: PlanSource;
  goal?: Goal;
  level?: FitnessLevel;
  notes?: string;
  sessions: PlanSession[];
};

export type UserProfile = {
  displayName: string;
  age?: number;
  sex: Sex;
  heightCm?: number;
  weightKg?: number;
  level: FitnessLevel;
  goal: Goal;
  daysPerWeek: number;
  durationMin: number;
  equipment: Equipment;
  injuries: string;
};

export type BlockResultInput = {
  exerciseKey: string;
  order: number;
  skipped: boolean;
  actualReps: number;
  actualWorkSeconds: number;
  actualHoldSeconds: number;
  actualRestSeconds: number;
  plannedReps: number;
  plannedWorkSeconds: number;
  plannedHoldSeconds: number;
  plannedRestSeconds: number;
  plannedSets: number;
  successMetric: SuccessMetric;
  trackingModeUsed: TrackingMode;
  fallbackOccurred: boolean;
  formScoreAvg: number | null;
  isLastBlock: boolean;
};

export type ComplianceBreakdown = {
  completion: number;
  volume: number;
  rest: number;
  order: number;
  form: number | null;
  score: number;
  band: ComplianceBand;
};

export type ImportIssue = {
  row: number;
  field?: string;
  message: string;
  exerciseKey?: string;
  unknownExercise?: boolean;
};

export type ParsedImport = {
  plan: WorkoutPlan;
  warnings: ImportIssue[];
  errors: ImportIssue[];
  unknownKeys: string[];
};
