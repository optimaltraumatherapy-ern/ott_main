import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventSourceFunc,
} from "@fullcalendar/core";
import { supabase } from "../../lib/supabaseClient";
import { AppointmentModal } from "../../components/scheduling/AppointmentModal";
import { RecurringSeriesModal } from "../../components/scheduling/RecurringSeriesModal";

type MyRole = "admin" | "therapist" | "client";

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

export function TherapistCalendar() {
  const nav = useNavigate();
  const calendarRef = useRef<FullCalendar | null>(null);

  // Auth / role
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<MyRole | null>(null);
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

  function refetchCalendar() {
    const api = calendarRef.current?.getApi();
    api?.refetchEvents();
  }

  // ------------------------------------------------------------
  // Auth bootstrap + role detection
  // ------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      setAuthLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setAuthError(error.message);
        setUserId(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }

      const session = data.session;
      if (!session?.user) {
        setUserId(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Determine role via RPC
      const { data: roleData, error: roleErr } = await supabase.rpc("my_role");
      if (!mounted) return;

      if (roleErr) {
        setRole(null);
        setAuthError(roleErr.message);
      } else {
        setRole(String(roleData) as MyRole);
      }

      setAuthLoading(false);
    }

    loadAuth();

    // Keep in sync
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUserId(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: roleData, error: roleErr } = await supabase.rpc("my_role");
      if (!mounted) return;

      if (roleErr) setRole(null);
      else setRole(String(roleData) as MyRole);

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ------------------------------------------------------------
  // Rooms legend (helps confirm room/color mapping)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase.from("rooms").select("id,name,color").order("name");
      if (!error) setRooms((data as Room[]) ?? []);
    })();
  }, [userId]);

  // ------------------------------------------------------------
  // FullCalendar event source
  // ------------------------------------------------------------
  const fetchEvents: EventSourceFunc = async (info, successCallback, failureCallback) => {
    try {
      setCalendarError(null);

      const { data, error } = await supabase.rpc("list_calendar_events", {
        p_start: info.startStr,
        p_end: info.endStr,
      });

      if (error) throw error;

      const rows = (data as CalendarEventRow[]) ?? [];

      const events = rows.map((r) => {
        // For others’ events, show "Busy" but keep room visible for scheduling awareness
        const baseTitle =
          r.can_edit || r.kind
            ? r.title
            : r.room_name
              ? `Busy · ${r.room_name}`
              : "Busy";

        const withKind = r.can_edit && r.kind ? `${baseTitle} · ${r.kind}` : baseTitle;

        return {
          id: r.id,
          title: withKind,
          start: r.start_time,
          end: r.end_time,
          editable: !!r.can_edit,
          backgroundColor: r.room_color ?? undefined,
          borderColor: r.room_color ?? undefined,
          extendedProps: {
            can_edit: r.can_edit,
            room_id: r.room_id,
            room_name: r.room_name,
            kind: r.kind,
            status: r.status,
            series_id: r.series_id,
          },
        };
      });

      successCallback(events);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setCalendarError(msg);

      // If auth expired, push user to login
      if (msg.toLowerCase().includes("not authenticated") || msg.toLowerCase().includes("jwt")) {
        nav(`/login?next=${encodeURIComponent("/portal")}`);
      }

      console.warn("Failed to load calendar events:", msg);
      failureCallback(e);
    }
  };

  function onEventClick(info: EventClickArg) {
    const canEdit = !!(info.event.extendedProps as any)?.can_edit;

    if (!canEdit) {
      alert("That time is blocked, but you don’t have permission to view details.");
      return;
    }

    setApptId(String(info.event.id));
    setApptCanEdit(true);
    setInitialRange(null);
    setApptModalOpen(true);
  }

  async function onEventDrop(info: EventDropArg) {
    const canEdit = !!(info.event.extendedProps as any)?.can_edit;
    if (!canEdit) {
      info.revert();
      return;
    }

    const id = String(info.event.id);
    const start: Date | null = info.event.start;
    const end: Date | null = info.event.end;

    if (!start || !end) {
      info.revert();
      return;
    }

    const series = ((info.event.extendedProps as any)?.series_id as string | null) ?? null;

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

    const roomId = (((info.event.extendedProps as any)?.room_id as string | null) ?? null) || null;

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
  }

  // NOTE: FullCalendar typing for resize differs slightly across versions/packages.
  // To avoid brittle imports (like EventResizeDoneArg), we explicitly type this arg as any.
  async function onEventResize(info: any) {
    const canEdit = !!(info.event?.extendedProps as any)?.can_edit;
    if (!canEdit) {
      info.revert?.();
      return;
    }

    const id = String(info.event.id);
    const start: Date | null = info.event.start;
    const end: Date | null = info.event.end;

    if (!start || !end) {
      info.revert?.();
      return;
    }

    const series = ((info.event.extendedProps as any)?.series_id as string | null) ?? null;

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

    const roomId = (((info.event.extendedProps as any)?.room_id as string | null) ?? null) || null;

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
  if (authLoading) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calendar</h3>
        <p>
          <small>Loading…</small>
        </p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Calendar</h3>
        <p>
          <small>You must be logged in to view the calendar.</small>
        </p>
        {authError && <p style={{ color: "crimson" }}>{authError}</p>}
        <button onClick={() => nav(`/login?next=${encodeURIComponent("/portal")}`)}>Go to login</button>
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
          <small>Drag & drop to reschedule. Other therapists appear as “Busy”.</small>
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
    </div>
  );
}
