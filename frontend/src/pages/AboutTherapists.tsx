export function AboutTherapists() {
  return (
    <section className="page">
      <div className="container stack">
        <h1>About Our Therapists</h1>
        <p className="muted">
          Placeholder content — we’ll add therapist bios, specialties, modalities, and credentials here.
        </p>

        <div className="grid grid-3">
          {["Therapist Name", "Therapist Name", "Therapist Name"].map((name, i) => (
            <div className="card" key={i}>
              <span className="pill">Trauma-informed • EMDR • Somatic</span>
              <h3 style={{ marginTop: 12 }}>{name}</h3>
              <p className="muted">
                Short bio placeholder. This will become a friendly, clear intro describing approach and
                experience.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
