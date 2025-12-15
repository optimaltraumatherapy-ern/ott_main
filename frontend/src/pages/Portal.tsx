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
    <div>
      <h1>Client Portal (Placeholder)</h1>
      <p>Signed in as: {email ?? "(not signed in)"}</p>

      <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
        <button onClick={signOut} disabled={!email}>
          Sign out
        </button>

        <h2>Next features we’ll wire up</h2>
        <ul>
          <li>Intake forms + assessments</li>
          <li>Insurance uploads</li>
          <li>Consultation scheduling</li>
          <li>My Plan (therapist-authored)</li>
          <li>Session notes + file sharing (therapist → client)</li>
        </ul>
      </div>
    </div>
  );
}
