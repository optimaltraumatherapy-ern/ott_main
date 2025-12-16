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
        body: JSON.stringify({ name, email, message }),
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

  const disabled = status === "sending";

  return (
    <section className="section">
      <div className="container">
        {/* Two-up layout using the same card + grid primitives */}
        <div className="cardGrid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <aside className="card">
            <h1>Contact</h1>
            <p className="muted">
              Placeholder form — we’ll connect this to your backend/email flow later (Resend, etc.).
            </p>

            <div style={{ marginTop: 12 }}>
              <strong>You’re in control</strong>
              <p className="muted" style={{ marginTop: 8 }}>
                Share only what you’re comfortable sharing. We’ll keep the next steps clear and
                supportive.
              </p>
            </div>

            <ul className="muted" style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>Private, secure submissions</li>
              <li>We respond with gentle, actionable next steps</li>
              <li>No marketing emails—ever</li>
            </ul>
          </aside>

          <div className="card">
            <form className="form" onSubmit={submit} noValidate>
              <label className="label" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                className="input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={disabled}
              />

              <label className="label" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled}
              />

              <label className="label" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                className="textarea"
                placeholder="How can we help?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={disabled}
              />

              <div className="formActions">
                <button className="button" type="submit" disabled={disabled}>
                  {status === "sending" ? "Sending…" : "Send Message"}
                </button>
                <span className="muted">
                  {status === "sent" && "Thanks—we’ll be in touch shortly."}
                  {status === "error" && "Something went wrong. Please try again."}
                </span>
              </div>

              <small className="muted">
                This demo form uses the same inputs/buttons used throughout the site.
              </small>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
