import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { AboutTherapists } from "./pages/AboutTherapists";
import { OurProcess } from "./pages/OurProcess";
import { Contact } from "./pages/Contact";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Portal } from "./pages/Portal";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";

export function App() {
  return (
    <BrowserRouter>
      <div className="appShell">
        <SiteHeader />

        <main id="main" className="appMain">
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about-therapists" element={<AboutTherapists />} />
              <Route path="/our-process" element={<OurProcess />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/portal" element={<Portal />} />
            </Routes>
          </div>
        </main>

        <SiteFooter />
      </div>
    </BrowserRouter>
  );
}
