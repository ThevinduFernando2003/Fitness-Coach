import { classifyRest, type SuccessMetric, type TrackingMode } from "@fitness-coach/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SessionBlock = {
  id?: string;
  exerciseKey: string;
  name: string;
  sets: number;
  reps: number;
  workSeconds: number;
  holdSeconds: number;
  restSeconds: number;
  trackingMode: TrackingMode;
  successMetric: SuccessMetric;
  notes?: string;
  cues?: string;
};

export type FinishedBlock = {
  planBlockId?: string;
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
};

export type Phase = "ready" | "work" | "rest" | "paused" | "done";

function formatMs(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function useWorkoutSession(blocks: SessionBlock[]) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [pausedFrom, setPausedFrom] = useState<Phase>("work");
  const [blockIndex, setBlockIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [reps, setReps] = useState(0);
  const [workMs, setWorkMs] = useState(0);
  const [holdMs, setHoldMs] = useState(0);
  const [restMs, setRestMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finished, setFinished] = useState<FinishedBlock[]>([]);
  const [forceTimer, setForceTimer] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [lowSince, setLowSince] = useState<number | null>(null);
  const [formScores, setFormScores] = useState<number[]>([]);
  const [holdingPose, setHoldingPose] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [cue, setCue] = useState("");

  const running = phase === "work" || phase === "rest";
  const completing = useRef(false);
  const holdGate = useRef(true);
  holdGate.current = holdingPose || forceTimer || currentMode() === "timer";

  function currentMode(): TrackingMode {
    const b = blocks[blockIndex];
    if (!b) return "timer";
    if (forceTimer || fallback) return "timer";
    return b.trackingMode;
  }

  const block = blocks[blockIndex];

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setElapsedMs((v) => v + dt);
      if (phase === "work") {
        setWorkMs((v) => v + dt);
        if (holdGate.current) setHoldMs((v) => v + dt);
      } else if (phase === "rest") {
        setRestMs((v) => v + dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, phase]);

  const plannedWorkMs = (block?.workSeconds ?? 0) * 1000;
  const plannedHoldMs = (block?.holdSeconds ?? 0) * 1000;
  const plannedRestMs = (block?.restSeconds ?? 0) * 1000;
  const targetReps = block?.reps ?? 0;

  const workDone = useMemo(() => {
    if (!block) return false;
    if (block.successMetric === "reps") return reps >= targetReps;
    if (block.successMetric === "hold_seconds") return holdMs >= plannedHoldMs;
    return workMs >= plannedWorkMs;
  }, [block, reps, targetReps, holdMs, plannedHoldMs, workMs, plannedWorkMs]);

  const restDone = phase === "rest" && restMs >= plannedRestMs;

  const completeSet = useCallback(
    (skipped = false) => {
      if (!block) return;
      const lastSet = setIndex + 1 >= block.sets;
      const lastBlock = blockIndex + 1 >= blocks.length;
      if (lastSet) {
        const used: TrackingMode = forceTimer || fallback || block.trackingMode === "timer" ? "timer" : block.trackingMode;
        const row: FinishedBlock = {
          planBlockId: block.id,
          exerciseKey: block.exerciseKey,
          order: blockIndex,
          skipped,
          actualReps: skipped ? 0 : block.successMetric === "reps" ? reps + (setIndex * (block.reps || 0)) : reps,
          actualWorkSeconds: skipped ? 0 : Math.round(workMs / 1000) + (finished[blockIndex]?.actualWorkSeconds ?? 0),
          actualHoldSeconds: skipped ? 0 : Math.round(holdMs / 1000),
          actualRestSeconds: 0,
          plannedReps: (block.reps || 0) * block.sets,
          plannedWorkSeconds: (block.workSeconds || 0) * block.sets,
          plannedHoldSeconds: (block.holdSeconds || 0) * block.sets,
          plannedRestSeconds: block.restSeconds,
          plannedSets: block.sets,
          successMetric: block.successMetric,
          trackingModeUsed: used,
          fallbackOccurred: fallback,
          formScoreAvg: formScores.length ? formScores.reduce((a, b) => a + b, 0) / formScores.length : null,
        };
        // accumulate reps across sets more simply: store running totals in ref-like state
        setFinished((prev) => {
          const copy = [...prev];
          const existing = copy.find((x) => x.order === blockIndex);
          if (existing) {
            existing.actualReps = skipped ? existing.actualReps : existing.actualReps + (block.successMetric === "reps" ? reps : 0);
            existing.actualWorkSeconds += Math.round(workMs / 1000);
            existing.actualHoldSeconds += Math.round(holdMs / 1000);
            existing.skipped = skipped || existing.skipped;
            existing.fallbackOccurred = existing.fallbackOccurred || fallback;
          } else {
            copy.push(row);
          }
          return copy;
        });
        if (lastBlock) {
          setPhase("done");
          return;
        }
        setBlockIndex((i) => i + 1);
        setSetIndex(0);
        setReps(0);
        setWorkMs(0);
        setHoldMs(0);
        setRestMs(0);
        setFormScores([]);
        setPhase("rest");
      } else {
        setFinished((prev) => {
          const copy = [...prev];
          const existing = copy.find((x) => x.order === blockIndex);
          const used: TrackingMode = forceTimer || fallback || block.trackingMode === "timer" ? "timer" : block.trackingMode;
          if (!existing) {
            copy.push({
              planBlockId: block.id,
              exerciseKey: block.exerciseKey,
              order: blockIndex,
              skipped: false,
              actualReps: block.successMetric === "reps" ? reps : 0,
              actualWorkSeconds: Math.round(workMs / 1000),
              actualHoldSeconds: Math.round(holdMs / 1000),
              actualRestSeconds: 0,
              plannedReps: (block.reps || 0) * block.sets,
              plannedWorkSeconds: (block.workSeconds || 0) * block.sets,
              plannedHoldSeconds: (block.holdSeconds || 0) * block.sets,
              plannedRestSeconds: block.restSeconds,
              plannedSets: block.sets,
              successMetric: block.successMetric,
              trackingModeUsed: used,
              fallbackOccurred: fallback,
              formScoreAvg: formScores.length ? formScores.reduce((a, c) => a + c, 0) / formScores.length : null,
            });
          } else {
            existing.actualReps += block.successMetric === "reps" ? reps : 0;
            existing.actualWorkSeconds += Math.round(workMs / 1000);
            existing.actualHoldSeconds += Math.round(holdMs / 1000);
          }
          return copy;
        });
        setSetIndex((s) => s + 1);
        setReps(0);
        setWorkMs(0);
        setHoldMs(0);
        setRestMs(0);
        setPhase("rest");
      }
    },
    [block, blockIndex, blocks.length, fallback, finished, forceTimer, formScores, holdMs, reps, setIndex, workMs],
  );

  useEffect(() => {
    if (phase === "work" && workDone && !completing.current) {
      completing.current = true;
      completeSet(false);
    }
    if (phase !== "work") completing.current = false;
  }, [phase, workDone, completeSet]);

  useEffect(() => {
    if (phase === "rest" && restDone) {
      setFinished((prev) =>
        prev.map((row) =>
          row.order === blockIndex - 1 || (row.order === blockIndex && setIndex === 0)
            ? { ...row, actualRestSeconds: row.actualRestSeconds + Math.round(restMs / 1000) }
            : row,
        ),
      );
      // rest is for the block we just finished or between sets of current
      setRestMs(0);
      setWorkMs(0);
      setHoldMs(0);
      setReps(0);
      setPhase("work");
    }
  }, [phase, restDone, restMs, blockIndex, setIndex]);

  const start = () => {
    setStartedAt(new Date().toISOString());
    setPhase("work");
    setElapsedMs(0);
  };

  const pause = () => {
    if (phase === "work" || phase === "rest") {
      setPausedFrom(phase);
      setPhase("paused");
    } else if (phase === "paused") setPhase(pausedFrom);
  };

  const skip = () => completeSet(true);

  const addRep = () => setReps((r) => r + 1);

  const onVisionRep = () => {
    if (phase === "work" && currentMode() !== "timer") addRep();
  };

  const onVisionHold = (holding: boolean, score: number, nextCue: string) => {
    setHoldingPose(holding);
    setCue(nextCue);
    if (score) setFormScores((s) => [...s.slice(-40), score]);
  };

  const onConfidence = (ok: boolean) => {
    const mode = blocks[blockIndex]?.trackingMode;
    if (forceTimer || mode === "timer") return;
    if (ok) {
      setLowSince(null);
      return;
    }
    const now = performance.now();
    setLowSince((prev) => {
      const startLow = prev ?? now;
      if (now - startLow >= 5000) setFallback(true);
      return startLow;
    });
  };

  const restClass = classifyRest(Math.round(restMs / 1000), block?.restSeconds ?? 0);

  const workRemainingMs =
    block?.successMetric === "hold_seconds"
      ? plannedHoldMs - holdMs
      : block?.successMetric === "work_seconds"
        ? plannedWorkMs - workMs
        : 0;

  return {
    phase,
    block,
    blockIndex,
    setIndex,
    reps,
    workMs,
    holdMs,
    restMs,
    elapsedMs,
    finished,
    fallback,
    forceTimer,
    cue,
    startedAt,
    holdingPose,
    restClass,
    trackingMode: currentMode(),
    clocks: {
      work: formatMs(block?.successMetric === "reps" ? workMs : Math.max(0, workRemainingMs)),
      rest: formatMs(Math.max(0, plannedRestMs - restMs)),
      elapsed: formatMs(elapsedMs),
      hold: formatMs(holdMs),
    },
    start,
    pause,
    skip,
    addRep,
    completeSet: () => completeSet(false),
    useTimer: () => {
      setForceTimer(true);
      setFallback(true);
    },
    retryCamera: () => {
      setForceTimer(false);
      setFallback(false);
      setLowSince(null);
    },
    onVisionRep,
    onVisionHold,
    onConfidence,
    setCue,
  };
}
