import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("referral_code").eq("id", user.id).single();

  // RLS's "read own referrals" policy already scopes this to rows where
  // referrer_id = auth.uid() — no admin client needed here.
  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, status, referrer_reward, created_at, qualified_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const rows = referrals ?? [];
  const rewarded = rows.filter((r) => r.status === "rewarded");

  const { origin } = new URL(req.url);

  return NextResponse.json({
    referralCode: profile?.referral_code ?? null,
    referralLink: profile?.referral_code ? `${origin}/signup?ref=${profile.referral_code}` : null,
    totals: {
      count: rows.length,
      rewardedCount: rewarded.length,
      pendingCount: rows.length - rewarded.length,
      creditsEarned: rewarded.reduce((sum, r) => sum + r.referrer_reward, 0),
    },
    referrals: rows.map((r) => ({
      id: r.id,
      status: r.status,
      reward: r.referrer_reward,
      createdAt: r.created_at,
      qualifiedAt: r.qualified_at,
    })),
  });
}
