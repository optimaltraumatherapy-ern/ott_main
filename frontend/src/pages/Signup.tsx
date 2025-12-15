import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Creating account...");

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Account created. You can log in now.");
    nav("/login");
  }

  return (
    <div>
      <h1>Sign Up</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Create account</button>
      </form>
      {status ? <p>{status}</p> : null}
    </div>
  );
}
