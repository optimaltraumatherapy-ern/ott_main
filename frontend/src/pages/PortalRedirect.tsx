import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PortalRedirect() {
  const nav = useNavigate();
  const { loading, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!profile) return;

    if (profile.role === "therapist" || profile.role === "admin") nav("/therapist", { replace: true });
    else nav("/app", { replace: true });
  }, [loading, profile, nav]);

  return <div className="container">Redirecting…</div>;
}
