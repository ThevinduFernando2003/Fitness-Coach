import { planFromCsv } from "@fitness-coach/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function PlanImport() {
  const navigate = useNavigate();
  const [csv, setCsv] = useState("");
  const [json, setJson] = useState("");
  const [mode, setMode] = useState<"csv" | "json">("csv");
  const [preview, setPreview] = useState<string>("");
  const [unknown, setUnknown] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("Uploaded plan");

  function previewCsv() {
    setError("");
    const parsed = planFromCsv(csv);
    if (parsed.errors.length) {
      setError(parsed.errors.map((e) => `Row ${e.row}: ${e.message}`).join("\n"));
      setPreview("");
      return;
    }
    setUnknown(parsed.unknownKeys);
    setPreview(JSON.stringify(parsed.plan, null, 2));
  }

  async function save(confirmUnknown = false) {
    setError("");
    try {
      if (mode === "csv") {
        await api("/api/plans/import", {
          method: "POST",
          body: JSON.stringify({ format: "csv", csv, confirmUnknown, name }),
        });
      } else {
        await api("/api/plans/import", {
          method: "POST",
          body: JSON.stringify({ format: "json", plan: JSON.parse(json), confirmUnknown, name }),
        });
      }
      navigate("/plans");
    } catch (err) {
      const payload = err as Error & { payload?: { needsConfirmation?: boolean; unknownKeys?: string[]; details?: unknown } };
      if (payload.payload?.needsConfirmation) {
        setUnknown(payload.payload.unknownKeys ?? []);
        setError("Unknown exercises found. Confirm to import them as timer-only.");
        return;
      }
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl">Upload a plan</h1>
      <p className="text-mute mt-2">
        CSV columns: day, session_name, exercise_key, mode, sets, reps, work_seconds, hold_seconds, rest_seconds, notes.
        Rest times are required so follow-check can score them.
      </p>
      <div className="mt-4 flex gap-2">
        <button className={`px-3 py-1 rounded-full ${mode === "csv" ? "bg-volt text-ink" : "border border-line"}`} onClick={() => setMode("csv")}>
          CSV
        </button>
        <button className={`px-3 py-1 rounded-full ${mode === "json" ? "bg-volt text-ink" : "border border-line"}`} onClick={() => setMode("json")}>
          JSON
        </button>
      </div>
      <label className="block mt-4 text-sm text-mute">
        Plan name
        <input className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {mode === "csv" ? (
        <textarea
          className="mt-4 h-48 w-full rounded-2xl border border-line bg-panel p-3 font-mono text-sm"
          placeholder="Paste CSV…"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
      ) : (
        <textarea
          className="mt-4 h-48 w-full rounded-2xl border border-line bg-panel p-3 font-mono text-sm"
          placeholder="Paste JSON…"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
      )}
      <div className="mt-3 flex gap-2">
        {mode === "csv" && (
          <button className="rounded-xl border border-line px-4 py-2" onClick={previewCsv}>
            Preview
          </button>
        )}
        <button className="rounded-xl bg-volt px-4 py-2 font-semibold text-ink" onClick={() => void save(unknown.length > 0)}>
          {unknown.length ? "Confirm timer-only import" : "Import"}
        </button>
      </div>
      {unknown.length > 0 && <p className="mt-3 text-warn text-sm">Unknown keys: {unknown.join(", ")}</p>}
      {error && <pre className="mt-3 text-bad text-sm whitespace-pre-wrap">{error}</pre>}
      {preview && <pre className="mt-4 overflow-auto rounded-2xl bg-panel-2 p-4 text-xs">{preview}</pre>}
    </div>
  );
}
