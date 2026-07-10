import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureEvent } from "@/lib/analytics/posthog";

/**
 * Best-effort: call after any successful scan completion. No-ops if the
 * user has no pending referral (never referred, or already rewarded) —
 * see the qualify_referral SQL function for the actual guard. Fires
 * referral_qualified only when the RPC reports it actually converted one.
 */
export async function qualifyReferral(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("qualify_referral", { p_referee_id: userId });
  if (error) {
    console.warn("[referrals] qualify_referral failed:", error);
    return;
  }
  if (data === true) {
    captureEvent(userId, "referral_qualified");
  }
}
