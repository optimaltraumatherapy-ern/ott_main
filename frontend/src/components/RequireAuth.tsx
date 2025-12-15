import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth() {
  const { loading, user } = useAuth();

  if (loading) return <div className="container">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
