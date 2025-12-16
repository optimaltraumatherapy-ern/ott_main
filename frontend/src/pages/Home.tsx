import { Link } from "react-router-dom";
import logo from "../assets/logo_ott.png";

export function Home() {
  return (
    <div className="ott-page">
      <main id="main" className="ott-main">
        <section className="ott-hero">
          <div className="ott-container">
            <div className="ott-hero__panel">
              <div className="ott-hero__grid">
                {/* Left: copy */}
                <div className="ott-hero__copy">
                  <p className="ott-eyebrow">Trauma‑informed • Client‑centered • Compassionate</p>
                  <h1 className="ott-hero__title">
                    Care that helps you feel safe, supported, and empowered.
                  </h1>
                  <p className="ott-hero__lead">
                    Optimal Trauma Therapy, PLLC provides a welcoming space to begin healing—at
                    your pace, with a plan built around your needs.
                  </p>

                  <div className="ott-actions">
                    <Link className="button" to="/contact">
                      Schedule a Consultation
                    </Link>
                    <Link className="button button--ghost" to="/our-process">
                      Learn Our Process
                    </Link>
                  </div>
                </div>

                {/* Right: logo only (no blob) */}
                <div className="ott-hero__art" aria-hidden="true">
                  <img className="ott-hero__logo" src={logo} alt="" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key pillars */}
        <section className="ott-section">
          <div className="ott-container">
            <header className="ott-section__header">
              <h2>Privacy‑first approach</h2>
              <p className="ott-section__lead">
                We design systems and workflows to protect your information and keep your experience
                calm and clear.
              </p>
            </header>

            <div className="cardGrid">
              <article className="card">
                <h3>Safe</h3>
                <p className="muted">A steady, respectful pace with clear boundaries.</p>
              </article>
              <article className="card">
                <h3>Supportive</h3>
                <p className="muted">Practical tools you can use between sessions.</p>
              </article>
              <article className="card">
                <h3>Empowering</h3>
                <p className="muted">A plan designed around your goals and strengths.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Placeholder sections (cards with better spacing & center alignment) */}
        <section className="ott-section">
          <div className="ott-container ott-grid-2">
            <article className="ott-card">
              <header className="ott-card__header">
                <h3>What to Expect</h3>
                <p className="muted">A clear and gentle process from first hello to ongoing care.</p>
              </header>
              <p>
                From intake to your first session, we set a calm pace. You’ll collaborate on goals,
                understand options like EMDR and somatic work, and decide what feels right.
              </p>
              <Link className="button button--ghost" to="/our-process">Our Process</Link>
            </article>

            <article className="ott-card">
              <header className="ott-card__header">
                <h3>Tools & Technology</h3>
                <p className="muted">Thoughtfully chosen, never overwhelming.</p>
              </header>
              <p>
                We incorporate EMDR light bars and other modern trauma therapies when appropriate.
                Each tool is explained in simple language and used only with your consent.
              </p>
              <div className="ott-chipRow" aria-hidden="true">
                <span className="ott-chip">EMDR</span>
                <span className="ott-chip">Light Bar</span>
                <span className="ott-chip">BLS</span>
                <span className="ott-chip">Somatic</span>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
