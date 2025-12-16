import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { TherapistCalendar } from "./TherapistCalendar";

type Room = { id: string; name: string; color: string | null };
type RoomBlock = {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
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

export function AdminSchedule() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Full calendar lives on this tab */}
      <TherapistCalendar />
      <RoomBlocksCard />
    </div>
  );
}

function RoomBlocksCard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [blocks, setBlocks] = useState<RoomBlock[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Create form
  const [roomId, setRoomId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [reason, setReason] = useState("");

  const roomMap = useMemo(() => {
    const m: Record<string, Room> = {};
    rooms.forEach((r) => (m[r.id] = r));
    return m;
  }, [rooms]);

  async function load() {
    setStatus(null);

    const [{ data: roomData, error: roomErr }, { data: blockData, error: blockErr }] = await Promise.all([
      supabase.from("rooms").select("id,name,color").order("name", { ascending: true }),
      supabase
        .from("room_blocks")
        .select("id,room_id,start_time,end_time,reason")
        .order("start_time", { ascending: true })
        .limit(200),
    ]);

    if (roomErr) setStatus((prev) => prev ?? `Rooms load failed: ${roomErr.message}`);
    if (blockErr) setStatus((prev) => prev ?? `Room blocks load failed: ${blockErr.message}`);

    setRooms((roomData as Room[]) ?? []);
    setBlocks((blockData as RoomBlock[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    setRoomId("");
    setStartLocal("");
    setEndLocal("");
    setReason("");
    await load();
    setStatus("Created room block.");
  }

  async function removeBlock(id: string) {
    setStatus(null);
    const { error } = await supabase.from("room_blocks").delete().eq("id", id);
    if (error) return setStatus(`Delete failed: ${error.message}`);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Room blocks</h3>
      <p className="muted">
        <small>Use room blocks to mark rooms unavailable (maintenance, holds, etc.).</small>
      </p>

      {status && <p className="muted"><small>{status}</small></p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label><small>Room</small></label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
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
            <p className="muted"><small>No blocks yet.</small></p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {blocks.map((b) => {
                const room = roomMap[b.room_id];
                return (
                  <li key={b.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>
                      {room?.name ?? b.room_id}
                    </div>
                    <div className="muted">
                      <small>
                        {toLocalInputValue(b.start_time).replace("T", " ")} → {toLocalInputValue(b.end_time).replace("T", " ")}
                      </small>
                    </div>
                    {b.reason ? (
                      <div className="muted"><small>{b.reason}</small></div>
                    ) : null}
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
