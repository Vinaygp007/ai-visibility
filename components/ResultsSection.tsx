"use client";

import { AnalysisResult } from "@/types";
import CategoryCard from "./CategoryCard";
import Recommendations from "./Recommendations";
import ScoreGauge from "./ScoreGauge";
import PromptResponsePanel from "./PromptResponsePanel";
import CitationsPanel from "./CitationsPanel";

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: "⬡", claude: "◈", perplexity: "◎", gemini: "✦",
  meta_ai: "⬟", you_com: "◉", duckduckgo: "⊙", apple: "◆",
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

      {/* ── AI Platform Coverage ────────────────────────────────────────── */}
      {coverageEntries.length > 0 && (
        <div
          className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-[13px] font-mono tracking-widest uppercase"
              style={{ color: "#8b8d9e" }}
            >
              AI Platform Coverage
            </div>
            <span
              className="text-[11px] font-mono"
              style={{ color: "#8b8d9e" }}
            >
              {indexedCount}/{coverageEntries.length} indexed
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {coverageEntries.map(([platform, status]) => {
              const isIndexed = status === "indexed";
              const label = platform
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <div
                  key={platform}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
                  style={{
                    background: isIndexed
                      ? "rgba(0,232,122,0.06)"
                      : "rgba(255,90,90,0.06)",
                    borderColor: isIndexed
                      ? "rgba(0,232,122,0.2)"
                      : "rgba(255,90,90,0.2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: isIndexed ? "#00e87a" : "#ff5a5a",
                    }}
                  >
                    {PLATFORM_ICONS[platform] ?? "◎"}
                  </span>
                  <div>
                    <div className="text-[11px] font-medium text-white">
                      {label}
                    </div>
                    <div
                      className="text-[10px] font-mono"
                      style={{ color: isIndexed ? "#00e87a" : "#ff5a5a" }}
                    >
                      {isIndexed ? "indexed" : "blocked"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
    </div>
  );
}