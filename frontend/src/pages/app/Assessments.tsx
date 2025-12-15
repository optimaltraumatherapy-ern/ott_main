import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export function Assessments() {
  const { user } = useAuth();
  const [severity, setSeverity] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("form_submissions")
        .select("id,responses")
        .eq("client_id", user.id)
        .eq("template_key", "assessment_v1")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        setExistingId(data.id);
        const r = (data.responses ?? {}) as any;
        setSeverity(r.severity ?? 5);
        setSleep(r.sleep ?? 5);
      }
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setStatus("saving");

    const payload = {
      client_id: user.id,
      template_key: "assessment_v1",
      responses: { severity, sleep },
      status: "submitted",
      submitted_at: new Date().toISOString()
    };

    const q = existingId
      ? supabase.from("form_submissions").update(payload).eq("id", existingId)
      : supabase.from("form_submissions").insert(payload).select("id").single();

    const { data, error } = await q;
    if (error) return setStatus("error");
    if (!existingId && (data as any)?.id) setExistingId((data as any).id);

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1200);
  }

  return (
    <div className="card">
      <h3>Initial Assessments</h3>
      <p><small>Starter assessment (0–10). Replace with standardized tools later.</small></p>

      <label>Overall distress severity (0–10)</label>
      <input
        type="number"
        min={0}
        max={10}
        value={severity}
        onChange={(e) => setSeverity(Number(e.target.value))}
      />

      <label>Sleep quality (0–10)</label>
      <input
        type="number"
        min={0}
        max={10}
        value={sleep}
        onChange={(e) => setSleep(Number(e.target.value))}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={save} disabled={status === "saving"}>Submit assessment</button>
      </div>

      {status === "saved" && <p>✅ Submitted</p>}
      {status === "error" && <p style={{ color: "crimson" }}>❌ Error</p>}
    </div>
  );
}
