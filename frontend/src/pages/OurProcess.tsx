import React from "react";

export function OurProcess() {
  const steps = [
    {
      title: "1) Create an account",
      body:
        "Secure access to your portal for forms, scheduling, and plan updates.",
    },
    {
      title: "2) Intake + assessments",
      body:
        "Complete forms at your pace, with gentle prompts and clear steps.",
    },
    {
      title: "3) Consultation",
      body:
        "Meet with a therapist to understand goals and next steps.",
    },
    {
      title: "4) Personalized plan",
      body:
        "Your therapist builds a plan that is visible in your portal.",
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <header className="card" aria-labelledby="process-heading">
          <h1 id="process-heading" style={{ marginBottom: 8 }}>Our Process</h1>
          <p className="muted">
            A calm, transparent flow from first contact to ongoing care. This page uses the same
            centered container, section spacing, and card grid as other pages for a cohesive feel.
          </p>
        </header>

        <div
          className="cardGrid"
          style={{ gridTemplateColumns: "1fr 1fr", marginTop: 24 }}
        >
          {steps.map((s) => (
            <article className="card" key={s.title}>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
