import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export function Intake() {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [goals, setGoals] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("form_submissions")
        .select("id,responses,status")
        .eq("client_id", user.id)
        .eq("template_key", "intake_v1")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        setExistingId(data.id);
        const r = (data.responses ?? {}) as any;
        setReason(r.reason ?? "");
        setGoals(r.goals ?? "");
      }
    })();
  }, [user]);

  async function save(submit: boolean) {
    if (!user) return;
    setStatus("saving");

    const payload = {
      client_id: user.id,
      template_key: "intake_v1",
      responses: { reason, goals },
      status: submit ? "submitted" : "draft",
      submitted_at: submit ? new Date().toISOString() : null
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
      <h3>Intake Form</h3>
      <p><small>Minimal v1 intake. We can replace this with a full form-builder later.</small></p>

      <label>What brings you in?</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />

      <label>What are your goals?</label>
      <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={4} />

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button onClick={() => save(false)} disabled={status === "saving"}>Save draft</button>
        <button onClick={() => save(true)} disabled={status === "saving"}>Submit</button>
      </div>

      {status === "saved" && <p>✅ Saved</p>}
      {status === "error" && <p style={{ color: "crimson" }}>❌ Error saving</p>}
    </div>
  );
}
