import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/adminGate";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  role: z.enum(["admin", "super_admin"]),
  fullName: z.string().trim().max(100).optional(),
  // Must be sent explicitly to touch an account that already exists, so a
  // typo'd email can't silently reset someone's password. The UI asks the
  // super admin to confirm first.
  updateExisting: z.boolean().optional(),
});

// Super-admin only: creates an email + password account that can sign in at
// /admin/login straight away (email pre-confirmed). The handle_new_user()
// trigger creates the profiles row (active, free plan, signup credits) on
// insert into auth.users; we then promote it to the requested role.
export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Email, password and role are required.";
    return NextResponse.json({ error: { code: "invalid_input", message } }, { status: 422, headers: CORS_HEADERS });
  }

  const { email, password, role, fullName, updateExisting } = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    if (!updateExisting) {
      return NextResponse.json(
        { error: { code: "already_exists", message: "An account with this email already exists." } },
        { status: 409, headers: CORS_HEADERS }
      );
    }
    if (existing.id === gate.user.id) {
      return NextResponse.json({ error: { code: "invalid_input", message: "You cannot change your own role here." } }, { status: 422, headers: CORS_HEADERS });
    }

    // Typical case: the person signed up with Google, so they have no
    // password and can't use /admin/login. Adding one keeps their Google
    // sign-in working alongside it.
    const { error: pwError } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (pwError) {
      return NextResponse.json({ error: { code: "internal", message: `Failed to set password: ${pwError.message}` } }, { status: 500, headers: CORS_HEADERS });
    }
    const { error: roleError } = await admin.from("profiles").update({ role, status: "active" }).eq("id", existing.id);
    if (roleError) {
      return NextResponse.json({ error: { code: "internal", message: "Password was set, but assigning the role failed. Try again." } }, { status: 500, headers: CORS_HEADERS });
    }

    await logAdminAction({
      actorId: gate.user.id,
      action: "admin.set_password_and_role",
      targetType: "profiles",
      targetId: existing.id,
      metadata: { email, role },
    });

    return NextResponse.json({ success: true, userId: existing.id, updated: true }, { headers: CORS_HEADERS });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (createError || !created.user) {
    const msg = createError?.message ?? "Failed to create account.";
    const exists = /already (been )?registered|already exists/i.test(msg);
    return NextResponse.json(
      { error: { code: exists ? "already_exists" : "internal", message: exists ? "An account with this email already exists." : msg } },
      { status: exists ? 409 : 500, headers: CORS_HEADERS }
    );
  }

  const userId = created.user.id;
  const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (roleError) {
    // Don't leave behind a half-made account that has a password but no admin
    // role — roll the auth user back so the super admin can simply retry.
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: { code: "internal", message: "Failed to assign role. No account was created." } }, { status: 500, headers: CORS_HEADERS });
  }

  await logAdminAction({
    actorId: gate.user.id,
    action: "admin.create",
    targetType: "profiles",
    targetId: userId,
    metadata: { email, role },
  });

  return NextResponse.json({ success: true, userId }, { headers: CORS_HEADERS });
}
