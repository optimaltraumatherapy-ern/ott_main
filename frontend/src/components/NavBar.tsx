import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function NavBar() {
  const { user, profile, signOut } = useAuth();

  return (
    <div className="nav">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link to="/"><strong>Optimal Trauma Therapy</strong></Link>
        <Link to="/therapists">Therapists</Link>
        <Link to="/process">Our Process</Link>
        <Link to="/contact">Contact</Link>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {user ? (
          <>
            <span className="badge">{profile?.role ?? "signed in"}</span>
            <Link to="/portal">Portal</Link>
            <button onClick={signOut}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Create account</Link>
          </>
        )}
      </div>
    </div>
  );
}
