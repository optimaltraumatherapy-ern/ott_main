import { Outlet } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  return (
    <div className="appShell">
      <SiteHeader />

      <main id="main" className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="siteFooter">
        <div className="container siteFooter__inner">
          <p className="textMuted small">
            © {new Date().getFullYear()} Optimal Trauma Therapy, PLLC
          </p>
          <p className="textMuted small">
            If you are experiencing an emergency, call 911 or your local emergency number.
          </p>
        </div>
      </footer>
    </div>
  );
}
