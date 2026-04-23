"use client";

import { useState } from "react";
import { AnalysisResult, CitationResult } from "@/types";
import CategoryCard from "./CategoryCard";
import Recommendations from "./Recommendations";
import ScoreGauge from "./ScoreGauge";
import PromptResponsePanel from "./PromptResponsePanel";

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: "⬡", claude: "◈", perplexity: "◎", gemini: "✦",
  meta_ai: "⬟", you_com: "◉", duckduckgo: "⊙", apple: "◆",
};

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  "Gemini 2.0 Flash":  { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)"  },
  "ChatGPT (GPT-4o)":  { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "Perplexity Sonar":  { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)"  },
};

function getScoreColor(score: number) {
  if (score >= 70) return "#00e87a";
  if (score >= 40) return "#ffb830";
  return "#ff5a5a";
}

function CitationBar({ count, max }: { count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const color = count === 0 ? "#ff5a5a" : count < 3 ? "#ffb830" : "#00e87a";
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>
        {count} {count === 1 ? "citation" : "citations"}
      </span>
    </div>
  );
}

// ── CitationsPanel component ───────────────────────────────────────────────
function CitationsPanel({ citations, maxCitations, totalCitations }: {
  citations: CitationResult[];
  maxCitations: number;
  totalCitations: number;
}) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "answer" | "prompt" | "urls">>({});

  const getTab = (provider: string) => activeTab[provider] ?? "answer";
  const setTab = (provider: string, tab: "answer" | "prompt" | "urls") =>
    setActiveTab(prev => ({ ...prev, [provider]: tab }));

  return (
    <div className="rounded-2xl border p-5 mb-6"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
          AI Citations
        </div>
        <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
          {totalCitations} total · {citations.filter(c => c.status === "success").length} agents queried
        </span>
      </div>
      <p className="text-[12px] mb-5" style={{ color: "#8b8d9e" }}>
        Each agent was asked the same prompt about this site. See exactly what was sent and what they said.
      </p>

      <div className="flex flex-col gap-4">
        {citations.map(c => {
          const cfg = PROVIDER_COLORS[c.provider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
          const isOpenAI = c.provider.includes("ChatGPT");
          const isExpanded = expandedProvider === c.provider;
          const tab = getTab(c.provider);

          return (
            <div key={c.provider} className="rounded-xl border overflow-hidden"
              style={{ borderColor: isExpanded ? cfg.border : "rgba(255,255,255,0.08)" }}>

              {/* ── Row header ── */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                style={{ background: isExpanded ? cfg.bg : "transparent" }}
                onClick={() => setExpandedProvider(isExpanded ? null : c.provider)}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: cfg.color }}>{c.provider}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: c.dataSource === "fetched_content" ? "#00e87a" : "#00e5ff",
                      background: c.dataSource === "fetched_content" ? "rgba(0,232,122,0.08)" : "rgba(0,229,255,0.06)"
                    }}>
                    {c.dataSource === "fetched_content" ? "fetched content" : "live search"}
                  </span>
                  {c.status === "failed" && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.08)" }}>failed</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {c.status === "success" && (
                    <div className="flex items-center gap-2">
                      {/* Mini bar */}
                      <div className="w-20 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: `${maxCitations > 0 ? Math.round((c.count / maxCitations) * 100) : 0}%`,
                            background: c.count === 0 ? "#ff5a5a" : c.count < 3 ? "#ffb830" : "#00e87a",
                          }} />
                      </div>
                      <span className="text-[12px] font-mono font-medium"
                        style={{ color: c.count === 0 ? "#ff5a5a" : c.count < 3 ? "#ffb830" : "#00e87a" }}>
                        {c.count} {c.count === 1 ? "citation" : "citations"}
                      </span>
                    </div>
                  )}
                  <span style={{ color: "#8b8d9e", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* ── Expanded drawer ── */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>

                  {/* Tab bar */}
                  <div className="flex gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {(["answer", "prompt", "urls"] as const).map(t => {
                      const labels = { answer: "Raw Answer", prompt: "Prompt Used", urls: `Source URLs (${c.allCitationUrls?.length ?? 0})` };
                      const isActive = tab === t;
                      return (
                        <button key={t} onClick={() => setTab(c.provider, t)}
                          className="px-4 py-2.5 text-[12px] font-mono transition-colors"
                          style={{
                            color: isActive ? cfg.color : "#8b8d9e",
                            background: isActive ? cfg.bg : "transparent",
                            borderBottom: isActive ? `2px solid ${cfg.color}` : "2px solid transparent",
                          }}>
                          {labels[t]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4">
                    {/* ── RAW ANSWER TAB ── */}
                    {tab === "answer" && (
                      <div>
                        {c.rawAnswer ? (
                          <div>
                            <pre className="text-[12px] leading-relaxed whitespace-pre-wrap font-sans mb-4"
                              style={{ color: "#c9cdd4" }}>
                              {c.rawAnswer}
                            </pre>
                            {/* Matching snippets highlighted */}
                            {c.snippets.length > 0 && (
                              <div>
                                <p className="text-[11px] font-mono mb-2" style={{ color: "#8b8d9e" }}>
                                  ↑ SENTENCES MENTIONING THE SITE:
                                </p>
                                <div className="flex flex-col gap-2">
                                  {c.snippets.map((s, i) => (
                                    <p key={i} className="text-[12px] leading-relaxed pl-3 border-l rounded-r"
                                      style={{ color: "#f0f0f5", borderColor: cfg.color, background: cfg.bg, padding: "8px 12px" }}>
                                      "{s}"
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {c.count === 0 && (
                              <p className="text-[12px] mt-2 italic" style={{ color: "#8b8d9e" }}>
                                "Site not cited in this live search response."
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                            {c.error ?? "No answer captured."}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── PROMPT TAB ── */}
                    {tab === "prompt" && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <p className="text-[11px] font-mono mb-2" style={{ color: "#8b8d9e" }}>SYSTEM PROMPT:</p>
                          <pre className="text-[12px] leading-relaxed whitespace-pre-wrap p-3 rounded-lg font-sans"
                            style={{ color: "#c9cdd4", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            {c.systemPrompt || "No system prompt used."}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[11px] font-mono mb-2" style={{ color: "#8b8d9e" }}>USER PROMPT:</p>
                          <pre className="text-[12px] leading-relaxed whitespace-pre-wrap p-3 rounded-lg font-sans"
                            style={{ color: "#f0f0f5", background: "rgba(255,255,255,0.03)", border: `1px solid ${cfg.border}` }}>
                            {c.query || "No query captured."}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* ── URLS TAB ── */}
                    {tab === "urls" && (
                      <div>
                        {c.allCitationUrls.length === 0 ? (
                          <div className="rounded-xl p-4" style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.15)" }}>
                            <p className="text-[13px] font-medium mb-1" style={{ color: "#00e5ff" }}>Live search used — no annotated URLs</p>
                            <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                              {c.provider.includes("ChatGPT")
                                ? "ChatGPT used web search but returned the answer as plain text without annotated URL links. The citation count reflects how many times your domain was mentioned in the live response."
                                : "No source URLs were returned for this query. The citation count reflects domain mentions in the response."}
                            </p>
                          </div>
                        ) : c.dataSource === "fetched_content" ? (
                          <div className="rounded-xl p-4" style={{ background: "rgba(0,232,122,0.06)", border: "1px solid rgba(0,232,122,0.2)" }}>
                            <p className="text-[13px] font-medium mb-1" style={{ color: "#00e87a" }}>Fetched live content — no external URLs</p>
                            <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                              This provider analyzed real content fetched directly from your website.
                              The citation count shows how many times your domain appeared in the analysis.
                              Use Perplexity or Gemini for external source URLs.
                            </p>
                          </div>

                        ) : (c.allCitationUrls?.length ?? 0) > 0 ? (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-mono mb-1" style={{ color: "#8b8d9e" }}>
                              ALL URLS RETURNED BY {c.provider.toUpperCase()} ({c.allCitationUrls.length}):
                            </p>
                            {c.allCitationUrls.map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer"
                                className="flex items-start gap-2 text-[12px] font-mono hover:underline break-all"
                                style={{ color: cfg.color }}>
                                <span style={{ flexShrink: 0 }}>↗</span>
                                <span>{u}</span>
                              </a>
                            ))}
                            {c.urls.length > 0 && (
                              <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                                <p className="text-[11px] font-mono mb-1.5" style={{ color: "#00e87a" }}>
                                  ✓ URLS MATCHING THIS SITE ({c.urls.length}):
                                </p>
                                {c.urls.map((u, i) => (
                                  <a key={i} href={u} target="_blank" rel="noreferrer"
                                    className="flex items-start gap-2 text-[12px] font-mono hover:underline break-all"
                                    style={{ color: "#00e87a" }}>
                                    <span style={{ flexShrink: 0 }}>✓</span>
                                    <span>{u}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[12px]" style={{ color: "#8b8d9e" }}>No source URLs returned by this provider.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#8b8d9e" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#00e87a", display: "inline-block" }} />
          3+ = well known
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#8b8d9e" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#ffb830", display: "inline-block" }} />
          1–2 = occasionally cited
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#8b8d9e" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#ff5a5a", display: "inline-block" }} />
          0 = not cited
        </div>
        <span className="text-[11px]" style={{ color: "#8b8d9e" }}>· Click any row to expand prompt + full answer</span>
      </div>
    </div>
  );
}

export default function ResultsSection({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const scoreColor = getScoreColor(result.overall_score);
  const totalChecks =
    (result.stats?.checks_passed ?? 0) +
    (result.stats?.checks_failed ?? 0) +
    (result.stats?.checks_warned ?? 0);

  const coverage = result.ai_platform_coverage ?? {};
  const coverageEntries = Object.entries(coverage);
  const indexedCount = coverageEntries.filter(([, v]) => v === "indexed").length;
  const providers = result._providers ?? [];
  const successfulProviders = providers.filter(p => p.status === "success");
  const citations = result.citations ?? [];
  const maxCitations = Math.max(...citations.map(c => c.count), 1);
  const totalCitations = citations.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="animate-fade-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-7 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
            <h2 className="text-xl font-semibold tracking-tight">{result.site_name || result.url}</h2>
            {result._cached && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{ color: "#8b8d9e", borderColor: "rgba(255,255,255,0.1)" }}>cached</span>
            )}
          </div>
          <div className="inline-block font-mono text-[12px] px-2.5 py-1 rounded-md mb-3"
            style={{ color: "#8b8d9e", background: "#181a25" }}>
            {result.url}
          </div>
          {result.summary && (
            <p className="text-sm max-w-xl leading-relaxed" style={{ color: "#8b8d9e" }}>
              {result.summary}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <ScoreGauge value={result.overall_score} label="AI SCORE" color={scoreColor} fillPercent={result.overall_score} />
          <ScoreGauge value={result.grade} label="GRADE" color={scoreColor} fillPercent={100} />
        </div>
      </div>

      {/* ── Prompts & Responses (Ahrefs-style) ─────────────────────────── */}
      {providers.length > 0 && (
        <PromptResponsePanel providers={providers} />
      )}

      {/* ── Provider results ────────────────────────────────────────────── */}
      {providers.length > 0 && (
        <div className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
              AI Provider Results
            </div>
            <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
              {successfulProviders.length}/{providers.length} succeeded · scores averaged
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {providers.map(p => {
              const cfg = PROVIDER_COLORS[p.name] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
              const isOk = p.status === "success";
              return (
                <div key={p.name} className="rounded-xl border p-4"
                  style={{ background: isOk ? cfg.bg : "rgba(255,90,90,0.04)", borderColor: isOk ? cfg.border : "rgba(255,90,90,0.2)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium" style={{ color: isOk ? cfg.color : "#ff5a5a" }}>{p.name}</span>
                    <span className="text-[10px] font-mono" style={{ color: "#8b8d9e" }}>{p.durationMs}ms</span>
                  </div>
                  {isOk ? (
                    <div>
                      <div className="text-2xl font-bold tracking-tight"
                        style={{ color: p.score != null ? getScoreColor(p.score) : "#8b8d9e" }}>
                        {p.score ?? "—"}
                      </div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: "#8b8d9e" }}>score / 100</div>
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: "#ff5a5a" }}>{p.error?.slice(0, 60) ?? "Failed"}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Citations panel ─────────────────────────────────────────────── */}
      {citations.length > 0 ? (
        <CitationsPanel citations={citations} maxCitations={maxCitations} totalCitations={totalCitations} />
      ) : (
        <div
          className="rounded-2xl border p-6 text-center"
          style={{ background: "rgba(0,229,255,0.03)", borderColor: "rgba(0,229,255,0.12)", borderStyle: "dashed" }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "#00e5ff" }}>AI Citations not included</p>
          <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
            Re-scan with the <span style={{ color: "#00e5ff" }}>&ldquo;Include AI Citations&rdquo;</span> toggle on to see how many times each AI agent cites this site.
          </p>
        </div>
      )}

      {/* ── AI Platform Coverage ────────────────────────────────────────── */}
      {coverageEntries.length > 0 && (
        <div className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
              AI Platform Coverage
            </div>
            <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
              {indexedCount}/{coverageEntries.length} indexed
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {coverageEntries.map(([platform, status]) => {
              const isIndexed = status === "indexed";
              const label = platform.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
              return (
                <div key={platform} className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
                  style={{
                    background: isIndexed ? "rgba(0,232,122,0.06)" : "rgba(255,90,90,0.06)",
                    borderColor: isIndexed ? "rgba(0,232,122,0.2)" : "rgba(255,90,90,0.2)",
                  }}>
                  <span style={{ fontSize: 12, color: isIndexed ? "#00e87a" : "#ff5a5a" }}>
                    {PLATFORM_ICONS[platform] ?? "◎"}
                  </span>
                  <div>
                    <div className="text-[11px] font-medium text-white">{label}</div>
                    <div className="text-[10px] font-mono" style={{ color: isIndexed ? "#00e87a" : "#ff5a5a" }}>
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
      <div className="flex gap-8 flex-wrap items-center rounded-2xl border px-6 py-5 mb-6"
        style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight" style={{ color: "#00e87a" }}>{result.stats?.checks_passed ?? 0}</div>
          <div className="text-[11px] font-mono mt-0.5 tracking-wide" style={{ color: "#8b8d9e" }}>PASSED</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight" style={{ color: "#ffb830" }}>{result.stats?.checks_warned ?? 0}</div>
          <div className="text-[11px] font-mono mt-0.5 tracking-wide" style={{ color: "#8b8d9e" }}>WARNINGS</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight" style={{ color: "#ff5a5a" }}>{result.stats?.checks_failed ?? 0}</div>
          <div className="text-[11px] font-mono mt-0.5 tracking-wide" style={{ color: "#8b8d9e" }}>FAILED</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold tracking-tight" style={{ color: "#00e5ff" }}>{totalChecks}</div>
          <div className="text-[11px] font-mono mt-0.5 tracking-wide" style={{ color: "#8b8d9e" }}>TOTAL CHECKS</div>
        </div>
        <div className="ml-auto">
          <button onClick={onReset}
            className="text-sm px-5 py-2.5 rounded-xl border transition-all hover:border-[#00e5ff] hover:text-[#00e5ff]"
            style={{ borderColor: "rgba(255,255,255,0.13)", color: "#f0f0f5", background: "transparent" }}>
            ← Scan another site
          </button>
        </div>
      </div>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <div className="text-[13px] font-mono tracking-widest mb-3.5 uppercase" style={{ color: "#8b8d9e" }}>
        Category Breakdown
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {result.categories?.map(cat => <CategoryCard key={cat.name} category={cat} />)}
      </div>

      <Recommendations recommendations={result.recommendations} />
    </div>
  );
}
