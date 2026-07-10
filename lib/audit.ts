import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every mutating admin action must call this (spec §9) — audit_log has no
 * client-writable policy, so this is the only way rows get created.
 */
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) console.warn("[audit] logAdminAction failed:", error);
}
