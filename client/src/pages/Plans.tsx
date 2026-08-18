import { getExercise } from "@fitness-coach/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { WEEKDAYS, type ApiPlan } from "../types";

export function Plans() {
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api<{ plans: ApiPlan[] }>("/api/plans");
    setPlans(r.plans);
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    setBusy(true);
    try {
      await api("/api/plans/generate", { method: "POST", body: "{}" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api(`/api/plans/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Plans</h1>
          <p className="text-mute mt-1">Generated, built, or uploaded. Rest times are required.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/plans/new" className="rounded-xl border border-line px-4 py-2">
            Build plan
          </Link>
          <Link to="/plans/import" className="rounded-xl border border-line px-4 py-2">
            Upload CSV / JSON
          </Link>
          <button disabled={busy} onClick={() => void generate()} className="rounded-xl bg-volt px-4 py-2 font-semibold text-ink">
            {busy ? "Working…" : "Generate"}
          </button>
        </div>
      </div>
      <div className="mt-8 space-y-6">
        {plans.map((plan) => (
          <article key={plan.id} className="rounded-3xl border border-line bg-panel p-6">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">{plan.workout.name}</h2>
                <p className="text-sm text-mute">{plan.workout.source} · {plan.sessions.length} sessions</p>
              </div>
              <button className="text-sm text-bad" onClick={() => void remove(plan.id)}>
                Delete
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {plan.sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/session/${plan.id}/${s.id}`}
                  className="rounded-2xl bg-panel-2 p-4 hover:border-volt border border-transparent"
                >
                  <p className="text-volt text-sm">{WEEKDAYS[s.dayIndex]}</p>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-mute mt-2">
                    {s.blocks.length} blocks · rest {s.blocks.map((b) => b.restSeconds).join("/")}s
                  </p>
                  <ul className="mt-2 text-sm text-mute">
                    {s.blocks.slice(0, 4).map((b) => (
                      <li key={b.id}>{getExercise(b.exerciseKey)?.name ?? b.exerciseKey}</li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
          </article>
        ))}
        {!plans.length && <p className="text-mute">No plans yet.</p>}
      </div>
    </div>
  );
}
