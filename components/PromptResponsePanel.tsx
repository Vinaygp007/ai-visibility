"use client";

import { useState, useEffect, useRef } from "react";
import { ProviderMeta, CitationResult } from "@/types";

const PROVIDER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.1)",  border: "rgba(66,133,244,0.28)", icon: "✦" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.1)",  border: "rgba(32,178,170,0.28)", icon: "◎" },
  "Claude 3.5 Sonnet":     { color: "#c17c4e", bg: "rgba(193,124,78,0.1)",  border: "rgba(193,124,78,0.28)", icon: "◈" },
  "Microsoft Copilot":     { color: "#0078d4", bg: "rgba(0,120,212,0.1)",   border: "rgba(0,120,212,0.28)", icon: "⊞" },
};

const MENTION_COLORS = [
  "#4285f4", "#10a37f", "#20b2aa", "#c17c4e", "#a855f7",
  "#f59e0b", "#ef4444", "#06b6d4",
];

function extractResponseText(rawResponse: string): string {
  try {
    const json = JSON.parse(rawResponse);
    if (json?.candidates?.[0]?.content?.parts?.[0]?.text) return json.candidates[0].content.parts[0].text;
    if (json?.choices?.[0]?.message?.content) return json.choices[0].message.content;
    if (json?.content?.[0]?.text) return json.content[0].text;
    return JSON.stringify(json, null, 2);
  } catch {
    return rawResponse;
  }
}

function parseCitedPage(url: string): { domain: string; path: string } {
  try {
    const u = new URL(url);
    const domain = u.hostname.replace(/^www\./, "");
    const raw = u.pathname + u.search;
    const path = raw.length > 40 ? raw.slice(0, 40) + "…" : raw;
    return { domain, path };
  } catch {
    return { domain: url.slice(0, 30), path: "" };
  }
}

function extractMentions(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,}){0,2}\b/g) ?? [];
  const stopWords = new Set(["The","This","That","With","From","When","Then","They","Your","Also","Just","More","Some","Such","Each","Into","Over","After","Before","Based","Here","Only"]);
  return [...new Set(matches.filter(m => !stopWords.has(m)))].slice(0, 8);
}

/** Render markdown-ish text */
function renderAnswer(text: string) {
  return text.split("\n").map((line, i) => {
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^(\d+)\. (.+)/);
    const renderInline = (t: string) =>
      t
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0e8">$1</strong>')
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
    if (h3) return <h3 key={i} style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: "10px 0 3px" }} dangerouslySetInnerHTML={{ __html: renderInline(h3[1]) }} />;
    if (h2) return <h2 key={i} style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "12px 0 4px" }} dangerouslySetInnerHTML={{ __html: renderInline(h2[1]) }} />;
    if (h1) return <h1 key={i} style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "12px 0 5px" }} dangerouslySetInnerHTML={{ __html: renderInline(h1[1]) }} />;
    if (bullet) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "#00e5ff", flexShrink: 0 }}>•</span>
        <span dangerouslySetInnerHTML={{ __html: renderInline(bullet[1]) }} />
      </div>
    );
    if (numbered) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "#00e5ff", flexShrink: 0, minWidth: 16 }}>{numbered[1]}.</span>
        <span dangerouslySetInnerHTML={{ __html: renderInline(numbered[2]) }} />
      </div>
    );
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} style={{ margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
  });
}

interface PromptResponsePanelProps {
  providers: ProviderMeta[];
  citations?: CitationResult[];
}

