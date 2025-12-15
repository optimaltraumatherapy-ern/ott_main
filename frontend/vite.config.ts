import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,

    // ✅ Allow Replit preview host (fixes "Blocked request. This host is not allowed.")
    allowedHosts: [
      "d7fcc3eb-22e5-4041-959c-b072044efd16-00-1lobmk1nzsxs3.janeway.replit.dev",
    ],
  },
});
