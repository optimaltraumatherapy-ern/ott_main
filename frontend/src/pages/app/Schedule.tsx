import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";

type Slot = {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
};

type Therapist = {
  therapist_id: string;
  display_name: string | null;
};

export function Schedule() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [therapists, setTherapists] = useState<Record<string, Therapist>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: slotData } = await supabase
        .from("availability_slots")
        .select("id,therapist_id,start_time,end_time,is_booked")
        .eq("is_booked", false)
        .order("start_time", { ascending: true })
        .limit(30);

      const s = (slotData as Slot[]) ?? [];
      setSlots(s);

      const ids = Array.from(new Set(s.map((x) => x.therapist_id)));
      if (ids.length) {
        const { data: tData } = await supabase
          .from("therapist_profiles")
          .select("therapist_id,display_name")
          .in("therapist_id", ids);

        const map: Record<string, Therapist> = {};
        ((tData as Therapist[]) ?? []).forEach((t) => (map[t.therapist_id] = t));
        setTherapists(map);
      }
    })();
  }, []);

  const rows = useMemo(() => slots, [slots]);

  async function book(slotId: string) {
    setStatus(null);
    const { data, error } = await supabase.rpc("book_availability_slot", { p_slot_id: slotId });
    if (error) return setStatus(`Booking failed: ${error.message}`);
    setStatus(`Booked! Appointment id: ${data}`);
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }

  return (
    <div className="card">
      <h3>Schedule a consultation</h3>
      <p><small>Select an available slot and book instantly.</small></p>

      {status && <p>{status}</p>}

      {rows.length === 0 ? (
        <p><small>No open slots yet. Please check back soon.</small></p>
      ) : (
        <ul>
          {rows.map((s) => (
            <li key={s.id} style={{ marginBottom: 10 }}>
              <div>
                <strong>{therapists[s.therapist_id]?.display_name ?? "Therapist"}</strong>{" "}
                <span className="badge">consult</span>
              </div>
              <div>
                {formatDateTime(s.start_time)} → {formatDateTime(s.end_time)}
              </div>
              <button onClick={() => book(s.id)} style={{ marginTop: 6 }}>Book</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
