import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

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
        <p><small>No appointments yet.</small></p>
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
