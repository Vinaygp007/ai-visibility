import "server-only";

export type PaidPlan = "starter" | "growth" | "agency" | "scale";
export type BillingInterval = "monthly" | "yearly";

interface PlanConfig {
  credits: number;
  priceIds: Record<BillingInterval, string>;
}

// Credit amounts and pricing mirror components/PricingSection.tsx. Price IDs
// come from the Stripe Dashboard (Products created per the plan's setup
// steps) — see .env.local for the STRIPE_PRICE_* keys.
export const PLAN_CONFIG: Record<PaidPlan, PlanConfig> = {
  starter: {
    credits: 200,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY!,
    },
  },
  growth: {
    credits: 600,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY!,
      yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY!,
    },
  },
  agency: {
    credits: 1500,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY!,
      yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY!,
    },
  },
  scale: {
    credits: 4000,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY!,
      yearly: process.env.STRIPE_PRICE_SCALE_YEARLY!,
    },
  },
};

export function isPaidPlan(plan: string): plan is PaidPlan {
  return plan in PLAN_CONFIG;
}

// Built lazily (not at module load) so a missing env var during local dev
// only breaks the specific plan/interval being requested, not every import
// of this module.
export function planForPriceId(priceId: string): PaidPlan | null {
  for (const [plan, config] of Object.entries(PLAN_CONFIG) as [PaidPlan, PlanConfig][]) {
    if (config.priceIds.monthly === priceId || config.priceIds.yearly === priceId) return plan;
  }
  return null;
}

// Same day next month, clamped to the month's last day (Jan 31 -> Feb 28/29)
// so a yearly plan's monthly grants don't drift into the following month.
export function addOneMonth(from: Date): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
