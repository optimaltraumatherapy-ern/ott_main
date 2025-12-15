import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ClientLayout() {
  const { profile } = useAuth();

  return (
    <div className="container">
      <h2>Client Portal</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/intake">Intake</Link>
        <Link to="/app/assessments">Assessments</Link>
        <Link to="/app/insurance">Insurance</Link>
        <Link to="/app/schedule">Schedule</Link>
        <Link to="/app/plan">My Plan</Link>
        <Link to="/app/files">Files</Link>
        <Link to="/app/notes">Notes</Link>
      </div>
      <p><small>Signed in as {profile?.email}</small></p>
      <Outlet />
    </div>
  );
}
