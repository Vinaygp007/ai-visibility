"use client";

import { useState, useEffect, useRef } from "react";
import { CitationResult } from "@/types";

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)", icon: "✦" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)", icon: "⬡" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)", icon: "⬡" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)", icon: "◎" },
};

const MENTION_COLORS = [
  "#4285f4", "#10a37f", "#20b2aa", "#c17c4e", "#a855f7",
  "#f59e0b", "#ef4444", "#06b6d4",
];

function parseCitedPage(url: string): { domain: string; path: string } {
  try {
    const u = new URL(url);
    const domain = u.hostname.replace(/^www\./, "");
    const path = (u.pathname + u.search).slice(0, 40) + ((u.pathname + u.search).length > 40 ? "…" : "");
    return { domain, path };
  } catch {
    return { domain: url.slice(0, 30), path: "" };
  }
}

function extractMentions(rawAnswer: string, urls: string[]): string[] {
  const fromUrls = urls
    .map((u) => {
      try { return new URL(u).hostname.replace(/^www\./, "").split(".")[0]; }
      catch { return null; }
    })
    .filter((s): s is string => !!s)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return [...new Set(fromUrls)].slice(0, 8);
}

const renderAnswer = (text: string) =>
  text.split("\n").map((line, i) => {
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^(\d+)\. (.+)/);
    const renderInline = (t: string) =>
      t
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--c-text)">$1</strong>')
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
    if (h3) return <h3 key={i} style={{ color: "var(--c-text)", fontSize: 13, fontWeight: 600, margin: "10px 0 3px" }} dangerouslySetInnerHTML={{ __html: renderInline(h3[1]) }} />;
    if (h2) return <h2 key={i} style={{ color: "var(--c-text)", fontSize: 14, fontWeight: 700, margin: "12px 0 4px" }} dangerouslySetInnerHTML={{ __html: renderInline(h2[1]) }} />;
    if (h1) return <h1 key={i} style={{ color: "var(--c-text)", fontSize: 15, fontWeight: 700, margin: "12px 0 5px" }} dangerouslySetInnerHTML={{ __html: renderInline(h1[1]) }} />;
    if (bullet) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "var(--c-accent)", flexShrink: 0 }}>•</span>
        <span dangerouslySetInnerHTML={{ __html: renderInline(bullet[1]) }} />
      </div>
    );
    if (numbered) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "var(--c-accent)", flexShrink: 0, minWidth: 16 }}>{numbered[1]}.</span>
        <span dangerouslySetInnerHTML={{ __html: renderInline(numbered[2]) }} />
      </div>
    );
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} style={{ margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
  });

interface CitationsPanelProps {
  citations: CitationResult[];
  maxCitations: number;
  totalCitations: number;
}

