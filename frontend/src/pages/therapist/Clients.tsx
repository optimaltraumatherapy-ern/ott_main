import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

type ClientLink = { client_id: string };
type Profile = { id: string; full_name: string | null; email: string | null };

export function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Profile[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: links } = await supabase
        .from("therapist_clients")
        .select("client_id")
        .eq("therapist_id", user.id);

      const ids = ((links as ClientLink[]) ?? []).map((l) => l.client_id);
      if (ids.length === 0) return setClients([]);

      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", ids);

      setClients((profs as Profile[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="card">
      <h3>Assigned Clients</h3>
      {clients.length === 0 ? (
        <p><small>No assigned clients yet.</small></p>
      ) : (
        <ul>
          {clients.map((c) => (
            <li key={c.id}>
              <Link to={`/therapist/clients/${c.id}`}>
                {c.full_name ?? c.email ?? c.id}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
