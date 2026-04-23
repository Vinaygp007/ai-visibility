"use client";

import { useState, useEffect } from "react";
import { CitationResult } from "@/types";

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  "Gemini 2.0 Flash":  { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)" },
  "ChatGPT (GPT-4o)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "Perplexity Sonar":  { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)" },
};

type ContentTab = "answer" | "prompt" | "urls";

interface CitationsPanelProps {
  citations: CitationResult[];
  maxCitations: number;
  totalCitations: number;
}

export default function CitationsPanel({
  citations,
  maxCitations,
  totalCitations,
}: CitationsPanelProps) {
  const [activeProvider, setActiveProvider] = useState<string>(
    citations[0]?.provider ?? ""
  );
  const [activeTab, setActiveTab] = useState<ContentTab>("answer");

  // Reset when citations change (e.g. new scan result loaded into mounted component)
  useEffect(() => {
    if (citations.length > 0) {
      setActiveProvider(citations[0].provider);
      setActiveTab("answer");
    }
  }, [citations]);

  // Fallback: if activeProvider is stale/mismatched, snap to first citation
  const resolvedProvider =
    citations.find((c) => c.provider === activeProvider)?.provider ??
    citations[0]?.provider ??
    "";

  const active = citations.find((c) => c.provider === resolvedProvider);
  const cfg = PROVIDER_COLORS[resolvedProvider] ?? {
    color: "#8b8d9e",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.1)",
  };

  const successCount = citations.filter((c) => c.status === "success").length;

  if (citations.length === 0) return null;

  /* ── helper: citation dot colour ── */
  const dotColor = (count: number, hasAnswer = true) =>
    !hasAnswer ? "#4b5563" : count === 0 ? "#ff5a5a" : count < 3 ? "#ffb830" : "#00e87a";

  return (
    <div
      className="rounded-2xl border mb-6"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-[13px] font-mono tracking-widest uppercase mb-1"
              style={{ color: "#8b8d9e" }}
            >
              AI Citations
            </div>
            <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
              Each agent was asked the same prompt about this site. See exactly
              what was sent and what they said.
            </p>
          </div>
          <span
            className="text-[11px] font-mono px-2.5 py-1 rounded-md"
            style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.03)" }}
          >
            {totalCitations} total · {successCount}{" "}
            {successCount === 1 ? "agent" : "agents"} queried
          </span>
        </div>
      </div>

      {/* ── Provider Tabs ── */}
      <div
        className="flex gap-0 overflow-x-auto border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        {citations.map((c) => {
          const pCfg = PROVIDER_COLORS[c.provider] ?? {
            color: "#8b8d9e",
            bg: "rgba(255,255,255,0.03)",
            border: "rgba(255,255,255,0.1)",
          };
          const isActive = resolvedProvider === c.provider;
          const isSuccess = c.status === "success";

          return (
            <button
              key={c.provider}
              onClick={() => {
                setActiveProvider(c.provider);
                setActiveTab("answer");
              }}
              className="px-5 py-3 text-[12px] font-medium transition-all whitespace-nowrap flex items-center gap-2"
              style={{
                color: isActive ? pCfg.color : "#8b8d9e",
                background: isActive ? pCfg.bg : "transparent",
                borderBottom: isActive
                  ? `2px solid ${pCfg.color}`
                  : "2px solid transparent",
              }}
            >
              <span>{c.provider}</span>

              {/* data-source badge */}
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  color:
                    c.dataSource === "fetched_content" ? "#00e87a" : "#00e5ff",
                  background:
                    c.dataSource === "fetched_content"
                      ? "rgba(0,232,122,0.08)"
                      : "rgba(0,229,255,0.06)",
                }}
              >
                {c.dataSource === "fetched_content"
                  ? "fetched"
                  : "live search"}
              </span>

              {/* status / citation count */}
              {!isSuccess ? (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    color: "#ff5a5a",
                    background: "rgba(255,90,90,0.1)",
                  }}
                >
                  failed
                </span>
              ) : (
                <span
                  className="text-[9px] font-mono flex items-center gap-1"
                  style={{ color: dotColor(c.count, !!c.rawAnswer) }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: dotColor(c.count, !!c.rawAnswer) }}
                  />
                  {c.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content Tabs ── */}
      <div
        className="flex gap-0 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        {(
          [
            { key: "answer", label: "← Raw Answer" },
            { key: "prompt", label: "→ Prompt Used" },
            {
              key: "urls",
              label: `⊞ Source URLs (${active?.allCitationUrls?.length ?? 0})`,
            },
          ] as { key: ContentTab; label: string }[]
        ).map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-all"
              style={{
                color: isActive ? cfg.color : "#8b8d9e",
                background: isActive ? cfg.bg : "transparent",
                borderBottom: isActive
                  ? `2px solid ${cfg.color}`
                  : "2px solid transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content Area ── */}
      <div className="p-5">
        {active ? (
          <>
            {/* ── ANSWER TAB ── */}
            {activeTab === "answer" && (
              <div>
                {active.status === "failed" ? (
                  <div
                    className="rounded-xl p-5 text-center"
                    style={{
                      background: "rgba(255,90,90,0.05)",
                      border: "1px solid rgba(255,90,90,0.2)",
                    }}
                  >
                    <p
                      className="text-[13px] font-medium mb-2"
                      style={{ color: "#ff5a5a" }}
                    >
                      ✗ Request Failed
                    </p>
                    <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                      {active.error ?? "No error details available"}
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Citation count summary */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[11px] font-mono uppercase tracking-wider"
                          style={{ color: "#8b8d9e" }}
                        >
                          Answer from {active.provider}
                        </span>
                        {/* Bar */}
                        <div className="flex items-center gap-2">
                          <div
                            className="w-24 h-1.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${
                                  maxCitations > 0
                                    ? Math.round(
                                        (active.count / maxCitations) * 100
                                      )
                                    : 0
                                }%`,
                                background: dotColor(active.count),
                              }}
                            />
                          </div>
                          <span
                            className="text-[11px] font-mono font-semibold"
                            style={{ color: dotColor(active.count, !!active.rawAnswer) }}
                          >
                            {active.count === 0 && active.rawAnswer
                              ? "site not cited"
                              : `${active.count} ${active.count === 1 ? "citation" : "citations"}`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(active.rawAnswer)
                        }
                        className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                        style={{
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    <div
                      className="text-[12px] leading-relaxed p-4 rounded-xl overflow-y-auto"
                      style={{
                        color: "#c9cdd4",
                        background: "rgba(0,0,0,0.3)",
                        border: `1px solid ${cfg.border}`,
                        maxHeight: "500px",
                      }}
                    >
                      {active.rawAnswer
                        ? active.rawAnswer.split("\n").map((line, i) => {
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
                            if (bullet) return <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}><span style={{ color: "#00e5ff", flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: renderInline(bullet[1]) }} /></div>;
                            if (numbered) return <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}><span style={{ color: "#00e5ff", flexShrink: 0, minWidth: 16 }}>{numbered[1]}.</span><span dangerouslySetInnerHTML={{ __html: renderInline(numbered[2]) }} /></div>;
                            if (line.trim() === "") return <br key={i} />;
                            return <p key={i} style={{ margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
                          })
                        : <span style={{ color: "#4b5563" }}>No answer captured</span>}
                    </div>

                    {/* Inline cited snippets */}
                    {active.snippets?.length > 0 && (
                      <div className="mt-4">
                        <div
                          className="text-[11px] font-mono uppercase tracking-wider mb-2"
                          style={{ color: "#8b8d9e" }}
                        >
                          Cited Snippets
                        </div>
                        <div className="flex flex-col gap-2">
                          {active.snippets.map((s, i) => (
                            <div
                              key={i}
                              className="text-[12px] px-3 py-2 rounded-lg"
                              style={{
                                color: "#c9cdd4",
                                background: "rgba(255,255,255,0.03)",
                                borderLeft: `2px solid ${cfg.color}`,
                              }}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PROMPT TAB ── */}
            {activeTab === "prompt" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-mono uppercase tracking-wider"
                    style={{ color: "#8b8d9e" }}
                  >
                    Prompt sent to {active.provider}
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        active.systemPrompt
                          ? `[SYSTEM]\n${active.systemPrompt}\n\n[USER]\n${active.query}`
                          : active.query
                      )
                    }
                    className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                    style={{
                      color: cfg.color,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    Copy
                  </button>
                </div>

                {active.systemPrompt && (
                  <div className="mb-3">
                    <div
                      className="text-[10px] font-mono uppercase tracking-wider mb-1.5 px-1"
                      style={{ color: "#8b8d9e" }}
                    >
                      System Prompt
                    </div>
                    <pre
                      className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-xl"
                      style={{
                        color: "#f0f0f5",
                        background: "rgba(0,0,0,0.3)",
                        border: `1px solid ${cfg.border}`,
                        maxHeight: "220px",
                        overflowY: "auto",
                      }}
                    >
                      {active.systemPrompt}
                    </pre>
                  </div>
                )}

                <div>
                  {active.systemPrompt && (
                    <div
                      className="text-[10px] font-mono uppercase tracking-wider mb-1.5 px-1"
                      style={{ color: "#8b8d9e" }}
                    >
                      User Query
                    </div>
                  )}
                  <pre
                    className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-xl"
                    style={{
                      color: "#f0f0f5",
                      background: "rgba(0,0,0,0.3)",
                      border: `1px solid ${cfg.border}`,
                      maxHeight: "500px",
                      overflowY: "auto",
                    }}
                  >
                    {active.query || "No prompt captured"}
                  </pre>
                </div>
              </div>
            )}

            {/* ── URLs TAB ── */}
            {activeTab === "urls" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-mono uppercase tracking-wider"
                    style={{ color: "#8b8d9e" }}
                  >
                    {active.allCitationUrls?.length ?? 0} source URLs cited by{" "}
                    {active.provider}
                  </span>
                  {(active.allCitationUrls?.length ?? 0) > 0 && (
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          (active.allCitationUrls ?? []).join("\n")
                        )
                      }
                      className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                      style={{
                        color: cfg.color,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      Copy All
                    </button>
                  )}
                </div>

                {active.allCitationUrls?.length ? (
                  <div
                    className="rounded-xl p-4 flex flex-col gap-2"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: `1px solid ${cfg.border}`,
                      maxHeight: "500px",
                      overflowY: "auto",
                    }}
                  >
                    {active.allCitationUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[12px] font-mono hover:opacity-80 transition-opacity"
                        style={{ color: cfg.color }}
                      >
                        <span
                          className="text-[10px] w-5 flex-shrink-0"
                          style={{ color: "#8b8d9e" }}
                        >
                          {i + 1}.
                        </span>
                        <span className="truncate">{url}</span>
                        <span
                          className="flex-shrink-0 text-[10px]"
                          style={{ color: "#8b8d9e" }}
                        >
                          ↗
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-xl p-8 text-center"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                      No source URLs captured for this provider
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p
            className="text-[12px] text-center py-8"
            style={{ color: "#8b8d9e" }}
          >
            No citation data available
          </p>
        )}
      </div>

      {/* ── Legend Footer ── */}
      <div
        className="px-5 py-3 border-t flex items-center gap-5 flex-wrap"
        style={{
          borderColor: "rgba(255,255,255,0.07)",
          background: "rgba(0,229,255,0.02)",
        }}
      >
        {[
          { color: "#00e87a", label: "3+ = well known" },
          { color: "#ffb830", label: "1–2 = occasionally cited" },
          { color: "#ff5a5a", label: "0 = not cited" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block flex-shrink-0"
              style={{ background: color }}
            />
            <span className="text-[11px]" style={{ color: "#8b8d9e" }}>
              {label}
            </span>
          </div>
        ))}
        <span className="text-[11px]" style={{ color: "#8b8d9e" }}>
          · Switch tabs to see the prompt sent and all source URLs
        </span>
      </div>
    </div>
  );
}