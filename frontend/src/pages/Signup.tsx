import { useState } from "react";
import { Link } from "react-router-dom";

export function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Wire to Supabase later; this keeps UI consistent now.
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => setBusy(false), 600); // placeholder
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1>Create your account</h1>
          <p className="muted">Placeholder — we’ll connect this to Supabase auth next.</p>

          <form className="form" onSubmit={submit} noValidate>
            <label className="label" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />

            <label className="label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              className="input"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />

            <div className="formActions">
              <button className="button" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Sign Up"}
              </button>
            </div>
          </form>

          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
