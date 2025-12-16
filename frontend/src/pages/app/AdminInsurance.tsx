import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";

type InsuranceDoc = {
  id: string;
  client_id: string;
  provider: string | null;
  member_id: string | null;
  group_number: string | null;
  front_path: string | null;
  back_path: string | null;
  created_at: string;
};

export function AdminInsurance() {
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<InsuranceDoc[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setStatus(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("insurance_documents")
      .select("id,client_id,provider,member_id,group_number,front_path,back_path,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setStatus(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as InsuranceDoc[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function openSigned(path: string | null) {
    setStatus(null);

    if (!path || !path.trim()) {
      setStatus("Missing file path for this document.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("client_uploads")
      .createSignedUrl(path, 60 * 10);

    if (error) {
      setStatus(`Signed URL failed: ${error.message}`);
      return;
    }

    if (!data?.signedUrl) {
      setStatus("Signed URL failed: no URL returned.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Insurance</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            <small>
              Admin view of <code>insurance_documents</code>. Files open via signed URL (bucket:{" "}
              <code>client_uploads</code>).
            </small>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {status && (
        <p style={{ color: "crimson", marginTop: 10 }}>
          <small>{status}</small>
        </p>
      )}

      {loading && rows.length === 0 ? (
        <p className="muted">
          <small>Loading…</small>
        </p>
      ) : rows.length === 0 ? (
        <p className="muted">
          <small>No insurance documents found.</small>
        </p>
      ) : (
        <ul style={{ paddingLeft: 16, marginTop: 10 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800 }}>{r.provider ?? "Insurance"}</div>

              <div className="muted">
                <small>
                  client: <code>{r.client_id}</code> · uploaded: {formatDateTime(r.created_at)}
                </small>
              </div>

              <div className="muted">
                <small>
                  member: <code>{r.member_id ?? "—"}</code> · group: <code>{r.group_number ?? "—"}</code>
                </small>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => openSigned(r.front_path)} disabled={!r.front_path}>
                  Open front
                </button>
                <button onClick={() => openSigned(r.back_path)} disabled={!r.back_path}>
                  Open back
                </button>
              </div>

              <div className="muted" style={{ marginTop: 6 }}>
                <small>
                  front_path: <code>{r.front_path ?? "—"}</code>
                  <br />
                  back_path: <code>{r.back_path ?? "—"}</code>
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
