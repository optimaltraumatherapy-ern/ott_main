import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

type Note = { id: string; title: string | null; note: string; created_at: string };

export function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("session_notes")
        .select("id,title,note,created_at")
        .eq("client_id", user.id)
        .eq("client_visible", true)
        .order("created_at", { ascending: false })
        .limit(30);

      setNotes((data as Note[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="card">
      <h3>Notes</h3>
      <p><small>Only notes marked “client-visible” are shown here.</small></p>

      {notes.length === 0 ? (
        <p><small>No notes yet.</small></p>
      ) : (
        notes.map((n) => (
          <div className="card" key={n.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <strong>{n.title ?? "Session Note"}</strong>
              <span className="badge">{formatDateTime(n.created_at)}</span>
            </div>
            <p style={{ whiteSpace: "pre-wrap" }}>{n.note}</p>
          </div>
        ))
      )}
    </div>
  );
}
