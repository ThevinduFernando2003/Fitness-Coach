import { getExercise } from "@fitness-coach/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useWorkoutSession, type SessionBlock } from "../session/useWorkoutSession";
import type { ApiPlan } from "../types";
import { PoseCamera } from "../vision/PoseCamera";
import { resetRepMachines } from "../vision/gym";

export function LiveSession() {
  const { planId, sessionId } = useParams();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<SessionBlock[] | null>(null);
  const [planSessionId, setPlanSessionId] = useState<string | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    resetRepMachines();
    void api<{ plan: ApiPlan }>(`/api/plans/${planId}`).then((r) => {
      const sess = r.plan.sessions.find((s) => s.id === sessionId);
      if (!sess) {
        setError("Session not found on this plan.");
        return;
      }
      setPlanSessionId(sess.id);
      setBlocks(
        sess.blocks.map((b) => ({
          id: b.id,
          exerciseKey: b.exerciseKey,
          name: getExercise(b.exerciseKey)?.name ?? b.exerciseKey,
          sets: b.sets,
          reps: b.reps,
          workSeconds: b.workSeconds,
          holdSeconds: b.holdSeconds,
          restSeconds: b.restSeconds,
          trackingMode: b.trackingMode,
          successMetric: b.successMetric,
          notes: b.notes,
          cues: getExercise(b.exerciseKey)?.cues,
        })),
      );
    });
  }, [planId, sessionId]);

  if (error) return <p className="text-bad">{error}</p>;
  if (!blocks) return <p className="text-mute">Loading session…</p>;
  return <Runner blocks={blocks} planSessionId={planSessionId} onSaved={(id) => navigate(`/report/${id}`)} />;
}

