import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

type Profile = { id: string; full_name: string | null; email: string | null };

export function ClientDetail() {
  const { clientId } = useParams();
  const { user } = useAuth();

  const [client, setClient] = useState<Profile | null>(null);

  // Plan creation
  const [planTitle, setPlanTitle] = useState("Personalized Plan");
  const [planSummary, setPlanSummary] = useState("");
  const [planStatus, setPlanStatus] = useState<string | null>(null);

  // Note creation
  const [noteTitle, setNoteTitle] = useState("Session Note");
  const [noteBody, setNoteBody] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  // File upload
  const [file, setFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("id", clientId)
        .single();
      setClient((data as Profile) ?? null);
    })();
  }, [clientId]);

  async function createPlan() {
    if (!user || !clientId) return;
    setPlanStatus(null);

    const { error } = await supabase.from("plans").insert({
      therapist_id: user.id,
      client_id: clientId,
      title: planTitle,
      summary: planSummary,
      is_active: true
    });

    if (error) return setPlanStatus(error.message);
    setPlanStatus("✅ Plan created");
  }

  async function addNote() {
    if (!user || !clientId) return;
    setNoteStatus(null);

    const { error } = await supabase.from("session_notes").insert({
      therapist_id: user.id,
      client_id: clientId,
      title: noteTitle,
      note: noteBody,
      client_visible: clientVisible
    });

    if (error) return setNoteStatus(error.message);
    setNoteStatus("✅ Note saved");
    setNoteBody("");
  }

  async function uploadFile() {
    if (!user || !clientId || !file) return;
    setFileStatus(null);

    const path = `${clientId}/therapist-uploads/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("client_uploads").upload(path, file);
    if (error) return setFileStatus(error.message);

    setFileStatus("✅ Uploaded");
    setFile(null);
  }

  return (
    <div className="card">
      <h3>Client Detail</h3>
      {!client ? (
        <p><small>Loading…</small></p>
      ) : (
        <div className="card">
          <div><strong>{client.full_name ?? "Client"}</strong></div>
          <div><small>{client.email}</small></div>
          <div><small>ID: {client.id}</small></div>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h4>Create / Update Plan</h4>
          <label>Title</label>
          <input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
          <label>Summary</label>
          <textarea value={planSummary} onChange={(e) => setPlanSummary(e.target.value)} rows={4} />
          <button onClick={createPlan}>Create Plan</button>
          {planStatus && <p>{planStatus}</p>}
        </div>

        <div className="card">
          <h4>Add Session Note</h4>
          <label>Title</label>
          <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
          <label>Note</label>
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={4} />
          <label>
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              style={{ width: "auto", marginRight: 8 }}
            />
            Visible in client portal
          </label>
          <button onClick={addNote} disabled={!noteBody}>Save Note</button>
          {noteStatus && <p>{noteStatus}</p>}
        </div>
      </div>

      <div className="card">
        <h4>Upload File for Client</h4>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ marginTop: 10 }}>
          <button onClick={uploadFile} disabled={!file}>Upload</button>
        </div>
        {fileStatus && <p>{fileStatus}</p>}
      </div>
    </div>
  );
}
