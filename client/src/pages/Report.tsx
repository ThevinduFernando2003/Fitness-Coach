import { getExercise } from "@fitness-coach/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { ApiWorkout } from "../types";

export function Report() {
  const { id } = useParams();
  const [session, setSession] = useState<ApiWorkout | null>(null);

  useEffect(() => {
    void api<{ session: ApiWorkout }>(`/api/sessions/${id}`).then((r) => setSession(r.session));
  }, [id]);

  if (!session) return <p className="text-mute">Loading report…</p>;
  const b = session.breakdown;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-mute">{session.planSession?.name ?? "Session"} · {session.status}</p>
        <h1 className="font-display text-4xl mt-1">Follow-check</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Compliance" value={String(Math.round(session.complianceScore))} sub={b?.band ?? ""} />
        <Stat label="Estimated kcal" value={String(session.kcalEstimate)} sub="MET × weight × work time" />
        <Stat label="Form" value={b?.form == null ? "—" : `${Math.round(b.form * 100)}`} sub="omitted if timer-only" />
      </div>
      {b && (
        <div className="rounded-3xl border border-line bg-panel p-6 grid sm:grid-cols-4 gap-4 text-sm">
          <Mini label="Completion" n={b.completion} />
          <Mini label="Volume" n={b.volume} />
          <Mini label="Rest" n={b.rest} />
          <Mini label="Order" n={b.order} />
        </div>
      )}
      <div className="rounded-3xl border border-line bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-mute text-left">
            <tr>
              <th className="p-3">Exercise</th>
              <th className="p-3">Planned</th>
              <th className="p-3">Actual</th>
              <th className="p-3">Rest</th>
              <th className="p-3">Mode</th>
            </tr>
          </thead>
          <tbody>
            {session.blocks.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="p-3">
                  {getExercise(row.exerciseKey)?.name ?? row.exerciseKey}
                  {row.skipped && <span className="text-bad ml-2">skipped</span>}
                  {row.fallbackOccurred && <span className="text-warn ml-2">timer fallback</span>}
                </td>
                <td className="p-3 text-mute">{planned(row)}</td>
                <td className="p-3">{actual(row)}</td>
                <td className="p-3">
                  {row.actualRestSeconds}s / {row.plannedRestSeconds}s
                  {row.restClass && <span className="ml-2 text-mute">{row.restClass}</span>}
                </td>
                <td className="p-3 text-mute">{row.trackingModeUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mute">
        Calories are estimates: kcal = MET × 3.5 × kg / 200 × minutes worked (rest excluded). Not a measurement.
      </p>
      <Link to="/" className="inline-block rounded-xl bg-volt px-4 py-2 font-semibold text-ink">
        Back to today
      </Link>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-line bg-panel p-5">
      <p className="text-mute text-sm">{label}</p>
      <p className="font-display text-4xl text-volt mt-1">{value}</p>
      <p className="text-xs text-mute mt-1">{sub}</p>
    </div>
  );
}

function Mini({ label, n }: { label: string; n: number }) {
  return (
    <div>
      <p className="text-mute">{label}</p>
      <p className="text-xl">{Math.round(n * 100)}%</p>
    </div>
  );
}

function planned(row: ApiWorkout["blocks"][0]) {
  if (row.successMetric === "reps") return `${row.plannedReps} reps`;
  if (row.successMetric === "hold_seconds") return `${row.plannedHoldSeconds}s hold`;
  return `${row.plannedWorkSeconds}s`;
}

function actual(row: ApiWorkout["blocks"][0]) {
  if (row.skipped) return "0";
  if (row.successMetric === "reps") return `${row.actualReps} reps`;
  if (row.successMetric === "hold_seconds") return `${row.actualHoldSeconds}s`;
  return `${row.actualWorkSeconds}s`;
}
