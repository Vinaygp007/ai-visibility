import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { captureEvent } from "@/lib/analytics/posthog";

const bodySchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().optional(),
  company: z.string().trim().optional(),
  source: z.string().trim().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const allowed = await checkRateLimit(`waitlist:ip:${ip}`, 5, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many submissions. Try again later." } },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "A valid email is required." } },
      { status: 422 }
    );
  }

  const captchaOk = await verifyTurnstile(parsed.data.turnstileToken ?? "", ip);
  if (!captchaOk) {
    return NextResponse.json(
      { error: { code: "captcha_failed", message: "Verification failed — please try again." } },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("waitlist").insert({
    email: parsed.data.email.toLowerCase(),
    full_name: parsed.data.fullName || null,
    company: parsed.data.company || null,
    source: parsed.data.source || "organic",
  });

  // Unique violation (already on the list) is treated as success — don't
  // leak whether an email is already registered.
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: { code: "internal", message: "Something went wrong." } },
      { status: 500 }
    );
  }

  // No account exists yet — the lowercased email is the best available
  // distinct_id for this pre-signup event.
  captureEvent(parsed.data.email.toLowerCase(), "waitlist_joined", { source: parsed.data.source || "organic" });

  return NextResponse.json({ ok: true });
}
