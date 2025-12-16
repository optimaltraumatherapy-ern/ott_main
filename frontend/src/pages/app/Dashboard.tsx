import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

import { TherapistCalendar } from "./TherapistCalendar";

// Staff pages (new)
import { AdminHome } from "./AdminHome";
import { AdminSchedule } from "./AdminSchedule";
import { AdminClients } from "./AdminClients";
import { AdminNotes } from "./AdminNotes";
import { AdminTherapists } from "./AdminTherapists";
import { AdminAssessments } from "./AdminAssessments";
import { AdminInsurance } from "./AdminInsurance";
import { AdminForms } from "./AdminForms";

type MyRole = "admin" | "therapist" | "client" | "unknown";

type Appointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  kind: string;
};

export function ClientDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,start_time,end_time,status,kind")
        .eq("client_id", user.id)
        .order("start_time", { ascending: true })
        .limit(10);

      setAppts((data as Appointment[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="card">
      <h3>Welcome</h3>
      <p>Use the navigation to complete intake, upload insurance, and schedule your consultation.</p>

      <h4>Upcoming appointments</h4>
      {appts.length === 0 ? (
        <p>
          <small className="muted">No appointments yet.</small>
        </p>
      ) : (
        <ul>
          {appts.map((a) => (
            <li key={a.id}>
              {formatDateTime(a.start_time)} — {a.kind} <span className="badge">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StaffShell(props: { role: "admin" | "therapist"; userEmailOrId: string }) {
  const nav = useNavigate();

  const menu = useMemo(() => {
    const base = [
      { to: "/app", label: "Home", roles: ["admin", "therapist"] as const },
      { to: "/app/schedule", label: "Schedule", roles: ["admin", "therapist"] as const },
      { to: "/app/clients", label: "Clients", roles: ["admin", "therapist"] as const },
      { to: "/app/notes", label: "Notes", roles: ["admin", "therapist"] as const },
    ];

    const adminOnly = [
      { to: "/app/assessments", label: "Assessments", roles: ["admin"] as const },
      { to: "/app/insurance", label: "Insurance", roles: ["admin"] as const },
      { to: "/app/forms", label: "Submitted forms", roles: ["admin"] as const },
      { to: "/app/therapists", label: "Therapists", roles: ["admin"] as const },
    ];

    return props.role === "admin" ? [...base, ...adminOnly] : base;
  }, [props.role]);

  async function logout() {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  }

  const layoutStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 12,
    alignItems: "start",
  };

  const asideStyle: React.CSSProperties = {
    position: "sticky",
    top: 12,
    alignSelf: "start",
  };

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    display: "block",
    padding: "10px 10px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    opacity: active ? 1 : 0.85,
    background: active ? "rgba(0,0,0,0.06)" : "transparent",
  });

  return (
    <div style={layoutStyle}>
      <aside style={asideStyle}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>Staff</div>
              <div className="muted">
                <small>{props.role}</small>
              </div>
            </div>
            <button onClick={logout}>Logout</button>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            <small>Signed in as</small>
            <div style={{ wordBreak: "break-word" }}>
              <small><strong>{props.userEmailOrId}</strong></small>
            </div>
          </div>

          <hr style={{ margin: "12px 0" }} />

          <nav style={{ display: "grid", gap: 6 }}>
            {menu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <section style={{ minWidth: 0 }}>
        <Routes>
          <Route index element={<AdminHome role={props.role} />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="clients" element={<AdminClients role={props.role} />} />
          <Route path="notes" element={<AdminNotes role={props.role} />} />

          {/* Admin-only */}
          <Route
            path="assessments"
            element={props.role === "admin" ? <AdminAssessments /> : <Navigate to="/app" replace />}
          />
          <Route
            path="insurance"
            element={props.role === "admin" ? <AdminInsurance /> : <Navigate to="/app" replace />}
          />
          <Route
            path="forms"
            element={props.role === "admin" ? <AdminForms /> : <Navigate to="/app" replace />}
          />
          <Route
            path="therapists"
            element={props.role === "admin" ? <AdminTherapists /> : <Navigate to="/app" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </section>
    </div>
  );
}

/**
 * App dashboard router:
 * - /app/* is staff area (admin/therapist)
 * - clients should use /portal
 */
export function Dashboard() {
  const { user } = useAuth();
  const [role, setRole] = useState<MyRole>("unknown");
  const [loadingRole, setLoadingRole] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoadingRole(true);
      setRoleError(null);

      const { data, error } = await supabase.rpc("my_role");
      if (error) {
        setRole("unknown");
        setRoleError(error.message);
        setLoadingRole(false);
        return;
      }

      const r = String(data ?? "unknown").toLowerCase();
      if (r === "admin" || r === "therapist" || r === "client") setRole(r);
      else setRole("unknown");

      setLoadingRole(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="card">
        <h3>Staff</h3>
        <p className="muted"><small>You must be logged in.</small></p>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="card">
        <h3>Loading…</h3>
      </div>
    );
  }

  if (roleError) {
    return (
      <div className="card">
        <h3>Role error</h3>
        <p style={{ color: "crimson" }}>{roleError}</p>
      </div>
    );
  }

  // Clients should not use /app; keep /portal client-only
  if (role === "client") {
    return (
      <div className="card">
        <h3>Client portal</h3>
        <p className="muted">
          <small>This area is for staff. Please use the client portal.</small>
        </p>
        <a href="/portal">Go to /portal</a>
      </div>
    );
  }

  if (role === "admin" || role === "therapist") {
    return <StaffShell role={role} userEmailOrId={user.email ?? user.id} />;
  }

  // Unknown role fallback
  return (
    <div className="card">
      <h3>Not authorized</h3>
      <p className="muted"><small>Your role could not be determined.</small></p>
    </div>
  );
}

export default Dashboard;

/**
 * NOTE:
 * TherapistCalendar is still used by the Schedule tab.
 * Keeping it imported here helps you confirm staff routing is working.
 */
export function _DebugCalendar() {
  return <TherapistCalendar />;
}
