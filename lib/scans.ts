import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ScanKind = "audit" | "bulk_item" | "prompt_run";

export interface ScanResultRow {
  engine: string;
  query: string;
  mentioned: boolean;
  position?: number | null;
  sentiment?: string | null;
  rawResponse?: string | null;
  citations?: unknown;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // matches the old Firestore cache TTL

export async function createScan(params: {
  userId: string;
  kind: ScanKind;
  url?: string | null;
  brand?: string | null;
  bulkJobId?: string | null;
  creditsCost: number;
  cacheKey?: string | null;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("scans")
    .insert({
      user_id: params.userId,
      kind: params.kind,
      url: params.url ?? null,
      brand: params.brand ?? null,
      bulk_job_id: params.bulkJobId ?? null,
      credits_cost: params.creditsCost,
      cache_key: params.cacheKey ?? null,
      status: "running",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function setScanLedgerDebit(scanId: string, ledgerId: string | null): Promise<void> {
  if (!ledgerId) return;
  const admin = createAdminClient();
  await admin.from("scans").update({ ledger_debit_id: ledgerId }).eq("id", scanId);
}

export async function completeScan(
  scanId: string,
  params: { result: Record<string, unknown>; visibilityScore?: number | null }
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("scans")
    .update({
      status: "completed",
      result: params.result,
      visibility_score: params.visibilityScore ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", scanId);
}

export async function failScan(scanId: string, error: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("scans")
    .update({ status: "failed", error, completed_at: new Date().toISOString() })
    .eq("id", scanId);
}

export async function insertScanResults(scanId: string, rows: ScanResultRow[]): Promise<void> {
  if (rows.length === 0) return;
  const admin = createAdminClient();
  await admin.from("scan_results").insert(
    rows.map((r) => ({
      scan_id: scanId,
      engine: r.engine,
      query: r.query,
      mentioned: r.mentioned,
      position: r.position ?? null,
      sentiment: r.sentiment ?? null,
      raw_response: r.rawResponse ?? null,
      citations: r.citations ?? null,
    }))
  );
}

/**
 * Reproduces the old Firestore 1-hour cache lookup: most recent completed
 * scan for this user+cacheKey younger than CACHE_TTL_MS. A cache hit costs
 * nothing — no fresh provider spend occurred — so the analyze route must
 * check this before calling spendCredits, not after.
 */
export async function findCachedScan(
  userId: string,
  cacheKey: string
): Promise<{ id: string; result: Record<string, unknown> } | null> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data } = await admin
    .from("scans")
    .select("id, result")
    .eq("user_id", userId)
    .eq("cache_key", cacheKey)
    .eq("status", "completed")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.result) return null;
  return { id: data.id as string, result: data.result as Record<string, unknown> };
}
