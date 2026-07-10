import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { captureEvent } from "@/lib/analytics/posthog";

const bodySchema = z.object({ code: z.string().trim().min(1) });

// Deliberately excluded from middleware's auth gate (see PUBLIC_API_PREFIXES)
// because a *pending* account must be able to reach this route to activate —
// middleware 403s pending accounts on every other API path. Auth is still
// required; it's just checked here instead of in middleware.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Sign in first." } },
      { status: 401 }
    );
  }

  const allowed = await checkRateLimit(`invite-redeem:user:${user.id}`, 10, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many attempts. Try again later." } },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "An invite code is required." } },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("redeem_invite", {
    p_user_id: user.id,
    p_code: parsed.data.code,
  });

  if (error) {
    if (error.message.includes("invalid_invite")) {
      return NextResponse.json(
        { error: { code: "invalid_invite", message: "That invite code isn't valid." } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: { code: "internal", message: "Something went wrong." } },
      { status: 500 }
    );
  }

  captureEvent(user.id, "invite_redeemed", { code: parsed.data.code });

  return NextResponse.json({ status: data });
}
