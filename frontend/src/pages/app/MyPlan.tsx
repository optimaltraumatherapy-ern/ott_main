import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

type PlanItem = { id: string; title: string; details: string | null; completed_at: string | null; sort_order: number };
type Plan = { id: string; title: string; summary: string | null; plan_items: PlanItem[] };

export function MyPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("plans")
        .select("id,title,summary,plan_items(id,title,details,completed_at,sort_order)")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setPlan((data as any) ?? null);
    })();
  }, [user]);

  return (
    <div className="card">
      <h3>My Plan</h3>
      {!plan ? (
        <p><small>No plan has been published yet.</small></p>
      ) : (
        <>
          <h4>{plan.title}</h4>
          {plan.summary && <p>{plan.summary}</p>}
          <ul>
            {(plan.plan_items ?? [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((i) => (
                <li key={i.id}>
                  {i.title} {i.completed_at ? <span className="badge">done</span> : null}
                  {i.details ? <div><small>{i.details}</small></div> : null}
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
