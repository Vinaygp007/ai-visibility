import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireAdmin } from "@/lib/adminGate";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to load invites." } }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ invites: data ?? [] }, { headers: CORS_HEADERS });
}

const createSchema = z.object({
  code: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  creditsGranted: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).default(1),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "Invalid invite payload." } }, { status: 422, headers: CORS_HEADERS });
  }

  const code = parsed.data.code || crypto.randomBytes(5).toString("hex").toUpperCase();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("invites")
    .insert({
      code,
      email: parsed.data.email || null,
      credits_granted: parsed.data.creditsGranted,
      max_uses: parsed.data.maxUses,
      expires_at: parsed.data.expiresAt || null,
      created_by: gate.user.id,
    })
    .select()
    .single();

  if (error) {
    const code = error.code === "23505" ? "duplicate_code" : "internal";
    return NextResponse.json({ error: { code, message: error.message } }, { status: code === "duplicate_code" ? 409 : 500, headers: CORS_HEADERS });
  }

  await logAdminAction({ actorId: gate.user.id, action: "invite.create", targetType: "invites", targetId: data.id, metadata: { code } });

  return NextResponse.json({ invite: data }, { headers: CORS_HEADERS });
}

const revokeSchema = z.object({ inviteId: z.string().uuid() });

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = revokeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "inviteId is required." } }, { status: 422, headers: CORS_HEADERS });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("invites").update({ status: "revoked" }).eq("id", parsed.data.inviteId);
  if (error) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to revoke invite." } }, { status: 500, headers: CORS_HEADERS });
  }

  await logAdminAction({ actorId: gate.user.id, action: "invite.revoke", targetType: "invites", targetId: parsed.data.inviteId });

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}
