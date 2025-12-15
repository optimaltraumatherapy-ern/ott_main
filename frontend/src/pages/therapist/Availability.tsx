import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

type Slot = { id: string; start_time: string; end_time: string; is_booked: boolean };

export function Availability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    if (!user) return;
    const { data } = await supabase
      .from("availability_slots")
      .select("id,start_time,end_time,is_booked")
      .eq("therapist_id", user.id)
      .order("start_time", { ascending: true })
      .limit(50);

    setSlots((data as Slot[]) ?? []);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function addSlot() {
    if (!user) return;
    setStatus(null);

    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();

    const { error } = await supabase.from("availability_slots").insert({
      therapist_id: user.id,
      start_time: startIso,
      end_time: endIso
    });

    if (error) return setStatus(error.message);

    setStart("");
    setEnd("");
    await refresh();
  }

  return (
    <div className="card">
      <h3>Availability</h3>
      <p><small>Create bookable consultation slots.</small></p>

      {status && <p style={{ color: "crimson" }}>{status}</p>}

      <div className="card">
        <label>Start (local)</label>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />

        <label>End (local)</label>
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />

        <div style={{ marginTop: 12 }}>
          <button onClick={addSlot} disabled={!start || !end}>Add slot</button>
        </div>
      </div>

      <h4>Your slots</h4>
      {slots.length === 0 ? (
        <p><small>No slots yet.</small></p>
      ) : (
        <ul>
          {slots.map((s) => (
            <li key={s.id}>
              {formatDateTime(s.start_time)} → {formatDateTime(s.end_time)}{" "}
              {s.is_booked ? <span className="badge">booked</span> : <span className="badge">open</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
