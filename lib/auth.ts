import "server-only";
import { createClient } from "@/lib/supabase/server";
import { UserPlan } from "@/types";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  role: "user" | "admin";
  status: "pending" | "active" | "suspended";
  referralCode: string;
  creditBalance: number;
  plan: UserPlan;
}

/**
 * Server-only helper: resolves the authenticated Supabase user plus their
 * profiles row and credit balance in one call. Returns null if there is no
 * session, the profile row is missing, or the account isn't active — every
 * credit-gated route and page should treat all three as "not authorized".
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, referral_code, plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") return null;

  const { data: balanceRow } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role,
    status: profile.status,
    referralCode: profile.referral_code,
    creditBalance: balanceRow?.balance ?? 0,
    plan: profile.plan,
  };
}
