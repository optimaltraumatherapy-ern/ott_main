import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus(null);
    nav("/portal");
  }

return (
    <section className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card stack">
          <h1>Login</h1>
          <p className="muted">Placeholder — we’ll connect this to Supabase auth next.</p>

          <form className="form">
            <label className="label">
              Email
              <input className="input" placeholder="you@example.com" />
            </label>

            <label className="label">
              Password
              <input className="input" type="password" placeholder="••••••••" />
            </label>

            <button className="btn btn--primary" type="button">
              Login
            </button>
          </form>

          <p className="muted">
            Don’t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
