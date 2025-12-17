import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTime } from "../../lib/time";
import { useAuth } from "../../context/AuthContext";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
};

type TherapistProfile = { therapist_id: string; display_name: string | null; is_active: boolean };
type ClientDisplay = { client_id: string; display_name: string | null };

type Appointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  kind: string;
  therapist_id: string;
  client_id: string;
};

type InsuranceDoc = {
  id: string;
  provider: string | null;
  member_id: string | null;
  group_number: string | null;
  front_path: string | null;
  back_path: string | null;
  created_at: string;
};

type FormSubmission = {
  id: string;
  template_key: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
};

function niceName(p: Profile | null | undefined) {
  if (!p) return "";
  return p.full_name || p.email || p.id;
}

export function AdminClients(props: { role: "admin" | "therapist" }) {
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [clients, setClients] = useState<Profile[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [assignedTherapists, setAssignedTherapists] = useState<TherapistProfile[]>([]);

  const [appts, setAppts] = useState<Appointment[]>([]);
  const [insurance, setInsurance] = useState<InsuranceDoc[]>([]);
  const [forms, setForms] = useState<FormSubmission[]>([]);

  const [assignTherapistId, setAssignTherapistId] = useState("");

  // ✅ FIX: selectedProfile state is inside the component (Hooks must be here)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;

    return clients.filter((c) => {
      const name = (clientNames[c.id] || "").toLowerCase();
      return (
        (c.email || "").toLowerCase().includes(s) ||
        (c.full_name || "").toLowerCase().includes(s) ||
        name.includes(s)
      );
    });
  }, [clients, q, clientNames]);

  // Load therapists list (for admin assignment + display)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("therapist_profiles")
        .select("therapist_id,display_name,is_active")
        .order("display_name", { ascending: true });

      if (!error) setTherapists((data as TherapistProfile[]) ?? []);
    })();
  }, []);

  // Load clients list based on role
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        if (props.role === "admin") {
          const { data, error } = await supabase
            .from("profiles")
            .select("id,email,full_name,role")
            .eq("role", "client")
            .order("created_at", { ascending: false })
            .limit(500);

          if (error) throw error;

          const rows = (data as Profile[]) ?? [];
          if (!mounted) return;

          setClients(rows);

          // Auto-select first client if none selected
          if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
        } else {
          // Therapist: clients they’re linked to (via therapist_clients)
          const { data, error } = await supabase.rpc("list_my_clients");
          if (error) throw error;

          const rows = (data as Array<{ client_id: string; display_name: string | null }>) ?? [];
          const pseudoProfiles: Profile[] = rows.map((r) => ({
            id: r.client_id,
            email: null,
            full_name: null,
            role: "client",
          }));

          if (!mounted) return;

          setClients(pseudoProfiles);

          // Seed display names directly from RPC result to reduce extra queries
          const nameMap: Record<string, string> = {};
          rows.forEach((r) => {
            if (r.display_name) nameMap[r.client_id] = r.display_name;
          });
          setClientNames((prev) => ({ ...prev, ...nameMap }));

          if (!selectedId && pseudoProfiles.length > 0) setSelectedId(pseudoProfiles[0].id);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Failed loading clients");
        setClients([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.role]);

  // After clients list loads, fetch client_profiles display_name in bulk
  useEffect(() => {
    if (!clients.length) return;

    (async () => {
      const ids = clients.map((c) => c.id);
      const { data, error } = await supabase
        .from("client_profiles")
        .select("client_id,display_name")
        .in("client_id", ids);

      if (error) return;

      const map: Record<string, string> = {};
      ((data as ClientDisplay[]) ?? []).forEach((r) => {
        if (r.display_name) map[r.client_id] = r.display_name;
      });

      setClientNames((prev) => ({ ...prev, ...map }));
    })();
  }, [clients]);

  // Load detail panels when client selected
  useEffect(() => {
    if (!selectedId) {
      setAssignedTherapists([]);
      setAppts([]);
      setInsurance([]);
      setForms([]);
      setSelectedProfile(null);
      return;
    }

    let mounted = true;

    (async () => {
      setErr(null);

      try {
        // Assigned therapists (admin sees all, therapist sees what RLS allows)
        const { data: tcData, error: tcErr } = await supabase
          .from("therapist_clients")
          .select("therapist_id")
          .eq("client_id", selectedId);

        if (!mounted) return;

        if (tcErr) {
          setAssignedTherapists([]);
        } else {
          const tIds = ((tcData as any[]) ?? []).map((x) => x.therapist_id);
          const assigned = therapists.filter((t) => tIds.includes(t.therapist_id));
          setAssignedTherapists(assigned);
        }

        // Contact info
        // Admin already has profiles info in list; therapist needs a direct fetch (requires profiles select policy)
        if (props.role === "therapist") {
          const { data: pData, error: pErr } = await supabase
            .from("profiles")
            .select("id,email,full_name,role")
            .eq("id", selectedId)
            .single();

          if (!mounted) return;

          if (pErr) setSelectedProfile(null);
          else setSelectedProfile((pData as Profile) ?? null);
        } else {
          const p = clients.find((c) => c.id === selectedId) ?? null;
          setSelectedProfile(p);
        }

        // Appointments (therapist: show only their own sessions)
        let apptQ = supabase
          .from("appointments")
          .select("id,start_time,end_time,status,kind,therapist_id,client_id")
          .eq("client_id", selectedId)
          .order("start_time", { ascending: false })
          .limit(50);

        if (props.role === "therapist" && user?.id) {
          apptQ = apptQ.eq("therapist_id", user.id);
        }

        const { data: apptData } = await apptQ;
        if (!mounted) return;
        setAppts((apptData as Appointment[]) ?? []);

        // Insurance (therapist should only see assigned clients; enforce with RLS if needed)
        const { data: insData } = await supabase
          .from("insurance_documents")
          .select("id,provider,member_id,group_number,front_path,back_path,created_at")
          .eq("client_id", selectedId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!mounted) return;
        setInsurance((insData as InsuranceDoc[]) ?? []);

        // Forms
        const { data: formData } = await supabase
          .from("form_submissions")
          .select("id,template_key,status,submitted_at,created_at")
          .eq("client_id", selectedId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!mounted) return;
        setForms((formData as FormSubmission[]) ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Failed loading client details");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedId, therapists, props.role, clients, user?.id]);

  async function assignTherapist() {
    if (props.role !== "admin") return;
    if (!selectedId) return;
    if (!assignTherapistId) return;

    const { error } = await supabase.from("therapist_clients").insert({
      therapist_id: assignTherapistId,
      client_id: selectedId,
    });

    if (error) {
      setErr(`Assign failed: ${error.message}`);
      return;
    }

    setAssignTherapistId("");

    // Refresh assignment list from DB (more reliable than trying to patch state)
    const { data: tcData } = await supabase
      .from("therapist_clients")
      .select("therapist_id")
      .eq("client_id", selectedId);

    const tIds = ((tcData as any[]) ?? []).map((x) => x.therapist_id);
    const assigned = therapists.filter((t) => tIds.includes(t.therapist_id));
    setAssignedTherapists(assigned);
  }

  if (loading) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Clients</h3>
        <p className="muted"><small>Loading…</small></p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Clients</h3>
        <p className="muted">
          <small>
            {props.role === "admin"
              ? "Admin: view all clients and assign therapists."
              : "Therapist: view only your assigned clients."}
          </small>
        </p>

        {err && <p style={{ color: "crimson" }}><small>{err}</small></p>}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name/email…"
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 12, alignItems: "start" }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>{props.role === "admin" ? "All clients" : "My clients"}</h4>
          {filtered.length === 0 ? (
            <p className="muted"><small>No clients found.</small></p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {filtered.slice(0, 200).map((c) => (
                <li key={c.id} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {clientNames[c.id] || niceName(c) || c.id}
                    </div>
                    <div className="muted">
                      <small>{c.email ?? c.id}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {filtered.length > 200 ? (
            <p className="muted"><small>Showing first 200 results.</small></p>
          ) : null}
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Client details</h4>

          {!selectedId ? (
            <p className="muted"><small>Select a client to view details.</small></p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {clientNames[selectedId] || selectedId}
                  </div>
                  <div className="muted"><small>{selectedId}</small></div>
                </div>
                <button onClick={() => nav(`/app/notes?client=${encodeURIComponent(selectedId)}`)}>
                  Open notes
                </button>
              </div>

              <hr style={{ margin: "12px 0" }} />

              <h5 style={{ margin: "0 0 8px 0" }}>Contact</h5>
              {!selectedProfile ? (
                <p className="muted"><small>Contact info unavailable.</small></p>
              ) : (
                <div className="card" style={{ padding: 10 }}>
                  <div><strong>{selectedProfile.full_name ?? "Name not set"}</strong></div>
                  <div className="muted"><small>{selectedProfile.email ?? "Email not set"}</small></div>
                  {selectedProfile.email ? (
                    <div style={{ marginTop: 8 }}>
                      <a href={`mailto:${selectedProfile.email}`}>Email client</a>
                    </div>
                  ) : null}
                </div>
              )}

              <hr style={{ margin: "12px 0" }} />

              <h5 style={{ margin: "0 0 8px 0" }}>Assigned therapist(s)</h5>
              {assignedTherapists.length === 0 ? (
                <p className="muted"><small>None assigned.</small></p>
              ) : (
                <ul style={{ paddingLeft: 16 }}>
                  {assignedTherapists.map((t) => (
                    <li key={t.therapist_id}>
                      {t.display_name ?? t.therapist_id}{" "}
                      {!t.is_active ? <span className="badge">inactive</span> : null}
                    </li>
                  ))}
                </ul>
              )}

              {props.role === "admin" ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <select
                    value={assignTherapistId}
                    onChange={(e) => setAssignTherapistId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Assign therapist…</option>
                    {therapists.map((t) => (
                      <option key={t.therapist_id} value={t.therapist_id}>
                        {t.display_name ?? t.therapist_id}
                      </option>
                    ))}
                  </select>
                  <button onClick={assignTherapist} disabled={!assignTherapistId}>
                    Assign
                  </button>
                </div>
              ) : null}

              <hr style={{ margin: "12px 0" }} />

              <h5 style={{ margin: "0 0 8px 0" }}>Sessions</h5>
              {appts.length === 0 ? (
                <p className="muted"><small>No appointments found.</small></p>
              ) : (
                <ul style={{ paddingLeft: 16 }}>
                  {appts.slice(0, 15).map((a) => (
                    <li key={a.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>
                        {formatDateTime(a.start_time)} — {a.kind} <span className="badge">{a.status}</span>
                      </div>
                      <div className="muted"><small>Appointment: {a.id}</small></div>
                    </li>
                  ))}
                </ul>
              )}

              <hr style={{ margin: "12px 0" }} />

              <h5 style={{ margin: "0 0 8px 0" }}>Insurance uploads</h5>
              {insurance.length === 0 ? (
                <p className="muted"><small>No insurance docs uploaded.</small></p>
              ) : (
                <ul style={{ paddingLeft: 16 }}>
                  {insurance.map((d) => (
                    <li key={d.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{d.provider ?? "Insurance"}</div>
                      <div className="muted"><small>Uploaded: {formatDateTime(d.created_at)}</small></div>
                    </li>
                  ))}
                </ul>
              )}

              <hr style={{ margin: "12px 0" }} />

              <h5 style={{ margin: "0 0 8px 0" }}>Submitted forms</h5>
              {forms.length === 0 ? (
                <p className="muted"><small>No form submissions.</small></p>
              ) : (
                <ul style={{ paddingLeft: 16 }}>
                  {forms.slice(0, 12).map((f) => (
                    <li key={f.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{f.template_key}</div>
                      <div className="muted">
                        <small>
                          status: {f.status} · submitted: {f.submitted_at ? formatDateTime(f.submitted_at) : "—"}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminClients;