function Runner({
  blocks,
  planSessionId,
  onSaved,
}: {
  blocks: SessionBlock[];
  planSessionId?: string;
  onSaved: (id: string) => void;
}) {
  const s = useWorkoutSession(blocks);
  const [saving, setSaving] = useState(false);
  const camOn = s.phase !== "ready" && s.phase !== "done" && s.trackingMode !== "timer";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        s.pause();
      }
      if (e.key.toLowerCase() === "s") s.skip();
      if (e.key === "+") s.addRep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  const save = useCallback(
    async (status: "complete" | "abandoned") => {
      setSaving(true);
      try {
        const payload = {
          planSessionId,
          startedAt: s.startedAt,
          endedAt: new Date().toISOString(),
          status,
          blocks: (s.finished.length ? s.finished : snapshotUnfinished(blocks, s.blockIndex)).map((b) => ({
            ...b,
            planBlockId: b.planBlockId,
          })),
        };
        const r = await api<{ session: { id: string } }>("/api/sessions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onSaved(r.session.id);
      } finally {
        setSaving(false);
      }
    },
    [blocks, onSaved, planSessionId, s.blockIndex, s.finished, s.startedAt],
  );

  useEffect(() => {
    if (s.phase === "done" && !saving) void save("complete");
  }, [s.phase, save, saving]);

  const next = blocks[s.blockIndex + 1];
  const restTone = s.restClass === "long" ? "text-bad" : s.restClass === "short" ? "text-warn" : "text-volt";

  const prescribed = useMemo(() => {
    const b = s.block;
    if (!b) return "";
    if (b.successMetric === "reps") return `${b.reps} reps`;
    if (b.successMetric === "hold_seconds") return `${b.holdSeconds}s hold`;
    return `${b.workSeconds}s work`;
  }, [s.block]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <PoseCamera
          enabled={camOn}
          exerciseKey={s.block?.exerciseKey ?? "squat"}
          successMetric={s.block?.successMetric ?? "reps"}
          onRep={s.onVisionRep}
          onHold={s.onVisionHold}
          onConfidence={s.onConfidence}
        />
        {s.fallback && <p className="mt-3 rounded-xl bg-panel-2 px-4 py-2 text-warn">We can’t see you clearly — using timer.</p>}
        <p className="mt-3 text-sm text-mute">
          Full body in frame, 45° or side light. Space = pause, S = skip, + = add rep. This is not medical advice.
        </p>
      </div>
      <div className="rounded-3xl border border-line bg-panel p-6 space-y-5">
        <div className="flex justify-between text-sm text-mute">
          <span>
            Exercise {s.blockIndex + 1}/{blocks.length}
          </span>
          <span>
            Set {(s.setIndex ?? 0) + 1}/{s.block?.sets ?? 1}
          </span>
        </div>
        <h1 className="font-display text-4xl">{s.block?.name ?? "Done"}</h1>
        <p className="text-mute">{s.block?.cues}</p>
        <div className="grid grid-cols-2 gap-3">
          <Clock label={s.phase === "rest" ? "Rest remaining" : "Work"} value={s.phase === "rest" ? s.clocks.rest : s.clocks.work} accent />
          <Clock label="Elapsed" value={s.clocks.elapsed} />
        </div>
        <div className="flex justify-between text-sm">
          <span>Prescribed {prescribed}</span>
          <span>
            Actual {s.block?.successMetric === "reps" ? `${s.reps} reps` : s.clocks.hold}
          </span>
        </div>
        {s.phase === "rest" && <p className={`text-sm ${restTone}`}>Rest {s.restClass}</p>}
        {s.cue && <p className="text-volt text-sm">{s.cue}</p>}
        {next && <p className="text-sm text-mute">Next: {next.name}</p>}
        <div className="flex flex-wrap gap-2">
          {s.phase === "ready" && (
            <button className="rounded-xl bg-volt px-4 py-2 font-semibold text-ink" onClick={s.start}>
              Start
            </button>
          )}
          {s.phase !== "ready" && s.phase !== "done" && (
            <button className="rounded-xl border border-line px-4 py-2" onClick={s.pause}>
              {s.phase === "paused" ? "Resume" : "Pause"}
            </button>
          )}
          {s.phase === "work" && s.block?.successMetric === "reps" && (
            <button className="rounded-xl border border-line px-4 py-2" onClick={s.addRep}>
              +1 rep
            </button>
          )}
          {s.phase === "work" && (
            <button className="rounded-xl border border-line px-4 py-2" onClick={s.completeSet}>
              Complete set
            </button>
          )}
          <button className="rounded-xl border border-line px-4 py-2" onClick={s.skip}>
            Skip
          </button>
          <button className="rounded-xl border border-line px-4 py-2" onClick={s.useTimer}>
            Use timer
          </button>
          {s.fallback && (
            <button className="rounded-xl border border-line px-4 py-2" onClick={s.retryCamera}>
              Retry camera
            </button>
          )}
          <button disabled={saving} className="rounded-xl text-bad px-4 py-2" onClick={() => void save("abandoned")}>
            End early
          </button>
        </div>
      </div>
    </div>
  );
}

function Clock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-panel-2 p-4">
      <p className="text-xs text-mute uppercase tracking-wide">{label}</p>
      <p className={`clock text-4xl mt-1 ${accent ? "text-volt" : ""}`}>{value}</p>
    </div>
  );
}

function snapshotUnfinished(blocks: SessionBlock[], index: number) {
  return blocks.map((b, i) => ({
    planBlockId: b.id,
    exerciseKey: b.exerciseKey,
    order: i,
    skipped: i >= index,
    actualReps: 0,
    actualWorkSeconds: 0,
    actualHoldSeconds: 0,
    actualRestSeconds: 0,
    plannedReps: (b.reps || 0) * b.sets,
    plannedWorkSeconds: (b.workSeconds || 0) * b.sets,
    plannedHoldSeconds: (b.holdSeconds || 0) * b.sets,
    plannedRestSeconds: b.restSeconds,
    plannedSets: b.sets,
    successMetric: b.successMetric,
    trackingModeUsed: "timer" as const,
    fallbackOccurred: false,
    formScoreAvg: null,
  }));
}
