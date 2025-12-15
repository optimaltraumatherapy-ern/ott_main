export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),

  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  // Optional: comma-separated allowed origins for CORS in prod
  APP_ORIGIN: process.env.APP_ORIGIN ?? ""
};

export function assertServerEnv() {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    // Don’t throw at import time; fail only when used
    console.warn(`[env] Missing server env vars: ${missing.join(", ")}`);
  }
}
