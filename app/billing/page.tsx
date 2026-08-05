"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
  scale: "Scale",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--success)" },
  trialing: { label: "Trialing", color: "var(--accent)" },
  past_due: { label: "Payment failed", color: "var(--danger)" },
  canceled: { label: "Canceled", color: "var(--text-dim)" },
};

export default function BillingPage() {
  const { user, checked } = useCurrentUser();
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function handleManageBilling() {
    setOpeningPortal(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/checkout/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error?.message || "Could not open billing portal.");
      window.location.href = data.url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Something went wrong.");
      setOpeningPortal(false);
    }
  }

  if (!checked) {
    return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;
  }

  const plan = user?.plan ?? "free";
  const isFree = plan === "free";
  const status = user?.subscriptionStatus ? STATUS_LABELS[user.subscriptionStatus] : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-12 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Billing</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your subscription and view your current plan.
          </p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-xs font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>CURRENT PLAN</div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-bold text-[var(--text)]">{PLAN_LABELS[plan] ?? plan}</span>
                {status && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: status.color, background: "rgba(var(--overlay-rgb),0.06)" }}
                  >
                    {status.label}
                  </span>
                )}
              </div>
              {user?.currentPeriodEnd && !isFree && (
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  {user.subscriptionStatus === "canceled" ? "Access ends" : "Renews"} on{" "}
                  {new Date(user.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>CREDIT BALANCE</div>
              <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{user?.creditBalance ?? 0}</span>
            </div>
          </div>

          {portalError && (
            <div className="mb-4 text-[13px] rounded-lg px-3 py-2 border" style={{ color: "var(--danger)", background: "rgba(255,90,90,0.08)", borderColor: "rgba(255,90,90,0.25)" }}>
              {portalError}
            </div>
          )}

          {isFree ? (
            <Link
              href="/#pricing"
              className="inline-block text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              View plans
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={openingPortal}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {openingPortal ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
