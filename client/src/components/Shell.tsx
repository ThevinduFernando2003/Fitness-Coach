import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const links = [
  { to: "/", label: "Today" },
  { to: "/plans", label: "Plans" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-ink text-mist">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-display text-xl tracking-tight text-volt">Fitness Coach</p>
          <p className="text-xs text-mute">Plan · timer · vision · follow-check</p>
        </div>
        <nav className="flex gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm ${isActive ? "bg-volt text-ink font-semibold" : "text-mist hover:bg-panel-2"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="text-sm text-mute hover:text-mist"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          {user?.displayName} · Sign out
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
