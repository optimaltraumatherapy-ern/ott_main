import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { loading, profile } = useAuth();

  if (loading) return <div className="container">Loading…</div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (!roles.includes(profile.role)) return <Navigate to="/portal" replace />;

  return <Outlet />;
}
