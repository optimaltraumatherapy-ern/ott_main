import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function Portal() {
  const [email, setEmail] = useState<string | null>(null);

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
    await supabase.auth.signOut();
  }

 return (
    <section className="page">
      <div className="container stack">
        <h1>Client Portal</h1>
        <p className="muted">
          Placeholder dashboard — later this will show intake forms, assessments, scheduling, documents,
          and “My Plan.”
        </p>

        <div className="grid grid-3">
          <div className="card">
            <h3>Intake Forms</h3>
            <p className="muted">Complete your intake forms (coming soon).</p>
            <button className="btn btn--secondary" type="button">Open</button>
          </div>
          <div className="card">
            <h3>Schedule</h3>
            <p className="muted">Book a consultation or session (coming soon).</p>
            <button className="btn btn--secondary" type="button">View</button>
          </div>
          <div className="card">
            <h3>My Plan</h3>
            <p className="muted">Your therapist-created plan will appear here.</p>
            <button className="btn btn--secondary" type="button">Open</button>
          </div>
        </div>
      </div>
    </section>
  );
}
