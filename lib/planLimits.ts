import type { UserPlan } from "@/types";

// Largest single bulk batch each plan may start. Client-safe (no
// "server-only") so the bulk pages and the API share one source of truth.
// Sized so a full batch with citations (8 credits per URL or prompt across
// 4 models) fits inside the plan's monthly credits in lib/stripe/plans.ts;
// keep in sync with the pricing cards in components/PricingSection.tsx.
export const PLAN_BULK_LIMITS: Record<UserPlan, { urls: number; prompts: number }> = {
  free: { urls: 0, prompts: 2 },
  starter: { urls: 10, prompts: 20 },
  growth: { urls: 50, prompts: 50 },
  agency: { urls: 100, prompts: 80 },
  scale: { urls: 400, prompts: 100 },
};

// Admins and super admins aren't bound by plan limits.
export const ADMIN_BULK_LIMITS = { urls: 500, prompts: 100 };

export function bulkLimitsFor(plan: UserPlan | null | undefined, isAdmin: boolean) {
  if (isAdmin) return ADMIN_BULK_LIMITS;
  return PLAN_BULK_LIMITS[plan ?? "free"] ?? PLAN_BULK_LIMITS.free;
}
