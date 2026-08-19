"use client";

import { useEffect, useMemo, useState } from "react";
import {
  History, Search, RotateCcw, Sparkles, Link2, Settings, Gift, CreditCard,
  ChevronLeft, ChevronRight, Wallet, Inbox, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, type LucideIcon,
} from "lucide-react";
import StatCard from "@/components/StatCard";

interface LedgerEntry {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  referenceId: string | null;
  createdAt: string;
}

interface HistoryData {
  entries: LedgerEntry[];
  page: number;
  pageSize: number;
  total: number;
}

const TYPE_LABELS: Record<string, string> = {
  scan_debit: "Scan",
  scan_refund: "Scan refund",
  signup_grant: "Signup bonus",
  magic_link_grant: "Magic link bonus",
  admin_adjustment: "Admin adjustment",
  referral_bonus_referrer: "Referral bonus",
  referral_bonus_referee: "Referral bonus",
  purchase: "Purchase",
};

// Each transaction type gets its own glyph + tint so the ledger reads at a
// glance instead of every row looking identical.
const TYPE_ICONS: Record<string, LucideIcon> = {
  scan_debit: Search,
  scan_refund: RotateCcw,
  signup_grant: Sparkles,
  magic_link_grant: Link2,
  admin_adjustment: Settings,
  referral_bonus_referrer: Gift,
  referral_bonus_referee: Gift,
  purchase: CreditCard,
};

export default function CreditsPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/credits/history?page=${page}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const currentBalance = data?.entries?.[0]?.balanceAfter;

  const { earned, spent } = useMemo(() => {
    const entries = data?.entries ?? [];
    return {
      earned: entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
      spent: entries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0),
    };
  }, [data]);

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
              <History size={18} color="var(--on-accent)" />
            </div>
            <h1
              className="heading-shimmer text-3xl font-bold"
              style={{
                background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              Credit History
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Every credit earned or spent on your account, most recent first.
          </p>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Wallet}
            label="Current balance"
            value={loading ? "" : currentBalance ?? 0}
            tone="accent"
            caption="credits available"
            loading={loading}
          />
          <StatCard
            icon={TrendingUp}
            label="Earned"
            value={loading ? "" : `+${earned}`}
            tone="success"
            caption="on this page"
            loading={loading}
          />
          <StatCard
            icon={TrendingDown}
            label="Spent"
            value={loading ? "" : `-${spent}`}
            tone="danger"
            caption="on this page"
            loading={loading}
          />
        </div>

        {/* ── Ledger ─────────────────────────────────────────────────────── */}
        <div
          className="dash-card rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(var(--overlay-rgb),0.07)" }}>
            <h3 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Transaction history</h3>
            {!loading && data && data.total > 0 && (
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>{data.total} total</span>
            )}
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-2 py-3.5">
                  <div className="dash-skeleton w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="dash-skeleton h-3 w-24 rounded" />
                    <div className="dash-skeleton h-2.5 w-36 rounded" />
                  </div>
                  <div className="dash-skeleton w-14 h-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.entries || data.entries.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.14), rgba(124,111,255,0.14))", border: "1px solid rgba(0,229,255,0.2)" }}
              >
                <Inbox size={22} style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>No credit activity yet</p>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Scans, bonuses and purchases will show up here.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-3 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Transaction</th>
                      <th className="hidden sm:table-cell text-left px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Date</th>
                      <th className="text-right px-3 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Amount</th>
                      <th className="hidden sm:table-cell text-right px-6 py-3 text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((e, i) => {
                      const positive = e.amount > 0;
                      const Icon = TYPE_ICONS[e.type] ?? Wallet;
                      return (
                        <tr
                          key={e.id}
                          className="dash-row animate-fade-up"
                          style={{ borderTop: "1px solid rgba(var(--overlay-rgb),0.06)", animationDelay: `${Math.min(i * 0.03, 0.24)}s` }}
                        >
                          <td className="px-3 sm:px-6 py-3.5">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <div
                                className="flex items-center justify-center rounded-full flex-shrink-0"
                                style={{
                                  width: 32, height: 32,
                                  background: positive ? "rgba(0,232,122,0.1)" : "rgba(255,88,88,0.08)",
                                  color: positive ? "var(--success)" : "#ff5858",
                                }}
                              >
                                <Icon size={14} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate" style={{ color: "var(--text)" }}>{TYPE_LABELS[e.type] ?? e.type}</div>
                                <div className="sm:hidden text-[11px] font-mono truncate" style={{ color: "var(--text-dim)" }}>
                                  {new Date(e.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-3.5 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                            {new Date(e.createdAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </td>
                          <td className="px-3 sm:px-6 py-3.5 text-right">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                              style={{
                                background: positive ? "rgba(0,232,122,0.1)" : "rgba(255,88,88,0.1)",
                                color: positive ? "var(--success)" : "#ff5858",
                              }}
                            >
                              {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                              {positive ? `+${e.amount}` : e.amount}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-3.5 text-right font-mono" style={{ color: "var(--text-dim)" }}>
                            {e.balanceAfter}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid rgba(var(--overlay-rgb),0.07)" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="dash-btn flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: "rgba(var(--overlay-rgb),0.04)", color: "var(--text-muted)", border: "1px solid rgba(var(--overlay-rgb),0.08)" }}
                  >
                    <ChevronLeft size={13} /> Previous
                  </button>
                  <span className="text-xs font-mono" style={{ color: "var(--text-dim)" }}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page + 1 >= totalPages}
                    className="dash-btn flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: "rgba(var(--overlay-rgb),0.04)", color: "var(--text-muted)", border: "1px solid rgba(var(--overlay-rgb),0.08)" }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
