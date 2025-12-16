import { NavLink, Link } from "react-router-dom";
import logo from "../assets/logo_ott.png";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <a className="skipLink" href="#main">
        Skip to content
      </a>

      <div className="container headerInner">
        <Link to="/" className="brand" aria-label="Optimal Trauma Therapy Home">
          <img className="brandLogo" src={logo} alt="" />
          <div className="brandText">
            <span className="brandName">Optimal Trauma Therapy</span>
            <span className="brandTagline">Safe, supportive trauma care</span>
          </div>
        </Link>

        <nav className="nav" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) => cx("navLink", isActive && "isActive")}
          >
            Home
          </NavLink>

          <NavLink
            to="/about-therapists"
            className={({ isActive }) => cx("navLink", isActive && "isActive")}
          >
            About Our Therapists
          </NavLink>

          <NavLink
            to="/our-process"
            className={({ isActive }) => cx("navLink", isActive && "isActive")}
          >
            Our Process
          </NavLink>

          <NavLink
            to="/contact"
            className={({ isActive }) => cx("navLink", isActive && "isActive")}
          >
            Contact
          </NavLink>
        </nav>

        <div className="headerActions">
          <NavLink to="/login" className="button button--ghost">
            Login
          </NavLink>
          <NavLink to="/signup" className="button">
            Sign Up
          </NavLink>
        </div>
      </div>
    </header>
  );
}
