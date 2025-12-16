import { Link } from "react-router-dom";
import logo from "../assets/logo_ott.png";

export function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="heroInner">
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
          </div>

          <div className="heroArt" aria-hidden="true">
            <img src={logo} alt="" />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Privacy-first approach</h2>
        <p className="muted">
          We build systems and workflows designed to protect your information and keep your
          experience calm and clear.
        </p>

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
      </section>
    </div>
  );
}
