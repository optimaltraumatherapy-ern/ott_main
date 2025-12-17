import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TherapistCalendar } from "./TherapistCalendar";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/time";

type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
};

type RoomRow = {
  id: string;
  name: string;
  color: string | null;
  // NOTE: optional because some environments may not have facilities migration applied yet
  location_id?: string | null;
};

type TherapistRow = {
  therapist_id: string;
  display_name: string | null;
  is_active: boolean;
};

type RoomBlock = {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
};

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
  created_at: string;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(v: string) {
  return new Date(v).toISOString();
}

export function AdminSchedule(props: { role: "admin" | "therapist" }) {
  const { user } = useAuth();

  const [status, setStatus] = useState<string | null>(null);

  // Facilities filter data
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);

  const [facilitiesHaveLocations, setFacilitiesHaveLocations] = useState(true);
  const [roomsHaveLocationId, setRoomsHaveLocationId] = useState(true);

  // Filters
  const [filterLocationId, setFilterLocationId] = useState("");
  const [filterRoomId, setFilterRoomId] = useState("");

  // Refresh token for calendar + lists
  const [refreshToken, setRefreshToken] = useState(0);
  const bumpRefresh = () => setRefreshToken((n) => n + 1);

  // Load therapists list (used by admin when creating group sessions)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("therapist_profiles")
        .select("therapist_id,display_name,is_active")
        .order("display_name", { ascending: true });

      if (error) {
        // non-fatal
        return;
      }
      setTherapists((data as TherapistRow[]) ?? []);
    })();
  }, []);

  // Load locations + rooms for filtering (and group session create room picker)
  useEffect(() => {
    (async () => {
      setStatus(null);

      // Try locations (may not exist if facilities migration not applied)
      const { data: locData, error: locErr } = await supabase
        .from("locations")
        .select("id,name,address,created_at")
        .order("name", { ascending: true });

      if (locErr) {
        setFacilitiesHaveLocations(false);
        setLocations([]);
      } else {
        setFacilitiesHaveLocations(true);
        setLocations((locData as LocationRow[]) ?? []);
      }

      // Try rooms with location_id (may not exist)
      const tryRoomsWithLoc = await supabase
        .from("rooms")
        .select("id,name,color,location_id")
        .order("name", { ascending: true });

      if (tryRoomsWithLoc.error) {
        // Fallback: rooms without location_id
        setRoomsHaveLocationId(false);

        const fallbackRooms = await supabase
          .from("rooms")
          .select("id,name,color")
          .order("name", { ascending: true });

        if (fallbackRooms.error) {
          setStatus(fallbackRooms.error.message);
          setRooms([]);
        } else {
          setRooms((fallbackRooms.data as RoomRow[]) ?? []);
        }
      } else {
        setRoomsHaveLocationId(true);
        setRooms((tryRoomsWithLoc.data as RoomRow[]) ?? []);
      }
    })();
  }, []);

  // room -> location map (empty if location_id is not available)
  const roomToLocation = useMemo(() => {
    const m: Record<string, string | null> = {};
    rooms.forEach((r) => {
      m[r.id] = (r.location_id ?? null) as any;
    });
    return m;
  }, [rooms]);

  // Rooms that match current location filter
  const roomsForFilterLocation = useMemo(() => {
    if (!filterLocationId) return rooms;
    if (!roomsHaveLocationId) return rooms; // cannot filter by location if no location_id

    return rooms.filter((r) => (r.location_id ?? null) === filterLocationId);
  }, [rooms, filterLocationId, roomsHaveLocationId]);

  // Keep room filter consistent when location changes
  useEffect(() => {
    if (!filterRoomId) return;
    if (!filterLocationId) return;

    // if we can't validate location_id, do nothing
    if (!roomsHaveLocationId) return;

    const room = rooms.find((r) => r.id === filterRoomId);
    if (!room) return;

    if ((room.location_id ?? null) !== filterLocationId) {
      setFilterRoomId("");
    }
  }, [filterLocationId, filterRoomId, rooms, roomsHaveLocationId]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header + filters */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Schedule</h3>
            <p className="muted" style={{ margin: 0 }}>
              <small>
                Filter the calendar by <strong>location</strong> and <strong>room</strong>, and manage{" "}
                <strong>group sessions</strong>.
              </small>
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={bumpRefresh}>Refresh</button>
          </div>
        </div>

        {status ? (
          <p className="muted" style={{ marginTop: 10 }}>
            <small>{status}</small>
          </p>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label><small>Filter by location</small></label>
            <select
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              style={{ width: "100%" }}
              disabled={!facilitiesHaveLocations || locations.length === 0}
            >
              <option value="">
                {!facilitiesHaveLocations
                  ? "Locations not configured"
                  : locations.length === 0
                  ? "No locations"
                  : "All locations"}
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {!roomsHaveLocationId ? (
              <p className="muted" style={{ marginTop: 6 }}>
                <small>
                  Location filtering requires <code>rooms.location_id</code>. Room filtering still works.
                </small>
              </p>
            ) : null}
          </div>

          <div>
            <label><small>Filter by room</small></label>
            <select
              value={filterRoomId}
              onChange={(e) => setFilterRoomId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All rooms</option>
              {roomsForFilterLocation.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  setFilterLocationId("");
                  setFilterRoomId("");
                }}
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar (appointments + group sessions) */}
      <TherapistCalendar
        role={props.role}
        filterLocationId={filterLocationId || undefined}
        filterRoomId={filterRoomId || undefined}
        roomToLocation={roomToLocation}
        refreshToken={refreshToken}
      />

      {/* Group sessions staff-side create + list */}
      <GroupSessionsCard
        role={props.role}
        userId={user?.id ?? null}
        rooms={roomsForFilterLocation}
        allRooms={rooms}
        roomToLocation={roomToLocation}
        filterLocationId={filterLocationId}
        filterRoomId={filterRoomId}
        therapists={therapists}
        onChanged={bumpRefresh}
      />

      {/* Room blocks (admin can create/delete; therapist sees read-only upcoming) */}
      {props.role === "admin" ? (
        <RoomBlocksCard
          rooms={roomsForFilterLocation}
          allRooms={rooms}
          roomToLocation={roomToLocation}
          filterLocationId={filterLocationId}
          filterRoomId={filterRoomId}
          onChanged={bumpRefresh}
        />
      ) : (
        <UpcomingRoomBlocksCard
          rooms={roomsForFilterLocation}
          allRooms={rooms}
          roomToLocation={roomToLocation}
          filterLocationId={filterLocationId}
          filterRoomId={filterRoomId}
        />
      )}
    </div>
  );
}

