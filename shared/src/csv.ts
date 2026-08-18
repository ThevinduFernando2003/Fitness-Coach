import { getExercise } from "./catalog.js";
import { PLAN_SCHEMA_VERSION, type ImportIssue, type ParsedImport, type PlanBlock, type PlanSession, type TrackingMode, type WorkoutPlan } from "./types.js";

const CSV_HEADERS = [
  "day",
  "session_name",
  "exercise_key",
  "mode",
  "sets",
  "reps",
  "work_seconds",
  "hold_seconds",
  "rest_seconds",
  "notes",
] as const;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c.length)) rows.push(row);
  return rows;
}

function headerIndex(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((h, i) => map.set(h.trim().toLowerCase(), i));
  return map;
}

function intAt(cols: string[], idx: number | undefined, fallback = 0): number {
  if (idx == null) return fallback;
  const n = Number(cols[idx] ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function inferMetric(reps: number, hold: number, work: number): PlanBlock["success_metric"] | null {
  const flags = [reps > 0, hold > 0, work > 0].filter(Boolean).length;
  if (flags !== 1) return null;
  if (reps > 0) return "reps";
  if (hold > 0) return "hold_seconds";
  return "work_seconds";
}

function parseMode(raw: string): TrackingMode | null {
  if (raw === "vision" || raw === "timer" || raw === "hybrid") return raw;
  return null;
}

export function planFromCsv(text: string, confirmUnknown = false): ParsedImport {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const unknownKeys = new Set<string>();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return {
      plan: emptyPlan("uploaded"),
      errors: [{ row: 0, message: "CSV needs a header row and at least one data row." }],
      warnings,
      unknownKeys: [],
    };
  }
  const idx = headerIndex(rows[0]);
  for (const h of CSV_HEADERS) {
    if (!idx.has(h)) {
      errors.push({ row: 1, field: h, message: `Missing required column "${h}".` });
    }
  }
  if (errors.length) {
    return { plan: emptyPlan("uploaded"), errors, warnings, unknownKeys: [] };
  }

  const sessions = new Map<string, PlanSession>();

  rows.slice(1).forEach((cols, i) => {
    const row = i + 2;
    const day = intAt(cols, idx.get("day"), -1);
    const sessionName = cols[idx.get("session_name")!] ?? "";
    const exerciseKey = (cols[idx.get("exercise_key")!] ?? "").trim();
    const modeRaw = (cols[idx.get("mode")!] ?? "").trim();
    const sets = intAt(cols, idx.get("sets"));
    const reps = intAt(cols, idx.get("reps"));
    const work = intAt(cols, idx.get("work_seconds"));
    const hold = intAt(cols, idx.get("hold_seconds"));
    const rest = intAt(cols, idx.get("rest_seconds"), Number.NaN);
    const notes = cols[idx.get("notes")!] ?? "";

    if (day < 0 || day > 6) errors.push({ row, field: "day", message: "day must be 0–6 (Mon–Sun)." });
    if (!sessionName) errors.push({ row, field: "session_name", message: "session_name is required." });
    if (!exerciseKey) errors.push({ row, field: "exercise_key", message: "exercise_key is required." });
    if (!Number.isFinite(rest) || rest < 0) {
      errors.push({ row, field: "rest_seconds", message: "rest_seconds is required and must be ≥ 0." });
    }
    if (sets < 1) errors.push({ row, field: "sets", message: "sets must be ≥ 1." });

    let mode = parseMode(modeRaw);
    if (!mode) {
      errors.push({ row, field: "mode", message: "mode must be vision, timer, or hybrid." });
      mode = "timer";
    }

    const metric = inferMetric(reps, hold, work);
    if (!metric) {
      errors.push({
        row,
        field: "reps",
        message: "Exactly one of reps, hold_seconds, or work_seconds must be > 0.",
      });
    }

    const known = getExercise(exerciseKey);
    if (exerciseKey && !known) {
      unknownKeys.add(exerciseKey);
      if (!confirmUnknown) {
        warnings.push({
          row,
          exerciseKey,
          unknownExercise: true,
          message: `Unknown exercise "${exerciseKey}" will import as timer-only after confirmation.`,
        });
      } else {
        mode = "timer";
        warnings.push({
          row,
          exerciseKey,
          unknownExercise: true,
          message: `Imported "${exerciseKey}" as timer-only.`,
        });
      }
    } else if (known && !known.visionSupported) {
      mode = "timer";
    }

    if (errors.some((e) => e.row === row)) return;

    const key = `${day}::${sessionName}`;
    if (!sessions.has(key)) {
      sessions.set(key, { day_index: day, name: sessionName, blocks: [] });
    }
    const block: PlanBlock = {
      exercise_key: exerciseKey,
      sets,
      rest_seconds: rest,
      success_metric: metric ?? "work_seconds",
      tracking_mode: mode,
      notes: notes || undefined,
    };
    if (metric === "reps") block.reps = reps;
    if (metric === "hold_seconds") block.hold_seconds = hold;
    if (metric === "work_seconds") block.work_seconds = work;
    sessions.get(key)!.blocks.push(block);
  });

  const plan: WorkoutPlan = {
    schema_version: PLAN_SCHEMA_VERSION,
    name: "Imported plan",
    source: "uploaded",
    sessions: [...sessions.values()].sort((a, b) => a.day_index - b.day_index),
  };

  if (!confirmUnknown && unknownKeys.size) {
    // Valid structure but needs user confirmation before save.
  }

  return { plan, errors, warnings, unknownKeys: [...unknownKeys] };
}

export const CSV_TEMPLATE_HEADERS = [
  "day",
  "session_name",
  "exercise_key",
  "mode",
  "sets",
  "reps",
  "work_seconds",
  "hold_seconds",
  "rest_seconds",
  "notes",
] as const;

export function planToCsv(plan: WorkoutPlan): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const session of plan.sessions) {
    for (const b of session.blocks) {
      const cols = [
        String(session.day_index),
        csvEscape(session.name),
        csvEscape(b.exercise_key),
        b.tracking_mode,
        String(b.sets),
        String(b.reps ?? 0),
        String(b.work_seconds ?? 0),
        String(b.hold_seconds ?? 0),
        String(b.rest_seconds),
        csvEscape(b.notes ?? ""),
      ];
      lines.push(cols.join(","));
    }
  }
  return lines.join("\n") + "\n";
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function emptyPlan(source: WorkoutPlan["source"] = "built"): WorkoutPlan {
  return { schema_version: PLAN_SCHEMA_VERSION, name: "Untitled plan", source, sessions: [] };
}
