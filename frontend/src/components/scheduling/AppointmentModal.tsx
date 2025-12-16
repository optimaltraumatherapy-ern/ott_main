import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type AppointmentDetail = {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  kind: string | null;
  therapist_id: string;
  therapist_display_name: string | null;
  client_id: string;
  client_display_name: string | null;
  room_id: string | null;
  room_name: string | null;
  room_color: string | null;
  notes: string | null;
  availability_slot_id: string | null;
  series_id: string | null;
};

type Room = { id: string; name: string; color: string | null };
type ClientOption = { client_id: string; display_name: string | null };

type EnumOptions = { status: string[]; kind: string[] };

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(v: string) {
  // datetime-local is interpreted as local time; JS Date will treat it as local
  return new Date(v).toISOString();
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: 16,
  width: "min(760px, 94vw)",
  maxHeight: "90vh",
  overflow: "auto",
};

export function AppointmentModal(props: {
  open: boolean;
  appointmentId: string | null;
  canEdit: boolean;
  initialStart: Date | null;
  initialEnd: Date | null;
  onClose: () => void;
  onSaved: () => void;
  onEditSeries: (seriesId: string) => void;
}) {
  const isEdit = !!props.appointmentId;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [detail, setDetail] = useState<AppointmentDetail | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [enumOptions, setEnumOptions] = useState<EnumOptions>({ status: [], kind: [] });

  // Form fields
  const [clientId, setClientId] = useState<string>("");
  const [clientDisplayName, setClientDisplayName] = useState<string>("");
  const [startLocal, setStartLocal] = useState<string>("");
  const [endLocal, setEndLocal] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [detachFromSeries, setDetachFromSeries] = useState<boolean>(false);

  const seriesId = detail?.series_id ?? null;

  const title = useMemo(() => {
    if (!props.open) return "";
    if (isEdit) return "Edit appointment";
    return "New appointment";
  }, [props.open, isEdit]);

  useEffect(() => {
    if (!props.open) return;

    (async () => {
      setErr(null);

      // Rooms
      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("id,name,color")
        .order("name", { ascending: true });

      if (!roomErr) setRooms((roomData as Room[]) ?? []);

      // Clients (therapist’s client list)
      const { data: clientData, error: clientErr } = await supabase.rpc("list_my_clients");
      if (!clientErr) setClients((clientData as ClientOption[]) ?? []);

      // Enum options (status/kind)
      const { data: enumData, error: enumErr } = await supabase.rpc("appointment_enum_options");
      if (!enumErr && enumData) {
        setEnumOptions({
          status: Array.isArray((enumData as any).status) ? (enumData as any).status : [],
          kind: Array.isArray((enumData as any).kind) ? (enumData as any).kind : [],
        });
      }
    })();
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;

    // Reset form whenever opened
    setLoading(false);
    setErr(null);
    setDetail(null);
    setDetachFromSeries(false);

    if (isEdit && props.appointmentId) {
      (async () => {
        setLoading(true);
        setErr(null);

        const { data, error } = await supabase.rpc("get_appointment_detail", {
          p_appointment_id: props.appointmentId,
        });

        if (error) {
          setErr(error.message);
          setLoading(false);
          return;
        }

        const row = (data as AppointmentDetail[])?.[0] ?? null;
        setDetail(row);

        if (row) {
          setClientId(row.client_id);
          setClientDisplayName(row.client_display_name ?? "");
          setStartLocal(toLocalInputValue(row.start_time));
          setEndLocal(toLocalInputValue(row.end_time));
          setRoomId(row.room_id ?? "");
          setNotes(row.notes ?? "");
          setKind(row.kind ?? "");
          setStatus(row.status ?? "");
        }

        setLoading(false);
      })();
    } else {
      // Create mode: prefill from selected range
      const start = props.initialStart ?? new Date();
      const end = props.initialEnd ?? new Date(start.getTime() + 50 * 60000);
      setStartLocal(toLocalInputValue(start.toISOString()));
      setEndLocal(toLocalInputValue(end.toISOString()));
      setClientId("");
      setClientDisplayName("");
      setRoomId("");
      setNotes("");
      setKind(enumOptions.kind?.[0] ?? "consult");
      setStatus(enumOptions.status?.[0] ?? "scheduled");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.appointmentId]);

  if (!props.open) return null;

  async function save() {
    setErr(null);

    if (!props.canEdit) {
      setErr("You do not have permission to edit this appointment.");
      return;
    }

    if (!clientId) {
      setErr("Please select a client.");
      return;
    }
    if (!startLocal || !endLocal) {
      setErr("Start and end time are required.");
      return;
    }

    const startIso = fromLocalInputValue(startLocal);
    const endIso = fromLocalInputValue(endLocal);

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setErr("End must be after start.");
      return;
    }

    setLoading(true);

    try {
      if (isEdit && props.appointmentId) {
        const { error } = await supabase.rpc("update_appointment", {
          p_appointment_id: props.appointmentId,
          p_start_time: startIso,
          p_end_time: endIso,
          p_room_id: roomId ? roomId : null,
          p_notes: notes,
          p_detach_from_series: detachFromSeries,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("create_appointment", {
          p_client_id: clientId,
          p_start_time: startIso,
          p_end_time: endIso,
          p_kind: kind,
          p_status: status,
          p_room_id: roomId ? roomId : null,
          p_notes: notes,
          p_therapist_id: null,
        });

        if (error) throw error;
      }

      // Update client display name (optional)
      if (clientId && clientDisplayName.trim().length > 0) {
        const { error: upsertErr } = await supabase
          .from("client_profiles")
          .upsert(
            { client_id: clientId, display_name: clientDisplayName.trim() },
            { onConflict: "client_id" }
          );

        if (upsertErr) {
          // Non-fatal, but surface it
          console.warn("client_profiles upsert failed:", upsertErr.message);
        }
      }

      props.onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle} onMouseDown={props.onClose}>
      <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={props.onClose}>Close</button>
        </div>

        {loading && <p><small>Loading…</small></p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label><small>Client</small></label>
            {isEdit ? (
              <div>
                <div style={{ fontWeight: 600 }}>{detail?.client_display_name ?? "Client"}</div>
                <input
                  value={clientDisplayName}
                  onChange={(e) => setClientDisplayName(e.target.value)}
                  placeholder="Edit client display name"
                  style={{ width: "100%", marginTop: 6 }}
                />
                <small style={{ opacity: 0.75 }}>Editing display name updates client_profiles.</small>
              </div>
            ) : (
              <>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "100%" }}>
                  <option value="">Select a client…</option>
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.display_name ?? c.client_id}
                    </option>
                  ))}
                </select>
                <input
                  value={clientDisplayName}
                  onChange={(e) => setClientDisplayName(e.target.value)}
                  placeholder="Optional display name"
                  style={{ width: "100%", marginTop: 6 }}
                />
              </>
            )}
          </div>

          <div>
            <label><small>Room</small></label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }}>
              <option value="">No room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {seriesId && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => props.onEditSeries(seriesId)}>Edit recurring series…</button>
              </div>
            )}
          </div>

          <div>
            <label><small>Start</small></label>
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label><small>End</small></label>
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label><small>Kind</small></label>
            {enumOptions.kind.length ? (
              <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: "100%" }}>
                {enumOptions.kind.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            ) : (
              <input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="e.g. consult" style={{ width: "100%" }} />
            )}
          </div>

          <div>
            <label><small>Status</small></label>
            {enumOptions.status.length ? (
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
                {enumOptions.status.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="e.g. scheduled" style={{ width: "100%" }} />
            )}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label><small>Notes</small></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              style={{ width: "100%" }}
              placeholder="Private appointment notes"
            />
          </div>

          {seriesId && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={detachFromSeries}
                  onChange={(e) => setDetachFromSeries(e.target.checked)}
                />
                <small>Detach this occurrence from the recurring series</small>
              </label>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={props.onClose} disabled={loading}>Cancel</button>
          <button onClick={save} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>

        {seriesId && (
          <p style={{ marginTop: 10, opacity: 0.75 }}>
            <small>
              Tip: Dragging/resizing a recurring occurrence will detach it automatically (single-occurrence exception).
              Use “Edit recurring series…” to change the whole schedule going forward.
            </small>
          </p>
        )}
      </div>
    </div>
  );
}
