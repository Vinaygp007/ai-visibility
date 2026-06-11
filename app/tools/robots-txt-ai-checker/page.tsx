"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

type BlockType = "explicit_allow" | "explicit_block" | "global_block" | "not_mentioned" | "no_robots";

interface BotResult {
  key: string;
  label: string;
  company: string;
  product: string;
  allowed: boolean;
  reason: string;
  blockType: BlockType;
}

interface CheckResult {
  domain: string;
  robotsUrl: string;
  robotsFound: boolean;
  robotsTxtPreview: string;
  results: BotResult[];
  allowedCount: number;
  blockedCount: number;
  total: number;
}

const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; color: string }> = {
  explicit_allow:  { label: "Explicitly allowed",    color: "var(--c-accent3)"  },
  not_mentioned:   { label: "Allowed (default)",      color: "var(--c-accent3)"  },
  no_robots:       { label: "Allowed (no file)",      color: "var(--c-accent3)"  },
  explicit_block:  { label: "Directly blocked",       color: "var(--c-error)"    },
  global_block:    { label: "Blocked by wildcard",    color: "var(--c-warning)"  },
};

export default function RobotsTxtAiCheckerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");
  const [showRobots, setShowRobots] = useState(false);

  const handleCheck = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResult(null);
    setShowRobots(false);
    try {
      const res = await fetch("/api/tools/fetch-robots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (allowed: number, total: number) => {
    const pct = allowed / total;
    if (pct >= 0.9) return "var(--c-accent3)";
    if (pct >= 0.6) return "var(--c-warning)";
    return "var(--c-error)";
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-14 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ background: "radial-gradient(ellipse 55% 40% at 50% 0%, rgba(0,229,255,0.4), transparent 70%)" }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
          >
            Free Tool
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
            robots.txt AI Checker
          </h1>
          <p className="text-lg" style={{ color: "var(--c-muted)" }}>
            Instantly check which AI bots your robots.txt allows or blocks. See the status of all 14 AI crawlers — ChatGPT, Claude, Gemini, and more.
          </p>
        </div>
      </section>

      {/* Tool */}
      <section className="py-8 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Input */}
          <div
            className="rounded-2xl border p-6 mb-6"
            style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
          >
            <label className="block text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>
              Enter your domain or URL
            </label>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--c-bg)",
                  borderColor: "var(--c-border-strong)",
                  color: "var(--c-text)",
                }}
                placeholder="example.com or https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCheck()}
              />
              <button
                onClick={handleCheck}
                disabled={loading || !url.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
                style={{ background: "var(--c-accent)", color: "#000" }}
              >
                {loading ? "Checking…" : "Check →"}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--c-muted)" }}>
              We fetch <span className="font-mono" style={{ color: "var(--c-accent)" }}>yourdomain.com/robots.txt</span> and parse each AI bot rule.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-2xl border p-5 mb-6 text-sm"
              style={{ background: "rgba(255,90,90,0.06)", borderColor: "rgba(255,90,90,0.2)", color: "var(--c-error)" }}
            >
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">

              {/* Summary */}
              <div
                className="rounded-2xl border p-5"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--c-text)" }}>{result.domain}</p>
                    <p className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>
                      {result.robotsFound ? "robots.txt found" : "No robots.txt — all bots allowed by default"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: scoreColor(result.allowedCount, result.total) }}
                    >
                      {result.allowedCount}/{result.total}
                    </div>
                    <div className="text-xs" style={{ color: "var(--c-muted)" }}>bots allowed</div>
                  </div>
                </div>

                {result.blockedCount > 0 && (
                  <div
                    className="rounded-xl p-3 mb-4 text-xs"
                    style={{ background: "rgba(255,90,90,0.06)", border: "1px solid rgba(255,90,90,0.15)", color: "var(--c-error)" }}
                  >
                    ⚠ {result.blockedCount} AI bot{result.blockedCount > 1 ? "s are" : " is"} blocked —{" "}
                    {result.blockedCount > 1 ? "these systems" : "this system"} cannot crawl your content.
                  </div>
                )}

                {result.allowedCount === result.total && (
                  <div
                    className="rounded-xl p-3 mb-4 text-xs"
                    style={{ background: "rgba(0,255,148,0.06)", border: "1px solid rgba(0,255,148,0.15)", color: "var(--c-accent3)" }}
                  >
                    ✓ All {result.total} AI bots can access your site.
                  </div>
                )}

                {/* Bot results table */}
                <div className="space-y-2">
                  {result.results.map((bot) => {
                    const status = BLOCK_TYPE_LABELS[bot.blockType];
                    return (
                      <div
                        key={bot.key}
                        className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                        style={{
                          background: "var(--c-bg)",
                          border: `1px solid ${bot.allowed ? "var(--c-border)" : "rgba(255,90,90,0.15)"}`,
                        }}
                      >
                        <div className="text-sm" style={{ color: bot.allowed ? "var(--c-accent3)" : "var(--c-error)" }}>
                          {bot.allowed ? "✓" : "✗"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: "var(--c-text)" }}>{bot.label}</span>
                            <span className="text-[10px]" style={{ color: "var(--c-muted)" }}>{bot.company}</span>
                          </div>
                          <div className="text-[10px] font-mono" style={{ color: "var(--c-muted)" }}>
                            User-agent: {bot.key}
                          </div>
                        </div>
                        <div
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: `${status.color}14`,
                            color: status.color,
                            border: `1px solid ${status.color}30`,
                          }}
                        >
                          {status.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* robots.txt preview toggle */}
              {result.robotsFound && result.robotsTxtPreview && (
                <div
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                >
                  <button
                    onClick={() => setShowRobots(!showRobots)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold transition-all hover:opacity-80"
                    style={{ color: "var(--c-text)" }}
                  >
                    <span>View your robots.txt</span>
                    <span>{showRobots ? "▲" : "▼"}</span>
                  </button>
                  {showRobots && (
                    <pre
                      className="text-xs font-mono overflow-auto max-h-64 px-5 pb-5"
                      style={{
                        color: "var(--c-text)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        lineHeight: 1.7,
                        borderTop: "1px solid var(--c-border)",
                        paddingTop: 16,
                      }}
                    >
                      {result.robotsTxtPreview}
                    </pre>
                  )}
                </div>
              )}

              {/* CTA */}
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ background: "var(--c-surface2)", borderColor: "var(--c-border)" }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-text)" }}>
                  Want the full AI visibility picture?
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--c-muted)" }}>
                  Run a complete audit — AI Visibility Score, structured data, llms.txt, and recommendations.
                </p>
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
                  style={{ background: "var(--c-accent)", color: "#000" }}
                >
                  Run Full Audit →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Educational section */}
      <section className="py-16 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--c-text)" }}>Common robots.txt mistakes that block AI</h2>
          <div className="space-y-4">
            {[
              {
                title: "Global Disallow: / (blocks everyone)",
                severity: "Critical",
                severityColor: "var(--c-error)",
                code: "User-agent: *\nDisallow: /",
                fix: "This blocks every crawler including all 14 AI bots. If you need to block specific bots, use their exact User-agent name instead of the wildcard.",
              },
              {
                title: "Blocking one OpenAI bot but not the other",
                severity: "Common mistake",
                severityColor: "var(--c-warning)",
                code: "User-agent: GPTBot\nDisallow: /\n\n# OAI-SearchBot still active — ChatGPT Search can crawl",
                fix: "OpenAI uses two different user agents: GPTBot (training) and OAI-SearchBot (ChatGPT Search). To block both, you need separate rules for each.",
              },
              {
                title: "Blocking ClaudeBot but not anthropic-ai",
                severity: "Common mistake",
                severityColor: "var(--c-warning)",
                code: "User-agent: ClaudeBot\nDisallow: /\n\n# anthropic-ai still active — Claude can still crawl",
                fix: "Anthropic uses two identifiers: ClaudeBot and anthropic-ai. Both need to be listed if you want to block all Claude access.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border p-5"
                style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{
                      background: `${item.severityColor}14`,
                      color: item.severityColor,
                      border: `1px solid ${item.severityColor}30`,
                    }}
                  >
                    {item.severity}
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{item.title}</h3>
                </div>
                <pre
                  className="text-xs font-mono rounded-xl p-3 mb-3 overflow-x-auto"
                  style={{ background: "var(--c-surface)", color: "var(--c-text)", lineHeight: 1.7 }}
                >
                  {item.code}
                </pre>
                <p className="text-xs" style={{ color: "var(--c-muted)" }}>{item.fix}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6" style={{ color: "var(--c-muted)" }}>
            See the full list of AI bots and their user agent strings →{" "}
            <Link href="/tools/ai-bot-list" style={{ color: "var(--c-accent)" }}>
              AI Bot Reference List
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
