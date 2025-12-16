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
  <section className="page">
    <div className="container">
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <h1>Contact</h1>
          <p className="muted">
            Placeholder form — we’ll connect this to your backend/email flow later (Resend, etc.).
          </p>

          <div className="callout">
            <strong>You’re in control</strong>
            <p className="muted" style={{ marginTop: 8 }}>
              Share only what you’re comfortable sharing. We’ll keep the next steps clear and supportive.
            </p>
          </div>
        </div>

        <div className="card">
          <form className="form">
            <label className="label">
              Name
              <input className="input" placeholder="Your name" />
            </label>

            <label className="label">
              Email
              <input className="input" placeholder="you@example.com" />
            </label>

            <label className="label">
              Message
              <textarea className="textarea" placeholder="How can we help?" />
            </label>

            <button className="btn btn--primary" type="button">
              Send Message
            </button>

            <small className="muted">
              (This button is not wired yet — we’ll connect it once backend email is ready.)
            </small>
          </form>
        </div>
      </div>
    </div>
  </section>
);
}
