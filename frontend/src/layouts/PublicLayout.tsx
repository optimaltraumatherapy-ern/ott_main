import React from "react";
import { Outlet } from "react-router-dom";
import { NavBar } from "../components/NavBar";

export function PublicLayout() {
  return (
    <div className="container">
      <NavBar />
      <Outlet />
    </div>
  );
}
