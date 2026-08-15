"use client";

import { ArrowLeft } from "lucide-react";
import { AnalysisResult, BotDetail } from "@/types";
import CategoryCard from "./CategoryCard";
import Recommendations from "./Recommendations";
import PromptResponsePanel from "./PromptResponsePanel";
import CitationsPanel from "./CitationsPanel";
import CrawlSection from "./CrawlSection";
import SpeedSection from "./SpeedSection";
import StatCards from "./StatCards";
import ProviderScoreChart from "./ProviderScoreChart";
import BotCoverageTable from "./BotCoverageTable";

function getScoreColor(score: number) {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
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
  const providers = result._providers ?? [];

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
                style={{ color: "var(--text-muted)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
              >
                cached
              </span>
            )}
          </div>
          <div
            className="inline-block font-mono text-[12px] px-2.5 py-1 rounded-md mb-3"
            style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
          >
            {result.url}
          </div>
          {result.summary && (
            <p
              className="text-sm max-w-xl leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {result.summary}
            </p>
          )}
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-xl border transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] flex-shrink-0"
          style={{
            borderColor: "rgba(var(--overlay-rgb),0.13)",
            color: "var(--text)",
            background: "transparent",
          }}
        >
          <ArrowLeft size={14} /> Scan another site
        </button>
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
          <p className="text-sm font-medium mb-1" style={{ color: "var(--accent)" }}>
            AI Citations not included
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Re-scan with the{" "}
            <span style={{ color: "var(--accent)" }}>
              &ldquo;Include AI Citations&rdquo;
            </span>{" "}
            toggle on to see how many times each AI agent cites this site.
          </p>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <StatCards
        score={result.overall_score}
        grade={result.grade}
        scoreColor={scoreColor}
        passed={result.stats?.checks_passed ?? 0}
        warned={result.stats?.checks_warned ?? 0}
        failed={result.stats?.checks_failed ?? 0}
        total={totalChecks}
      />

      {/* ── AI Provider Results ─────────────────────────────────────────── */}
      <ProviderScoreChart providers={providers} />

      {/* ── AI Platform Coverage ─────────────────────────────────────────── */}
      <BotCoverageTable accessible={botAccessible} blocked={botBlocked} />

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <div
        className="text-[13px] font-mono tracking-widest mb-3.5 uppercase"
        style={{ color: "var(--text-muted)" }}
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
        <div className="rounded-2xl border p-5 mt-6" style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
          <div className="text-[13px] font-mono tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>
            Keyword Intelligence
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map(kw => (
              <div
                key={kw.word}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px]"
                style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
                title={`In title: ${kw.inTitle} · In H1: ${kw.inH1} · In meta: ${kw.inMeta}`}
              >
                <span className="font-medium" style={{ color: "var(--text)" }}>{kw.word}</span>
                <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>{kw.count}×</span>
                {kw.inTitle && <span title="In title" style={{ color: "var(--success)", fontSize: 8 }}>T</span>}
                {kw.inH1    && <span title="In H1"    style={{ color: "#4285f4", fontSize: 8 }}>H1</span>}
                {kw.inMeta  && <span title="In meta"  style={{ color: "var(--warning)", fontSize: 8 }}>M</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--success)" }}>T</span> = in title · <span style={{ color: "#4285f4" }}>H1</span> = in H1 · <span style={{ color: "var(--warning)" }}>M</span> = in meta description
          </p>
        </div>
      )}

      {/* ── Core Web Vitals & Speed ──────────────────────────────────────── */}
      <SpeedSection url={result.url} autoRun />

      {/* ── Technical Crawl ──────────────────────────────────────────────── */}
      <CrawlSection url={result.url} autoRun />
    </div>
  );
}