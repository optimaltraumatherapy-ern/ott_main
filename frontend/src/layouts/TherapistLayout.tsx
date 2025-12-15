import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function TherapistLayout() {
  const { profile } = useAuth();

  return (
    <div className="container">
      <h2>Therapist Admin</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/therapist">Dashboard</Link>
        <Link to="/therapist/availability">Availability</Link>
        <Link to="/therapist/clients">Clients</Link>
      </div>
      <p><small>Signed in as {profile?.email}</small></p>
      <Outlet />
    </div>
  );
}
