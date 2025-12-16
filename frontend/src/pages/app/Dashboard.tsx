import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";
import { TherapistCalendar } from "./TherapistCalendar";

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
          <small>No appointments yet.</small>
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

/**
 * App dashboard router:
 * - clients see ClientDashboard
 * - therapists/admins see TherapistCalendar
 */
export function Dashboard() {
  const { user } = useAuth();
  const [role, setRole] = useState<"admin" | "therapist" | "client" | "unknown">("unknown");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoadingRole(true);
      const { data, error } = await supabase.rpc("my_role");
      if (error) {
        console.warn("my_role failed:", error.message);
        setRole("unknown");
      } else {
        const r = String(data ?? "unknown");
        if (r === "admin" || r === "therapist" || r === "client") setRole(r);
        else setRole("unknown");
      }
      setLoadingRole(false);
    })();
  }, [user]);

  if (!user) return null;

  if (loadingRole) {
    return (
      <div className="card">
        <h3>Loading…</h3>
      </div>
    );
  }

  if (role === "therapist" || role === "admin") {
    return <TherapistCalendar />;
  }

  return <ClientDashboard />;
}
