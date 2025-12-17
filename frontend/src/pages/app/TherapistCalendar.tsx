import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg, EventSourceFunc } from "@fullcalendar/core";
import { supabase } from "../../lib/supabaseClient";
import { AppointmentModal } from "../../components/scheduling/AppointmentModal";
import { RecurringSeriesModal } from "../../components/scheduling/RecurringSeriesModal";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

type StaffRole = "admin" | "therapist";
type MyRole = StaffRole | "client";

type TherapistCalendarProps = {
  /**
   * If provided (staff app), calendar skips role RPC and uses this.
   * If omitted (older call sites), it will call `my_role`.
   */
  role?: StaffRole;

  /** Facilities filters coming from AdminSchedule */
  filterLocationId?: string;
  filterRoomId?: string;

  /**
   * Map room_id -> location_id (or null) so we can filter by location on the client.
   * If you don't have facilities migration, this can be empty.
   */
  roomToLocation?: Record<string, string | null>;

  /**
   * Any time this changes, we refetch events.
   * AdminSchedule bumps this after creating blocks / group sessions, etc.
   */
  refreshToken?: number;
};

type CalendarEventRow = {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  can_edit: boolean;
  room_id: string | null;
  room_name: string | null;
  room_color: string | null;
  kind: string | null;
  status: string | null;
  series_id: string | null;
};

type Room = { id: string; name: string; color: string | null };

type GroupSessionRow = {
  id: string;
  therapist_id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  is_public: boolean;
  status: string;
};

type GroupSessionDetails = {
  id: string;
  can_edit: boolean;
  therapist_id: string;
  room_id: string | null;
  room_name: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  is_public: boolean;
  status: string;
};

function safeNowPath() {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return "/app";
  }
}

