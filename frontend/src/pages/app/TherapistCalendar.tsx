import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateSelectArg, EventClickArg } from "@fullcalendar/interaction";

import "@fullcalendar/core/index.css";
import "@fullcalendar/timegrid/index.css";
import "@fullcalendar/daygrid/index.css";

type Room = { id: string; name: string; color: string | null };

type CalendarEventRow = {
  event_type: "appointment" | "availability_slot" | "room_block" | "group_session";
  id: string;
  start_time: string;
  end_time: string;
  room_id: string | null;
  room_name: string | null;
  room_color: string | null;
  therapist_id: string | null;
  client_id: string | null;
  title: string | null;
  status: string | null;
  kind: string | null;
  is_mine: boolean;
  can_edit: boolean;
};

type TherapistClientRow = { client_id: string };

function isoAddWeeks(isoStart: string, weeks: number) {
  const d = new Date(isoStart);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString();
}

export function TherapistCalendar() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [clients, setClients] = useState<TherapistClientRow[]>([]);

  // modal state
  const [modal, setModal] = useState<
    | null
    | {
        mode: "create";
        start: string;
        end: string;
      }
    | {
        mode: "edit";
        event: CalendarEventRow;
      }
  >(null);

  // create form state
  const [createType, setCreateType] = useState<"appointment" | "group_session" | "room_block">(
    "appointment"
  );
  const [clientId, setClientId] = useState<string>("");
  const [kind, setKind] = useState<string>("session");
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(8);

  // recurring (simple weekly count)
  const [repeatWeeklyCount, setRepeatWeeklyCount] = useState<number>(0);

  // edit state
  const [editStart, setEditStart] = useState<string>("");
  const [editEnd, setEditEnd] = useState<string>("");
  const [editRoomId, setEditRoomId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [editKind, setEditKind] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    (async () => {
      // rooms
      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("id,name,color")
        .order("name", { ascending: true });

      if (roomErr) setStatus(`Failed to load rooms: ${roomErr.message}`);
      setRooms((roomData as Room[]) ?? []);

      // default room from settings if exists
      const { data: settings } = await supabase
        .from("therapist_schedule_settings")
        .select("default_room_id")
        .eq("therapist_id", user.id)
        .maybeSingle();

      const defaultRoom = (settings as any)?.default_room_id as string | null;
      setRoomId(defaultRoom ?? (roomData?.[0]?.id ?? null));

      // therapist clients (IDs only)
      const { data: clientData } = await supabase
        .from("therapist_clients")
        .select("client_id")
        .eq("therapist_id", user.id);

      setClients((clientData as TherapistClientRow[]) ?? []);
    })();
  }, [user]);

  async function loadEvents(rangeStartIso: string, rangeEndIso: string, rId: string | null) {
    setStatus(null);
    if (!rId) {
      setEvents([]);
      return;
    }

    const { data, error } = await supabase.rpc("get_calendar_events", {
      p_start_time: rangeStartIso,
      p_end_time: rangeEndIso,
      p_room_id: rId,
    });

    if (error) {
      setStatus(`Failed to load calendar events: ${error.message}`);
      setEvents([]);
      return;
    }

    setEvents((data as CalendarEventRow[]) ?? []);
  }

  const fcEvents = useMemo(() => {
    return events.map((e) => {
      const baseId = `${e.event_type}:${e.id}`;
      const isBusyOther = !e.can_edit && (e.event_type === "appointment" || e.event_type === "availability_slot");
      const isSlot = e.event_type === "availability_slot";
      const isBlock = e.event_type === "room_block";
      const isGroup = e.event_type === "group_session";

      const title =
        e.event_type === "availability_slot"
          ? e.title ?? "Slot"
          : e.title ?? e.event_type;

      return {
        id: baseId,
        title,
        start: e.start_time,
        end: e.end_time,

        // visual language:
        // - non-editable items display as background “busy”
        display: isBusyOther ? "background" : "auto",
        // - room blocks are strong
        backgroundColor: isBlock ? "#d9534f" : undefined,
        // - group sessions distinct
        borderColor: isGroup ? "#6f42c1" : undefined,

        extendedProps: {
          raw: e,
          isSlot,
        },
      };
    });
  }, [events]);

  function onSelect(sel: DateSelectArg) {
    setStatus(null);
    setCreateType("appointment");
    setClientId(clients?.[0]?.client_id ?? "");
    setKind("session");
    setTitle("");
    setNotes("");
    setCapacity(8);
    setRepeatWeeklyCount(0);
    setModal({ mode: "create", start: sel.startStr, end: sel.endStr });
  }

  function onEventClick(arg: EventClickArg) {
    const raw = (arg.event.extendedProps as any)?.raw as CalendarEventRow | undefined;
    if (!raw) return;

    if (!raw.can_edit) return;

    setEditStart(raw.start_time);
    setEditEnd(raw.end_time);
    setEditRoomId(raw.room_id ?? roomId ?? "");
    setEditStatus(raw.status ?? "");
    setEditKind(raw.kind ?? "");
    setEditTitle(raw.title ?? "");
    setEditNotes(""); // notes not returned in calendar feed v1 (privacy). Keep editable via update if you want to fetch details.

    setModal({ mode: "edit", event: raw });
  }

  async function createAppointmentOrRecurring(startIso: string, endIso: string) {
    if (!clientId) {
      setStatus("Client is required.");
      return;
    }

    if (repeatWeeklyCount <= 0) {
      const { data, error } = await supabase.rpc("create_appointment_for_client", {
        p_client_id: clientId,
        p_start_time: startIso,
        p_end_time: endIso,
        p_room_id: roomId,
        p_kind: kind,
        p_title: title || null,
        p_notes: notes || null,
        p_therapist_id: null,
      });

      if (error) return setStatus(`Create failed: ${error.message}`);
      setStatus(`Created appointment: ${data}`);
      return;
    }

    // build occurrences (weekly)
    const items = [];
    for (let i = 0; i < repeatWeeklyCount; i++) {
      items.push({
        client_id: clientId,
        start_time: isoAddWeeks(startIso, i),
        end_time: isoAddWeeks(endIso, i),
        room_id: roomId,
        kind,
        title: title || null,
        notes: notes || null,
      });
    }

    const { data, error } = await supabase.rpc("create_appointments_bulk", {
      p_appointments: items,
      p_therapist_id: null,
    });

    if (error) return setStatus(`Bulk create failed: ${error.message}`);

    const created = (data as any)?.created_ids ?? [];
    const failures = (data as any)?.failures ?? [];
    setStatus(
      `Bulk result: created ${created.length}. ${failures.length ? `Failures: ${failures.length}` : "No failures."}`
    );
  }

  async function createGroupSession(startIso: string, endIso: string) {
    const { data, error } = await supabase.rpc("create_group_session", {
      p_title: title || "Group Session",
      p_description: notes || null,
      p_start_time: startIso,
      p_end_time: endIso,
      p_capacity: capacity,
      p_is_public: true,
      p_room_id: roomId,
      p_therapist_id: null,
    });

    if (error) return setStatus(`Create group session failed: ${error.message}`);
    setStatus(`Created group session: ${data}`);
  }

  async function createRoomBlock(startIso: string, endIso: string) {
    const { data, error } = await supabase.rpc("create_room_block", {
      p_room_id: roomId,
      p_start_time: startIso,
      p_end_time: endIso,
      p_reason: title || notes || "Room blocked",
    });

    if (error) return setStatus(`Create room block failed: ${error.message}`);
    setStatus(`Created room block: ${data}`);
  }

  async function saveCreate() {
    if (!modal || modal.mode !== "create") return;
    if (!roomId) return setStatus("Pick a room first.");

    const { start, end } = modal;

    setStatus(null);

    if (createType === "appointment") {
      await createAppointmentOrRecurring(start, end);
    } else if (createType === "group_session") {
      await createGroupSession(start, end);
    } else if (createType === "room_block") {
      await createRoomBlock(start, end);
    }

    setModal(null);
  }

  async function saveEdit() {
    if (!modal || modal.mode !== "edit") return;

    const e = modal.event;

    if (e.event_type === "appointment") {
      const { error } = await supabase.rpc("update_appointment", {
        p_appointment_id: e.id,
        p_start_time: editStart,
        p_end_time: editEnd,
        p_room_id: editRoomId || null,
        p_status: editStatus || null,
        p_kind: editKind || null,
        p_title: editTitle || null,
        p_notes: editNotes || null,
      });
      if (error) return setStatus(`Update failed: ${error.message}`);
      setStatus("Appointment updated.");
    } else {
      setStatus("Editing group sessions/blocks via calendar UI is v1-limited. (Create/delete flows are supported.)");
    }

    setModal(null);
  }

  async function cancelSelectedAppointment() {
    if (!modal || modal.mode !== "edit") return;
    const e = modal.event;
    if (e.event_type !== "appointment") return;

    const { error } = await supabase.rpc("cancel_appointment", { p_appointment_id: e.id });
    if (error) return setStatus(`Cancel failed: ${error.message}`);

    setStatus("Appointment cancelled.");
    setModal(null);
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Calendar</h3>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label>
            <small>Room</small>
            <br />
            <select value={roomId ?? ""} onChange={(e) => setRoomId(e.target.value || null)}>
              <option value="">(select)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {status && <p style={{ marginTop: 10 }}>{status}</p>}

      <div style={{ marginTop: 12 }}>
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          selectable={true}
          select={onSelect}
          eventClick={onEventClick}
          height="auto"
          allDaySlot={false}
          nowIndicator={true}
          events={fcEvents as any}
          datesSet={(arg) => {
            // Load events whenever the visible range changes
            loadEvents(arg.startStr, arg.endStr, roomId);
          }}
        />
      </div>

      {/* Modal */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setModal(null)}
        >
          <div
            className="card"
            style={{ width: "min(720px, 96vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {modal.mode === "create" ? (
              <>
                <h3>Create</h3>
                <p>
                  <small>
                    {new Date(modal.start).toLocaleString()} → {new Date(modal.end).toLocaleString()}
                  </small>
                </p>

                <div style={{ display: "grid", gap: 10 }}>
                  <label>
                    <small>Type</small>
                    <br />
                    <select value={createType} onChange={(e) => setCreateType(e.target.value as any)}>
                      <option value="appointment">Appointment (1:1)</option>
                      <option value="group_session">Group Session (public join)</option>
                      <option value="room_block">Room Block</option>
                    </select>
                  </label>

                  {createType === "appointment" && (
                    <>
                      <label>
                        <small>Client</small>
                        <br />
                        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                          {clients.length === 0 && <option value="">No linked clients yet</option>}
                          {clients.map((c) => (
                            <option key={c.client_id} value={c.client_id}>
                              {c.client_id}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <small>Kind</small>
                        <br />
                        <input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="session / consult" />
                      </label>

                      <label>
                        <small>Repeat weekly (count)</small>
                        <br />
                        <input
                          type="number"
                          min={0}
                          value={repeatWeeklyCount}
                          onChange={(e) => setRepeatWeeklyCount(parseInt(e.target.value || "0", 10))}
                        />
                        <small style={{ display: "block" }}>
                          0 = no recurrence. 4 = create weekly appointments for 4 weeks.
                        </small>
                      </label>
                    </>
                  )}

                  {createType === "group_session" && (
                    <label>
                      <small>Capacity</small>
                      <br />
                      <input
                        type="number"
                        min={1}
                        value={capacity}
                        onChange={(e) => setCapacity(parseInt(e.target.value || "8", 10))}
                      />
                    </label>
                  )}

                  <label>
                    <small>Title</small>
                    <br />
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" />
                  </label>

                  <label>
                    <small>Notes / Description</small>
                    <br />
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => setModal(null)}>Close</button>
                  <button onClick={saveCreate}>Create</button>
                </div>
              </>
            ) : (
              <>
                <h3>Edit</h3>
                <p>
                  <small>
                    {modal.event.event_type}:{modal.event.id}
                  </small>
                </p>

                {modal.event.event_type === "appointment" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <label>
                      <small>Start (ISO)</small>
                      <br />
                      <input value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                    </label>
                    <label>
                      <small>End (ISO)</small>
                      <br />
                      <input value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                    </label>

                    <label>
                      <small>Room</small>
                      <br />
                      <select value={editRoomId} onChange={(e) => setEditRoomId(e.target.value)}>
                        <option value="">(none)</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <small>Status</small>
                      <br />
                      <input value={editStatus} onChange={(e) => setEditStatus(e.target.value)} placeholder="scheduled/cancelled/..." />
                    </label>

                    <label>
                      <small>Kind</small>
                      <br />
                      <input value={editKind} onChange={(e) => setEditKind(e.target.value)} placeholder="session/consult/..." />
                    </label>

                    <label>
                      <small>Title</small>
                      <br />
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </label>

                    <label>
                      <small>Notes</small>
                      <br />
                      <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                    </label>
                  </div>
                ) : (
                  <p>
                    <small>
                      Editing group sessions/blocks inline is v1-limited. Create/delete flows are supported; editing can be added next.
                    </small>
                  </p>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 12 }}>
                  <div>
                    {modal.event.event_type === "appointment" && (
                      <button onClick={cancelSelectedAppointment}>Cancel Appointment</button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setModal(null)}>Close</button>
                    {modal.event.event_type === "appointment" && <button onClick={saveEdit}>Save</button>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button
          onClick={async () => {
            // best-effort refresh
            const view = document.querySelector(".fc") as any;
            if (!view) return;
          }}
          style={{ display: "none" }}
        >
          noop
        </button>
      </div>
    </div>
  );
}
