import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";

type FormSubmission = {
  id: string;
  client_id: string;
  template_key: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  responses: Record<string, any>;
};

export function AdminForms() {
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterClient, setFilterClient] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setStatus(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("form_submissions")
      .select("id,client_id,template_key,status,submitted_at,created_at,responses")
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) {
      setStatus(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as FormSubmission[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const filtered = rows.filter((r) => {
    const okClient =
      !filterClient.trim() ||
      r.client_id.toLowerCase().includes(filterClient.trim().toLowerCase());

    const okTemplate =
      !filterTemplate.trim() ||
      r.template_key.toLowerCase().includes(filterTemplate.trim().toLowerCase());

    return okClient && okTemplate;
  });

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Submitted Forms</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            <small>
              Admin view of <code>form_submissions</code> (responses stored as JSON).
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div style={{ minWidth: 260, flex: "1 1 260px" }}>
          <label className="muted">
            <small>Filter by client_id</small>
          </label>
          <input
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            placeholder="uuid…"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ minWidth: 260, flex: "1 1 260px" }}>
          <label className="muted">
            <small>Filter by template_key</small>
          </label>
          <input
            value={filterTemplate}
            onChange={(e) => setFilterTemplate(e.target.value)}
            placeholder="assessment_v1…"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          <small>Loading…</small>
        </p>
      ) : filtered.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          <small>No form submissions found.</small>
        </p>
      ) : (
        <ul style={{ paddingLeft: 16, marginTop: 12 }}>
          {filtered.map((r) => {
            const isOpen = !!expanded[r.id];
            return (
              <li key={r.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800 }}>
                    {r.template_key} <span className="badge">{r.status}</span>
                  </div>
                  <div className="muted">
                    <small>{formatDateTime(r.created_at)}</small>
                  </div>
                </div>

                <div className="muted" style={{ marginTop: 2 }}>
                  <small>
                    client: <code>{r.client_id}</code>
                    {r.submitted_at ? (
                      <>
                        {" "}
                        · submitted: <span>{formatDateTime(r.submitted_at)}</span>
                      </>
                    ) : (
                      <> · submitted: —</>
                    )}
                  </small>
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => toggleExpanded(r.id)}>
                    {isOpen ? "Hide responses" : "View responses"}
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(r.responses ?? {}, null, 2));
                        setStatus("Copied responses JSON to clipboard.");
                        setTimeout(() => setStatus(null), 1200);
                      } catch {
                        setStatus("Failed to copy to clipboard.");
                      }
                    }}
                  >
                    Copy JSON
                  </button>
                </div>

                {isOpen && (
                  <div className="card" style={{ marginTop: 10 }}>
                    <div className="muted" style={{ marginBottom: 8 }}>
                      <small>
                        submission id: <code>{r.id}</code>
                      </small>
                    </div>
                    <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {JSON.stringify(r.responses ?? {}, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
