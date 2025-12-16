import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type MyRole = "admin" | "therapist" | "client";

const CLIENT_HOME = "/portal";
const STAFF_HOME = "/app";

function isSafeInternalPath(p: string | null | undefined): p is string {
  if (!p) return false;
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return false; // blocks http:, javascript:, etc
  return true;
}

function stripTrailingSlash(p: string): string {
  if (p === "/") return "/";
  return p.replace(/\/+$/, "");
}

function coerceKnownNextPath(rawNext: string | null): string | null {
  if (!isSafeInternalPath(rawNext)) return null;

  const next = stripTrailingSlash(rawNext.trim());
  const lower = next.toLowerCase();

  // If someone passes file-ish paths or old guesses, normalize to real routes
  if (lower === "/app/dashboard" || lower === "/dashboard" || lower === "/app/dashboard/") {
    return STAFF_HOME;
  }

  if (lower === "/app/dashboard.tsx" || lower === "/app/dashboardtsx") {
    return STAFF_HOME;
  }

  if (lower === "/app/dashboard" || lower === "/app/dashboard/") return STAFF_HOME;

  // If someone tries "/app/Dashboard" (mixed case)
  if (next === "/app/Dashboard") return STAFF_HOME;

  return next;
}

function normalizeRole(v: unknown): MyRole | null {
  const r = String(v ?? "").toLowerCase();
  if (r === "admin" || r === "therapist" || r === "client") return r;
  return null;
}

function computeRedirectTarget(role: MyRole, requestedNext: string | null): string {
  const safeNext = coerceKnownNextPath(requestedNext);
  const isStaff = role === "admin" || role === "therapist";

  if (isStaff) {
    // Never send staff to the client portal by default
    if (safeNext) {
      if (safeNext === CLIENT_HOME || safeNext.startsWith(CLIENT_HOME + "/")) return STAFF_HOME;
      return safeNext;
    }
    return STAFF_HOME;
  }

  // Client role: never send clients to staff routes by default
  if (safeNext) {
    if (safeNext === STAFF_HOME || safeNext.startsWith(STAFF_HOME + "/")) return CLIENT_HOME;
    return safeNext;
  }

  return CLIENT_HOME;
}

export function Login() {
  const nav = useNavigate();
  const loc = useLocation();

  const requestedNext = useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return sp.get("next");
  }, [loc.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prevent double redirects if submit + auth listener both fire
  const redirectingRef = useRef(false);

  async function redirectForCurrentUser() {
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    try {
      const { data: roleData, error: roleErr } = await supabase.rpc("my_role");
      const role = !roleErr ? normalizeRole(roleData) : null;

      // Safest fallback (least privileged)
      if (!role) {
        const fallback = coerceKnownNextPath(requestedNext) ?? CLIENT_HOME;
        nav(fallback, { replace: true });
        return;
      }

      const target = computeRedirectTarget(role, requestedNext);
      nav(target, { replace: true });
    } finally {
      redirectingRef.current = false;
    }
  }

  // If already logged in, redirect away from login (role-aware)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) return;

      if (data.session?.user) {
        await redirectForCurrentUser();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await redirectForCurrentUser();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedNext, nav]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Signing in…");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setStatus("Please enter email and password.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setStatus(error.message);
      setBusy(false);
      return;
    }

    setStatus(null);
    setBusy(false);

    await redirectForCurrentUser();
  }

  const redirectPreview = useMemo(() => {
    const safe = coerceKnownNextPath(requestedNext);
    if (safe) return safe;
    return `${CLIENT_HOME} (clients) / ${STAFF_HOME} (therapists & admins)`;
  }, [requestedNext]);

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
              After login you’ll be redirected to: <code>{redirectPreview}</code>
            </small>
          </p>
        </div>
      </div>
    </section>
  );
}
