import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export function Insurance() {
  const { user } = useAuth();
  const [provider, setProvider] = useState("");
  const [memberId, setMemberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function upload() {
    if (!user) return;
    if (!front && !back) return;

    setStatus("uploading");

    try {
      const base = `${user.id}/insurance/${Date.now()}`;

      let frontPath: string | null = null;
      let backPath: string | null = null;

      if (front) {
        frontPath = `${base}-front-${front.name}`;
        const { error } = await supabase.storage.from("client_uploads").upload(frontPath, front);
        if (error) throw error;
      }
      if (back) {
        backPath = `${base}-back-${back.name}`;
        const { error } = await supabase.storage.from("client_uploads").upload(backPath, back);
        if (error) throw error;
      }

      const { error: insErr } = await supabase.from("insurance_documents").insert({
        client_id: user.id,
        provider,
        member_id: memberId,
        group_number: groupNumber,
        front_path: frontPath,
        back_path: backPath
      });

      if (insErr) throw insErr;

      setStatus("done");
      setProvider("");
      setMemberId("");
      setGroupNumber("");
      setFront(null);
      setBack(null);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="card">
      <h3>Insurance</h3>
      <p><small>Uploads go to a private bucket and are accessed via signed URLs.</small></p>

      <label>Provider</label>
      <input value={provider} onChange={(e) => setProvider(e.target.value)} />

      <label>Member ID</label>
      <input value={memberId} onChange={(e) => setMemberId(e.target.value)} />

      <label>Group Number</label>
      <input value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} />

      <label>Front of card</label>
      <input type="file" accept="image/*,.pdf" onChange={(e) => setFront(e.target.files?.[0] ?? null)} />

      <label>Back of card</label>
      <input type="file" accept="image/*,.pdf" onChange={(e) => setBack(e.target.files?.[0] ?? null)} />

      <div style={{ marginTop: 12 }}>
        <button onClick={upload} disabled={status === "uploading"}>Upload</button>
      </div>

      {status === "done" && <p>✅ Uploaded</p>}
      {status === "error" && <p style={{ color: "crimson" }}>❌ Upload failed</p>}
    </div>
  );
}
