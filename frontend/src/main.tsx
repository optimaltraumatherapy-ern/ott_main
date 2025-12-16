import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";
import { AuthProvider } from "./context/AuthContext";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Root element "#root" not found');
}

ReactDOM.createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
