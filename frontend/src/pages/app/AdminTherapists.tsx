import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Therapist = {
  therapist_id: string;
  display_name: string | null;
  bio: string | null;
  specialties: string[];
  credentials: string[];
  is_active: boolean;
  photo_path?: string | null; // optional if you add column
};

function splitCsv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinCsv(v: string[]): string {
  return (v ?? []).join(", ");
}

export function AdminTherapists() {
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<Therapist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // edit form
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialtiesCsv, setSpecialtiesCsv] = useState("");
  const [credentialsCsv, setCredentialsCsv] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function load() {
    setStatus(null);
    const { data, error } = await supabase
      .from("therapist_profiles")
      .select("therapist_id,display_name,bio,specialties,credentials,is_active")
      .order("display_name", { ascending: true });

    if (error) return setStatus(error.message);
    setRows((data as Therapist[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const selected = useMemo(() => rows.find((r) => r.therapist_id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    if (!selected) return;

    setDisplayName(selected.display_name ?? "");
    setBio(selected.bio ?? "");
    setSpecialtiesCsv(joinCsv(selected.specialties ?? []));
    setCredentialsCsv(joinCsv(selected.credentials ?? []));
    setIsActive(!!selected.is_active);
  }, [selected]);

  async function save() {
    if (!selectedId) return;

    setStatus(null);

    const payload = {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      specialties: splitCsv(specialtiesCsv),
      credentials: splitCsv(credentialsCsv),
      is_active: isActive,
    };

    const { error } = await supabase
      .from("therapist_profiles")
      .update(payload)
      .eq("therapist_id", selectedId);

    if (error) return setStatus(`Save failed: ${error.message}`);

    setStatus("Saved.");
    await load();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Therapists</h3>
        <p className="muted">
          <small>
            Manage therapist profiles (display name, bio, specialties, credentials, active status).
            This content is what you’ll show on “About Our Therapists”.
          </small>
        </p>
        {status && <p className="muted"><small>{status}</small></p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 12, alignItems: "start" }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>All therapists</h4>
          {rows.length === 0 ? (
            <p className="muted"><small>No therapist profiles found.</small></p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {rows.map((t) => (
                <li key={t.therapist_id} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setSelectedId(t.therapist_id)}
                    style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8 }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {t.display_name ?? t.therapist_id}
                      {!t.is_active ? <span className="badge" style={{ marginLeft: 8 }}>inactive</span> : null}
                    </div>
                    <div className="muted"><small>{t.therapist_id}</small></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Edit therapist</h4>

          {!selected ? (
            <p className="muted"><small>Select a therapist to edit.</small></p>
          ) : (
            <>
              <label><small>Display name</small></label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

              <label style={{ marginTop: 10 }}><small>Bio</small></label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={6} />

              <label style={{ marginTop: 10 }}><small>Specialties (comma-separated)</small></label>
              <input value={specialtiesCsv} onChange={(e) => setSpecialtiesCsv(e.target.value)} />

              <label style={{ marginTop: 10 }}><small>Credentials (comma-separated)</small></label>
              <input value={credentialsCsv} onChange={(e) => setCredentialsCsv(e.target.value)} />

              <label style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <small>Active</small>
              </label>

              <hr style={{ margin: "12px 0" }} />

              <h5 style={{ marginTop: 0 }}>Photo upload (placeholder)</h5>
              <p className="muted">
                <small>
                  Photo upload requires a storage bucket + a column to store the file path (e.g. therapist_profiles.photo_path).
                  If you want, I can provide the exact SQL + bucket policy for admin upload.
                </small>
              </p>
              <input type="file" accept="image/*" disabled />

              <div style={{ marginTop: 12 }}>
                <button onClick={save}>Save changes</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
