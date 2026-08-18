import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (!loading && user) return <Navigate to={user.onboarded ? "/" : "/onboarding"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to run today's plan.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        {error && <p className="text-bad text-sm">{error}</p>}
        <button className="w-full rounded-xl bg-volt py-3 font-semibold text-ink">Sign in</button>
      </form>
      <p className="mt-6 text-sm text-mute">
        New here? <Link className="text-volt" to="/register">Create an account</Link>
      </p>
    </AuthCard>
  );
}

export function Register() {
  const { user, register, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (!loading && user) return <Navigate to="/onboarding" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await register(email, password, displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register.");
    }
  }

  return (
    <AuthCard title="Create your coach" subtitle="Plans, timers, and follow-check live on your account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" value={displayName} onChange={setDisplayName} />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        {error && <p className="text-bad text-sm">{error}</p>}
        <button className="w-full rounded-xl bg-volt py-3 font-semibold text-ink">Create account</button>
      </form>
      <p className="mt-6 text-sm text-mute">
        Already have an account? <Link className="text-volt" to="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-panel p-8">
        <p className="font-display text-volt text-sm tracking-wide">FITNESS COACH</p>
        <h1 className="font-display text-3xl mt-2">{title}</h1>
        <p className="text-mute mt-1 mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-mute">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 outline-none focus:border-volt"
        required
      />
    </label>
  );
}