function GroupSessionsCard(props: {
  role: "admin" | "therapist";
  userId: string | null;
  rooms: RoomRow[];
  allRooms: RoomRow[];
  roomToLocation: Record<string, string | null>;
  filterLocationId: string;
  filterRoomId: string;
  therapists: TherapistRow[];
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<GroupSessionRow[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  // Create form
  const [therapistId, setTherapistId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [isPublic, setIsPublic] = useState(true);
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");

  const roomName = useMemo(() => {
    const m: Record<string, string> = {};
    props.allRooms.forEach((r) => (m[r.id] = r.name));
    return m;
  }, [props.allRooms]);

  const therapistName = useMemo(() => {
    const m: Record<string, string> = {};
    props.therapists.forEach((t) => (m[t.therapist_id] = t.display_name ?? t.therapist_id));
    return m;
  }, [props.therapists]);

  async function load() {
    setStatus(null);
    setLoading(true);

    try {
      const nowIso = new Date().toISOString();

      let q = supabase
        .from("group_sessions")
        .select("id,therapist_id,room_id,title,description,start_time,end_time,capacity,is_public,status,created_at")
        .gte("end_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(250);

      if (props.filterRoomId) {
        q = q.eq("room_id", props.filterRoomId);
      } else if (props.filterLocationId) {
        // Filter by rooms in this location (if you have roomToLocation populated)
        const roomIdsInLoc = props.allRooms
          .filter((r) => (r.location_id ?? null) === props.filterLocationId)
          .map((r) => r.id);

        if (roomIdsInLoc.length === 0) {
          setRows([]);
          setParticipantCounts({});
          setLoading(false);
          return;
        }
        q = q.in("room_id", roomIdsInLoc as any);
      }

      if (props.role === "therapist" && props.userId) {
        q = q.eq("therapist_id", props.userId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const gs = (data as GroupSessionRow[]) ?? [];
      setRows(gs);

      // Participants count (optional; depends on RLS)
      const ids = gs.map((x) => x.id);
      if (!ids.length) {
        setParticipantCounts({});
        setLoading(false);
        return;
      }

      const { data: pData, error: pErr } = await supabase
        .from("group_session_participants")
        .select("group_session_id,status")
        .in("group_session_id", ids);

      if (pErr) {
        // Non-fatal if RLS prevents therapist/admin from seeing participant rows
        setParticipantCounts({});
        setLoading(false);
        return;
      }

      const counts: Record<string, number> = {};
      ((pData as any[]) ?? []).forEach((p) => {
        if (String(p.status ?? "joined") !== "joined") return;
        const sid = String(p.group_session_id);
        counts[sid] = (counts[sid] ?? 0) + 1;
      });

      setParticipantCounts(counts);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed loading group sessions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filterLocationId, props.filterRoomId, props.role, props.userId]);

  async function createGroupSession() {
    setStatus(null);

    if (!props.userId) return setStatus("Not signed in.");
    if (!title.trim()) return setStatus("Title is required.");
    if (!startLocal || !endLocal) return setStatus("Start/end required.");
    if (!roomId) return setStatus("Room is required.");
    if (!Number.isFinite(capacity) || capacity <= 0) return setStatus("Capacity must be > 0.");

    const startIso = fromLocalInputValue(startLocal);
    const endIso = fromLocalInputValue(endLocal);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      return setStatus("End must be after start.");
    }

    // Therapist attribution: therapist creates their own; admin must pick one
    const effectiveTherapistId =
      props.role === "therapist" ? props.userId : therapistId;

    if (props.role === "admin" && !effectiveTherapistId) {
      return setStatus("Admin: select a therapist responsible for this group session.");
    }

    const payload = {
      therapist_id: effectiveTherapistId,
      room_id: roomId,
      title: title.trim(),
      description: description.trim() || null,
      start_time: startIso,
      end_time: endIso,
      capacity: Math.max(1, Math.floor(capacity)),
      is_public: !!isPublic,
      status: "scheduled",
      created_by: props.userId,
    };

    const { error } = await supabase.from("group_sessions").insert(payload);
    if (error) return setStatus(`Create failed: ${error.message}`);

    setTitle("");
    setDescription("");
    setCapacity(8);
    setIsPublic(true);
    setStartLocal("");
    setEndLocal("");
    setRoomId("");
    if (props.role === "admin") setTherapistId("");

    await load();
    props.onChanged();
    setStatus("Group session created.");
  }

  async function deleteGroupSession(id: string) {
    setStatus(null);
    if (!confirm("Delete this group session? Participants will be removed as well.")) return;

    const { error } = await supabase.from("group_sessions").delete().eq("id", id);
    if (error) return setStatus(`Delete failed: ${error.message}`);

    setRows((prev) => prev.filter((r) => r.id !== id));
    props.onChanged();
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Group sessions</h3>
      <p className="muted">
        <small>
          Create group sessions (title/description/capacity) that appear on the schedule calendar.
          Clients will “join” later via <code>group_session_participants</code>.
        </small>
      </p>

      {status ? (
        <p className="muted">
          <small>{status}</small>
        </p>
      ) : null}

      <div className="card" style={{ padding: 12, marginTop: 10 }}>
        <h4 style={{ marginTop: 0 }}>Create group session</h4>

        {props.role === "admin" ? (
          <>
            <label><small>Therapist responsible</small></label>
            <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select therapist…</option>
              {props.therapists.map((t) => (
                <option key={t.therapist_id} value={t.therapist_id}>
                  {(t.display_name ?? t.therapist_id) + (t.is_active ? "" : " (inactive)")}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <label style={{ marginTop: 10 }}><small>Room</small></label>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }}>
          <option value="">Select room…</option>
          {props.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 10 }}><small>Title</small></label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name…" />

        <label style={{ marginTop: 10 }}><small>Description (optional)</small></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div>
            <label><small>Start</small></label>
            <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </div>
          <div>
            <label><small>End</small></label>
            <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div>
            <label><small>Maximum participants</small></label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value || "0", 10))}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 22 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <small>Public (client can see/join)</small>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={createGroupSession} disabled={loading}>
            Create group session
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <h4 style={{ marginTop: 0, marginBottom: 0 }}>Upcoming</h4>
          <button onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh list"}</button>
        </div>

        {rows.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}><small>No upcoming group sessions.</small></p>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {rows.map((r) => {
              const count = participantCounts[r.id] ?? 0;
              return (
                <div key={r.id} className="card" style={{ padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 800 }}>
                      {r.title}{" "}
                      <span className="badge">{r.status}</span>{" "}
                      {r.is_public ? <span className="badge">public</span> : <span className="badge">private</span>}
                    </div>
                    <div className="muted">
                      <small>{formatDateTime(r.start_time)} → {formatDateTime(r.end_time)}</small>
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 6 }}>
                    <small>
                      therapist: <strong>{therapistName[r.therapist_id] ?? r.therapist_id}</strong>
                      {" "}· room: <strong>{r.room_id ? (roomName[r.room_id] ?? r.room_id) : "—"}</strong>
                      {" "}· participants: <strong>{count}/{r.capacity}</strong>
                    </small>
                  </div>

                  {r.description ? (
                    <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.description}</div>
                  ) : null}

                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => deleteGroupSession(r.id)}>Delete</button>
                  </div>

                  <div className="muted" style={{ marginTop: 6 }}>
                    <small>id: <code>{r.id}</code></small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomBlocksCard(props: {
  rooms: RoomRow[];        // rooms filtered by location (if possible)
  allRooms: RoomRow[];     // all rooms
  roomToLocation: Record<string, string | null>;
  filterLocationId: string;
  filterRoomId: string;
  onChanged: () => void;
}) {
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Create form
  const [roomId, setRoomId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [reason, setReason] = useState("");

  const roomMap = useMemo(() => {
    const m: Record<string, RoomRow> = {};
    props.allRooms.forEach((r) => (m[r.id] = r));
    return m;
  }, [props.allRooms]);

  useEffect(() => {
    // Default create-room selection to the current room filter (nice UX)
    if (props.filterRoomId) setRoomId(props.filterRoomId);
  }, [props.filterRoomId]);

  async function load() {
    setStatus(null);

    const nowIso = new Date().toISOString();
    let q = supabase
      .from("room_blocks")
      .select("id,room_id,start_time,end_time,reason")
      .gte("end_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(250);

    if (props.filterRoomId) {
      q = q.eq("room_id", props.filterRoomId);
    } else if (props.filterLocationId) {
      const roomIdsInLoc = props.allRooms
        .filter((r) => (r.location_id ?? null) === props.filterLocationId)
        .map((r) => r.id);

      if (roomIdsInLoc.length === 0) {
        setBlocks([]);
        return;
      }
      q = q.in("room_id", roomIdsInLoc as any);
    }

    const { data, error } = await q;
    if (error) {
      setStatus(error.message);
      setBlocks([]);
      return;
    }

    setBlocks((data as RoomBlock[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filterLocationId, props.filterRoomId]);

  async function createBlock() {
    setStatus(null);

    if (!roomId) return setStatus("Pick a room.");
    if (!startLocal || !endLocal) return setStatus("Start/end required.");

    const startIso = fromLocalInputValue(startLocal);
    const endIso = fromLocalInputValue(endLocal);

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      return setStatus("End must be after start.");
    }

    const { error } = await supabase.from("room_blocks").insert({
      room_id: roomId,
      start_time: startIso,
      end_time: endIso,
      reason: reason.trim() || null,
    });

    if (error) return setStatus(`Create failed: ${error.message}`);

    setStartLocal("");
    setEndLocal("");
    setReason("");
    await load();
    props.onChanged();
    setStatus("Created room block.");
  }

  async function removeBlock(id: string) {
    setStatus(null);
    if (!confirm("Delete this room block?")) return;
    const { error } = await supabase.from("room_blocks").delete().eq("id", id);
    if (error) return setStatus(`Delete failed: ${error.message}`);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    props.onChanged();
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Room blocks</h3>
      <p className="muted">
        <small>Admin-only: create/delete room blocks (maintenance, holds, etc.).</small>
      </p>

      {status && <p className="muted"><small>{status}</small></p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label><small>Room</small></label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select…</option>
            {props.rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
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
          </div>

          <label style={{ marginTop: 10 }}><small>Reason</small></label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%" }} />

          <div style={{ marginTop: 10 }}>
            <button onClick={createBlock}>Create room block</button>
          </div>
        </div>

        <div>
          <h4 style={{ marginTop: 0 }}>Upcoming blocks</h4>
          {blocks.length === 0 ? (
            <p className="muted"><small>No upcoming blocks for this filter.</small></p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {blocks.map((b) => {
                const room = roomMap[b.room_id];
                return (
                  <li key={b.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>{room?.name ?? b.room_id}</div>
                    <div className="muted">
                      <small>
                        {toLocalInputValue(b.start_time).replace("T", " ")} →{" "}
                        {toLocalInputValue(b.end_time).replace("T", " ")}
                      </small>
                    </div>
                    {b.reason ? <div className="muted"><small>{b.reason}</small></div> : null}
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => removeBlock(b.id)}>Delete</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function UpcomingRoomBlocksCard(props: {
  rooms: RoomRow[];
  allRooms: RoomRow[];
  roomToLocation: Record<string, string | null>;
  filterLocationId: string;
  filterRoomId: string;
}) {
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const roomMap = useMemo(() => {
    const m: Record<string, RoomRow> = {};
    props.allRooms.forEach((r) => (m[r.id] = r));
    return m;
  }, [props.allRooms]);

  async function load() {
    setStatus(null);

    const nowIso = new Date().toISOString();
    let q = supabase
      .from("room_blocks")
      .select("id,room_id,start_time,end_time,reason")
      .gte("end_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(250);

    if (props.filterRoomId) {
      q = q.eq("room_id", props.filterRoomId);
    } else if (props.filterLocationId) {
      const roomIdsInLoc = props.allRooms
        .filter((r) => (r.location_id ?? null) === props.filterLocationId)
        .map((r) => r.id);

      if (roomIdsInLoc.length === 0) {
        setBlocks([]);
        return;
      }
      q = q.in("room_id", roomIdsInLoc as any);
    }

    const { data, error } = await q;
    if (error) {
      setStatus(error.message);
      setBlocks([]);
      return;
    }

    setBlocks((data as RoomBlock[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filterLocationId, props.filterRoomId]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Upcoming room blocks</h3>
      <p className="muted">
        <small>Read-only for therapists. Room blocks prevent scheduling conflicts.</small>
      </p>

      {status && <p className="muted"><small>{status}</small></p>}

      {blocks.length === 0 ? (
        <p className="muted"><small>No upcoming room blocks for this filter.</small></p>
      ) : (
        <ul style={{ paddingLeft: 16 }}>
          {blocks.map((b) => {
            const room = roomMap[b.room_id];
            return (
              <li key={b.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{room?.name ?? b.room_id}</div>
                <div className="muted">
                  <small>
                    {toLocalInputValue(b.start_time).replace("T", " ")} →{" "}
                    {toLocalInputValue(b.end_time).replace("T", " ")}
                  </small>
                </div>
                {b.reason ? <div className="muted"><small>{b.reason}</small></div> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
