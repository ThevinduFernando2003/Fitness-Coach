import { getExercise } from "@fitness-coach/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { WEEKDAYS, type ApiPlan, type ApiWorkout } from "../types";

export function Dashboard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [sessions, setSessions] = useState<ApiWorkout[]>([]);
  const [busy, setBusy] = useState(false);
  const today = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    void Promise.all([
      api<{ plans: ApiPlan[] }>("/api/plans").then((r) => setPlans(r.plans)),
      api<{ sessions: ApiWorkout[] }>("/api/sessions").then((r) => setSessions(r.sessions)),
    ]);
  }, []);

  const plan = plans[0];
  const todaySession = plan?.sessions.find((s) => s.dayIndex === today) ?? plan?.sessions[0];

  async function generate() {
    setBusy(true);
    try {
      const r = await api<{ plan: ApiPlan }>("/api/plans/generate", { method: "POST", body: "{}" });
      setPlans((p) => [r.plan, ...p]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-mute">Hello {user?.displayName}</p>
        <h1 className="font-display text-4xl mt-1">Today’s session</h1>
      </section>
      {!plan && (
        <div className="rounded-3xl border border-line bg-panel p-8">
          <p className="text-lg">No plan yet. Generate one from your profile, or upload CSV with rest times.</p>
          <div className="mt-4 flex gap-3">
            <button disabled={busy} onClick={() => void generate()} className="rounded-xl bg-volt px-4 py-2 font-semibold text-ink">
              {busy ? "Generating…" : "Generate plan"}
            </button>
            <Link to="/plans/import" className="rounded-xl border border-line px-4 py-2">
              Upload plan
            </Link>
          </div>
        </div>
      )}
      {plan && todaySession && (
        <div className="rounded-3xl border border-line bg-panel p-8 grid gap-6 md:grid-cols-[1fr_280px]">
          <div>
            <p className="text-volt text-sm">{WEEKDAYS[todaySession.dayIndex]} · {plan.workout.name}</p>
            <h2 className="font-display text-3xl mt-1">{todaySession.name}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {todaySession.blocks.map((b) => {
                const ex = getExercise(b.exerciseKey);
                const metric =
                  b.successMetric === "reps"
                    ? `${b.sets} × ${b.reps}`
                    : b.successMetric === "hold_seconds"
                      ? `${b.sets} × ${b.holdSeconds}s hold`
                      : `${b.sets} × ${b.workSeconds}s`;
                return (
                  <li key={b.id} className="flex justify-between border-b border-line py-2">
                    <span>{ex?.name ?? b.exerciseKey}</span>
                    <span className="text-mute">
                      {metric} · rest {b.restSeconds}s · {b.trackingMode}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-panel-2 p-5">
            <p className="text-sm text-mute">Camera is optional. Clocks always run. Follow-check scores work and rest.</p>
            <Link
              to={`/session/${plan.id}/${todaySession.id}`}
              className="mt-6 rounded-xl bg-volt py-3 text-center font-semibold text-ink"
            >
              Start session
            </Link>
          </div>
        </div>
      )}
      <section>
        <h3 className="font-display text-xl mb-3">Recent follow-check</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {sessions.slice(0, 5).map((s) => (
            <Link key={s.id} to={`/report/${s.id}`} className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-2xl font-display text-volt">{Math.round(s.complianceScore)}</p>
              <p className="text-sm text-mute">{s.breakdown?.band ?? "scored"} · {s.kcalEstimate} kcal est.</p>
            </Link>
          ))}
          {!sessions.length && <p className="text-mute">No sessions yet.</p>}
        </div>
      </section>
    </div>
  );
}
