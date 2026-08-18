import { Navigate, Route, Routes, type ReactNode } from "react-router-dom";
import { useAuth } from "./auth";
import { Shell } from "./components/Shell";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { LiveSession } from "./pages/LiveSession";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { PlanBuilder } from "./pages/PlanBuilder";
import { PlanImport } from "./pages/PlanImport";
import { Plans } from "./pages/Plans";
import { Register } from "./pages/Register";
import { Report } from "./pages/Report";
import { Settings } from "./pages/Settings";

function Gate({ children, needOnboard = false }: { children: ReactNode; needOnboard?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-mute">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needOnboard && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/onboarding"
        element={
          <Gate>
            <Onboarding />
          </Gate>
        }
      />
      <Route
        element={
          <Gate needOnboard>
            <Shell />
          </Gate>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/new" element={<PlanBuilder />} />
        <Route path="/plans/import" element={<PlanImport />} />
        <Route path="/session/:planId/:sessionId" element={<LiveSession />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
