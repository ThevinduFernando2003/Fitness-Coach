import { useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export function Settings() {
  const { user, refresh } = useAuth();
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    weightKg: String(user?.weightKg ?? 70),
    heightCm: String(user?.heightCm ?? 170),
    level: user?.level ?? "beginner",
    goal: user?.goal ?? "mixed",
    daysPerWeek: String(user?.daysPerWeek ?? 3),
    durationMin: String(user?.durationMin ?? 30),
    equipment: user?.equipment ?? "none",
    injuries: user?.injuries ?? "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api("/api/me", {
      method: "PUT",
      body: JSON.stringify({
        ...form,
        weightKg: Number(form.weightKg),
        heightCm: Number(form.heightCm),
        daysPerWeek: Number(form.daysPerWeek),
        durationMin: Number(form.durationMin),
      }),
    });
    await refresh();
    setMsg("Saved.");
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="text-mute mt-2 mb-6">
        Camera is processed in the browser. Video is not uploaded. Calories stay estimates.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        {Object.entries({
          displayName: "Name",
          weightKg: "Weight (kg)",
          heightCm: "Height (cm)",
          injuries: "Injuries",
        }).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="text-mute">{label}</span>
            <input
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2"
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <button className="rounded-xl bg-volt px-4 py-2 font-semibold text-ink">Save profile</button>
        {msg && <p className="text-volt text-sm">{msg}</p>}
      </form>
    </div>
  );
}
