import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";

type Slot = {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  is_public: boolean;
  room_id: string | null;
};

type Therapist = {
  therapist_id: string;
  display_name: string | null;
};

type PublicGroupSession = {
  id: string;
  therapist_id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  joined_count: number;
  is_joined: boolean;
};

export function Schedule() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [therapists, setTherapists] = useState<Record<string, Therapist>>({});
  const [status, setStatus] = useState<string | null>(null);

  const [groups, setGroups] = useState<PublicGroupSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: slotData, error: slotErr } = await supabase
        .from("availability_slots")
        .select("id,therapist_id,start_time,end_time,is_booked,is_public,room_id")
        .eq("is_booked", false)
        .eq("is_public", true)
        .order("start_time", { ascending: true })
        .limit(40);

      if (slotErr) setStatus(`Failed loading slots: ${slotErr.message}`);

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

      // group sessions
      const { data: gData, error: gErr } = await supabase.rpc("list_public_group_sessions", {});
      if (gErr) setStatus((prev) => prev ?? `Failed loading group sessions: ${gErr.message}`);
      setGroups((gData as PublicGroupSession[]) ?? []);

      setLoading(false);
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

  async function joinGroup(id: string) {
    setStatus(null);
    const { error } = await supabase.rpc("join_group_session", { p_group_session_id: id });
    if (error) return setStatus(`Join failed: ${error.message}`);

    setStatus("Joined group session.");
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, is_joined: true, joined_count: g.joined_count + 1 } : g
      )
    );
  }

  async function leaveGroup(id: string) {
    setStatus(null);
    const { error } = await supabase.rpc("leave_group_session", { p_group_session_id: id });
    if (error) return setStatus(`Leave failed: ${error.message}`);

    setStatus("Left group session.");
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, is_joined: false, joined_count: Math.max(0, g.joined_count - 1) } : g
      )
    );
  }

  return (
    <div className="card">
      <h3>Schedule</h3>
      <p>
        <small>Select an available slot to book instantly, or join a public group session.</small>
      </p>

      {status && <p>{status}</p>}

      {loading ? (
        <p>
          <small>Loading…</small>
        </p>
      ) : (
        <>
          <h4>Public group sessions</h4>
          {groups.length === 0 ? (
            <p>
              <small>No public group sessions scheduled yet.</small>
            </p>
          ) : (
            <ul>
              {groups.map((g) => {
                const remaining = Math.max(0, g.capacity - g.joined_count);
                return (
                  <li key={g.id} style={{ marginBottom: 10 }}>
                    <div>
                      <strong>{g.title}</strong>{" "}
                      <span className="badge">group</span>{" "}
                      <small>
                        ({remaining} spots left)
                      </small>
                    </div>
                    {g.description && (
                      <div>
                        <small>{g.description}</small>
                      </div>
                    )}
                    <div>
                      {formatDateTime(g.start_time)} → {formatDateTime(g.end_time)}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {g.is_joined ? (
                        <button onClick={() => leaveGroup(g.id)}>Leave</button>
                      ) : (
                        <button onClick={() => joinGroup(g.id)} disabled={remaining <= 0}>
                          {remaining <= 0 ? "Full" : "Join"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <hr style={{ margin: "14px 0" }} />

          <h4>1:1 available slots</h4>
          {rows.length === 0 ? (
            <p>
              <small>No open slots yet. Please check back soon.</small>
            </p>
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
                  <button onClick={() => book(s.id)} style={{ marginTop: 6 }}>
                    Book
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
