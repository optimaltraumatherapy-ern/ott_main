import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../../lib/supabaseClient";

type SeriesDetail = {
  id: string;
  therapist_id: string;
  client_id: string;
  client_display_name: string | null;
  kind: string;
  status: string;
  start_time: string;
  duration_minutes: number;
  weekdays: number[];
  until_date: string; // YYYY-MM-DD
  room_id: string | null;
  room_name: string | null;
  room_color: string | null;
  notes: string | null;
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
  return new Date(v).toISOString();
}

function todayDateInput() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function chooseDefaultOption(options: string[], preferred?: string): string {
  if (!options || options.length === 0) return "";
  if (preferred && options.includes(preferred)) return preferred;
  // noUncheckedIndexedAccess-safe:
  return options[0] ?? "";
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 55,
};

const modalStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: 16,
  width: "min(760px, 94vw)",
  maxHeight: "90vh",
  overflow: "auto",
};

const weekdayOptions = [
  { dow: 0, label: "Sun" },
  { dow: 1, label: "Mon" },
  { dow: 2, label: "Tue" },
  { dow: 3, label: "Wed" },
  { dow: 4, label: "Thu" },
  { dow: 5, label: "Fri" },
  { dow: 6, label: "Sat" },
];

export function RecurringSeriesModal(props: {
  open: boolean;
  seriesId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!props.seriesId;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [enumOptions, setEnumOptions] = useState<EnumOptions>({ status: [], kind: [] });

  const [detail, setDetail] = useState<SeriesDetail | null>(null);

  // Form
  const [clientId, setClientId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [untilDate, setUntilDate] = useState("");
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [applyFromDate, setApplyFromDate] = useState(todayDateInput());

  const title = useMemo(() => (isEdit ? "Edit recurring series" : "New recurring series"), [isEdit]);

  // Load support data on open
  useEffect(() => {
    if (!props.open) return;

    (async () => {
      setErr(null);

      const [
        { data: roomData, error: roomErr },
        { data: clientData, error: clientErr },
        { data: enumData, error: enumErr },
      ] = await Promise.all([
        supabase.from("rooms").select("id,name,color").order("name", { ascending: true }),
        supabase.rpc("list_my_clients"),
        supabase.rpc("appointment_enum_options"),
      ]);

      if (!roomErr) setRooms((roomData as Room[]) ?? []);
      if (!clientErr) setClients((clientData as ClientOption[]) ?? []);

      if (!enumErr && enumData) {
        setEnumOptions({
          status: Array.isArray((enumData as any).status) ? (enumData as any).status : [],
          kind: Array.isArray((enumData as any).kind) ? (enumData as any).kind : [],
        });
      }
    })();
  }, [props.open]);

  // Load series detail (edit mode) or initialize defaults (create mode)
  useEffect(() => {
    if (!props.open) return;

    setErr(null);
    setLoading(false);
    setDetail(null);

    if (isEdit && props.seriesId) {
      (async () => {
        setLoading(true);

        const { data, error } = await supabase.rpc("get_recurring_series_detail", {
          p_series_id: props.seriesId,
        });

        if (error) {
          setErr(error.message);
          setLoading(false);
          return;
        }

        const row = (data as SeriesDetail[])?.[0] ?? null;
        setDetail(row);

        if (row) {
          setClientId(row.client_id);
          setStartLocal(toLocalInputValue(row.start_time));
          setDurationMinutes(row.duration_minutes);
          setWeekdays(Array.isArray(row.weekdays) ? row.weekdays : []);
          setUntilDate(row.until_date);
          setRoomId(row.room_id ?? "");
          setNotes(row.notes ?? "");
          setKind(row.kind ?? "");
          setStatus(row.status ?? "");
          setApplyFromDate(todayDateInput());
        }

        setLoading(false);
      })();
    } else {
      // Create defaults
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60000);
      const endDate = new Date(start.getTime() + 8 * 7 * 24 * 60 * 60000);

      setClientId("");
      setStartLocal(toLocalInputValue(start.toISOString()));
      setDurationMinutes(50);
      setWeekdays([1, 2, 3, 4, 5]);
      setUntilDate(endDate.toISOString().slice(0, 10));
      setRoomId("");
      setNotes("");
      setKind(""); // set once enums are available
      setStatus(""); // set once enums are available
      setApplyFromDate(todayDateInput());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.seriesId]);

  // Safe defaults for create mode once enums are loaded
  useEffect(() => {
    if (!props.open) return;
    if (isEdit) return;

    setKind((prev) => prev || chooseDefaultOption(enumOptions.kind, "session"));
    setStatus((prev) => prev || chooseDefaultOption(enumOptions.status, "scheduled"));
  }, [enumOptions, props.open, isEdit]);

  if (!props.open) return null;

  function toggleDow(dow: number) {
    setWeekdays((prev) => {
      const set = new Set(prev);
      if (set.has(dow)) set.delete(dow);
      else set.add(dow);
      return Array.from(set).sort((a, b) => a - b);
    });
  }

  async function save() {
    setErr(null);

    if (!clientId) return setErr("Please select a client.");
    if (!startLocal) return setErr("Start time is required.");
    if (!untilDate) return setErr("Stop date (until) is required.");
    if (!weekdays.length) return setErr("Select at least one weekday.");
    if (!durationMinutes || durationMinutes <= 0) return setErr("Duration must be > 0.");
    if (!kind) return setErr("Kind is required.");
    if (!status) return setErr("Status is required.");

    const startIso = fromLocalInputValue(startLocal);

    // Guard: until_date should not be before start date
    const startDate = new Date(startIso).toISOString().slice(0, 10);
    if (untilDate < startDate) {
      return setErr("Stop date (until) must be on/after the start date.");
    }

    setLoading(true);

    try {
      if (!isEdit) {
        const { error } = await supabase.rpc("create_recurring_series", {
          p_client_id: clientId,
          p_kind: kind,
          p_status: status,
          p_start_time: startIso,
          p_duration_minutes: durationMinutes,
          p_weekdays: weekdays,
          p_until_date: untilDate,
          p_room_id: roomId ? roomId : null,
          p_notes: notes,
        });

        if (error) throw error;
      } else {
        // Send UTC midnight explicitly to avoid timezone shifting across locales
        const applyFromIso = `${applyFromDate}T00:00:00.000Z`;

        const { error } = await supabase.rpc("update_recurring_series", {
          p_series_id: props.seriesId,
          p_kind: kind,
          p_status: status,
          p_start_time: startIso,
          p_duration_minutes: durationMinutes,
          p_weekdays: weekdays,
          p_until_date: untilDate,
          p_room_id: roomId ? roomId : null,
          p_notes: notes,
          p_apply_from: applyFromIso,
        });

        if (error) throw error;
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

        {loading && (
          <p>
            <small>Loading…</small>
          </p>
        )}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        {detail && (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            <small>
              Client: <strong>{detail.client_display_name ?? detail.client_id}</strong>
              {detail.room_name ? (
                <>
                  {" "}
                  · Room: <strong>{detail.room_name}</strong>
                </>
              ) : null}
            </small>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label>
              <small>Client</small>
            </label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.display_name ?? c.client_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>
              <small>Room</small>
            </label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }}>
              <option value="">No room</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>
              <small>Series start (first occurrence time)</small>
            </label>
            <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div>
            <label>
              <small>Duration (minutes)</small>
            </label>
            <input
              type="number"
              min={5}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value || "0", 10))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label>
              <small>Weekdays</small>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
              {weekdayOptions.map((d) => (
                <label key={d.dow} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={weekdays.includes(d.dow)} onChange={() => toggleDow(d.dow)} />
                  <small>{d.label}</small>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label>
              <small>Stop date (until)</small>
            </label>
            <input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div>
            <label>
              <small>Kind</small>
            </label>
            {enumOptions.kind.length ? (
              <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: "100%" }}>
                {enumOptions.kind.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            ) : (
              <input value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: "100%" }} />
            )}
          </div>

          <div>
            <label>
              <small>Status</small>
            </label>
            {enumOptions.status.length ? (
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
                {enumOptions.status.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }} />
            )}
          </div>

          {isEdit && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label>
                <small>Apply series changes starting from</small>
              </label>
              <input type="date" value={applyFromDate} onChange={(e) => setApplyFromDate(e.target.value)} style={{ width: "100%" }} />
              <small style={{ opacity: 0.75 }}>This will delete & recreate future occurrences from this date forward.</small>
            </div>
          )}

          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <small>Series notes</small>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{ width: "100%" }}
              placeholder="Notes applied to generated appointments"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={props.onClose} disabled={loading}>
            Cancel
          </button>
          <button onClick={save} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