export default function PromptResponsePanel({ providers, citations = [] }: PromptResponsePanelProps) {
  const [section, setSection] = useState<"analysis" | "citations">("analysis");
  const [activeProvider, setActiveProvider] = useState<string>(providers[0]?.name || "");
  const [activeCitation, setActiveCitation] = useState<string>(citations[0]?.provider || "");
  const [analysisDropdownOpen, setAnalysisDropdownOpen] = useState(false);
  const [citationDropdownOpen, setCitationDropdownOpen] = useState(false);
  const analysisDropdownRef = useRef<HTMLDivElement>(null);
  const citationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (providers.length > 0 && !activeProvider) setActiveProvider(providers[0].name);
  }, [providers, activeProvider]);

  useEffect(() => {
    if (citations.length > 0) setActiveCitation(citations[0].provider);
  }, [citations]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (analysisDropdownRef.current && !analysisDropdownRef.current.contains(e.target as Node)) setAnalysisDropdownOpen(false);
      if (citationDropdownRef.current && !citationDropdownRef.current.contains(e.target as Node)) setCitationDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (providers.length === 0 && citations.length === 0) return null;

  const hasCitations = citations.length > 0;

  // ── Analysis section data ──
  const activeData = providers.find((p) => p.name === activeProvider) ?? providers[0];
  const cfg = PROVIDER_CONFIG[activeData?.name ?? ""] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
  const responseText = activeData?.status === "success" ? extractResponseText(activeData.rawResponse ?? "") : null;
  const mentions = responseText ? extractMentions(responseText) : [];

  // ── Citation section data ──
  const activeCitationData = citations.find((c) => c.provider === activeCitation) ?? citations[0];
  const citCfg = PROVIDER_CONFIG[activeCitationData?.provider ?? ""] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
  const citedUrls = activeCitationData?.allCitationUrls ?? [];
  const citMentions = citedUrls.map((u) => {
    try { return new URL(u).hostname.replace(/^www\./, "").split(".")[0]; } catch { return null; }
  }).filter((s): s is string => !!s).map(s => s.charAt(0).toUpperCase() + s.slice(1));
  const dedupCitMentions = [...new Set(citMentions)].slice(0, 8);

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)" }}
      >
        <span className="text-[11px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
          Prompts &amp; Responses
        </span>

        <div className="flex items-center gap-3">
          {/* Section toggle */}
          {hasCitations && (
            <div
              className="flex items-center gap-1 rounded-lg p-1"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {(["analysis", "citations"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className="px-3 py-1 rounded-md text-[11px] font-medium transition-all"
                  style={{
                    background: section === s ? "rgba(0,229,255,0.12)" : "transparent",
                    color: section === s ? "#00e5ff" : "#6f7280",
                    border: section === s ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                  }}
                >
                  {s === "analysis" ? `Analysis (${providers.length})` : `Citation Queries (${citations.length})`}
                </button>
              ))}
            </div>
          )}

          {/* Provider dropdown — Analysis */}
          {section === "analysis" && providers.length > 0 && (
            <div className="relative" ref={analysisDropdownRef}>
              <button
                onClick={() => setAnalysisDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all hover:opacity-90"
                style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
              >
                <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                <span>{activeData?.name}</span>
                {activeData?.status === "failed" && (
                  <span className="text-[9px] font-mono px-1 rounded" style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.12)" }}>✗</span>
                )}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                  style={{ color: cfg.color, transform: analysisDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
                  <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {analysisDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl border z-20 overflow-hidden min-w-[220px]"
                  style={{ background: "#181a25", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                >
                  {providers.map((p) => {
                    const pCfg = PROVIDER_CONFIG[p.name] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
                    const isSelected = activeData?.name === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => { setActiveProvider(p.name); setAnalysisDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-all hover:bg-white/5"
                        style={{ color: isSelected ? pCfg.color : "#c9cdd4", background: isSelected ? pCfg.bg : "transparent" }}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 11 }}>{pCfg.icon}</span>
                          <span className="font-medium">{p.name}</span>
                          {p.status === "failed" && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.1)" }}>failed</span>
                          )}
                        </div>
                        {p.status === "success" && p.durationMs && (
                          <span className="text-[11px] font-mono" style={{ color: "#4b5563" }}>{p.durationMs}ms</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Provider dropdown — Citations */}
          {section === "citations" && hasCitations && (
            <div className="relative" ref={citationDropdownRef}>
              <button
                onClick={() => setCitationDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all hover:opacity-90"
                style={{ color: citCfg.color, background: citCfg.bg, borderColor: citCfg.border }}
              >
                <span style={{ fontSize: 12 }}>{citCfg.icon}</span>
                <span>{activeCitationData?.provider}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                  style={{ color: citCfg.color, transform: citationDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
                  <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {citationDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl border z-20 overflow-hidden min-w-[220px]"
                  style={{ background: "#181a25", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                >
                  {citations.map((c) => {
                    const pCfg = PROVIDER_CONFIG[c.provider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
                    const isSelected = activeCitationData?.provider === c.provider;
                    return (
                      <button
                        key={c.provider}
                        onClick={() => { setActiveCitation(c.provider); setCitationDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-all hover:bg-white/5"
                        style={{ color: isSelected ? pCfg.color : "#c9cdd4", background: isSelected ? pCfg.bg : "transparent" }}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 11 }}>{pCfg.icon}</span>
                          <span className="font-medium">{c.provider}</span>
                          {c.status !== "success" && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.1)" }}>failed</span>
                          )}
                        </div>
                        {c.status === "success" && (
                          <span className="text-[11px] font-mono font-semibold" style={{ color: c.count >= 3 ? "#00e87a" : c.count > 0 ? "#ffb830" : "#ff5a5a" }}>
                            {c.count} cite{c.count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ ANALYSIS SECTION — two-column layout ══ */}
      {section === "analysis" && (
        <>
          {activeData?.status === "failed" ? (
            <div className="p-8 text-center">
              <div className="rounded-xl p-5 inline-block" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.2)" }}>
                <p className="text-[13px] font-medium mb-2" style={{ color: "#ff5a5a" }}>✗ Request Failed</p>
                <p className="text-[12px]" style={{ color: "#8b8d9e" }}>{activeData.error || "No error details available"}</p>
              </div>
            </div>
          ) : activeData ? (
            <div className="flex" style={{ minHeight: 320 }}>
              {/* Left: Prompt + Response */}
              <div className="flex-1 p-5 overflow-y-auto" style={{ borderRight: "1px solid rgba(255,255,255,0.07)", maxHeight: 560 }}>
                {/* Prompt */}
                <div className="mb-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>
                    Prompt sent to {activeData.name}
                  </p>
                  <div
                    className="text-[12px] leading-relaxed px-4 py-3 rounded-xl"
                    style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", maxHeight: 120, overflowY: "auto" }}
                  >
                    {activeData.prompt}
                  </div>
                </div>

                {/* Response header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>Response</p>
                    {activeData.durationMs && (
                      <span className="text-[10px] font-mono" style={{ color: "#4b5563" }}>· {activeData.durationMs}ms</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(responseText ?? "")}
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    Copy
                  </button>
                </div>

                {/* Response text rendered as markdown */}
                <div className="text-[12.5px] leading-relaxed" style={{ color: "#c9cdd4" }}>
                  {responseText
                    ? renderAnswer(responseText)
                    : <span style={{ color: "#4b5563" }}>No response captured</span>}
                </div>
              </div>

              {/* Right: Mentions */}
              <div className="flex flex-col" style={{ width: 220, flexShrink: 0, background: "rgba(0,0,0,0.15)" }}>
                <div className="px-4 py-4">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-[12px] font-semibold text-white">Mentions</span>
                    <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>{mentions.length}</span>
                  </div>
                  {mentions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {mentions.map((m, i) => (
                        <div key={m} className="flex items-center gap-2.5">
                          <span className="text-[11px] font-mono w-4 flex-shrink-0" style={{ color: "#4b5563" }}>{i + 1}</span>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{
                              background: `${MENTION_COLORS[i % MENTION_COLORS.length]}22`,
                              color: MENTION_COLORS[i % MENTION_COLORS.length],
                              border: `1px solid ${MENTION_COLORS[i % MENTION_COLORS.length]}44`,
                            }}
                          >
                            {m[0]}
                          </div>
                          <span className="text-[12px] font-medium text-white truncate">{m}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: "#4b5563" }}>No entities extracted</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ══ CITATIONS SECTION — two-column layout ══ */}
      {section === "citations" && hasCitations && (
        <>
          {activeCitationData?.status !== "success" ? (
            <div className="p-8 text-center">
              <div className="rounded-xl p-5 inline-block" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.2)" }}>
                <p className="text-[13px] font-medium mb-2" style={{ color: "#ff5a5a" }}>✗ Citation Query Failed</p>
                <p className="text-[12px]" style={{ color: "#8b8d9e" }}>{activeCitationData?.error || "No details available"}</p>
              </div>
            </div>
          ) : activeCitationData ? (
            <div className="flex" style={{ minHeight: 320 }}>
              {/* Left: Query + Response */}
              <div className="flex-1 p-5 overflow-y-auto" style={{ borderRight: "1px solid rgba(255,255,255,0.07)", maxHeight: 560 }}>
                {/* Query */}
                <div className="mb-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>Query</p>
                  <div className="text-[12px] leading-relaxed px-4 py-3 rounded-xl" style={{ color: "#e0e0ea", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {activeCitationData.query}
                  </div>
                </div>

                {/* Response header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>Response</p>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, (activeCitationData.count / 10) * 100)}%`,
                            background: activeCitationData.count >= 3 ? "#00e87a" : activeCitationData.count > 0 ? "#ffb830" : "#ff5a5a",
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-semibold" style={{
                        color: activeCitationData.count === 0 ? "#ff5a5a" : activeCitationData.count < 3 ? "#ffb830" : "#00e87a"
                      }}>
                        {activeCitationData.count === 0 ? "not cited" : `${activeCitationData.count} ${activeCitationData.count === 1 ? "citation" : "citations"}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(activeCitationData.rawAnswer)}
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ color: citCfg.color, background: citCfg.bg, border: `1px solid ${citCfg.border}` }}
                  >
                    Copy
                  </button>
                </div>

                {/* Response text */}
                <div className="text-[12.5px] leading-relaxed" style={{ color: "#c9cdd4" }}>
                  {activeCitationData.rawAnswer
                    ? renderAnswer(activeCitationData.rawAnswer)
                    : <span style={{ color: "#4b5563" }}>No answer captured</span>}
                </div>
              </div>

              {/* Right: Mentions + Cited Pages */}
              <div className="flex flex-col" style={{ width: 240, flexShrink: 0, background: "rgba(0,0,0,0.15)" }}>
                {/* Mentions */}
                <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-[12px] font-semibold text-white">Mentions</span>
                    <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>{dedupCitMentions.length}</span>
                  </div>
                  {dedupCitMentions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {dedupCitMentions.map((m, i) => (
                        <div key={m} className="flex items-center gap-2.5">
                          <span className="text-[11px] font-mono w-4 flex-shrink-0" style={{ color: "#4b5563" }}>{i + 1}</span>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{
                              background: `${MENTION_COLORS[i % MENTION_COLORS.length]}22`,
                              color: MENTION_COLORS[i % MENTION_COLORS.length],
                              border: `1px solid ${MENTION_COLORS[i % MENTION_COLORS.length]}44`,
                            }}
                          >
                            {m[0]}
                          </div>
                          <span className="text-[12px] font-medium text-white truncate">{m}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: "#4b5563" }}>No entities extracted</p>
                  )}
                </div>

                {/* Cited pages */}
                <div className="px-4 py-4 flex-1 overflow-y-auto" style={{ maxHeight: 280 }}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-[12px] font-semibold text-white">Cited pages</span>
                    <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>{citedUrls.length}</span>
                  </div>
                  {citedUrls.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                      {citedUrls.map((url, i) => {
                        const { domain, path } = parseCitedPage(url);
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
                            <span className="text-[11px] font-mono w-4 flex-shrink-0 mt-0.5" style={{ color: "#4b5563" }}>{i + 1}</span>
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                              style={{ background: `${MENTION_COLORS[i % MENTION_COLORS.length]}22`, color: MENTION_COLORS[i % MENTION_COLORS.length] }}
                            >
                              {domain[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-semibold group-hover:underline leading-tight block truncate" style={{ color: "#e0e0e8" }}>{domain}</span>
                              {path && <span className="text-[10px] font-mono leading-tight block truncate" style={{ color: "#4b5563" }}>{path}</span>}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: "#4b5563" }}>No source URLs captured</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}