import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sliding-window rate limit backed by Postgres. Returns true if the call
 * is allowed (and records it), false if the bucket is over limit for the
 * window. Fails OPEN on a database error — a rate-limiter outage should
 * not take down the whole app.
 *
 * The check-and-record happens atomically inside check_and_record_rate_limit
 * (see supabase/migrations/20260821000001_atomic_rate_limit.sql) — a plain
 * SELECT count + INSERT from here would race under concurrent callers on
 * the same bucket (two calls both read "under limit" before either writes),
 * which defeats the limit at exactly the concurrency it's meant to hold.
 */
export async function checkRateLimit(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("check_and_record_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error) {
    console.warn("[rateLimit] check failed, failing open:", error);
    return true;
  }

  return data === true;
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
