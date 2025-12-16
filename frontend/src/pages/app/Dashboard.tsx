import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";
import { useUserRole } from "../../hooks/useUserRole";
import { TherapistCalendar } from "./TherapistCalendar";
import { TherapistScheduleSettings } from "./TherapistScheduleSettings";

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
      <p>
        Use the navigation to complete intake, upload insurance, and schedule your consultation.
      </p>

      <h4>Upcoming appointments</h4>
      {appts.length === 0 ? (
        <p>
          <small>No appointments yet.</small>
        </p>
      ) : (
        <ul>
          {appts.map((a) => (
            <li key={a.id}>
              {formatDateTime(a.start_time)} — {a.kind}{" "}
              <span className="badge">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TherapistOrAdminDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<"calendar" | "settings">("calendar");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h3>{isAdmin ? "Admin Scheduling" : "Therapist Scheduling"}</h3>
        <p style={{ marginTop: 6 }}>
          <small>
            Calendar shows appointments, reserved slots, room blocks, and group sessions. Other
            therapists’ events appear as “Busy”.
          </small>
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => setTab("calendar")} disabled={tab === "calendar"}>
            Calendar
          </button>
          <button onClick={() => setTab("settings")} disabled={tab === "settings"}>
            Schedule Settings
          </button>
        </div>
      </div>

      {tab === "calendar" ? (
        <TherapistCalendar />
      ) : (
        <TherapistScheduleSettings />
      )}
    </div>
  );
}

/**
 * Main dashboard export:
 * - clients get the client dashboard
 * - therapists/admins get calendar + settings
 */
export default function Dashboard() {
  const { role } = useUserRole();

  if (role === "loading") {
    return (
      <div className="card">
        <p>
          <small>Loading…</small>
        </p>
      </div>
    );
  }

  if (role === "admin") return <TherapistOrAdminDashboard isAdmin={true} />;
  if (role === "therapist") return <TherapistOrAdminDashboard isAdmin={false} />;

  return <ClientDashboard />;
}
