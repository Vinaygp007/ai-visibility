"use client";

import { useEffect, useState } from "react";
import {
  Users, Link2, Copy, Check, Clock, Gift, Share2, CheckCircle2, X, type LucideIcon,
} from "lucide-react";
import StatCard from "@/components/StatCard";

interface ReferralRow {
  id: string;
  status: "pending" | "qualified" | "rewarded" | "void";
  reward: number;
  createdAt: string;
  qualifiedAt: string | null;
}

interface ReferralsData {
  referralCode: string | null;
  referralLink: string | null;
  totals: { count: number; rewardedCount: number; pendingCount: number; creditsEarned: number };
  referrals: ReferralRow[];
}

const STATUS_META: Record<ReferralRow["status"], { label: string; color: string; bg: string; icon: LucideIcon }> = {
  pending: { label: "Pending", color: "var(--warning)", bg: "rgba(255,184,48,0.1)", icon: Clock },
  qualified: { label: "Qualified", color: "var(--accent)", bg: "rgba(0,229,255,0.1)", icon: CheckCircle2 },
  rewarded: { label: "Rewarded", color: "var(--success)", bg: "rgba(0,232,122,0.1)", icon: Check },
  void: { label: "Void", color: "var(--text-dim)", bg: "rgba(var(--overlay-rgb),0.06)", icon: X },
};

function StatusPill({ status }: { status: ReferralRow["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ color: meta.color, background: meta.bg }}
    >
      <meta.icon size={11} /> {meta.label}
    </span>
  );
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totals = data?.totals;
  const conversionPct = totals && totals.count > 0 ? Math.round((totals.rewardedCount / totals.count) * 100) : null;

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
              <Share2 size={17} color="var(--on-accent)" />
            </div>
            <h1
              className="heading-shimmer text-3xl font-bold"
              style={{
                background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              Referrals
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Share your link. You get 10 credits once your friend signs up and runs their first scan.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="dash-skeleton h-[104px] rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <StatCard key={i} icon={Users} label="" value="" loading />)}
            </div>
            <div className="dash-skeleton h-[280px] rounded-2xl" />
          </div>
        ) : (
          <>
            {/* ── Referral link ──────────────────────────────────────────── */}
            <div
              className="rf-link-card dash-card rounded-2xl border p-6 mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,111,255,0.06))",
                borderColor: "rgba(0,229,255,0.18)",
              }}
            >
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: "var(--text)" }}>
                <Link2 size={12} /> Your referral link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={data?.referralLink ?? ""}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono"
                  style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <button
                  onClick={handleCopy}
                  className="rf-copy-btn dash-btn-primary flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                  style={{
                    background: copied ? "var(--success)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
                    color: "var(--on-accent)",
                  }}
                >
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={Users}
                label="Total referred"
                value={totals?.count ?? 0}
                tone="accent"
                caption={conversionPct != null ? `${conversionPct}% converted` : "friends invited"}
              />
              <StatCard
                icon={Clock}
                label="Pending"
                value={totals?.pendingCount ?? 0}
                tone="warning"
                caption="awaiting first scan"
              />
              <StatCard
                icon={Gift}
                label="Credits earned"
                value={totals?.creditsEarned ?? 0}
                tone="success"
                caption="added to your balance"
              />
            </div>

            {/* ── Referral table ─────────────────────────────────────────── */}
            <div
              className="dash-card rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(var(--overlay-rgb),0.07)" }}>
                <h3 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Your referrals</h3>
                {data?.referrals && data.referrals.length > 0 && (
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>{data.referrals.length} total</span>
                )}
              </div>

              {(!data?.referrals || data.referrals.length === 0) ? (
                <div className="text-center py-12 px-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.14), rgba(124,111,255,0.14))", border: "1px solid rgba(0,229,255,0.2)" }}
                  >
                    <Users size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>No referrals yet</p>
                  <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Share your link above to start earning credits.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Referral</th>
                        <th className="text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Date</th>
                        <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Reward</th>
                        <th className="text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrals.map((r, i) => {
                        const meta = STATUS_META[r.status];
                        return (
                          <tr
                            key={r.id}
                            className="dash-row animate-fade-up"
                            style={{ borderTop: "1px solid rgba(var(--overlay-rgb),0.06)", animationDelay: `${Math.min(i * 0.03, 0.24)}s` }}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: meta.bg, color: meta.color }}
                                >
                                  <meta.icon size={15} />
                                </div>
                                <span className="font-medium" style={{ color: "var(--text)" }}>Referral #{i + 1}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5" style={{ color: "var(--text-muted)" }}>
                              {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono" style={{ color: r.status === "rewarded" ? "var(--success)" : "var(--text-dim)" }}>
                              {r.status === "rewarded" ? `+${r.reward}` : "—"}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <StatusPill status={r.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
