import { Link } from "react-router-dom";

export function Signup() {
  return (
    <section className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card stack">
          <h1>Create your account</h1>
          <p className="muted">Placeholder — we’ll connect this to Supabase auth next.</p>

          <form className="form">
            <label className="label">
              Email
              <input className="input" placeholder="you@example.com" />
            </label>

            <label className="label">
              Password
              <input className="input" type="password" placeholder="Create a password" />
            </label>

            <button className="btn btn--primary" type="button">
              Sign Up
            </button>
          </form>

          <p className="muted">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
