import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export type UserRole = "loading" | "client" | "therapist" | "admin";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>("loading");

  useEffect(() => {
    if (!user) {
      setRole("loading");
      return;
    }

    let cancelled = false;

    (async () => {
      // Admin?
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (adminRow?.user_id) {
        setRole("admin");
        return;
      }

      // Therapist?
      const { data: therapistRow } = await supabase
        .from("therapist_profiles")
        .select("therapist_id")
        .eq("therapist_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (therapistRow?.therapist_id) {
        setRole("therapist");
        return;
      }

      // Default: client
      setRole("client");
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { user, role };
}
