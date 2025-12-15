import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { AboutTherapists } from "./pages/AboutTherapists";
import { OurProcess } from "./pages/OurProcess";
import { Contact } from "./pages/Contact";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Portal } from "./pages/Portal";

export function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/">Home</Link>
        <Link to="/about-therapists">About Our Therapists</Link>
        <Link to="/our-process">Our Process</Link>
        <Link to="/contact">Contact</Link>
        <span style={{ flex: 1 }} />
        <Link to="/login">Login</Link>
        <Link to="/signup">Sign Up</Link>
        <Link to="/portal">Client Portal</Link>
      </div>

      <div style={{ padding: 16 }}>
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
    </BrowserRouter>
  );
}
