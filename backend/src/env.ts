import "dotenv/config";
import { z } from "zod";

/**
 * IMPORTANT:
 * - On Replit, `PORT` is often reserved for the main web server.
 * - Since we run BOTH Vite + API in dev, we avoid process.env.PORT entirely.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().positive().default(3001),

  // Supabase (server-side)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Optional strict CORS for production
  APP_ORIGIN: z.string().url().optional()
});

export const env = EnvSchema.parse(process.env);
