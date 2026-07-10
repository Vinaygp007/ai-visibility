import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Debits credits via the spend_credits Postgres RPC (row-locked, idempotent
 * by idempotencyKey). Throws InsufficientCreditsError on insufficient
 * balance — callers should catch that specifically to return a 402 instead
 * of a generic 500.
 */
export interface CreditTxnResult {
  balance: number;
  ledgerId: string | null;
}

async function findLedgerId(idempotencyKey: string | null): Promise<string | null> {
  if (!idempotencyKey) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data?.id ?? null;
}

export async function spendCredits(
  userId: string,
  amount: number,
  referenceId: string | null,
  idempotencyKey: string | null
): Promise<CreditTxnResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: "scan_debit",
    p_reference_id: referenceId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    if (error.message.includes("insufficient_credits")) throw new InsufficientCreditsError();
    throw error;
  }
  return { balance: data as number, ledgerId: await findLedgerId(idempotencyKey) };
}

/**
 * Refunds credits via the grant_credits RPC, idempotency-keyed on the scan
 * so a scan can never be refunded twice even if the refund call is retried.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  referenceId: string | null,
  idempotencyKey: string | null
): Promise<CreditTxnResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: "scan_refund",
    p_reference_id: referenceId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;
  return { balance: data as number, ledgerId: await findLedgerId(idempotencyKey) };
}

export async function getBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
  return data?.balance ?? 0;
}
