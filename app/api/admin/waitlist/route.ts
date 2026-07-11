import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireAdmin } from "@/lib/adminGate";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to load waitlist." } }, { status: 500, headers: CORS_HEADERS });
  }

  const entries = data ?? [];

  // Surface the invite code for already-invited rows too (not just the one
  // just created in this request) so the link is still visible after a
  // page reload, not only in the one-time creation response.
  const invitedEmails = [...new Set(entries.filter((e) => e.status === "invited").map((e) => e.email))];
  const inviteByEmail = new Map<string, string>();
  if (invitedEmails.length > 0) {
    const { data: invites } = await admin
      .from("invites")
      .select("email, code, created_at")
      .in("email", invitedEmails)
      .order("created_at", { ascending: false });
    for (const inv of invites ?? []) {
      if (inv.email && !inviteByEmail.has(inv.email)) inviteByEmail.set(inv.email, inv.code);
    }
  }

  const waitlist = entries.map((e) => ({ ...e, inviteCode: inviteByEmail.get(e.email) ?? null }));

  return NextResponse.json({ waitlist }, { headers: CORS_HEADERS });
}

const patchSchema = z.object({
  waitlistId: z.string().uuid(),
  action: z.enum(["invite", "reject"]),
  creditsGranted: z.number().int().min(0).default(0),
});

// Converts a waitlist entry into a real invite (email-locked, single use)
// and marks the row so it drops out of the "pending" queue — or just marks
// it rejected without creating anything.
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "waitlistId and action are required." } }, { status: 422, headers: CORS_HEADERS });
  }

  const admin = createAdminClient();
  const { data: entry, error: fetchErr } = await admin
    .from("waitlist")
    .select("id, email, status")
    .eq("id", parsed.data.waitlistId)
    .single();

  if (fetchErr || !entry) {
    return NextResponse.json({ error: { code: "not_found", message: "Waitlist entry not found." } }, { status: 404, headers: CORS_HEADERS });
  }

  if (parsed.data.action === "reject") {
    await admin.from("waitlist").update({ status: "rejected" }).eq("id", entry.id);
    await logAdminAction({ actorId: gate.user.id, action: "waitlist.reject", targetType: "waitlist", targetId: entry.id });
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  }

  const code = crypto.randomBytes(5).toString("hex").toUpperCase();
  const { data: invite, error: inviteErr } = await admin
    .from("invites")
    .insert({
      code,
      email: entry.email,
      credits_granted: parsed.data.creditsGranted,
      max_uses: 1,
      created_by: gate.user.id,
    })
    .select()
    .single();

  if (inviteErr) {
    return NextResponse.json({ error: { code: "internal", message: "Failed to create invite." } }, { status: 500, headers: CORS_HEADERS });
  }

  await admin.from("waitlist").update({ status: "invited" }).eq("id", entry.id);
  await logAdminAction({ actorId: gate.user.id, action: "waitlist.invite", targetType: "waitlist", targetId: entry.id, metadata: { inviteCode: code } });

  return NextResponse.json({ success: true, invite }, { headers: CORS_HEADERS });
}
