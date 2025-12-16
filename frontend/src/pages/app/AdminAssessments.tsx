import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";

type Submission = {
  id: string;
  client_id: string;
  template_key: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
};

type ClientOpt = { id: string; label: string };

export function AdminAssessments() {
  const [status, setStatus] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<Submission[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,role")
        .eq("role", "client")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        setStatus(error.message);
        setClients([]);
        return;
      }

      setClients(
        ((data as any[]) ?? []).map((p) => ({
          id: p.id,
          label: p.full_name || p.email || p.id,
        }))
      );
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setStatus(null);

      let q = supabase
        .from("form_submissions")
        .select("id,client_id,template_key,status,submitted_at,created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (clientId) q = q.eq("client_id", clientId);

      const { data, error } = await q;
      if (error) {
        setStatus(error.message);
        setRows([]);
        return;
      }

      // Treat any template_key containing "assessment" as an assessment for now
      const all = (data as Submission[]) ?? [];
      setRows(all.filter((r) => r.template_key.toLowerCase().includes("assessment")));
    })();
  }, [clientId]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Assessments</h3>
      <p className="muted">
        <small>
          Starter view: assessments are stored in <code>form_submissions</code> (template_key contains “assessment”).
          Next step is adding a real “assessment templates + assignments” layer.
        </small>
      </p>

      {status && <p style={{ color: "crimson" }}><small>{status}</small></p>}

      <label><small>Filter by client</small></label>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "100%" }}>
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>

      <hr style={{ margin: "12px 0" }} />

      {rows.length === 0 ? (
        <p className="muted"><small>No assessment submissions found.</small></p>
      ) : (
        <ul style={{ paddingLeft: 16 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800 }}>{r.template_key}</div>
              <div className="muted">
                <small>
                  client: {r.client_id} · status: {r.status} · submitted: {r.submitted_at ? formatDateTime(r.submitted_at) : "—"}
                </small>
              </div>
              <div className="muted"><small>created: {formatDateTime(r.created_at)}</small></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
