"use client";

import { useState } from "react";
import { ProviderMeta, CitationResult } from "@/types";

const PROVIDER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.1)",  border: "rgba(66,133,244,0.28)", icon: "✦" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.1)",  border: "rgba(32,178,170,0.28)", icon: "◎" },
  "Claude 3.5 Sonnet":     { color: "#c17c4e", bg: "rgba(193,124,78,0.1)",  border: "rgba(193,124,78,0.28)", icon: "◈" },
  "Microsoft Copilot":     { color: "#0078d4", bg: "rgba(0,120,212,0.1)",   border: "rgba(0,120,212,0.28)", icon: "⊞" },
};

function extractResponseText(rawResponse: string): string {
  try {
    const json = JSON.parse(rawResponse);
    // Gemini
    if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return json.candidates[0].content.parts[0].text;
    }
    // OpenAI / Perplexity
    if (json?.choices?.[0]?.message?.content) {
      return json.choices[0].message.content;
    }
    // Anthropic
    if (json?.content?.[0]?.text) {
      return json.content[0].text;
    }
    return JSON.stringify(json, null, 2);
  } catch {
    return rawResponse;
  }
}

interface PromptResponsePanelProps {
  providers: ProviderMeta[];
  citations?: CitationResult[];
}

export default function PromptResponsePanel({ providers, citations = [] }: PromptResponsePanelProps) {
  const [section, setSection] = useState<"analysis" | "citations">("analysis");
  const [activeProvider, setActiveProvider] = useState<string>(providers[0]?.name || "");
  const [activeCitation, setActiveCitation] = useState<string>(citations[0]?.provider || "");

  const activeData = providers.find((p) => p.name === activeProvider);
  const activeCitationData = citations.find((c) => c.provider === activeCitation);
  const cfg = PROVIDER_CONFIG[activeProvider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
  const citCfg = PROVIDER_CONFIG[activeCitation] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };

  if (providers.length === 0 && citations.length === 0) return null;

  const responseText = activeData?.status === "success" ? extractResponseText(activeData.rawResponse) : null;
  const hasCitations = citations.length > 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
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

        {/* Section toggle — only show if we have both */}
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
      </div>

      {/* ══ ANALYSIS SECTION ══ */}
      {section === "analysis" && (
        <>
          {/* Provider tabs */}
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {providers.map((p) => {
              const pCfg = PROVIDER_CONFIG[p.name] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
              const isActive = activeProvider === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => setActiveProvider(p.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border"
                  style={{
                    color: isActive ? pCfg.color : "#6f7280",
                    background: isActive ? pCfg.bg : "transparent",
                    borderColor: isActive ? pCfg.border : "rgba(255,255,255,0.07)",
                  }}
                >
                  <span style={{ fontSize: 10 }}>{pCfg.icon}</span>
                  {p.name}
                  {p.status === "failed" && (
                    <span className="text-[9px] font-mono px-1 rounded ml-0.5" style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.12)" }}>✗</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5 pt-4 space-y-4">
            {activeData?.status === "failed" ? (
              <div className="rounded-xl p-4" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.18)" }}>
                <p className="text-[13px] font-medium mb-1" style={{ color: "#ff5a5a" }}>✗ Request Failed</p>
                <p className="text-[12px]" style={{ color: "#8b8d9e" }}>{activeData.error || "No error details available"}</p>
              </div>
            ) : activeData ? (
              <>
                {/* Prompt */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>Prompt sent to {activeData.name}</p>
                  <div className="text-[13px] leading-relaxed px-4 py-3 rounded-xl" style={{ color: "#e0e0ea", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {activeData.prompt}
                  </div>
                </div>

                {/* Response */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>Response</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(responseText ?? "")}
                      className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      Copy
                    </button>
                  </div>
                  <div
                    className="text-[13px] leading-relaxed px-4 py-3 rounded-xl overflow-y-auto whitespace-pre-wrap"
                    style={{ color: "#c9cdd4", background: "rgba(0,0,0,0.22)", border: `1px solid ${cfg.border}`, maxHeight: "380px" }}
                  >
                    {responseText}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {activeData?.status === "success" && (
            <div className="px-5 py-2.5 border-t flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="text-[10px] font-mono" style={{ color: "#4b5563" }}>{cfg.icon} {activeProvider} · {activeData.durationMs}ms</span>
            </div>
          )}
        </>
      )}

      {/* ══ CITATIONS SECTION ══ */}
      {section === "citations" && hasCitations && (
        <>
          {/* Provider tabs */}
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {citations.map((c) => {
              const pCfg = PROVIDER_CONFIG[c.provider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
              const isActive = activeCitation === c.provider;
              return (
                <button
                  key={c.provider}
                  onClick={() => setActiveCitation(c.provider)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border"
                  style={{
                    color: isActive ? pCfg.color : "#6f7280",
                    background: isActive ? pCfg.bg : "transparent",
                    borderColor: isActive ? pCfg.border : "rgba(255,255,255,0.07)",
                  }}
                >
                  <span style={{ fontSize: 10 }}>{pCfg.icon}</span>
                  {c.provider}
                  <span className="text-[10px] font-mono ml-1" style={{ color: isActive ? pCfg.color : "#4b5563" }}>
                    {c.count} cite{c.count !== 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-5 pt-4 space-y-4">
            {activeCitationData?.status !== "success" ? (
              <div className="rounded-xl p-4" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.18)" }}>
                <p className="text-[13px] font-medium mb-1" style={{ color: "#ff5a5a" }}>✗ Citation Query Failed</p>
                <p className="text-[12px]" style={{ color: "#8b8d9e" }}>{activeCitationData?.error || "No details available"}</p>
              </div>
            ) : activeCitationData ? (
              <>
                {/* System prompt (if present) */}
                {activeCitationData.systemPrompt && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>System Prompt</p>
                    <div
                      className="text-[12px] leading-relaxed px-4 py-3 rounded-xl whitespace-pre-wrap"
                      style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      {activeCitationData.systemPrompt}
                    </div>
                  </div>
                )}

                {/* User query */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>Query</p>
                  <div className="text-[13px] leading-relaxed px-4 py-3 rounded-xl" style={{ color: "#e0e0ea", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {activeCitationData.query}
                  </div>
                </div>

                {/* Response */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>
                      Response
                      <span className="ml-2 normal-case" style={{ color: "#4b5563" }}>· {activeCitationData.count} citation{activeCitationData.count !== 1 ? "s" : ""} detected</span>
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(activeCitationData.rawAnswer)}
                      className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ color: citCfg.color, background: citCfg.bg, border: `1px solid ${citCfg.border}` }}
                    >
                      Copy
                    </button>
                  </div>
                  <div
                    className="text-[13px] leading-relaxed px-4 py-3 rounded-xl overflow-y-auto whitespace-pre-wrap"
                    style={{ color: "#c9cdd4", background: "rgba(0,0,0,0.22)", border: `1px solid ${citCfg.border}`, maxHeight: "380px" }}
                  >
                    {activeCitationData.rawAnswer}
                  </div>
                </div>

                {/* Cited URLs */}
                {activeCitationData.allCitationUrls?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>
                      Cited URLs ({activeCitationData.allCitationUrls.length})
                    </p>
                    <div className="space-y-1.5">
                      {activeCitationData.allCitationUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-mono hover:opacity-80 transition-opacity truncate"
                          style={{ color: citCfg.color, background: citCfg.bg, border: `1px solid ${citCfg.border}` }}
                        >
                          <span style={{ color: "#4b5563" }}>{i + 1}.</span>
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}