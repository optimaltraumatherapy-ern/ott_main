import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function Portal() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  }

  return (
    <section className="section">
      <div className="container">
        <header className="card" aria-labelledby="portal-heading">
          <h1 id="portal-heading">Client Portal</h1>
          <p className="muted">
            Placeholder dashboard — later this will show intake forms, assessments, scheduling,
            documents, and “My Plan.”
          </p>

          <div className="formActions" style={{ marginTop: 8 }}>
            <small className="muted">
              {email ? `Signed in as ${email}` : "Not signed in"}
            </small>
            {email && (
              <button className="button button--ghost" onClick={signOut} disabled={busy}>
                {busy ? "Signing out…" : "Sign out"}
              </button>
            )}
          </div>
        </header>

        <div className="cardGrid" style={{ marginTop: 24 }}>
          <section className="card" aria-labelledby="intake-title">
            <h3 id="intake-title">Intake Forms</h3>
            <p className="muted">Complete your intake forms (coming soon).</p>
            <div className="formActions">
              <button className="button button--ghost" type="button">Open</button>
            </div>
          </section>

          <section className="card" aria-labelledby="schedule-title">
            <h3 id="schedule-title">Schedule</h3>
            <p className="muted">Book a consultation or session (coming soon).</p>
            <div className="formActions">
              <button className="button button--ghost" type="button">View</button>
            </div>
          </section>

          <section className="card" aria-labelledby="plan-title">
            <h3 id="plan-title">My Plan</h3>
            <p className="muted">Your therapist‑created plan will appear here.</p>
            <div className="formActions">
              <button className="button button--ghost" type="button">Open</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
