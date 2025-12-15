import { env } from "./env.js";
import { createApp } from "./server.js";

// Make thrown objects actually visible (fixes your current “null prototype” mystery)
process.on("uncaughtException", (err) => {
  console.error("[backend] uncaughtException:", err);
  try {
    console.error("[backend] uncaughtException JSON:", JSON.stringify(err));
  } catch {}
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[backend] unhandledRejection:", reason);
  try {
    console.error("[backend] unhandledRejection JSON:", JSON.stringify(reason));
  } catch {}
  process.exit(1);
});

async function main() {
  const app = createApp();

  // Replit-friendly: listen on all interfaces
  app.listen(env.BACKEND_PORT, "0.0.0.0", () => {
    console.log(`[backend] listening on http://localhost:${env.BACKEND_PORT}`);
  });
}

main().catch((err) => {
  console.error("[backend] fatal:", err);
  process.exit(1);
});
