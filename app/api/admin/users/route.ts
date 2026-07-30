import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminGate";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const search = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, email, full_name, role, status, referral_code, plan, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) query = query.ilike("email", `%${search}%`);

  const { data: profiles, error } = await query;
  if (error) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to load users." } }, { status: 500, headers: CORS_HEADERS });
  }

  const ids = (profiles ?? []).map((p) => p.id);
  const { data: balances } = await admin.from("credit_balances").select("user_id, balance").in("user_id", ids);
  const balanceByUser = new Map((balances ?? []).map((b) => [b.user_id, b.balance]));

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role,
    status: p.status,
    referralCode: p.referral_code,
    plan: p.plan,
    createdAt: p.created_at,
    balance: balanceByUser.get(p.id) ?? 0,
  }));

  return NextResponse.json({ users }, { headers: CORS_HEADERS });
}

const grantSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().trim().min(1),
});

// POST grants (positive amount) or debits (negative amount, via a manual
// admin_adjustment) credits for a user, with a required reason — logged
// to audit_log per spec §9.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = grantSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "userId, amount, and reason are required." } }, { status: 422, headers: CORS_HEADERS });
  }
  if (parsed.data.amount === 0) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Amount must be non-zero." } }, { status: 422, headers: CORS_HEADERS });
  }

  const admin = createAdminClient();
  const { userId, amount, reason } = parsed.data;
  const idempotencyKey = `admin:${gate.user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  let error;
  if (amount > 0) {
    ({ error } = await admin.rpc("grant_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_type: "admin_adjustment",
      p_reference_id: null,
      p_idempotency_key: idempotencyKey,
      p_created_by: gate.user.id,
      p_metadata: { reason },
    }));
  } else {
    ({ error } = await admin.rpc("spend_credits", {
      p_user_id: userId,
      p_amount: -amount,
      p_type: "admin_adjustment",
      p_reference_id: null,
      p_idempotency_key: idempotencyKey,
      p_metadata: { reason, created_by: gate.user.id },
    }));
  }

  if (error) {
    const code = error.message.includes("insufficient_credits") ? "insufficient_credits" : "internal";
    return NextResponse.json({ error: { code, message: error.message } }, { status: code === "insufficient_credits" ? 422 : 500, headers: CORS_HEADERS });
  }

  await logAdminAction({
    actorId: gate.user.id,
    action: "credit.adjust",
    targetType: "profiles",
    targetId: userId,
    metadata: { amount, reason },
  });

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["pending", "active", "suspended"]).optional(),
  plan: z.enum(["free", "starter", "growth", "agency", "scale"]).optional(),
});

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.role && !parsed.data.status && !parsed.data.plan)) {
    return NextResponse.json({ error: { code: "invalid_input", message: "userId plus role, status, and/or plan are required." } }, { status: 422, headers: CORS_HEADERS });
  }

  const { userId, role, status, plan } = parsed.data;
  const admin = createAdminClient();
  const updates: Record<string, string> = {};
  if (role) updates.role = role;
  if (status) updates.status = status;
  if (plan) updates.plan = plan;

  const { error } = await admin.from("profiles").update(updates).eq("id", userId);
  if (error) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to update user." } }, { status: 500, headers: CORS_HEADERS });
  }

  await logAdminAction({
    actorId: gate.user.id,
    action: plan ? "user.plan_change" : role ? "user.role_change" : "user.status_change",
    targetType: "profiles",
    targetId: userId,
    metadata: updates,
  });

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}

const deleteSchema = z.object({ userId: z.string().uuid() });

// Deletes the auth.users row via the service-role client; profiles (and
// everything FK'd to it) cascades per the schema's `on delete cascade`.
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "userId is required." } }, { status: 422, headers: CORS_HEADERS });
  }

  const { userId } = parsed.data;
  if (userId === gate.user.id) {
    return NextResponse.json({ error: { code: "invalid_input", message: "You cannot delete your own account." } }, { status: 422, headers: CORS_HEADERS });
  }

  const admin = createAdminClient();

  // waitlist.email is unique and unrelated to auth.users (no FK), so it
  // survives the account delete below — grab it first so a re-submission
  // (form or "Continue with Google") isn't silently swallowed by the old
  // invited/rejected row once the account is gone.
  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).single();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to delete user." } }, { status: 500, headers: CORS_HEADERS });
  }

  if (profile?.email) {
    await admin.from("waitlist").delete().eq("email", profile.email.toLowerCase());
  }

  await logAdminAction({
    actorId: gate.user.id,
    action: "user.delete",
    targetType: "profiles",
    targetId: userId,
  });

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}
