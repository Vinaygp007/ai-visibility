"use client";

import { useEffect, useState } from "react";

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

  if (loading) {
    return (
      <div className="min-h-screen md:pl-64 flex items-center justify-center" style={{ background: "#0a0b10" }}>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pl-64" style={{ background: "#0a0b10" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-16 md:pt-12 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Referrals</h1>
          <p className="text-sm" style={{ color: "#8b8d9e" }}>
            Share your link — you and your friend each get 25 credits once they run their first scan.
          </p>
        </div>

        <div className="rounded-2xl border p-6 mb-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <label className="block text-xs font-medium text-white mb-2">Your referral link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={data?.referralLink ?? ""}
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#f0f0f5" }}
            />
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={{ background: "#00e5ff", color: "#000" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total referred", value: data?.totals.count ?? 0 },
            { label: "Pending", value: data?.totals.pendingCount ?? 0 },
            { label: "Credits earned", value: data?.totals.creditsEarned ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border p-5 text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: "#8b8d9e" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-lg font-semibold text-white mb-4">Your referrals</h3>
          {(!data?.referrals || data.referrals.length === 0) ? (
            <p className="text-sm" style={{ color: "#8b8d9e" }}>No referrals yet — share your link above.</p>
          ) : (
            <div className="space-y-2">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-sm" style={{ color: "#f0f0f5" }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: r.status === "rewarded" ? "rgba(0,232,122,0.1)" : "rgba(255,184,48,0.1)",
                      color: r.status === "rewarded" ? "#00e87a" : "#ffb830",
                    }}
                  >
                    {r.status === "rewarded" ? `+${r.reward} credits` : "pending first scan"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
