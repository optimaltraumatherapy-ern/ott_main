import { Link } from "react-router-dom";
import logo from "../assets/logo_ott.png";

function SoftBlobs() {
  // lightweight placeholder art (no external images needed)
  return (
    <svg
      className="softBlobs"
      viewBox="0 0 600 420"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      <g filter="url(#blur)" opacity="0.7">
        <circle cx="170" cy="170" r="110" />
        <circle cx="360" cy="140" r="95" />
        <circle cx="320" cy="290" r="120" />
        <circle cx="470" cy="270" r="85" />
      </g>
    </svg>
  );
}

export function Home() {
  return (
    <main className="page">
      {/* HERO */}
      <section className="hero">
        <div className="container heroInner">
          <div className="heroCopy">
            <div className="eyebrow">Trauma-informed • Client-centered • Compassionate</div>

            <h1>Care that helps you feel safe, supported, and empowered.</h1>

            <p className="lead">
              Optimal Trauma Therapy, PLLC provides a welcoming space to begin healing—at
              your pace, with a plan built around your needs.
            </p>

            <div className="actionsRow">
              <Link className="button" to="/contact">
                Schedule a Consultation
              </Link>
              <Link className="button button--ghost" to="/our-process">
                Learn Our Process
              </Link>
            </div>

            <div className="pillRow" aria-label="At-a-glance">
              <span className="pill">Warm, calm environment</span>
              <span className="pill">Clear, collaborative planning</span>
              <span className="pill">Evidence-informed care</span>
            </div>
          </div>

          <div className="heroArt" aria-hidden="true">
            <div className="heroArtSurface">
              <SoftBlobs />
              <img className="heroLogo" src={logo} alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* VALUES / PRIVACY */}
      <section className="section">
        <div className="container">
          <header className="sectionHeader">
            <h2>Privacy-first approach</h2>
            <p className="muted">
              We build systems and workflows designed to protect your information and keep your
              experience calm and clear.
            </p>
          </header>

          <div className="cardGrid">
            <div className="card">
              <h3>Safe</h3>
              <p className="muted">A steady, respectful pace with clear boundaries.</p>
            </div>
            <div className="card">
              <h3>Supportive</h3>
              <p className="muted">Practical tools you can use between sessions.</p>
            </div>
            <div className="card">
              <h3>Empowering</h3>
              <p className="muted">A plan designed around your goals and strengths.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="section section--alt">
        <div className="container">
          <header className="sectionHeader">
            <h2>What it’s like to get started</h2>
            <p className="muted">A clear, predictable process—so you always know what to expect.</p>
          </header>

          <ol className="stepsGrid">
            <li className="card stepCard">
              <div className="stepNum">1</div>
              <h3>Consultation</h3>
              <p className="muted">
                We’ll talk through what you’re looking for, answer questions, and discuss fit.
              </p>
            </li>

            <li className="card stepCard">
              <div className="stepNum">2</div>
              <h3>Gentle assessment</h3>
              <p className="muted">
                We gather just enough background to build a plan—without rushing into details.
              </p>
            </li>

            <li className="card stepCard">
              <div className="stepNum">3</div>
              <h3>Skills & stabilization</h3>
              <p className="muted">
                We start with grounding and practical strategies to support you between sessions.
              </p>
            </li>

            <li className="card stepCard">
              <div className="stepNum">4</div>
              <h3>Trauma processing (when ready)</h3>
              <p className="muted">
                We move forward at your pace using approaches that fit your needs and preferences.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* ADVANCED TOOLS */}
      <section className="section">
        <div className="container">
          <header className="sectionHeader">
            <h2>Modern, evidence-informed tools</h2>
            <p className="muted">
              When appropriate, sessions may incorporate technology-assisted supports—always with
              consent and a focus on comfort.
            </p>
          </header>

          <div className="cardGrid cardGrid--4">
            <div className="card">
              <h3>EMDR light bar</h3>
              <p className="muted">
                Visual bilateral stimulation may be used to support EMDR sessions when it’s a good fit.
              </p>
            </div>

            <div className="card">
              <h3>Handheld tappers</h3>
              <p className="muted">
                Gentle tactile bilateral stimulation options for clients who prefer non-visual support.
              </p>
            </div>

            <div className="card">
              <h3>Audio bilateral tones</h3>
              <p className="muted">
                Alternating tones can be an option for clients who find sound grounding and helpful.
              </p>
            </div>

            <div className="card">
              <h3>Skills between sessions</h3>
              <p className="muted">
                Practical tools and simple routines to support regulation, sleep, and day-to-day steadiness.
              </p>
            </div>
          </div>

          <p className="finePrint">
            Modalities and tools vary by client needs and clinical appropriateness. We’ll review options together
            and proceed at a pace that feels safe.
          </p>
        </div>
      </section>

      {/* PLACEHOLDER “SECTIONS AS CARDS” */}
      <section className="section section--alt">
        <div className="container">
          <header className="sectionHeader">
            <h2>Areas of focus</h2>
            <p className="muted">
              Placeholder categories for now—these can become dedicated pages later.
            </p>
          </header>

          <div className="cardGrid">
            <div className="card">
              <h3>Trauma & PTSD</h3>
              <p className="muted">Stabilization, processing, and long-term resilience.</p>
            </div>
            <div className="card">
              <h3>Anxiety & overwhelm</h3>
              <p className="muted">Tools for nervous system regulation and sustainable coping.</p>
            </div>
            <div className="card">
              <h3>Life transitions</h3>
              <p className="muted">Support through change, grief, identity shifts, and stress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--cta">
        <div className="container">
          <div className="ctaCard">
            <div className="ctaCopy">
              <h2>Ready when you are</h2>
              <p className="muted">
                Take the next step in a way that feels manageable. We’ll keep it simple and supportive.
              </p>
            </div>

            <div className="actionsRow">
              <Link className="button" to="/contact">
                Schedule a Consultation
              </Link>
              <Link className="button button--ghost" to="/our-process">
                See what to expect
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
