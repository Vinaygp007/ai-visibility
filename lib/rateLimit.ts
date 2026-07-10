import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sliding-window rate limit backed by Postgres. Returns true if the call
 * is allowed (and records it), false if the bucket is over limit for the
 * window. Fails OPEN on a database error — a rate-limiter outage should
 * not take down the whole app.
 */
export async function checkRateLimit(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await admin
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("bucket", bucket)
    .gte("created_at", cutoff);

  if (error) {
    console.warn("[rateLimit] check failed, failing open:", error);
    return true;
  }

  if ((count ?? 0) >= limit) return false;

  await admin.from("rate_limit_events").insert({ bucket });
  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
