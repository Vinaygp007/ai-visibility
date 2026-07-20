import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Matches the /api/analyze cache TTL (lib/scans.ts) so crawl/pagespeed data
// doesn't outlive the main scan result it's shown alongside.
const CACHE_TTL_MS = 60 * 60 * 1000;

export type PageCheckKind = "crawl" | "pagespeed";

export async function getCachedPageCheck(
  kind: PageCheckKind,
  cacheKey: string
): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data } = await admin
    .from("page_check_cache")
    .select("result")
    .eq("kind", kind)
    .eq("url", cacheKey)
    .gte("created_at", cutoff)
    .maybeSingle();

  return (data?.result as Record<string, unknown>) ?? null;
}

export async function savePageCheck(
  kind: PageCheckKind,
  cacheKey: string,
  result: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("page_check_cache")
    .upsert(
      { kind, url: cacheKey, result, created_at: new Date().toISOString() },
      { onConflict: "kind,url" }
    );
}
