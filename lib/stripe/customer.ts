import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

/**
 * Returns the caller's Stripe customer id, creating one on first use.
 * Writes go through the service-role client — profiles.stripe_customer_id
 * is locked against direct client writes (see the billing migration).
 */
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });

  await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);

  return customer.id;
}
