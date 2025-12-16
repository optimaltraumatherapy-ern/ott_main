import React from "react";

export function AboutTherapists() {
  const therapists = [
    {
      name: "Therapist Name",
      blurb:
        "Short bio placeholder. This will become a friendly, clear intro describing approach and experience.",
      tags: ["Trauma‑informed", "EMDR", "Somatic"],
    },
    {
      name: "Therapist Name",
      blurb:
        "Short bio placeholder. This will become a friendly, clear intro describing approach and experience.",
      tags: ["Trauma‑informed", "EMDR", "Somatic"],
    },
    {
      name: "Therapist Name",
      blurb:
        "Short bio placeholder. This will become a friendly, clear intro describing approach and experience.",
      tags: ["Trauma‑informed", "EMDR", "Somatic"],
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <header className="card" aria-labelledby="therapists-heading">
          <h1 id="therapists-heading" style={{ marginBottom: 8 }}>
            About Our Therapists
          </h1>
          <p className="muted">
            Placeholder content — we’ll add therapist bios, specialties, modalities, and
            credentials here. These cards use the same surface, radius, and shadow tokens
            so they match the rest of the site.
          </p>
        </header>

        <div className="cardGrid" style={{ marginTop: 24 }}>
          {therapists.map((t, i) => (
            <article className="card" key={i}>
              {/* Simple avatar placeholder—swap with photos later */}
              <div
                aria-hidden="true"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background:
                    "radial-gradient(60% 60% at 40% 30%, rgba(174,177,199,.25), transparent 60%), var(--surface)",
                  boxShadow: "var(--shadow-sm)",
                }}
              />
              <h3 style={{ marginTop: 12 }}>{t.name}</h3>

              <p className="muted" style={{ marginTop: 4 }}>{t.blurb}</p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {t.tags.map((tag) => (
                  <span key={tag} className="badge">{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