export function TherapistCalendar(props: TherapistCalendarProps) {
  const nav = useNavigate();
  const calendarRef = useRef<FullCalendar | null>(null);

  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Role: accept from props (staff) or fallback to RPC (back-compat)
  const [role, setRole] = useState<MyRole | null>(props.role ?? null);
  const [roleLoading, setRoleLoading] = useState<boolean>(!props.role);
  const [authError, setAuthError] = useState<string | null>(null);

  // UI support
  const [rooms, setRooms] = useState<Room[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Appointment modal
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [apptId, setApptId] = useState<string | null>(null);
  const [apptCanEdit, setApptCanEdit] = useState<boolean>(false);
  const [initialRange, setInitialRange] = useState<{ start: Date; end: Date } | null>(null);

  // Series modal
  const [seriesModalOpen, setSeriesModalOpen] = useState(false);
  const [seriesId, setSeriesId] = useState<string | null>(null);

  // Group session details modal
  const [gsModalOpen, setGsModalOpen] = useState(false);
  const [gsDetails, setGsDetails] = useState<GroupSessionDetails | null>(null);

  const filterLocationId = props.filterLocationId ?? "";
  const filterRoomId = props.filterRoomId ?? "";
  const roomToLocation = props.roomToLocation ?? {};
  const refreshToken = props.refreshToken ?? 0;

  function refetchCalendar() {
    const api = calendarRef.current?.getApi();
    api?.refetchEvents();
  }

  // ------------------------------------------------------------
  // Role bootstrap (only when not passed in as props)
  // ------------------------------------------------------------
  useEffect(() => {
    if (props.role) {
      setRole(props.role);
      setRoleLoading(false);
      setAuthError(null);
      return;
    }

    if (!userId) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      setRoleLoading(true);
      setAuthError(null);

      const { data: roleData, error: roleErr } = await supabase.rpc("my_role");
      if (!mounted) return;

      if (roleErr) {
        setRole(null);
        setAuthError(roleErr.message);
      } else {
        setRole(String(roleData) as MyRole);
      }

      setRoleLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [props.role, userId]);

  // ------------------------------------------------------------
  // Rooms legend + mapping (also used for group sessions color/name)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase.from("rooms").select("id,name,color").order("name", { ascending: true });
      if (!error) setRooms((data as Room[]) ?? []);
    })();
  }, [userId]);

  const roomMap = useMemo(() => {
    const m: Record<string, Room> = {};
    rooms.forEach((r) => (m[r.id] = r));
    return m;
  }, [rooms]);

  // ------------------------------------------------------------
  // Refetch when filters / refresh token change
  // ------------------------------------------------------------
  useEffect(() => {
    refetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLocationId, filterRoomId, refreshToken]);

  function passesFilters(roomId: string | null) {
    if (filterRoomId) return roomId === filterRoomId;
    if (filterLocationId) {
      if (!roomId) return false;
      return (roomToLocation[roomId] ?? null) === filterLocationId;
    }
    return true;
  }

  // ------------------------------------------------------------
  // FullCalendar event source:
  // - appointments come from list_calendar_events RPC
  // - group sessions come from group_sessions table
  // ------------------------------------------------------------
  const fetchEvents: EventSourceFunc = async (info, successCallback, failureCallback) => {
    try {
      setCalendarError(null);

      // ----- 1) Appointments
      const { data: apptData, error: apptErr } = await supabase.rpc("list_calendar_events", {
        p_start: info.startStr,
        p_end: info.endStr,
      });
      if (apptErr) throw apptErr;

      const apptRows = (apptData as CalendarEventRow[]) ?? [];

      const apptEvents = apptRows
        .filter((r) => passesFilters(r.room_id))
        .map((r) => {
          // For others’ events, show "Busy" but keep room visible for scheduling awareness
          const baseTitle =
            r.can_edit || r.kind
              ? r.title
              : r.room_name
              ? `Busy · ${r.room_name}`
              : "Busy";

          const withKind = r.can_edit && r.kind ? `${baseTitle} · ${r.kind}` : baseTitle;

          return {
            id: `appt:${r.id}`,
            title: withKind,
            start: r.start_time,
            end: r.end_time,
            editable: !!r.can_edit,
            backgroundColor: r.room_color ?? undefined,
            borderColor: r.room_color ?? undefined,
            extendedProps: {
              event_type: "appointment",
              can_edit: r.can_edit,
              appointment_id: r.id,
              room_id: r.room_id,
              room_name: r.room_name,
              room_color: r.room_color,
              kind: r.kind,
              status: r.status,
              series_id: r.series_id,
            },
          };
        });

      // ----- 2) Group sessions
      // Pull sessions that overlap the visible range:
      // start_time < range_end AND end_time > range_start
      const { data: gsData, error: gsErr } = await supabase
        .from("group_sessions")
        .select("id,therapist_id,room_id,title,description,start_time,end_time,capacity,is_public,status")
        .lt("start_time", info.endStr)
        .gt("end_time", info.startStr)
        .order("start_time", { ascending: true })
        .limit(500);

      if (gsErr) throw gsErr;

      const gsRows = (gsData as GroupSessionRow[]) ?? [];

      const gsEvents = gsRows
        .filter((g) => passesFilters(g.room_id))
        .map((g) => {
          const room = g.room_id ? roomMap[g.room_id] : undefined;

          const canEdit =
            role === "admin" ||
            (role === "therapist" && !!userId && g.therapist_id === userId);

          const baseTitle = canEdit
            ? `Group · ${g.title}`
            : room?.name
            ? `Busy · ${room.name}`
            : "Busy";

          return {
            id: `gs:${g.id}`,
            title: baseTitle,
            start: g.start_time,
            end: g.end_time,
            editable: !!canEdit,
            backgroundColor: room?.color ?? undefined,
            borderColor: room?.color ?? undefined,
            extendedProps: {
              event_type: "group_session",
              can_edit: canEdit,
              group_session_id: g.id,
              therapist_id: g.therapist_id,
              room_id: g.room_id,
              room_name: room?.name ?? null,
              room_color: room?.color ?? null,
              title: g.title,
              description: g.description,
              capacity: g.capacity,
              is_public: g.is_public,
              status: g.status,
            },
          };
        });

      successCallback([...apptEvents, ...gsEvents]);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setCalendarError(msg);

      // If auth expired, push user to login
      if (msg.toLowerCase().includes("not authenticated") || msg.toLowerCase().includes("jwt")) {
        nav(`/login?next=${encodeURIComponent(safeNowPath())}`);
      }

      console.warn("Failed to load calendar events:", msg);
      failureCallback(e);
    }
  };

  // ------------------------------------------------------------
  // Click handling:
  // - appointment -> AppointmentModal
  // - group session -> details modal
  // ------------------------------------------------------------
  function onEventClick(info: EventClickArg) {
    const ep = (info.event.extendedProps ?? {}) as any;
    const type = String(ep.event_type ?? "appointment");
    const canEdit = !!ep.can_edit;

    if (type === "appointment") {
      if (!canEdit) {
        alert("That time is blocked, but you don’t have permission to view details.");
        return;
      }

      setApptId(String(ep.appointment_id ?? ""));
      setApptCanEdit(true);
      setInitialRange(null);
      setApptModalOpen(true);
      return;
    }

    if (type === "group_session") {
      if (!canEdit) {
        alert("That time is blocked, but you don’t have permission to view details.");
        return;
      }

      const d: GroupSessionDetails = {
        id: String(ep.group_session_id ?? ""),
        can_edit: canEdit,
        therapist_id: String(ep.therapist_id ?? ""),
        room_id: (ep.room_id as string | null) ?? null,
        room_name: (ep.room_name as string | null) ?? null,
        title: String(ep.title ?? "Group session"),
        description: (ep.description as string | null) ?? null,
        start_time: String(info.event.startStr ?? ep.start_time ?? ""),
        end_time: String(info.event.endStr ?? ep.end_time ?? ""),
        capacity: Number(ep.capacity ?? 0) || 0,
        is_public: !!ep.is_public,
        status: String(ep.status ?? "scheduled"),
      };

      setGsDetails(d);
      setGsModalOpen(true);
      return;
    }
  }

  // ------------------------------------------------------------
  // Drag/drop:
  // - appointment uses update_appointment RPC (keeps series logic)
  // - group session updates group_sessions table
  // ------------------------------------------------------------
  async function onEventDrop(info: EventDropArg) {
    const ep = (info.event.extendedProps ?? {}) as any;
    const type = String(ep.event_type ?? "appointment");
    const canEdit = !!ep.can_edit;

    if (!canEdit) {
      info.revert();
      return;
    }

    const start: Date | null = info.event.start;
    const end: Date | null = info.event.end;
    if (!start || !end) {
      info.revert();
      return;
    }

    if (type === "appointment") {
      const id = String(ep.appointment_id ?? "");
      const series = (ep.series_id as string | null) ?? null;

      let detachFromSeries = false;
      if (series) {
        const ok = window.confirm(
          "This appointment is part of a recurring series.\n\nDragging will detach this ONE occurrence from the series.\n\nContinue?"
        );
        if (!ok) {
          info.revert();
          return;
        }
        detachFromSeries = true;
      }

      const roomId = ((ep.room_id as string | null) ?? null) || null;

      const { error } = await supabase.rpc("update_appointment", {
        p_appointment_id: id,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_room_id: roomId,
        p_notes: null, // do not overwrite notes on drag/drop
        p_detach_from_series: detachFromSeries,
      });

      if (error) {
        info.revert();
        alert(`Reschedule failed: ${error.message}`);
        return;
      }

      refetchCalendar();
      return;
    }

    if (type === "group_session") {
      const id = String(ep.group_session_id ?? "");
      const { error } = await supabase
        .from("group_sessions")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
        .eq("id", id);

      if (error) {
        info.revert();
        alert(`Reschedule group session failed: ${error.message}`);
        return;
      }

      refetchCalendar();
      return;
    }
  }

  // NOTE: FullCalendar typing for resize differs slightly across versions/packages.
  // We explicitly type this arg as any to avoid brittle imports.
  async function onEventResize(info: any) {
    const ep = (info.event?.extendedProps ?? {}) as any;
    const type = String(ep.event_type ?? "appointment");
    const canEdit = !!ep.can_edit;

    if (!canEdit) {
      info.revert?.();
      return;
    }

    const start: Date | null = info.event.start;
    const end: Date | null = info.event.end;

    if (!start || !end) {
      info.revert?.();
      return;
    }

    if (type === "appointment") {
      const id = String(ep.appointment_id ?? "");
      const series = (ep.series_id as string | null) ?? null;

      let detachFromSeries = false;
      if (series) {
        const ok = window.confirm(
          "This appointment is part of a recurring series.\n\nResizing will detach this ONE occurrence from the series.\n\nContinue?"
        );
        if (!ok) {
          info.revert?.();
          return;
        }
        detachFromSeries = true;
      }

      const roomId = ((ep.room_id as string | null) ?? null) || null;

      const { error } = await supabase.rpc("update_appointment", {
        p_appointment_id: id,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_room_id: roomId,
        p_notes: null,
        p_detach_from_series: detachFromSeries,
      });

      if (error) {
        info.revert?.();
        alert(`Resize failed: ${error.message}`);
        return;
      }

      refetchCalendar();
      return;
    }

    if (type === "group_session") {
      const id = String(ep.group_session_id ?? "");
      const { error } = await supabase
        .from("group_sessions")
        .update({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
        .eq("id", id);

      if (error) {
        info.revert?.();
        alert(`Resize group session failed: ${error.message}`);
        return;
      }

      refetchCalendar();
      return;
    }
  }

  function onSelect(selection: DateSelectArg) {
    // Only therapists/admins should be creating appointments here
    if (role !== "therapist" && role !== "admin") {
      alert("You don’t have permission to create appointments from this view.");
      return;
    }

    setApptId(null);
    setApptCanEdit(true);
    setInitialRange({ start: selection.start, end: selection.end });
    setApptModalOpen(true);
  }

  const roomLegend = useMemo(() => {
    if (!rooms.length) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {rooms.map((r) => (
          <span
            key={r.id}
            className="badge"
            style={{
              background: r.color ?? undefined,
              border: "1px solid rgba(0,0,0,0.1)",
              color: r.color ? "#fff" : undefined,
            }}
            title={r.name}
          >
            {r.name}
          </span>
        ))}
      </div>
    );
  }, [rooms]);

  // ------------------------------------------------------------
  // Render gates
  // ------------------------------------------------------------
  if (!userId) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calendar</h3>
        <p className="muted">
          <small>You must be logged in to view the calendar.</small>
        </p>
        {authError && <p style={{ color: "crimson" }}><small>{authError}</small></p>}
        <button onClick={() => nav(`/login?next=${encodeURIComponent(safeNowPath())}`)}>Go to login</button>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calendar</h3>
        <p className="muted">
          <small>Loading role…</small>
        </p>
      </div>
    );
  }

  if (role !== "therapist" && role !== "admin") {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calendar</h3>
        <p style={{ color: "crimson" }}>
          <small>Not authorized. This calendar is only for therapists and admins.</small>
        </p>
        {authError && (
          <p>
            <small style={{ color: "crimson" }}>{authError}</small>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0 }}>Calendar</h3>
          <small className="muted">
            Drag & drop to reschedule. Other therapists appear as “Busy”. Group sessions appear as “Group · …”.
          </small>
          {roomLegend}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setSeriesId(null);
              setSeriesModalOpen(true);
            }}
          >
            New recurring series
          </button>
        </div>
      </div>

      {calendarError && (
        <p style={{ color: "crimson", marginTop: 10 }}>
          <small>{calendarError}</small>
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        <FullCalendar
          ref={(r) => (calendarRef.current = r)}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          nowIndicator
          selectable
          selectMirror
          editable
          eventStartEditable
          eventDurationEditable
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          events={fetchEvents}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          eventResize={onEventResize}
          select={onSelect}
          height="auto"
        />
      </div>

      {/* Appointment modals */}
      <AppointmentModal
        open={apptModalOpen}
        appointmentId={apptId}
        canEdit={apptCanEdit}
        initialStart={initialRange?.start ?? null}
        initialEnd={initialRange?.end ?? null}
        onClose={() => setApptModalOpen(false)}
        onSaved={() => {
          setApptModalOpen(false);
          refetchCalendar();
        }}
        onEditSeries={(sid) => {
          setApptModalOpen(false);
          setSeriesId(sid);
          setSeriesModalOpen(true);
        }}
      />

      <RecurringSeriesModal
        open={seriesModalOpen}
        seriesId={seriesId}
        onClose={() => setSeriesModalOpen(false)}
        onSaved={() => {
          setSeriesModalOpen(false);
          refetchCalendar();
        }}
      />

      {/* Group session details modal (simple, local) */}
      {gsModalOpen && gsDetails ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 12,
            zIndex: 50,
          }}
          onClick={() => {
            setGsModalOpen(false);
            setGsDetails(null);
          }}
        >
          <div
            className="card"
            style={{ width: "min(720px, 96vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>Group session</h3>
                <div className="muted">
                  <small>
                    {formatDateTime(gsDetails.start_time)} → {formatDateTime(gsDetails.end_time)}
                  </small>
                </div>
              </div>
              <button
                onClick={() => {
                  setGsModalOpen(false);
                  setGsDetails(null);
                }}
              >
                Close
              </button>
            </div>

            <hr style={{ margin: "12px 0" }} />

            <div style={{ fontWeight: 900, fontSize: 16 }}>{gsDetails.title}</div>

            <div className="muted" style={{ marginTop: 6 }}>
              <small>
                status: <span className="badge">{gsDetails.status}</span>{" "}
                · visibility: {gsDetails.is_public ? <span className="badge">public</span> : <span className="badge">private</span>}
                {" "}· capacity: <strong>{gsDetails.capacity}</strong>
              </small>
            </div>

            <div className="muted" style={{ marginTop: 6 }}>
              <small>
                room: <strong>{gsDetails.room_name ?? gsDetails.room_id ?? "—"}</strong>
                {" "}· therapist: <code>{gsDetails.therapist_id}</code>
              </small>
            </div>

            {gsDetails.description ? (
              <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{gsDetails.description}</div>
            ) : (
              <p className="muted" style={{ marginTop: 10 }}>
                <small>No description.</small>
              </p>
            )}

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {gsDetails.can_edit ? (
                <button
                  onClick={async () => {
                    if (!confirm("Delete this group session? Participants will be removed too.")) return;
                    const { error } = await supabase.from("group_sessions").delete().eq("id", gsDetails.id);
                    if (error) {
                      alert(`Delete failed: ${error.message}`);
                      return;
                    }
                    setGsModalOpen(false);
                    setGsDetails(null);
                    refetchCalendar();
                  }}
                >
                  Delete group session
                </button>
              ) : null}

              <button
                onClick={() => {
                  // quick copy for admin debugging / future deep-links
                  navigator.clipboard?.writeText(gsDetails.id).catch(() => {});
                  alert("Copied group session id to clipboard.");
                }}
              >
                Copy id
              </button>
            </div>

            <div className="muted" style={{ marginTop: 8 }}>
              <small>
                id: <code>{gsDetails.id}</code>
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TherapistCalendar;
