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

/**
 * Blocks until a request slot for `bucket` opens under its shared
 * requests-per-minute budget, or gives up after `maxWaitMs`. All concurrent
 * scans across every user draw from the same budget here — they call out
 * with the same platform-owned provider key (see PROVIDER_RPM_LIMITS in
 * lib/providerConfig.ts), so this is what keeps the app under that key's
 * real account-wide rate limit instead of every scan racing for it
 * independently. Returns false if no slot opened in time; callers should
 * treat that as "skip this provider for this scan" rather than call it
 * anyway, since calling anyway would just draw a 429 from the provider.
 */
export async function waitForProviderSlot(
  bucket: string,
  limitPerMinute: number,
  maxWaitMs = 25_000
): Promise<boolean> {
  const start = Date.now();
  while (true) {
    const allowed = await checkRateLimit(`provider:${bucket}`, limitPerMinute, 60_000);
    if (allowed) return true;
    if (Date.now() - start >= maxWaitMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
