import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ApiWorkout } from "../types";

export function History() {
  const [sessions, setSessions] = useState<ApiWorkout[]>([]);
  useEffect(() => {
    void api<{ sessions: ApiWorkout[] }>("/api/sessions").then((r) => setSessions(r.sessions));
  }, []);
  const weekKcal = sessions
    .filter((s) => Date.now() - new Date(s.startedAt).getTime() < 7 * 86400000)
    .reduce((a, s) => a + s.kcalEstimate, 0);

  return (
    <div>
      <h1 className="font-display text-4xl">History</h1>
      <p className="text-mute mt-1">
        {sessions.length} sessions · {Math.round(weekKcal)} estimated kcal this week
      </p>
      <div className="mt-6 space-y-3">
        {sessions.map((s) => (
          <Link key={s.id} to={`/report/${s.id}`} className="flex justify-between rounded-2xl border border-line bg-panel px-5 py-4">
            <div>
              <p className="font-semibold">{s.planSession?.name ?? "Session"}</p>
              <p className="text-sm text-mute">{new Date(s.startedAt).toLocaleString()} · {s.status}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl text-volt">{Math.round(s.complianceScore)}</p>
              <p className="text-xs text-mute">{s.breakdown?.band} · {s.kcalEstimate} kcal est.</p>
            </div>
          </Link>
        ))}
        {!sessions.length && <p className="text-mute">No history yet.</p>}
      </div>
    </div>
  );
}
