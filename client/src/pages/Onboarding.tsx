import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

export function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    age: "22",
    sex: "unspecified",
    heightCm: "170",
    weightKg: "70",
    level: "beginner",
    goal: "mixed",
    daysPerWeek: "3",
    durationMin: "30",
    equipment: "none",
    injuries: "",
    acceptDisclaimer: false,
  });

  if (user?.onboarded) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.acceptDisclaimer) {
      setError("Please acknowledge the health disclaimer.");
      return;
    }
    setError("");
    try {
      await api("/api/me", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
          heightCm: Number(form.heightCm),
          weightKg: Number(form.weightKg),
          daysPerWeek: Number(form.daysPerWeek),
          durationMin: Number(form.durationMin),
          acceptDisclaimer: true,
        }),
      });
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-panel p-8">
        <p className="font-display text-volt">Setup</p>
        <h1 className="font-display text-3xl mt-1">Tell the coach who you are</h1>
        <p className="text-mute mt-2 mb-6">
          Weight is used for estimated calories (MET × time). This app is not medical advice.
        </p>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={form.displayName} onChange={(v) => set("displayName", v)} className="sm:col-span-2" />
          <Input label="Age" value={form.age} onChange={(v) => set("age", v)} />
          <Select label="Sex" value={form.sex} onChange={(v) => set("sex", v)} options={["unspecified", "female", "male", "other"]} />
          <Input label="Height (cm)" value={form.heightCm} onChange={(v) => set("heightCm", v)} />
          <Input label="Weight (kg)" value={form.weightKg} onChange={(v) => set("weightKg", v)} />
          <Select label="Level" value={form.level} onChange={(v) => set("level", v)} options={["beginner", "intermediate", "advanced"]} />
          <Select
            label="Goal"
            value={form.goal}
            onChange={(v) => set("goal", v)}
            options={["mixed", "strength", "mobility_yoga", "fat_loss", "consistency"]}
          />
          <Select label="Days / week" value={form.daysPerWeek} onChange={(v) => set("daysPerWeek", v)} options={["2", "3", "4", "5"]} />
          <Select label="Session length (min)" value={form.durationMin} onChange={(v) => set("durationMin", v)} options={["20", "30", "45"]} />
          <Select label="Equipment" value={form.equipment} onChange={(v) => set("equipment", v)} options={["none", "home", "gym"]} />
          <Input label="Injuries (optional)" value={form.injuries} onChange={(v) => set("injuries", v)} className="sm:col-span-2" required={false} />
          <label className="sm:col-span-2 flex gap-3 text-sm text-mist">
            <input type="checkbox" checked={form.acceptDisclaimer} onChange={(e) => set("acceptDisclaimer", e.target.checked)} />
            I understand this is a student fitness coach, not a medical device. I will stop if I feel pain or dizziness.
          </label>
          {error && <p className="sm:col-span-2 text-bad text-sm">{error}</p>}
          <button className="sm:col-span-2 rounded-xl bg-volt py-3 font-semibold text-ink">Save and continue</button>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  className = "",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-mute">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none focus:border-volt"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-sm">
      <span className="text-mute">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none focus:border-volt"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
