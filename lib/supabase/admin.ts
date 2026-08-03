import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only.
 *
 * Only import this from Route Handlers, Server Actions, or other
 * server-only modules: admin RPC calls (grant_credits, spend_credits,
 * etc.), and anything else that must act outside the calling user's own
 * row. Never expose SUPABASE_SERVICE_ROLE_KEY to the
 * browser — the "server-only" import above makes an accidental client
 * bundle inclusion a build-time error instead of a leaked secret.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
