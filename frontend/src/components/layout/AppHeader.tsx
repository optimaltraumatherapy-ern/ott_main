import { NavLink } from "react-router-dom";
import logoUrl from "../assets/logo_ott.png";

function navClass(isActive: boolean) {
  return `navLink ${isActive ? "navLink--active" : ""}`;
}

export function AppHeader() {
  return (
    <header className="appHeader">
      <a className="skipLink" href="#main">
        Skip to content
      </a>

      <div className="container appHeader__inner">
        <div className="brand">
          <img className="brand__logo" src={logoUrl} alt="Optimal Trauma Therapy logo" />
          <div className="brand__name">
            <strong>Optimal Trauma Therapy</strong>
            <span>Safe, supportive trauma care</span>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <NavLink to="/" className={({ isActive }) => navClass(isActive)}>
            Home
          </NavLink>
          <NavLink to="/about-therapists" className={({ isActive }) => navClass(isActive)}>
            About
          </NavLink>
          <NavLink to="/our-process" className={({ isActive }) => navClass(isActive)}>
            Our Process
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => navClass(isActive)}>
            Contact
          </NavLink>

          <span className="navSpacer" />

          <NavLink to="/login" className={({ isActive }) => navClass(isActive)}>
            Login
          </NavLink>
          <NavLink to="/signup" className={({ isActive }) => navClass(isActive)}>
            Sign Up
          </NavLink>
          <NavLink to="/portal" className={({ isActive }) => navClass(isActive)}>
            Client Portal
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
