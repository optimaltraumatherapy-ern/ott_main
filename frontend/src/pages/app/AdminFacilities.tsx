import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";

/**
 * AdminFacilities
 * - Manage Locations
 * - Manage Rooms per Location
 * - Assign therapist access to Locations and/or Rooms
 * - Create/Delete Room Blocks (blackout times) per Room
 *
 * Conventions match AdminNotes/Admin* pages:
 * - "card" layout
 * - small status line
 * - optimistic but simple refresh-after-write flows
 */

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
  location_id: string | null; // nullable for back-compat if migration not yet applied
  created_at: string;
};

type TherapistRow = {
  therapist_id: string;
  display_name: string | null;
};

type TherapistLocationAccessRow = {
  therapist_id: string;
  location_id: string;
};

type TherapistRoomAccessRow = {
  therapist_id: string;
  room_id: string;
};

type RoomBlockRow = {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
};

export function AdminFacilities() {
  const [status, setStatus] = useState<string | null>(null);

  // Data
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);

  // Filters / selections
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // Create forms
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomColor, setNewRoomColor] = useState("");

  // Renames
  const [renameLocation, setRenameLocation] = useState("");
  const [renameRoom, setRenameRoom] = useState("");

  // Assignments
  const [selectedTherapistForLoc, setSelectedTherapistForLoc] = useState("");
  const [selectedTherapistForRoom, setSelectedTherapistForRoom] = useState("");
  const [locAccess, setLocAccess] = useState<TherapistLocationAccessRow[]>([]);
  const [roomAccess, setRoomAccess] = useState<TherapistRoomAccessRow[]>([]);

  // Room blocks
  const [blocks, setBlocks] = useState<RoomBlockRow[]>([]);
  const [blockStart, setBlockStart] = useState(""); // datetime-local value
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Load therapists once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("therapist_profiles")
        .select("therapist_id,display_name")
        .order("display_name", { ascending: true });

      if (error) {
        setStatus(error.message);
      } else {
        // Ensure defined array (avoid possibly undefined)
        setTherapists((Array.isArray(data) ? (data as TherapistRow[]) : []) ?? []);
      }
    })();
  }, []);

  // Load locations on mount
  useEffect(() => {
    refreshLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * IMPORTANT: Fixes the TS error "Object is possibly 'undefined'."
   * We normalize Supabase `data` (which is `T[] | null`) into a definite array
   * before assigning to a variable typed as `LocationRow[]`.
   */
  async function refreshLocations() {
    setStatus(null);

    const { data, error } = await supabase
      .from("locations")
      .select("id,name,address,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(error.message);
      setLocations([]);
      return;
    }

    // ✅ Narrow to a definite array first, then type it.
    const rows = (Array.isArray(data) ? data : []) as LocationRow[];
    setLocations(rows);

    // If nothing selected, try to pick the first
    if (!selectedLocationId && rows.length > 0) {
      setSelectedLocationId(rows[0].id);
    }
  }

  // When location changes, load rooms, location-level access, and reset room
  useEffect(() => {
    if (!selectedLocationId) {
      setRooms([]);
      setLocAccess([]);
      setSelectedRoomId("");
      return;
    }

    (async () => {
      setStatus(null);

      // Rooms
      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("id,name,color,location_id,created_at")
        .eq("location_id", selectedLocationId)
        .order("created_at", { ascending: false });

      if (roomErr) {
        setStatus(roomErr.message);
        setRooms([]);
      } else {
        setRooms((Array.isArray(roomData) ? (roomData as RoomRow[]) : []) ?? []);
      }

      // Location access
      const { data: laData, error: laErr } = await supabase
        .from("therapist_location_access")
        .select("therapist_id,location_id")
        .eq("location_id", selectedLocationId);

      if (laErr) {
        setStatus(laErr.message);
        setLocAccess([]);
      } else {
        setLocAccess((Array.isArray(laData) ? (laData as TherapistLocationAccessRow[]) : []) ?? []);
      }

      // If previously chosen room no longer exists, clear it
      const roomArr = (Array.isArray(roomData) ? (roomData as RoomRow[]) : []) ?? [];
      if (selectedRoomId && !roomArr.some((r) => r.id === selectedRoomId)) {
        setSelectedRoomId("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  // When room changes, load room-level access and blocks
  useEffect(() => {
    if (!selectedRoomId) {
      setRoomAccess([]);
      setBlocks([]);
      return;
    }

    (async () => {
      setStatus(null);

      const [{ data: raData, error: raErr }, { data: rbData, error: rbErr }] = await Promise.all([
        supabase
          .from("therapist_room_access")
          .select("therapist_id,room_id")
          .eq("room_id", selectedRoomId),
        supabase
          .from("room_blocks")
          .select("id,room_id,start_time,end_time,reason,created_at")
          .eq("room_id", selectedRoomId)
          .order("start_time", { ascending: true }),
      ]);

      if (raErr) {
        setStatus(raErr.message);
        setRoomAccess([]);
      } else {
        setRoomAccess((Array.isArray(raData) ? (raData as TherapistRoomAccessRow[]) : []) ?? []);
      }

      if (rbErr) {
        setStatus(rbErr.message);
        setBlocks([]);
      } else {
        setBlocks((Array.isArray(rbData) ? (rbData as RoomBlockRow[]) : []) ?? []);
      }
    })();
  }, [selectedRoomId]);

  // Derived helpers
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) || null,
    [locations, selectedLocationId]
  );

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  // Create location
  async function createLocation() {
    if (!newLocationName.trim()) return setStatus("Location name is required.");
    setStatus(null);

    const payload = { name: newLocationName.trim(), address: newLocationAddress.trim() || null };
    const { error } = await supabase.from("locations").insert(payload);

    if (error) return setStatus(`Create failed: ${error.message}`);

    setNewLocationName("");
    setNewLocationAddress("");
    await refreshLocations();
    setStatus("Location created.");
  }

  // Rename location
  async function saveRenameLocation() {
    if (!selectedLocationId) return setStatus("Select a location.");
    if (!renameLocation.trim()) return setStatus("New name is required.");

    const { error } = await supabase
      .from("locations")
      .update({ name: renameLocation.trim() })
      .eq("id", selectedLocationId);

    if (error) return setStatus(`Update failed: ${error.message}`);

    setRenameLocation("");
    await refreshLocations();
    setStatus("Location renamed.");
  }

  // Delete location (requires cascade or manual cleanup)
  async function deleteLocation() {
    if (!selectedLocationId) return;
    if (!confirm("Delete this location and its rooms/blocks/access? This cannot be undone.")) return;

    const { error } = await supabase.from("locations").delete().eq("id", selectedLocationId);
    if (error) return setStatus(`Delete failed: ${error.message}`);

    setSelectedLocationId("");
    await refreshLocations();
    setStatus("Location deleted.");
  }

  // Create room in selected location
  async function createRoom() {
    if (!selectedLocationId) return setStatus("Select a location.");
    if (!newRoomName.trim()) return setStatus("Room name is required.");

    const payload = {
      name: newRoomName.trim(),
      color: newRoomColor.trim() || null,
      location_id: selectedLocationId,
    };

    const { error } = await supabase.from("rooms").insert(payload);
    if (error) return setStatus(`Create room failed: ${error.message}`);

    setNewRoomName("");
    setNewRoomColor("");

    // refresh rooms
    const { data } = await supabase
      .from("rooms")
      .select("id,name,color,location_id,created_at")
      .eq("location_id", selectedLocationId)
      .order("created_at", { ascending: false });

    setRooms((Array.isArray(data) ? (data as RoomRow[]) : []) ?? []);
    setStatus("Room created.");
  }

  // Rename room
  async function saveRenameRoom() {
    if (!selectedRoomId) return setStatus("Select a room.");
    if (!renameRoom.trim()) return setStatus("New name is required.");

    const { error } = await supabase.from("rooms").update({ name: renameRoom.trim() }).eq("id", selectedRoomId);
    if (error) return setStatus(`Update failed: ${error.message}`);

    setRenameRoom("");

    // refresh rooms
    const { data } = await supabase
      .from("rooms")
      .select("id,name,color,location_id,created_at")
      .eq("location_id", selectedLocationId)
      .order("created_at", { ascending: false });

    setRooms((Array.isArray(data) ? (data as RoomRow[]) : []) ?? []);
    setStatus("Room renamed.");
  }

  // Delete room
  async function deleteRoom() {
    if (!selectedRoomId) return;
    if (!confirm("Delete this room (and its blocks/access)? This cannot be undone.")) return;

    const { error } = await supabase.from("rooms").delete().eq("id", selectedRoomId);
    if (error) return setStatus(`Delete failed: ${error.message}`);

    setSelectedRoomId("");

    // refresh rooms
    const { data } = await supabase
      .from("rooms")
      .select("id,name,color,location_id,created_at")
      .eq("location_id", selectedLocationId)
      .order("created_at", { ascending: false });

    setRooms((Array.isArray(data) ? (data as RoomRow[]) : []) ?? []);
    setStatus("Room deleted.");
  }

  // Grant / revoke access at location level
  async function grantLocationAccess() {
    if (!selectedLocationId) return setStatus("Select a location.");
    if (!selectedTherapistForLoc) return setStatus("Select a therapist.");

    const payload = { therapist_id: selectedTherapistForLoc, location_id: selectedLocationId };
    const { error } = await supabase.from("therapist_location_access").insert(payload);
    if (error) return setStatus(`Grant failed: ${error.message}`);

    // refresh
    const { data } = await supabase
      .from("therapist_location_access")
      .select("therapist_id,location_id")
      .eq("location_id", selectedLocationId);

    setLocAccess((Array.isArray(data) ? (data as TherapistLocationAccessRow[]) : []) ?? []);
    setSelectedTherapistForLoc("");
    setStatus("Access granted.");
  }

  async function revokeLocationAccess(tid: string) {
    const { error } = await supabase
      .from("therapist_location_access")
      .delete()
      .eq("therapist_id", tid)
      .eq("location_id", selectedLocationId);

    if (error) return setStatus(`Revoke failed: ${error.message}`);

    setLocAccess((prev) => prev.filter((a) => !(a.therapist_id === tid && a.location_id === selectedLocationId)));
    setStatus("Access revoked.");
  }

  // Grant / revoke access at room level
  async function grantRoomAccess() {
    if (!selectedRoomId) return setStatus("Select a room.");
    if (!selectedTherapistForRoom) return setStatus("Select a therapist.");

    const payload = { therapist_id: selectedTherapistForRoom, room_id: selectedRoomId };
    const { error } = await supabase.from("therapist_room_access").insert(payload);
    if (error) return setStatus(`Grant failed: ${error.message}`);

    // refresh
    const { data } = await supabase
      .from("therapist_room_access")
      .select("therapist_id,room_id")
      .eq("room_id", selectedRoomId);

    setRoomAccess((Array.isArray(data) ? (data as TherapistRoomAccessRow[]) : []) ?? []);
    setSelectedTherapistForRoom("");
    setStatus("Access granted.");
  }

  async function revokeRoomAccess(tid: string) {
    const { error } = await supabase
      .from("therapist_room_access")
      .delete()
      .eq("therapist_id", tid)
      .eq("room_id", selectedRoomId);

    if (error) return setStatus(`Revoke failed: ${error.message}`);

    setRoomAccess((prev) => prev.filter((a) => !(a.therapist_id === tid && a.room_id === selectedRoomId)));
    setStatus("Access revoked.");
  }

  // Create room block
  async function createBlock() {
    if (!selectedRoomId) return setStatus("Select a room.");
    if (!blockStart || !blockEnd) return setStatus("Start and end are required.");

    // Convert from <input type="datetime-local"> (no timezone) to ISO
    const start = new Date(blockStart);
    const end = new Date(blockEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return setStatus("Invalid date(s).");
    if (end <= start) return setStatus("End must be after start.");

    const payload = {
      room_id: selectedRoomId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reason: blockReason.trim() || null,
    };

    const { error } = await supabase.from("room_blocks").insert(payload);
    if (error) return setStatus(`Create block failed: ${error.message}`);

    setBlockStart("");
    setBlockEnd("");
    setBlockReason("");

    // refresh
    const { data } = await supabase
      .from("room_blocks")
      .select("id,room_id,start_time,end_time,reason,created_at")
      .eq("room_id", selectedRoomId)
      .order("start_time", { ascending: true });

    setBlocks((Array.isArray(data) ? (data as RoomBlockRow[]) : []) ?? []);
    setStatus("Block created.");
  }

  // Delete room block
  async function deleteBlock(id: string) {
    const { error } = await supabase.from("room_blocks").delete().eq("id", id);
    if (error) return setStatus(`Delete block failed: ${error.message}`);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setStatus("Block deleted.");
  }

  const therapistLabel = (tid: string) => {
    const t = therapists.find((x) => x.therapist_id === tid);
    return t ? (t.display_name || t.therapist_id) : tid;
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Facilities</h3>
        <p className="muted">
          <small>
            Create <strong>locations</strong>, add <strong>rooms</strong>, assign <strong>therapist access</strong>,
            and manage <strong>room blocks</strong>.
          </small>
        </p>
        {status && (
          <p className="muted">
            <small>{status}</small>
          </p>
        )}

        {/* Locations row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>
              <small>Locations</small>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <div className="card" style={{ marginTop: 10, padding: 12 }}>
              <h4 style={{ marginTop: 0 }}>Create location</h4>
              <label>
                <small>Name</small>
              </label>
              <input value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} />
              <label style={{ marginTop: 8 }}>
                <small>Address (optional)</small>
              </label>
              <input value={newLocationAddress} onChange={(e) => setNewLocationAddress(e.target.value)} />

              <div style={{ marginTop: 10 }}>
                <button onClick={createLocation}>Create</button>
              </div>
            </div>

            {selectedLocation ? (
              <div className="card" style={{ marginTop: 10, padding: 12 }}>
                <h4 style={{ marginTop: 0 }}>Selected location</h4>
                <div style={{ fontWeight: 800 }}>{selectedLocation.name}</div>
                {selectedLocation.address ? (
                  <div className="muted">
                    <small>{selectedLocation.address}</small>
                  </div>
                ) : null}

                <label style={{ marginTop: 8 }}>
                  <small>Rename</small>
                </label>
                <input value={renameLocation} onChange={(e) => setRenameLocation(e.target.value)} />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button onClick={saveRenameLocation} disabled={!renameLocation.trim()}>
                    Save name
                  </button>
                  <button onClick={deleteLocation}>Delete location</button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Rooms */}
          <div>
            <label>
              <small>Rooms (for selected location)</small>
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              style={{ width: "100%" }}
              disabled={!selectedLocationId}
            >
              <option value="">Select…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div className="card" style={{ marginTop: 10, padding: 12 }}>
              <h4 style={{ marginTop: 0 }}>Create room</h4>
              <label>
                <small>Name</small>
              </label>
              <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} disabled={!selectedLocationId} />

              <label style={{ marginTop: 8 }}>
                <small>Color (optional)</small>
              </label>
              <input value={newRoomColor} onChange={(e) => setNewRoomColor(e.target.value)} disabled={!selectedLocationId} />

              <div style={{ marginTop: 10 }}>
                <button onClick={createRoom} disabled={!selectedLocationId}>
                  Create
                </button>
              </div>
            </div>

            {selectedRoom ? (
              <div className="card" style={{ marginTop: 10, padding: 12 }}>
                <h4 style={{ marginTop: 0 }}>Selected room</h4>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800 }}>
                    {selectedRoom.name}{" "}
                    {selectedRoom.color ? <span className="badge">{selectedRoom.color}</span> : null}
                  </div>
                </div>

                <label style={{ marginTop: 8 }}>
                  <small>Rename</small>
                </label>
                <input value={renameRoom} onChange={(e) => setRenameRoom(e.target.value)} />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button onClick={saveRenameRoom} disabled={!renameRoom.trim()}>
                    Save name
                  </button>
                  <button onClick={deleteRoom}>Delete room</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Access management */}
      <div className="card">
        <h4 style={{ marginTop: 0 }}>Therapist access</h4>
        <p className="muted">
          <small>
            Grant access at the <strong>location</strong> or <strong>room</strong> level. Room access does not imply
            location access (and vice versa).
          </small>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Location access */}
          <div className="card" style={{ padding: 12 }}>
            <h5 style={{ marginTop: 0 }}>Location access</h5>
            <label>
              <small>Therapist</small>
            </label>
            <select
              value={selectedTherapistForLoc}
              onChange={(e) => setSelectedTherapistForLoc(e.target.value)}
              style={{ width: "100%" }}
              disabled={!selectedLocationId}
            >
              <option value="">Select therapist…</option>
              {therapists.map((t) => (
                <option key={t.therapist_id} value={t.therapist_id}>
                  {t.display_name ?? t.therapist_id}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 8 }}>
              <button onClick={grantLocationAccess} disabled={!selectedLocationId || !selectedTherapistForLoc}>
                Grant access
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <h6 style={{ margin: "6px 0" }}>Existing</h6>
              {locAccess.length === 0 ? (
                <p className="muted">
                  <small>No therapists assigned to this location.</small>
                </p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {locAccess.map((a) => (
                    <div key={`${a.therapist_id}-${a.location_id}`} className="card" style={{ padding: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div>{therapistLabel(a.therapist_id)}</div>
                        <div>
                          <button onClick={() => revokeLocationAccess(a.therapist_id)}>Revoke</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Room access */}
          <div className="card" style={{ padding: 12 }}>
            <h5 style={{ marginTop: 0 }}>Room access</h5>
            <label>
              <small>Therapist</small>
            </label>
            <select
              value={selectedTherapistForRoom}
              onChange={(e) => setSelectedTherapistForRoom(e.target.value)}
              style={{ width: "100%" }}
              disabled={!selectedRoomId}
            >
              <option value="">Select therapist…</option>
              {therapists.map((t) => (
                <option key={t.therapist_id} value={t.therapist_id}>
                  {t.display_name ?? t.therapist_id}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 8 }}>
              <button onClick={grantRoomAccess} disabled={!selectedRoomId || !selectedTherapistForRoom}>
                Grant access
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <h6 style={{ margin: "6px 0" }}>Existing</h6>
              {roomAccess.length === 0 ? (
                <p className="muted">
                  <small>No therapists assigned to this room.</small>
                </p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {roomAccess.map((a) => (
                    <div key={`${a.therapist_id}-${a.room_id}`} className="card" style={{ padding: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div>{therapistLabel(a.therapist_id)}</div>
                        <div>
                          <button onClick={() => revokeRoomAccess(a.therapist_id)}>Revoke</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Room blocking */}
      <div className="card">
        <h4 style={{ marginTop: 0 }}>Room blocks</h4>
        <p className="muted">
          <small>Block times in the selected room. Uses <code>room_blocks</code>.</small>
        </p>

        <div className="card" style={{ padding: 12 }}>
          <h5 style={{ marginTop: 0 }}>Create block</h5>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>
                <small>Start</small>
              </label>
              <input
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                disabled={!selectedRoomId}
              />
            </div>
            <div>
              <label>
                <small>End</small>
              </label>
              <input
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                disabled={!selectedRoomId}
              />
            </div>
          </div>

          <label style={{ marginTop: 8 }}>
            <small>Reason (optional)</small>
          </label>
          <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} disabled={!selectedRoomId} />

          <div style={{ marginTop: 10 }}>
            <button onClick={createBlock} disabled={!selectedRoomId || !blockStart || !blockEnd}>
              Create block
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 10, padding: 12 }}>
          <h5 style={{ marginTop: 0 }}>Existing blocks</h5>
          {!selectedRoomId ? (
            <p className="muted">
              <small>Select a room to view blocks.</small>
            </p>
          ) : blocks.length === 0 ? (
            <p className="muted">
              <small>No blocks for this room.</small>
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {blocks.map((b) => (
                <div key={b.id} className="card" style={{ padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {formatDateTime(b.start_time)} → {formatDateTime(b.end_time)}
                      </div>
                      {b.reason ? (
                        <div className="muted">
                          <small>{b.reason}</small>
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <button onClick={() => deleteBlock(b.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminFacilities;
