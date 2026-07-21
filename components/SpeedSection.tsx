"use client";

import { useState, useEffect } from "react";
import type { SpeedResult } from "@/types";

type SpeedState = "idle" | "loading" | "done" | "error";

interface SpeedData { mobile: SpeedResult; desktop: SpeedResult; hasApiKey?: boolean }

function scoreColor(score: number | null): string {
  if (score === null) return "var(--text-muted)";
  if (score >= 90) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function metricColor(key: string, score: number | null): string {
  if (score === null) return "var(--text-muted)";
  // CLS thresholds are different
  return score >= 90 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
}

const METRIC_LABELS: Record<string, { label: string; good: string; poor: string }> = {
  lcp:  { label: "LCP",  good: "< 2.5s",  poor: "> 4s"    },
  cls:  { label: "CLS",  good: "< 0.1",   poor: "> 0.25"  },
  inp:  { label: "INP",  good: "< 200ms", poor: "> 500ms" },
  fcp:  { label: "FCP",  good: "< 1.8s",  poor: "> 3s"    },
  ttfb: { label: "TTFB", good: "< 800ms", poor: "> 1.8s"  },
  tbt:  { label: "TBT",  good: "< 200ms", poor: "> 600ms" },
};

function ScoreGaugeMini({ score, label }: { score: number | null; label: string }) {
  const color = scoreColor(score);
  const r = 28, cx = 34, cy = 34, stroke = 6;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? score / 100 : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(var(--overlay-rgb),0.06)" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${circ}`}
          strokeDashoffset={`${circ * (1 - pct)}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="bold" fill={color}>
          {score ?? "—"}
        </text>
      </svg>
      <span className="text-[10px] font-mono uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-[9px] font-medium" style={{ color }}>{scoreLabel(score)}</span>
    </div>
  );
}

function MetricRow({ metricKey, metric }: { metricKey: string; metric: SpeedResult["metrics"]["lcp"] }) {
  const cfg = METRIC_LABELS[metricKey];
  const color = metricColor(metricKey, metric.score);
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "rgba(var(--overlay-rgb),0.05)" }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-bold w-10" style={{ color: "var(--text-muted)" }}>{cfg.label}</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          good {cfg.good}
        </span>
      </div>
      <span className="text-[12px] font-mono font-semibold" style={{ color }}>{metric.displayValue}</span>
    </div>
  );
}

function StrategyPanel({ data, keywords }: { data: SpeedResult; keywords: string }) {
  const isMobile = data.strategy === "mobile";
  return (
    <div className="rounded-xl border p-4" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px]">{isMobile ? "📱" : "🖥️"}</span>
          <span className="text-[12px] font-semibold text-[var(--text)] capitalize">{data.strategy}</span>
        </div>
        {data.error && <span className="text-[10px]" style={{ color: "var(--danger)" }}>{data.error.slice(0, 60)}</span>}
      </div>

      <div className="flex justify-center mb-4">
        <ScoreGaugeMini score={data.performanceScore} label="Performance" />
      </div>

      {/* Core Web Vitals */}
      <div className="mb-3">
        <div className="text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Core Web Vitals</div>
        {(["lcp", "cls", "inp"] as const).map(k => (
          <MetricRow key={k} metricKey={k} metric={data.metrics[k]} />
        ))}
      </div>

      {/* Other metrics */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>Speed Metrics</div>
        {(["fcp", "ttfb", "tbt"] as const).map(k => (
          <MetricRow key={k} metricKey={k} metric={data.metrics[k]} />
        ))}
      </div>
    </div>
  );
}

export default function SpeedSection({ url, autoRun = false }: { url: string; autoRun?: boolean }) {
  const [state, setState] = useState<SpeedState>("idle");
  const [data, setData] = useState<SpeedData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { if (autoRun) run(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setState("loading");
    setData(null);
    setError("");
    try {
      const res = await fetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Speed test failed");
      // If BOTH strategies failed at network level, surface it as an error state
      if (json.mobile?.error && json.desktop?.error) {
        throw new Error(json.mobile.error);
      }
      setData(json);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speed test failed");
      setState("error");
    }
  };

  return (
    <div className="rounded-2xl border mt-6" style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
        <div>
          <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Core Web Vitals & Speed
          </div>
          {state === "done" && data && (
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              Mobile {data.mobile.performanceScore ?? "—"} · Desktop {data.desktop.performanceScore ?? "—"}
            </div>
          )}
        </div>
        {state !== "loading" && (
          <button
            onClick={run}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{
              background: state === "done" ? "rgba(0,229,255,0.1)" : "var(--accent)",
              color: state === "done" ? "var(--accent)" : "var(--on-accent)",
              border: state === "done" ? "1px solid rgba(0,229,255,0.3)" : "none",
            }}
          >
            {state === "done" ? "↺ Re-test" : "Run Speed Test"}
          </button>
        )}
      </div>

      {state === "idle" && (
        <div className="px-5 py-10 text-center">
          <div className="text-2xl mb-3">⚡</div>
          <p className="text-sm font-medium text-[var(--text)] mb-1">Core Web Vitals Analysis</p>
          <p className="text-[12px] max-w-sm mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Runs Google PageSpeed Insights for both mobile and desktop. Measures LCP, CLS, INP, FCP, TTFB and
            identifies render-blocking resources. Takes ~10 seconds.
          </p>
        </div>
      )}

      {state === "loading" && (
        <div className="px-5 py-10 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(0,229,255,0.3)", borderTopColor: "var(--accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>Running Lighthouse audit…</span>
          </div>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Testing mobile and desktop in parallel via Google PSI</p>
        </div>
      )}

      {state === "error" && (
        <div className="px-5 py-8 text-center">
          <div className="text-2xl mb-3">⚡</div>
          <p className="text-sm font-medium mb-2" style={{ color: "var(--danger)" }}>Speed test unavailable</p>
          <p className="text-[11px] max-w-sm mx-auto leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>{error}</p>
          <div className="rounded-xl border p-3 max-w-sm mx-auto text-left" style={{ background: "rgba(0,229,255,0.04)", borderColor: "rgba(0,229,255,0.15)" }}>
            <p className="text-[10px] font-mono mb-1" style={{ color: "var(--accent)" }}>How to fix:</p>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              1. The scanned URL must be <strong style={{ color: "var(--text)" }}>publicly accessible</strong> (not localhost or private network).<br />
              2. Add <code className="font-mono" style={{ color: "var(--accent)" }}>PAGESPEED_API_KEY</code> to <code className="font-mono" style={{ color: "var(--accent)" }}>.env.local</code> for higher rate limits and reliability.
            </p>
          </div>
        </div>
      )}

      {state === "done" && data && (
        <div className="px-5 pb-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <StrategyPanel data={data.mobile} keywords="" />
            <StrategyPanel data={data.desktop} keywords="" />
          </div>

          {/* Opportunities */}
          {(data.mobile.opportunities.length > 0 || data.desktop.opportunities.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {(["mobile", "desktop"] as const).map((strategy) =>
                data[strategy].opportunities.length > 0 ? (
                  <div key={strategy} className="rounded-xl border p-4" style={{ background: "rgba(255,184,48,0.04)", borderColor: "rgba(255,184,48,0.15)" }}>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--warning)" }}>
                      Opportunities ({strategy})
                    </div>
                    <div className="flex flex-col gap-2">
                      {data[strategy].opportunities.map((opp, i) => (
                        <div key={i} className="flex items-start justify-between gap-3">
                          <span className="text-[12px] text-[var(--text)]">{opp.title}</span>
                          {opp.savingsMs && (
                            <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: "var(--warning)" }}>
                              save ~{opp.savingsMs > 1000 ? (opp.savingsMs / 1000).toFixed(1) + "s" : opp.savingsMs + "ms"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Diagnostics */}
          {(data.mobile.diagnostics.length > 0 || data.desktop.diagnostics.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["mobile", "desktop"] as const).map((strategy) =>
                data[strategy].diagnostics.length > 0 ? (
                  <div key={strategy} className="rounded-xl border p-4" style={{ background: "rgba(255,90,90,0.04)", borderColor: "rgba(255,90,90,0.15)" }}>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--danger)" }}>
                      Failed checks ({strategy})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data[strategy].diagnostics.map((d, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,90,90,0.1)", color: "#ff8a8a", border: "1px solid rgba(255,90,90,0.2)" }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          <p className="text-[10px] mt-4 text-center font-mono" style={{ color: "var(--text-muted)" }}>
            {data.hasApiKey
              ? "Powered by Google PageSpeed Insights"
              : <>Powered by Google PageSpeed Insights · Add <code>PAGESPEED_API_KEY</code> to .env for higher rate limits</>}
          </p>
        </div>
      )}
    </div>
  );
}
