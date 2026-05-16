"use client";

import { AnalysisResult, BotDetail } from "@/types";
import CategoryCard from "./CategoryCard";
import Recommendations from "./Recommendations";
import ScoreGauge from "./ScoreGauge";
import PromptResponsePanel from "./PromptResponsePanel";
import CitationsPanel from "./CitationsPanel";
import CrawlSection from "./CrawlSection";
import SpeedSection from "./SpeedSection";

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: "⬡", claude: "◈", perplexity: "◎", gemini: "✦",
  meta_ai: "⬟", you_com: "◉", duckduckgo: "⊙", apple: "◆",
};

const COMPANY_COLORS: Record<string, { color: string }> = {
  OpenAI:      { color: "#10a37f" },
  Anthropic:   { color: "#c87533" },
  Perplexity:  { color: "#20b2aa" },
  Google:      { color: "#4285f4" },
  Meta:        { color: "#0082fb" },
  "You.com":   { color: "#ff6b35" },
  DuckDuckGo:  { color: "#de5833" },
  Apple:       { color: "#888" },
  Cohere:      { color: "#4db69e" },
  ByteDance:   { color: "#ff0050" },
  CommonCrawl: { color: "#9b9b9b" },
  Amazon:      { color: "#ff9900" },
};

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  "Gemini 2.0 Flash":  { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)" },
  "ChatGPT (GPT-4o)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "Perplexity Sonar":  { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)" },
};

function getScoreColor(score: number) {
  if (score >= 70) return "#00e87a";
  if (score >= 40) return "#ffb830";
  return "#ff5a5a";
}

export default function ResultsSection({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset: () => void;
}) {
  const scoreColor = getScoreColor(result.overall_score);
  const totalChecks =
    (result.stats?.checks_passed ?? 0) +
    (result.stats?.checks_failed ?? 0) +
    (result.stats?.checks_warned ?? 0);

  const coverage = result.ai_platform_coverage ?? {};
  const coverageEntries = Object.entries(coverage);
  const indexedCount = coverageEntries.filter(([, v]) => v === "indexed").length;
  const providers = result._providers ?? [];
  const successfulProviders = providers.filter((p) => p.status === "success");

  // Enhanced bot coverage — use rich _botResults when available, fall back to ai_platform_coverage
  const rawBotResults = result._botResults ?? null;
  const fallbackBots = (key: string, allowed: boolean): BotDetail => ({
    key, label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    company: "", allowed, reason: "", directive: null, blockType: "not_mentioned",
  });
  const botAccessible: BotDetail[] = rawBotResults
    ? rawBotResults.filter(b => b.allowed)
    : coverageEntries.filter(([, v]) => v === "indexed").map(([k]) => fallbackBots(k, true));
  const botBlocked: BotDetail[] = rawBotResults
    ? rawBotResults.filter(b => !b.allowed)
    : coverageEntries.filter(([, v]) => v === "blocked").map(([k]) => fallbackBots(k, false));
  const botTotal = (rawBotResults?.length ?? coverageEntries.length);

  // Normalize name for fuzzy matching (strips punctuation/spaces/case)
  // This handles mismatches like "ChatGPT (GPT-4o)" vs "ChatGPT (GPT-4o-mini)"
  const normName = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Build a set of base provider keys from the names actually used in citations
  // We match by the provider "family" prefix (e.g. "chatgpt", "gemini", "perplexity")
  // against what _providers ran this scan — so disabled providers get filtered out
  const enabledKeys = new Set(providers.map((p) => normName(p.name)));

  // For each citation provider name, check if ANY enabled provider shares
  // at least the first 6 normalized characters (the brand name)
  const isCitationEnabled = (citProvider: string) => {
    const citKey = normName(citProvider);
    for (const key of enabledKeys) {
      const minLen = Math.min(key.length, citKey.length, 6);
      if (key.slice(0, minLen) === citKey.slice(0, minLen)) return true;
    }
    return false;
  };

  const citations = (result.citations ?? []).filter((c) =>
    isCitationEnabled(c.provider)
  );
  const maxCitations = Math.max(...citations.map((c) => c.count), 1);
  const totalCitations = citations.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="animate-fade-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-7 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <h2 className="text-xl font-semibold tracking-tight">
              {result.site_name || result.url}
            </h2>
            {result._cached && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{ color: "#8b8d9e", borderColor: "rgba(255,255,255,0.1)" }}
              >
                cached
              </span>
            )}
          </div>
          <div
            className="inline-block font-mono text-[12px] px-2.5 py-1 rounded-md mb-3"
            style={{ color: "#8b8d9e", background: "#181a25" }}
          >
            {result.url}
          </div>
          {result.summary && (
            <p
              className="text-sm max-w-xl leading-relaxed"
              style={{ color: "#8b8d9e" }}
            >
              {result.summary}
            </p>
          )}
        </div>
      </div>

      {/* ── Prompts & Responses ─────────────────────────────────────────── */}
      {providers.length > 0 && <PromptResponsePanel providers={providers} />}


      {/* ── Citations Panel ─────────────────────────────────────────────── */}
      {citations.length > 0 ? (
        <CitationsPanel
          citations={citations}
          maxCitations={maxCitations}
          totalCitations={totalCitations}
        />
      ) : (
        <div
          className="rounded-2xl border p-6 text-center mb-6"
          style={{
            background: "rgba(0,229,255,0.03)",
            borderColor: "rgba(0,229,255,0.12)",
            borderStyle: "dashed",
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "#00e5ff" }}>
            AI Citations not included
          </p>
          <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
            Re-scan with the{" "}
            <span style={{ color: "#00e5ff" }}>
              &ldquo;Include AI Citations&rdquo;
            </span>{" "}
            toggle on to see how many times each AI agent cites this site.
          </p>
        </div>
      )}

      <div>
        <div className="flex pb-6 gap-3 flex-wrap">
          <ScoreGauge
            value={result.overall_score}
            label="AI SCORE"
            color={scoreColor}
            fillPercent={result.overall_score}
          />
          <ScoreGauge
            value={result.grade}
            label="GRADE"
            color={scoreColor}
            fillPercent={100}
          />
        </div>
      </div>

