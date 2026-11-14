import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CONFIG, isPaidPlan, addOneMonth } from "@/lib/stripe/plans";

export const runtime = "nodejs";

// GET /api/cron/plan-credits: daily Vercel Cron (vercel.json). Gives
// yearly subscribers their monthly plan credits: Stripe only invoices them
// once a year, so the webhook schedules credit_balances.next_plan_grant_at
// and this job grants each month as it comes due. Exempt from session auth
// in proxy.ts; Vercel sends CRON_SECRET as a bearer token.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: due, error } = await admin
    .from("credit_balances")
    .select("user_id, next_plan_grant_at")
    .not("next_plan_grant_at", "is", null)
    .lte("next_plan_grant_at", now.toISOString())
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let granted = 0;
  let stopped = 0;
  const failures: string[] = [];

  for (const row of due ?? []) {
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("plan, subscription_status, current_period_end")
        .eq("id", row.user_id)
        .maybeSingle();

      const scheduledAt = new Date(row.next_plan_grant_at as string);
      const periodEnd = profile?.current_period_end ? new Date(profile.current_period_end) : null;
      const active = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";

      // No grant if the subscription lapsed, the plan isn't paid, or the
      // yearly renewal invoice (which grants via the webhook) is due first.
      if (!active || !profile || !isPaidPlan(profile.plan) || !periodEnd || scheduledAt >= periodEnd) {
        await admin.from("credit_balances").update({ next_plan_grant_at: null }).eq("user_id", row.user_id);
        stopped++;
        continue;
      }

      const next = addOneMonth(scheduledAt);
      const { error: rpcError } = await admin.rpc("reset_plan_credits", {
        p_user_id: row.user_id,
        p_amount: PLAN_CONFIG[profile.plan].credits,
        p_idempotency_key: `yearly_monthly_grant:${row.user_id}:${scheduledAt.toISOString()}`,
        p_next_grant_at: next < periodEnd ? next.toISOString() : null,
      });
      if (rpcError) throw rpcError;
      granted++;
    } catch (err) {
      failures.push(`${row.user_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ due: due?.length ?? 0, granted, stopped, failures });
}
