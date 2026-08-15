"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CreditCard, Wallet, Calendar, AlertCircle, ArrowRight, Settings2, Loader2 } from "lucide-react";
import StatCard from "@/components/StatCard";

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

  const plan = user?.plan ?? "free";
  const isFree = plan === "free";
  const status = user?.subscriptionStatus ? STATUS_LABELS[user.subscriptionStatus] : null;
  const periodDate = user?.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-12">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative mb-8">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true" style={{ height: 180 }}>
            <div className="aurora-blob aurora-blob-1" style={{ width: 260, height: 260, top: -150, left: "0%", background: "var(--accent)", opacity: 0.08 }} />
            <div className="aurora-blob aurora-blob-2" style={{ width: 220, height: 220, top: -120, left: "22%", background: "var(--accent2)", opacity: 0.07 }} />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              boxShadow: "0 6px 18px rgba(0,229,255,0.25)",
            }}>
              <CreditCard size={17} color="var(--on-accent)" />
            </div>
            <h1
              className="heading-shimmer text-3xl font-bold"
              style={{
                background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              Billing
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your subscription and view your current plan.
          </p>
        </div>

        {!checked ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <StatCard key={i} icon={CreditCard} label="" value="" loading />)}
            </div>
            <div className="dash-skeleton rounded-2xl" style={{ height: 140 }} />
          </div>
        ) : (
          <>
            {/* ── Stats ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={CreditCard}
                label="Current plan"
                value={PLAN_LABELS[plan] ?? plan}
                tone="accent"
                caption={status ? status.label : "No active subscription"}
              />
              <StatCard
                icon={Wallet}
                label="Credit balance"
                value={user?.creditBalance ?? 0}
                tone="success"
                caption="available to spend"
              />
              <StatCard
                icon={Calendar}
                label={user?.subscriptionStatus === "canceled" ? "Access ends" : "Renews"}
                value={periodDate ? periodDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                tone="violet"
                caption={isFree ? "no billing cycle" : periodDate ? periodDate.getFullYear().toString() : "n/a"}
              />
            </div>

            {/* ── Manage subscription ───────────────────────────────────── */}
            <div
              className="bl-plan-card dash-card rounded-2xl border p-6"
              style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,111,255,0.06))",
                borderColor: "rgba(0,229,255,0.18)",
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.25)" }}
                  >
                    <CreditCard size={20} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-semibold text-[var(--text)]">{PLAN_LABELS[plan] ?? plan} plan</span>
                      {status && (
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ color: status.color, background: `${status.color}18`, border: `1px solid ${status.color}30` }}
                        >
                          {status.label}
                        </span>
                      )}
                    </div>
                    {periodDate && !isFree && (
                      <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                        {user?.subscriptionStatus === "canceled" ? "Access ends" : "Renews"} on {periodDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>

                {isFree ? (
                  <Link
                    href="/#pricing"
                    className="dash-btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold active:scale-95"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "var(--on-accent)" }}
                  >
                    View plans <ArrowRight size={14} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    disabled={openingPortal}
                    className="dash-btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "var(--on-accent)" }}
                  >
                    {openingPortal ? <><Loader2 size={14} className="bl-spin" /> Opening…</> : <><Settings2 size={14} /> Manage billing</>}
                  </button>
                )}
              </div>

              {portalError && (
                <div className="mt-4 flex items-center gap-2 text-[13px] rounded-lg px-3 py-2 border" style={{ color: "var(--danger)", background: "rgba(255,90,90,0.08)", borderColor: "rgba(255,90,90,0.25)" }}>
                  <AlertCircle size={14} className="flex-shrink-0" /> {portalError}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .bl-spin { animation: spin 0.8s linear infinite; }
        .bl-plan-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .bl-plan-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,229,255,0.1); }
      `}</style>
    </div>
  );
}