{/* ── AI Provider Results ─────────────────────────────────────────── */}
      {providers.length > 0 && (
        <div
          className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-[13px] font-mono tracking-widest uppercase"
              style={{ color: "#8b8d9e" }}
            >
              AI Provider Results
            </div>
            <span
              className="text-[11px] font-mono"
              style={{ color: "#8b8d9e" }}
            >
              {successfulProviders.length}/{providers.length} succeeded · scores
              averaged
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {providers.map((p) => {
              const cfg = PROVIDER_COLORS[p.name] ?? {
                color: "#8b8d9e",
                bg: "rgba(255,255,255,0.03)",
                border: "rgba(255,255,255,0.1)",
              };
              const isOk = p.status === "success";
              return (
                <div
                  key={p.name}
                  className="rounded-xl border p-4"
                  style={{
                    background: isOk ? cfg.bg : "rgba(255,90,90,0.04)",
                    borderColor: isOk ? cfg.border : "rgba(255,90,90,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: isOk ? cfg.color : "#ff5a5a" }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "#8b8d9e" }}
                    >
                      {p.durationMs}ms
                    </span>
                  </div>
                  {isOk ? (
                    <div>
                      <div
                        className="text-2xl font-bold tracking-tight"
                        style={{
                          color:
                            p.score != null
                              ? getScoreColor(p.score)
                              : "#8b8d9e",
                        }}
                      >
                        {p.score ?? "—"}
                      </div>
                      <div
                        className="text-[10px] font-mono mt-0.5"
                        style={{ color: "#8b8d9e" }}
                      >
                        score / 100
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: "#ff5a5a" }}>
                      {p.error?.slice(0, 60) ?? "Failed"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Platform Coverage (Enhanced) ─────────────────────────────── */}
      {botTotal > 0 && (
        <div
          className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
              AI Platform Coverage
            </div>
            <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
              {botAccessible.length}/{botTotal} accessible
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full mb-5" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((botAccessible.length / botTotal) * 100)}%`,
                background:
                  botAccessible.length === botTotal ? "#00e87a"
                  : botAccessible.length > botTotal / 2 ? "#ffb830"
                  : "#ff5a5a",
              }}
            />
          </div>

          {/* Accessible bots */}
          {botAccessible.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: "#00e87a" }}>
                Accessible — {botAccessible.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {botAccessible.map(bot => {
                  const dotColor = COMPANY_COLORS[bot.company]?.color ?? "#00e87a";
                  return (
                    <div
                      key={bot.key}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px]"
                      style={{ background: "rgba(0,232,122,0.05)", borderColor: "rgba(0,232,122,0.15)" }}
                      title={bot.reason}
                    >
                      <span style={{ color: dotColor, fontSize: 7, lineHeight: 1 }}>●</span>
                      <span className="font-medium" style={{ color: "#d0d0dc" }}>{bot.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Blocked bots */}
          {botBlocked.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: "#ff5a5a" }}>
                Blocked — {botBlocked.length}
              </div>
              <div className="flex flex-col gap-2">
                {botBlocked.map(bot => {
                  const dotColor = COMPANY_COLORS[bot.company]?.color ?? "#ff5a5a";
                  const isGlobal = bot.blockType === "global_block";
                  const fixHint = isGlobal
                    ? `Add before User-agent: *  →  User-agent: ${bot.key}  then  Allow: /`
                    : `Under User-agent: ${bot.key}  →  change Disallow: / to Allow: /`;
                  return (
                    <div
                      key={bot.key}
                      className="rounded-xl border p-3"
                      style={{ background: "rgba(255,90,90,0.04)", borderColor: "rgba(255,90,90,0.18)" }}
                    >
                      {/* Bot name + badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: dotColor, fontSize: 7, lineHeight: 1 }}>●</span>
                        <span className="text-[12px] font-semibold text-white">{bot.label}</span>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase"
                          style={{
                            background: isGlobal ? "rgba(255,184,48,0.12)" : "rgba(255,90,90,0.12)",
                            color: isGlobal ? "#ffb830" : "#ff5a5a",
                            border: `1px solid ${isGlobal ? "rgba(255,184,48,0.25)" : "rgba(255,90,90,0.25)"}`,
                          }}
                        >
                          {isGlobal ? "wildcard block" : "explicit block"}
                        </span>
                      </div>

                      {/* Actual robots.txt directive */}
                      {bot.directive && (
                        <div
                          className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg mb-2"
                          style={{ background: "rgba(0,0,0,0.4)", color: "#ff9a9a" }}
                        >
                          {bot.directive}
                        </div>
                      )}

                      {/* Fix hint */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-mono shrink-0" style={{ color: "#00e5ff" }}>fix →</span>
                        <span className="text-[10px] leading-snug" style={{ color: "#8b8d9e" }}>{fixHint}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div
        className="flex gap-8 flex-wrap items-center rounded-2xl border px-6 py-5 mb-6"
        style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="text-center">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#00e87a" }}
          >
            {result.stats?.checks_passed ?? 0}
          </div>
          <div
            className="text-[11px] font-mono mt-0.5 tracking-wide"
            style={{ color: "#8b8d9e" }}
          >
            PASSED
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#ffb830" }}
          >
            {result.stats?.checks_warned ?? 0}
          </div>
          <div
            className="text-[11px] font-mono mt-0.5 tracking-wide"
            style={{ color: "#8b8d9e" }}
          >
            WARNINGS
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#ff5a5a" }}
          >
            {result.stats?.checks_failed ?? 0}
          </div>
          <div
            className="text-[11px] font-mono mt-0.5 tracking-wide"
            style={{ color: "#8b8d9e" }}
          >
            FAILED
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#00e5ff" }}
          >
            {totalChecks}
          </div>
          <div
            className="text-[11px] font-mono mt-0.5 tracking-wide"
            style={{ color: "#8b8d9e" }}
          >
            TOTAL CHECKS
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={onReset}
            className="text-sm px-5 py-2.5 rounded-xl border transition-all hover:border-[#00e5ff] hover:text-[#00e5ff]"
            style={{
              borderColor: "rgba(255,255,255,0.13)",
              color: "#f0f0f5",
              background: "transparent",
            }}
          >
            ← Scan another site
          </button>
        </div>
      </div>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <div
        className="text-[13px] font-mono tracking-widest mb-3.5 uppercase"
        style={{ color: "#8b8d9e" }}
      >
        Category Breakdown
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {result.categories?.map((cat) => (
          <CategoryCard key={cat.name} category={cat} />
        ))}
      </div>

      <Recommendations recommendations={result.recommendations} />

      {/* ── Keyword Intelligence ─────────────────────────────────────────── */}
      {result.keywords && result.keywords.length > 0 && (
        <div className="rounded-2xl border p-5 mt-6" style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="text-[13px] font-mono tracking-widest uppercase mb-4" style={{ color: "#8b8d9e" }}>
            Keyword Intelligence
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map(kw => (
              <div
                key={kw.word}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px]"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
                title={`In title: ${kw.inTitle} · In H1: ${kw.inH1} · In meta: ${kw.inMeta}`}
              >
                <span className="font-medium" style={{ color: "#d0d0dc" }}>{kw.word}</span>
                <span className="font-mono text-[9px]" style={{ color: "#8b8d9e" }}>{kw.count}×</span>
                {kw.inTitle && <span title="In title" style={{ color: "#00e87a", fontSize: 8 }}>T</span>}
                {kw.inH1    && <span title="In H1"    style={{ color: "#4285f4", fontSize: 8 }}>H1</span>}
                {kw.inMeta  && <span title="In meta"  style={{ color: "#ffb830", fontSize: 8 }}>M</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: "#8b8d9e" }}>
            <span style={{ color: "#00e87a" }}>T</span> = in title · <span style={{ color: "#4285f4" }}>H1</span> = in H1 · <span style={{ color: "#ffb830" }}>M</span> = in meta description
          </p>
        </div>
      )}

      {/* ── Core Web Vitals & Speed ──────────────────────────────────────── */}
      <SpeedSection url={result.url} />

      {/* ── Technical Crawl ──────────────────────────────────────────────── */}
      <CrawlSection url={result.url} />
    </div>
  );
}