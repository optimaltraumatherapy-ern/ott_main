import React, { useState } from "react";

export function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });

      if (!resp.ok) throw new Error("Request failed");
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="card">
      <h1>Contact</h1>
      <p><small>This form writes to a secure DB table (later: email notifications via Resend, but avoid PHI in email).</small></p>

      <form onSubmit={submit}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />

        <label>Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required />

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
          <button disabled={status === "sending"}>Send</button>
          {status === "sent" && <span>✅ Sent</span>}
          {status === "error" && <span>❌ Failed</span>}
        </div>
      </form>
    </div>
  );
}
