import { EXERCISES, PLAN_SCHEMA_VERSION, type PlanBlock, type PlanSession, type WorkoutPlan } from "@fitness-coach/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function PlanBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState("Custom plan");
  const [sessions, setSessions] = useState<PlanSession[]>([
    { day_index: 0, name: "Monday session", blocks: [] },
  ]);
  const [error, setError] = useState("");

  function addSession() {
    const used = new Set(sessions.map((s) => s.day_index));
    const day = [0, 1, 2, 3, 4, 5, 6].find((d) => !used.has(d)) ?? 0;
    setSessions((s) => [...s, { day_index: day, name: `${DAYS[day]} session`, blocks: [] }]);
  }

  function addBlock(si: number, key: string) {
    const ex = EXERCISES.find((e) => e.key === key);
    if (!ex) return;
    const block: PlanBlock = {
      exercise_key: ex.key,
      sets: 3,
      rest_seconds: ex.defaultRest,
      success_metric: ex.successMetric,
      tracking_mode: ex.visionSupported ? "hybrid" : "timer",
    };
    if (ex.successMetric === "reps") block.reps = ex.defaultReps || 8;
    if (ex.successMetric === "hold_seconds") block.hold_seconds = ex.defaultHold || 20;
    if (ex.successMetric === "work_seconds") block.work_seconds = ex.defaultWork || 30;
    setSessions((all) => all.map((s, i) => (i === si ? { ...s, blocks: [...s.blocks, block] } : s)));
  }

  async function save() {
    setError("");
    const plan: WorkoutPlan = { schema_version: PLAN_SCHEMA_VERSION, name, source: "built", sessions };
    try {
      await api("/api/plans", { method: "POST", body: JSON.stringify({ source: "built", plan }) });
      navigate("/plans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan. Check rest times and metrics.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-4xl">Build a plan</h1>
      <p className="text-mute">Every block needs rest seconds. Vision exercises default to hybrid tracking.</p>
      <label className="block text-sm">
        <span className="text-mute">Plan name</span>
        <input className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {sessions.map((session, si) => (
        <section key={si} className="rounded-3xl border border-line bg-panel p-5 space-y-3">
          <div className="flex gap-3">
            <select
              className="rounded-xl border border-line bg-ink px-3 py-2"
              value={session.day_index}
              onChange={(e) =>
                setSessions((all) => all.map((s, i) => (i === si ? { ...s, day_index: Number(e.target.value) } : s)))
              }
            >
              {DAYS.map((d, di) => (
                <option key={d} value={di}>
                  {d}
                </option>
              ))}
            </select>
            <input
              className="flex-1 rounded-xl border border-line bg-ink px-3 py-2"
              value={session.name}
              onChange={(e) => setSessions((all) => all.map((s, i) => (i === si ? { ...s, name: e.target.value } : s)))}
            />
          </div>
          <ul className="space-y-2">
            {session.blocks.map((b, bi) => (
              <li key={bi} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-40">{EXERCISES.find((e) => e.key === b.exercise_key)?.name}</span>
                <Num label="sets" value={b.sets} onChange={(n) => patchBlock(si, bi, { sets: n })} />
                {b.success_metric === "reps" && (
                  <Num label="reps" value={b.reps ?? 0} onChange={(n) => patchBlock(si, bi, { reps: n })} />
                )}
                {b.success_metric === "hold_seconds" && (
                  <Num label="hold s" value={b.hold_seconds ?? 0} onChange={(n) => patchBlock(si, bi, { hold_seconds: n })} />
                )}
                {b.success_metric === "work_seconds" && (
                  <Num label="work s" value={b.work_seconds ?? 0} onChange={(n) => patchBlock(si, bi, { work_seconds: n })} />
                )}
                <Num label="rest s" value={b.rest_seconds} onChange={(n) => patchBlock(si, bi, { rest_seconds: n })} />
                <button className="text-bad" onClick={() => setSessions((all) => all.map((s, i) => (i === si ? { ...s, blocks: s.blocks.filter((_, j) => j !== bi) } : s)))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <select className="rounded-xl border border-line bg-ink px-3 py-2" defaultValue="" onChange={(e) => { if (e.target.value) addBlock(si, e.target.value); e.target.value = ""; }}>
            <option value="">Add exercise…</option>
            {EXERCISES.map((ex) => (
              <option key={ex.key} value={ex.key}>
                {ex.name} ({ex.trackingMode})
              </option>
            ))}
          </select>
        </section>
      ))}
      <div className="flex gap-2">
        <button className="rounded-xl border border-line px-4 py-2" onClick={addSession}>
          Add day
        </button>
        <button className="rounded-xl bg-volt px-4 py-2 font-semibold text-ink" onClick={() => void save()}>
          Save plan
        </button>
      </div>
      {error && <p className="text-bad text-sm">{error}</p>}
    </div>
  );

  function patchBlock(si: number, bi: number, patch: Partial<PlanBlock>) {
    setSessions((all) =>
      all.map((s, i) => (i === si ? { ...s, blocks: s.blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)) } : s)),
    );
  }
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-mute">
      {label}
      <input
        type="number"
        min={0}
        className="w-16 rounded-lg border border-line bg-ink px-2 py-1 text-mist"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
