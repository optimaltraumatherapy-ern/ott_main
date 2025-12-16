import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

type ClientOpt = { id: string; label: string };
type TherapistOpt = { therapist_id: string; display_name: string | null };

type AppointmentOpt = { id: string; start_time: string; end_time: string; therapist_id: string };

type NoteRow = {
  id: string;
  therapist_id: string;
  client_id: string;
  appointment_id: string | null;
  title: string | null;
  note: string;
  client_visible: boolean;
  created_at: string;
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export function AdminNotes(props: { role: "admin" | "therapist" }) {
  const { user } = useAuth();
  const loc = useLocation();

  const sp = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const clientFromUrl = sp.get("client");
  const apptFromUrl = sp.get("appointment");

  const [status, setStatus] = useState<string | null>(null);

  // Filters
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [clientId, setClientId] = useState<string>(clientFromUrl ?? "");

  const [therapists, setTherapists] = useState<TherapistOpt[]>([]);
  const [therapistId, setTherapistId] = useState<string>("");

  const [appts, setAppts] = useState<AppointmentOpt[]>([]);
  const [appointmentId, setAppointmentId] = useState<string>(apptFromUrl ?? "");

  // Notes list
  const [notes, setNotes] = useState<NoteRow[]>([]);

  // Create form
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [clientVisible, setClientVisible] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editClientVisible, setEditClientVisible] = useState(false);

  // Load clients list
  useEffect(() => {
    (async () => {
      setStatus(null);

      try {
        if (props.role === "admin") {
          const { data, error } = await supabase
            .from("profiles")
            .select("id,full_name,email,role")
            .eq("role", "client")
            .order("created_at", { ascending: false })
            .limit(500);

          if (error) throw error;

          const opts: ClientOpt[] = ((data as any[]) ?? []).map((p) => ({
            id: p.id,
            label: p.full_name || p.email || p.id,
          }));

          setClients(opts);
        } else {
          const { data, error } = await supabase.rpc("list_my_clients");
          if (error) throw error;

          const opts: ClientOpt[] = ((data as any[]) ?? []).map((c) => ({
            id: c.client_id,
            label: c.display_name || c.client_id,
          }));

          setClients(opts);
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load clients");
      }
    })();
  }, [props.role]);

  // Load therapist list for admin-created notes
  useEffect(() => {
    if (props.role !== "admin") return;

    (async () => {
      const { data } = await supabase
        .from("therapist_profiles")
        .select("therapist_id,display_name")
        .order("display_name", { ascending: true });

      setTherapists((data as TherapistOpt[]) ?? []);
    })();
  }, [props.role]);

  // When client changes, load appointments and notes for that client
  useEffect(() => {
    if (!clientId) {
      setAppts([]);
      setNotes([]);
      return;
    }

    (async () => {
      setStatus(null);

      // appointments for linking
      const { data: apptData } = await supabase
        .from("appointments")
        .select("id,start_time,end_time,therapist_id")
        .eq("client_id", clientId)
        .order("start_time", { ascending: false })
        .limit(80);

      const apptRows = (apptData as AppointmentOpt[]) ?? [];
      setAppts(apptRows);

      // If URL provided appointment, keep it if exists
      if (appointmentId && !apptRows.some((a) => a.id === appointmentId)) {
        // keep but may be outside limit
      }

      // notes
      const { data: noteData, error: noteErr } = await supabase
        .from("session_notes")
        .select("id,therapist_id,client_id,appointment_id,title,note,client_visible,created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (noteErr) {
        setStatus(noteErr.message);
        setNotes([]);
      } else {
        setNotes((noteData as NoteRow[]) ?? []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // If appointment selected, default therapistId to appointment therapist (admin workflow)
  useEffect(() => {
    if (!appointmentId) return;
    const a = appts.find((x) => x.id === appointmentId);
    if (a?.therapist_id) setTherapistId(a.therapist_id);
  }, [appointmentId, appts]);

  async function createNote() {
    setStatus(null);

    if (!user) return setStatus("Not signed in.");
    if (!clientId) return setStatus("Select a client.");
    if (!note.trim()) return setStatus("Note text is required.");

    let effectiveTherapistId = user.id;

    if (props.role === "admin") {
      // For admin, require therapist attribution, typically from appointment selection.
      effectiveTherapistId = therapistId || "";
      if (!effectiveTherapistId) return setStatus("Select an appointment or choose a therapist for this note.");
    }

    const payload = {
      therapist_id: effectiveTherapistId,
      client_id: clientId,
      appointment_id: appointmentId || null,
      title: title.trim() || null,
      note: note.trim(),
      client_visible: clientVisible,
    };

    const { error } = await supabase.from("session_notes").insert(payload);
    if (error) return setStatus(`Create failed: ${error.message}`);

    setTitle("");
    setNote("");
    setClientVisible(false);

    // refresh
    const { data } = await supabase
      .from("session_notes")
      .select("id,therapist_id,client_id,appointment_id,title,note,client_visible,created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(200);

    setNotes((data as NoteRow[]) ?? []);
    setStatus("Saved.");
  }

  function beginEdit(n: NoteRow) {
    setEditingId(n.id);
    setEditTitle(n.title ?? "");
    setEditNote(n.note);
    setEditClientVisible(!!n.client_visible);
  }

  async function saveEdit() {
    if (!editingId) return;

    const { error } = await supabase
      .from("session_notes")
      .update({
        title: editTitle.trim() || null,
        note: editNote,
        client_visible: editClientVisible,
      })
      .eq("id", editingId);

    if (error) return setStatus(`Update failed: ${error.message}`);

    setEditingId(null);
    setStatus("Updated.");

    // refresh list
    const { data } = await supabase
      .from("session_notes")
      .select("id,therapist_id,client_id,appointment_id,title,note,client_visible,created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(200);

    setNotes((data as NoteRow[]) ?? []);
  }

  const appointmentOptions = useMemo(() => {
    return appts.map((a) => ({
      id: a.id,
      label: `${formatDateTime(a.start_time)} → ${formatDateTime(a.end_time)}`,
      therapist_id: a.therapist_id,
    }));
  }, [appts]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Notes</h3>
        <p className="muted">
          <small>
            Admin: view/create/edit notes across clients. Therapist: limited by RLS to associated clients.
          </small>
        </p>
        {status && <p className="muted"><small>{status}</small></p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label><small>Client</small></label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label><small>Link to appointment (optional)</small></label>
            <select
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              style={{ width: "100%" }}
              disabled={!clientId}
            >
              <option value="">No appointment</option>
              {appointmentOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          {props.role === "admin" ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <label><small>Therapist attribution (required for admin-created notes)</small></label>
              <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} style={{ width: "100%" }}>
                <option value="">Select therapist…</option>
                {therapists.map((t) => (
                  <option key={t.therapist_id} value={t.therapist_id}>
                    {t.display_name ?? t.therapist_id}
                  </option>
                ))}
              </select>
              <p className="muted" style={{ marginTop: 6 }}>
                <small>Tip: selecting an appointment auto-fills this.</small>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Create note</h4>

        <label><small>Title (optional)</small></label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label style={{ marginTop: 10 }}><small>Note</small></label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={6} />

        <label style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={clientVisible}
            onChange={(e) => setClientVisible(e.target.checked)}
          />
          <small>Client-visible</small>
        </label>

        <div style={{ marginTop: 10 }}>
          <button onClick={createNote} disabled={!clientId}>Save note</button>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Existing notes</h4>
        {!clientId ? (
          <p className="muted"><small>Select a client to see notes.</small></p>
        ) : notes.length === 0 ? (
          <p className="muted"><small>No notes yet.</small></p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {notes.map((n) => (
              <div key={n.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800 }}>{n.title ?? "Session note"}</div>
                  <div className="muted">
                    <small>{formatDateTime(n.created_at)}</small>
                  </div>
                </div>

                {editingId === n.id ? (
                  <>
                    <label style={{ marginTop: 8 }}><small>Title</small></label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />

                    <label style={{ marginTop: 8 }}><small>Note</small></label>
                    <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={6} />

                    <label style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={editClientVisible}
                        onChange={(e) => setEditClientVisible(e.target.checked)}
                      />
                      <small>Client-visible</small>
                    </label>

                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button onClick={saveEdit}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{n.note}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="badge">{n.client_visible ? "client-visible" : "private"}</span>
                      {n.appointment_id ? <span className="muted"><small>appt: {n.appointment_id}</small></span> : null}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => beginEdit(n)}>Edit</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
