import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../../lib/supabaseClient";
import { AppointmentModal } from "../../components/scheduling/AppointmentModal";
import { formatDateTime } from "../../lib/time";
import { useAuth } from "../../context/AuthContext";

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

type ApptRow = {
  id: string;
  client_id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  status: string;
  kind: string;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };
type ClientProfileRow = { client_id: string; display_name: string | null };
type TherapistProfileRow = { therapist_id: string; display_name: string | null };

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function displayPerson(p?: ProfileRow | null) {
  if (!p) return "";
  return p.full_name || p.email || p.id;
}

export function AdminHome(props: { role: "admin" | "therapist" }) {
  const nav = useNavigate();
  const { user } = useAuth();

  // Appointment modal (click events in mini calendar)
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [apptId, setApptId] = useState<string | null>(null);

  // Missing notes card
  const [missingLoading, setMissingLoading] = useState(true);
  const [missingErr, setMissingErr] = useState<string | null>(null);
  const [missingRows, setMissingRows] = useState<
    Array<
      ApptRow & {
        client_name: string;
        therapist_name: string;
      }
    >
  >([]);

  // Mini calendar event source
  async function fetchEvents(info: any, successCallback: any, failureCallback: any) {
    try {
      const { data, error } = await supabase.rpc("list_calendar_events", {
        p_start: info.startStr,
        p_end: info.endStr,
      });
      if (error) throw error;

      const rows = (data as CalendarEventRow[]) ?? [];
      const events = rows.map((r) => ({
        id: r.id,
        title: r.kind ? `${r.title} · ${r.kind}` : r.title,
        start: r.start_time,
        end: r.end_time,
        editable: false,
        backgroundColor: r.room_color ?? undefined,
        borderColor: r.room_color ?? undefined,
        extendedProps: {
          can_edit: r.can_edit,
          series_id: r.series_id,
        },
      }));

      successCallback(events);
    } catch (e: any) {
      failureCallback(e);
    }
  }

  function onEventClick(info: any) {
    const canEdit = !!info.event?.extendedProps?.can_edit;
    if (!canEdit) return;

    setApptId(String(info.event.id));
    setApptModalOpen(true);
  }

  // Load “missing notes” list (last 14 days, ended appointments without session_notes)
  useEffect(() => {
    let mounted = true;

    (async () => {
      setMissingLoading(true);
      setMissingErr(null);

      try {
        if (props.role === "therapist" && !user) {
          if (!mounted) return;
          setMissingErr("Not signed in.");
          setMissingRows([]);
          setMissingLoading(false);
          return;
        }

        const nowIso = new Date().toISOString();
        const sinceIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        let q = supabase
          .from("appointments")
          .select("id,client_id,therapist_id,start_time,end_time,status,kind")
          .lt("end_time", nowIso)
          .gte("end_time", sinceIso)
          .order("end_time", { ascending: false })
          .limit(300);

        // ✅ Therapist-specific missing notes
        if (props.role === "therapist" && user?.id) {
          q = q.eq("therapist_id", user.id);
        }

        const { data: apptsData, error: apptsErr } = await q;
        if (apptsErr) throw apptsErr;

        const appts = (apptsData as ApptRow[]) ?? [];
        if (!appts.length) {
          if (!mounted) return;
          setMissingRows([]);
          setMissingLoading(false);
          return;
        }

        const apptIds = appts.map((a) => a.id);

        // Pull notes that reference those appointments
        const { data: notesData, error: notesErr } = await supabase
          .from("session_notes")
          .select("appointment_id")
          .in("appointment_id", apptIds);

        if (notesErr) throw notesErr;

        const hasNote = new Set(((notesData as any[]) ?? []).map((n) => n.appointment_id).filter(Boolean));
        const missing = appts.filter((a) => !hasNote.has(a.id));

        // Build name lookups
        const clientIds = uniq(missing.map((m) => m.client_id));
        const therapistIds = uniq(missing.map((m) => m.therapist_id));
        const personIds = uniq([...clientIds, ...therapistIds]);

        const [{ data: profilesData }, { data: clientProfData }, { data: therapistProfData }] = await Promise.all([
          supabase.from("profiles").select("id,full_name,email").in("id", personIds),
          supabase.from("client_profiles").select("client_id,display_name").in("client_id", clientIds),
          supabase.from("therapist_profiles").select("therapist_id,display_name").in("therapist_id", therapistIds),
        ]);

        const profiles = ((profilesData as ProfileRow[]) ?? []).reduce<Record<string, ProfileRow>>((acc, r) => {
          acc[r.id] = r;
          return acc;
        }, {});

        const clientNames = ((clientProfData as ClientProfileRow[]) ?? []).reduce<Record<string, string>>((acc, r) => {
          if (r.display_name) acc[r.client_id] = r.display_name;
          return acc;
        }, {});

        const therapistNames = ((therapistProfData as TherapistProfileRow[]) ?? []).reduce<Record<string, string>>(
          (acc, r) => {
            if (r.display_name) acc[r.therapist_id] = r.display_name;
            return acc;
          },
          {}
        );

        const rows = missing.map((m) => ({
          ...m,
          client_name: clientNames[m.client_id] || displayPerson(profiles[m.client_id]) || m.client_id,
          therapist_name:
            props.role === "therapist"
              ? "You"
              : (therapistNames[m.therapist_id] || displayPerson(profiles[m.therapist_id]) || m.therapist_id),
        }));

        if (!mounted) return;
        setMissingRows(rows);
        setMissingLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        setMissingErr(e?.message ?? "Failed loading missing notes list");
        setMissingLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [props.role, user?.id]);

  const twoCol: React.CSSProperties = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 12,
      alignItems: "start",
    }),
    []
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>{props.role === "admin" ? "Admin Home" : "Therapist Home"}</h3>
            <p className="muted" style={{ margin: "6px 0 0 0" }}>
              <small>Quick overview + shortcuts.</small>
            </p>
          </div>
          <button onClick={() => nav("/app/schedule")}>Open full schedule</button>
        </div>
      </div>

      <div style={twoCol}>
        {/* Weekly calendar preview card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h4 style={{ margin: 0 }}>Weekly calendar</h4>
            <small className="muted">Click an event to edit</small>
          </div>

          <div style={{ marginTop: 10 }}>
            <FullCalendar
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              allDaySlot={false}
              nowIndicator
              height={520}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              events={fetchEvents}
              eventClick={onEventClick}
              editable={false}
              selectable={false}
            />
          </div>
        </div>

        {/* Missing notes card */}
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Sessions missing notes</h4>
          <p className="muted" style={{ marginTop: 6 }}>
            <small>
              Ended appointments in the last 14 days with no linked note.
              {props.role === "therapist" ? " (Your sessions only.)" : null}
            </small>
          </p>

          {missingLoading ? (
            <p className="muted">
              <small>Loading…</small>
            </p>
          ) : missingErr ? (
            <p style={{ color: "crimson" }}>
              <small>{missingErr}</small>
            </p>
          ) : missingRows.length === 0 ? (
            <p className="muted">
              <small>✅ No missing notes found.</small>
            </p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {missingRows.slice(0, 18).map((r) => (
                <li key={r.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{r.client_name}</div>
                  <div className="muted">
                    <small>
                      {formatDateTime(r.end_time)} · Therapist: <strong>{r.therapist_name}</strong>
                    </small>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        nav(`/app/notes?client=${encodeURIComponent(r.client_id)}&appointment=${encodeURIComponent(r.id)}`);
                      }}
                    >
                      Create note
                    </button>
                    <button
                      onClick={() => {
                        setApptId(r.id);
                        setApptModalOpen(true);
                      }}
                    >
                      Open appointment
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {missingRows.length > 18 ? (
            <p className="muted">
              <small>Showing first 18.</small>
            </p>
          ) : null}
        </div>
      </div>

      <AppointmentModal
        open={apptModalOpen}
        appointmentId={apptId}
        canEdit={props.role === "admin" || props.role === "therapist"}
        initialStart={null}
        initialEnd={null}
        onClose={() => setApptModalOpen(false)}
        onSaved={() => setApptModalOpen(false)}
        onEditSeries={() => {
          nav("/app/schedule");
        }}
      />
    </div>
  );
}
