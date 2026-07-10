import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type BulkJobKind = "bulk_audit" | "bulk_prompt";

export async function createBulkJob(params: {
  userId: string;
  kind: BulkJobKind;
  total: number;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bulk_jobs")
    .insert({
      user_id: params.userId,
      kind: params.kind,
      total: params.total,
      status: "running",
      metadata: params.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateBulkJobCounters(
  jobId: string,
  counters: { completed?: number; failed?: number; skipped?: number }
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("bulk_jobs").update(counters).eq("id", jobId);
}

export async function completeBulkJob(jobId: string, status: "completed" | "failed" = "completed"): Promise<void> {
  const admin = createAdminClient();
  await admin.from("bulk_jobs").update({ status, completed_at: new Date().toISOString() }).eq("id", jobId);
}
