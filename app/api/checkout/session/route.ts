import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStripeClient } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { PLAN_CONFIG } from "@/lib/stripe/plans";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiscope.io";

const bodySchema = z.object({
  plan: z.enum(["starter", "growth", "agency", "scale"]),
  interval: z.enum(["monthly", "yearly"]),
});

// POST /api/checkout/session — creates a Stripe Checkout Session for the
// requested plan/interval and returns its hosted URL. Auth is already
// enforced by middleware.ts for every non-public /api route.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required." } }, { status: 401 });
  }

  const allowed = await checkRateLimit(`checkout:${user.id}`, 10, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: { code: "rate_limited", message: "Too many attempts. Please wait a moment." } }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "plan and interval are required." } }, { status: 422 });
  }

  const { plan, interval } = parsed.data;
  const priceId = PLAN_CONFIG[plan].priceIds[interval];
  if (!priceId) {
    return NextResponse.json({ error: { code: "not_configured", message: "This plan isn't available yet." } }, { status: 500 });
  }

  const customerId = await getOrCreateStripeCustomer(user.id, user.email);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/billing/canceled`,
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id, plan } },
  });

  if (!session.url) {
    return NextResponse.json({ error: { code: "internal", message: "Could not start checkout." } }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
