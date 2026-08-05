import "server-only";
import Stripe from "stripe";

let stripe: Stripe | null = null;

/**
 * Server-only Stripe client singleton. Never import from a client
 * component — the "server-only" import above makes an accidental client
 * bundle inclusion a build-time error instead of a leaked secret key.
 */
export function getStripeClient(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}
