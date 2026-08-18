export type ApiBlock = {
  id: string;
  order: number;
  exerciseKey: string;
  sets: number;
  reps: number;
  workSeconds: number;
  holdSeconds: number;
  restSeconds: number;
  trackingMode: "vision" | "timer" | "hybrid";
  successMetric: "reps" | "hold_seconds" | "work_seconds";
  notes: string;
};

export type ApiPlanSession = {
  id: string;
  dayIndex: number;
  name: string;
  blocks: ApiBlock[];
};

export type ApiPlan = {
  id: string;
  createdAt: string;
  workout: { name: string; notes?: string; source?: string };
  sessions: ApiPlanSession[];
};

export type ApiWorkout = {
  id: string;
  startedAt: string;
  endedAt: string;
  status: string;
  complianceScore: number;
  kcalEstimate: number;
  note: string;
  breakdown: {
    completion: number;
    volume: number;
    rest: number;
    order: number;
    form: number | null;
    score: number;
    band: string;
  } | null;
  planSession: { id: string; name: string; dayIndex: number } | null;
  blocks: Array<{
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
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
