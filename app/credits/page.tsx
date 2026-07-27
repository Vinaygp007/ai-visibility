"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-12 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Credit History</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Every credit earned or spent on your account, most recent first.
          </p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
          ) : !data?.entries || data.entries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No credit activity yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                {data.entries.map((e) => {
                  const positive = e.amount > 0;
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: "rgba(var(--overlay-rgb),0.03)" }}
                    >
                      <div>
                        <div className="text-sm" style={{ color: "var(--text)" }}>
                          {TYPE_LABELS[e.type] ?? e.type}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {new Date(e.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: positive ? "rgba(0,232,122,0.1)" : "rgba(255,88,88,0.1)",
                            color: positive ? "var(--success)" : "#ff5858",
                          }}
                        >
                          {positive ? `+${e.amount}` : e.amount}
                        </span>
                        <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
                          balance {e.balanceAfter}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: "rgba(var(--overlay-rgb),0.04)", color: "var(--text-muted)", border: "1px solid rgba(var(--overlay-rgb),0.08)" }}
                  >
                    Previous
                  </button>
                  <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page + 1 >= totalPages}
                    className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: "rgba(var(--overlay-rgb),0.04)", color: "var(--text-muted)", border: "1px solid rgba(var(--overlay-rgb),0.08)" }}
                  >
                    Next
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
