import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export function Login() {
  const nav = useNavigate();
  const loc = useLocation();

  const nextPath = useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return sp.get("next") || "/portal";
  }, [loc.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect away from login
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) return;
      if (data.session?.user) {
        nav(nextPath, { replace: true });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) nav(nextPath, { replace: true });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [nav, nextPath]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Signing in…");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setStatus("Please enter email and password.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      // Common helpful hints:
      // - "Invalid login credentials"
      // - "Email not confirmed"
      setStatus(error.message);
      setBusy(false);
      return;
    }

    setStatus(null);
    setBusy(false);
    nav(nextPath, { replace: true });
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1>Login</h1>
          <p className="muted">Use your email and password to access the portal.</p>

          <form className="form" onSubmit={submit} noValidate>
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
              autoComplete="email"
            />

            <label className="label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              autoComplete="current-password"
            />

            <div className="formActions">
              <button className="button" type="submit" disabled={busy}>
                {busy ? "Logging in…" : "Login"}
              </button>
              {status && <span className="muted">{status}</span>}
            </div>
          </form>

          <p className="muted" style={{ marginTop: 12 }}>
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>

          <p className="muted" style={{ marginTop: 8 }}>
            <small>
              After login you’ll be redirected to: <code>{nextPath}</code>
            </small>
          </p>
        </div>
      </div>
    </section>
  );
}
