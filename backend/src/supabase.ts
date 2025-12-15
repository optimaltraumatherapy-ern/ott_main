import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Server/admin client (NEVER expose service role key to frontend)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