export default function CitationsPanel({ citations, maxCitations, totalCitations }: CitationsPanelProps) {
  const [activeProvider, setActiveProvider] = useState<string>(citations[0]?.provider ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (citations.length > 0) setActiveProvider(citations[0].provider);
  }, [citations]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resolvedProvider = citations.find((c) => c.provider === activeProvider)?.provider ?? citations[0]?.provider ?? "";
  const active = citations.find((c) => c.provider === resolvedProvider);
  const cfg = PROVIDER_COLORS[resolvedProvider] ?? { color: "var(--c-muted)", bg: "var(--c-surface2)", border: "var(--c-border-strong)", icon: "◎" };
  const successCount = citations.filter((c) => c.status === "success").length;

  if (citations.length === 0) return null;

  const dotColor = (count: number, hasAnswer = true) =>
    !hasAnswer ? "var(--c-muted)" : count === 0 ? "var(--c-error)" : count < 3 ? "var(--c-warning)" : "var(--c-success)";

  const citedUrls = active?.allCitationUrls ?? [];
  const mentions = extractMentions(active?.rawAnswer ?? "", citedUrls);

  return (
    <div
      className="rounded-2xl border mb-6 overflow-hidden"
      style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3.5 border-b flex items-center justify-between"
        style={{ borderColor: "var(--c-border)", background: "var(--c-surface2)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "var(--c-muted)" }}>
            AI Citations
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ color: "var(--c-muted)", background: "var(--c-surface)" }}>
            {totalCitations} total · {successCount} {successCount === 1 ? "agent" : "agents"}
          </span>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all hover:opacity-90"
            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
          >
            <span style={{ fontSize: 12 }}>{cfg.icon}</span>
            <span>{resolvedProvider}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ color: cfg.color, transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
              <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 rounded-xl border z-20 overflow-hidden min-w-[220px]"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border-strong)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
            >
              {citations.map((c) => {
                const pCfg = PROVIDER_COLORS[c.provider] ?? { color: "var(--c-muted)", bg: "var(--c-surface2)", border: "var(--c-border-strong)", icon: "◎" };
                const isSelected = resolvedProvider === c.provider;
                const isSuccess = c.status === "success";
                return (
                  <button
                    key={c.provider}
                    onClick={() => { setActiveProvider(c.provider); setDropdownOpen(false); }}
                    className="hover-surface w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-all"
                    style={{ color: isSelected ? pCfg.color : "var(--c-text-sub)", background: isSelected ? pCfg.bg : "transparent" }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 11 }}>{pCfg.icon}</span>
                      <span className="font-medium">{c.provider}</span>
                      {!isSuccess && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--c-error)", background: "rgba(255,90,90,0.1)" }}>
                          failed
                        </span>
                      )}
                    </div>
                    {isSuccess && (
                      <span className="text-[11px] font-mono font-semibold" style={{ color: dotColor(c.count, !!c.rawAnswer) }}>
                        {c.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      {active ? (
        active.status === "failed" ? (
          <div className="p-8 text-center">
            <div className="rounded-xl p-5 inline-block" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.2)" }}>
              <p className="text-[13px] font-medium mb-2" style={{ color: "var(--c-error)" }}>✗ Request Failed</p>
              <p className="text-[12px]" style={{ color: "var(--c-muted)" }}>{active.error ?? "No error details available"}</p>
            </div>
          </div>
        ) : (
          <div className="flex" style={{ minHeight: 320 }}>
            {/* Left: Response */}
            <div className="flex-1 p-5 overflow-y-auto" style={{ borderRight: "1px solid var(--c-border)", maxHeight: 560 }}>
              {/* Response header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-mono uppercase tracking-wider" style={{ color: "var(--c-muted)" }}>Response</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 rounded-full" style={{ background: "var(--c-border-strong)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${maxCitations > 0 ? Math.round((active.count / maxCitations) * 100) : 0}%`,
                          background: dotColor(active.count),
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: dotColor(active.count, !!active.rawAnswer) }}>
                      {active.count === 0 && active.rawAnswer
                        ? "not cited"
                        : `${active.count} ${active.count === 1 ? "citation" : "citations"}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(active.rawAnswer)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                  style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  Copy
                </button>
              </div>

              {/* Response text */}
              <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--c-text-sub)" }}>
                {active.rawAnswer
                  ? renderAnswer(active.rawAnswer)
                  : <span style={{ color: "var(--c-muted)" }}>No answer captured</span>}
              </div>

              {/* Cited snippets */}
              {active.snippets?.length > 0 && (
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--c-border)" }}>
                  <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>
                    Cited Snippets
                  </div>
                  <div className="flex flex-col gap-2">
                    {active.snippets.map((s, i) => (
                      <div key={i} className="text-[12px] px-3 py-2 rounded-lg"
                        style={{ color: "var(--c-text-sub)", background: "var(--c-surface2)", borderLeft: `2px solid ${cfg.color}` }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Mentions + Cited Pages */}
            <div className="flex flex-col" style={{ width: 240, flexShrink: 0, background: "var(--c-surface2)" }}>
              {/* Mentions */}
              <div className="px-4 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[12px] font-semibold" style={{ color: "var(--c-text)" }}>Mentions</span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>{mentions.length}</span>
                </div>
                {mentions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {mentions.map((m, i) => (
                      <div key={m} className="flex items-center gap-2.5">
                        <span className="text-[11px] font-mono w-4 flex-shrink-0" style={{ color: "var(--c-muted)" }}>{i + 1}</span>
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
                        <span className="text-[12px] font-medium truncate" style={{ color: "var(--c-text)" }}>{m}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px]" style={{ color: "var(--c-muted)" }}>No entities extracted</p>
                )}
              </div>

              {/* Cited pages */}
              <div className="px-4 py-4 flex-1 overflow-y-auto" style={{ maxHeight: 280 }}>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[12px] font-semibold" style={{ color: "var(--c-text)" }}>Cited pages</span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>{citedUrls.length}</span>
                </div>
                {citedUrls.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {citedUrls.map((url, i) => {
                      const { domain, path } = parseCitedPage(url);
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
                          <span className="text-[11px] font-mono w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--c-muted)" }}>{i + 1}</span>
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                            style={{ background: `${MENTION_COLORS[i % MENTION_COLORS.length]}22`, color: MENTION_COLORS[i % MENTION_COLORS.length] }}
                          >
                            {domain[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold group-hover:underline leading-tight block truncate" style={{ color: "var(--c-text)" }}>{domain}</span>
                            {path && <span className="text-[10px] font-mono leading-tight block truncate" style={{ color: "var(--c-muted)" }}>{path}</span>}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px]" style={{ color: "var(--c-muted)" }}>No source URLs captured</p>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        <p className="text-[12px] text-center py-8" style={{ color: "var(--c-muted)" }}>No citation data available</p>
      )}

      {/* ── Legend Footer ── */}
      <div
        className="px-5 py-3 border-t flex items-center gap-5 flex-wrap"
        style={{ borderColor: "var(--c-border)", background: "var(--c-surface2)" }}
      >
        {[
          { color: "var(--c-success)", label: "3+ = well cited" },
          { color: "var(--c-warning)", label: "1–2 = occasionally" },
          { color: "var(--c-error)",   label: "0 = not cited" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
            <span className="text-[11px]" style={{ color: "var(--c-muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
