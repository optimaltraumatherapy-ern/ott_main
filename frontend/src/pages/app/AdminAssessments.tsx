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

type MyClientRow = {
  client_id: string;
  display_name: string | null;
  full_name?: string | null;
  email?: string | null;
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export function AdminAssessments(props: { role: "admin" | "therapist" }) {
  const [status, setStatus] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [myClientIds, setMyClientIds] = useState<string[]>([]);

  // Filter for list
  const [clientId, setClientId] = useState("");

  // Assignment controls
  const [assignClientId, setAssignClientId] = useState("");
  const [assignTemplateKey, setAssignTemplateKey] = useState("");

  const [rows, setRows] = useState<Submission[]>([]);

  // Load clients based on role
  useEffect(() => {
    (async () => {
      setStatus(null);

      try {
        if (props.role === "admin") {
          const { data, error } = await supabase
            .from("profiles")
            .select("id,full_name,email,role")
            .eq("role", "client")
            .order("created_at", { ascending: false })
            .limit(500);

          if (error) throw error;

          const opts: ClientOpt[] = ((data as any[]) ?? []).map((p) => ({
            id: p.id,
            label: p.full_name || p.email || p.id,
          }));

          setClients(opts);
          setMyClientIds(opts.map((o) => o.id));
        } else {
          const { data, error } = await supabase.rpc("list_my_clients");
          if (error) throw error;

          const mine = (data as MyClientRow[]) ?? [];
          const opts: ClientOpt[] = mine.map((c) => ({
            id: c.client_id,
            label: c.display_name || c.full_name || c.email || c.client_id,
          }));

          setClients(opts);
          setMyClientIds(opts.map((o) => o.id));
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load clients");
        setClients([]);
        setMyClientIds([]);
      }
    })();
  }, [props.role]);

  // Load submissions based on role + filter
  useEffect(() => {
    (async () => {
      setStatus(null);

      try {
        let q = supabase
          .from("form_submissions")
          .select("id,client_id,template_key,status,submitted_at,created_at")
          .order("created_at", { ascending: false })
          .limit(250);

        if (props.role === "therapist") {
          // Therapist view: only assigned clients
          if (clientId) {
            q = q.eq("client_id", clientId);
          } else {
            if (!myClientIds.length) {
              setRows([]);
              return;
            }
            q = q.in("client_id", myClientIds);
          }
        } else {
          // Admin view: optional client filter
          if (clientId) q = q.eq("client_id", clientId);
        }

        const { data, error } = await q;
        if (error) throw error;

        const all = (data as Submission[]) ?? [];
        // Treat any template_key containing "assessment" as an assessment for now
        setRows(all.filter((r) => r.template_key.toLowerCase().includes("assessment")));
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load assessments");
        setRows([]);
      }
    })();
  }, [props.role, clientId, myClientIds]);

  const templateHints = useMemo(() => {
    // quick “suggestions” from what already exists
    const keys = rows.map((r) => r.template_key);
    return uniq(keys).slice(0, 12);
  }, [rows]);

  async function assignAssessment() {
    setStatus(null);

    if (!assignClientId) return setStatus("Select a client.");
    if (!assignTemplateKey.trim()) return setStatus("Template key is required.");

    // Therapist can only assign to their clients (UI + RLS should enforce)
    if (props.role === "therapist" && myClientIds.length && !myClientIds.includes(assignClientId)) {
      return setStatus("You can only assign assessments to clients assigned to you.");
    }

    const payload = {
      client_id: assignClientId,
      template_key: assignTemplateKey.trim(),
      status: "draft",          // client completes in portal
      responses: {},            // not-null jsonb
      submitted_at: null,
    };

    const { error } = await supabase.from("form_submissions").insert(payload);
    if (error) return setStatus(`Assign failed: ${error.message}`);

    setAssignTemplateKey("");
    setStatus("Assessment assigned (draft created).");

    // Refresh list
    setClientId(assignClientId);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Assessments</h3>
      <p className="muted">
        <small>
          Assessments are stored in <code>form_submissions</code>. Assigning an assessment creates a{" "}
          <strong>draft</strong> submission for the client to complete in the portal.
        </small>
      </p>

      {status && <p style={{ color: status.toLowerCase().includes("fail") ? "crimson" : undefined }}><small>{status}</small></p>}

      <div style={{ display: "grid", gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Assign an assessment</h4>
          <p className="muted" style={{ marginTop: 6 }}>
            <small>
              {props.role === "therapist"
                ? "Therapists can assign to currently assigned clients only."
                : "Admins can assign to any client."}
            </small>
          </p>

          <label><small>Client</small></label>
          <select value={assignClientId} onChange={(e) => setAssignClientId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <label style={{ marginTop: 10 }}><small>Assessment template key</small></label>
          <input
            value={assignTemplateKey}
            onChange={(e) => setAssignTemplateKey(e.target.value)}
            placeholder="assessment_gad7_v1"
            style={{ width: "100%" }}
          />

          {templateHints.length ? (
            <div className="muted" style={{ marginTop: 8 }}>
              <small>Recent keys: </small>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {templateHints.map((k) => (
                  <button key={k} onClick={() => setAssignTemplateKey(k)} type="button">
                    {k}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 10 }}>
            <button onClick={assignAssessment} disabled={!assignClientId || !assignTemplateKey.trim()}>
              Assign
            </button>
          </div>
        </div>

        <div>
          <label><small>Filter by client</small></label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "100%" }}>
            <option value="">{props.role === "admin" ? "All clients" : "All my clients"}</option>
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
      </div>
    </div>
  );
}
