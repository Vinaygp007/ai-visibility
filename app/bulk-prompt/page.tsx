"use client";

import { useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
interface ProviderResponse {
  provider: string;
  response: string;
  durationMs?: number;
  error?: string;
}

interface CitationResult {
  provider: string;
  status: "success" | "failed";
  count: number;
  rawAnswer: string;
  query: string;
  allCitationUrls: string[];
  error?: string;
}

type PromptStatus = "idle" | "running" | "done" | "error";

interface PromptContainer {
  id: string;
  prompt: string;
  status: PromptStatus;
  responses: ProviderResponse[];
  citations: CitationResult[];
  topic: string;
  error: string | null;
  activeProvider: string;
  activeTab: "responses" | "citations";
  activeCitProvider: string;
}

function providerSortRank(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("overview")) return 0;
  if (n.includes("gemini")) return 2;
  return 1;
}

// ── Provider colours ──────────────────────────────────────────────────────
const PROVIDER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.1)",  border: "rgba(66,133,244,0.28)", icon: "✦" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.1)",  border: "rgba(32,178,170,0.28)", icon: "◎" },
  "Claude 3.5 Sonnet":     { color: "#c17c4e", bg: "rgba(193,124,78,0.1)",  border: "rgba(193,124,78,0.28)", icon: "◈" },
  "Microsoft Copilot":     { color: "#0078d4", bg: "rgba(0,120,212,0.1)",   border: "rgba(0,120,212,0.28)", icon: "⊞" },
};

const DEFAULT_PROVIDER_CFG = { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };

const PROMPT_PRESETS = [
  "Best 5 CRM platforms for startups — rank them with pros, cons, and pricing URL.",
  "Top 5 AI writing tools in 2025 — who are they best for? Include website URLs.",
  "Best project management software for remote teams — compare features and pricing.",
  "Top 5 email marketing platforms — rank by deliverability, ease of use, and cost.",
];

// ── Markdown renderer ─────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^(\d+)\. (.+)/);
    const bold = (t: string) =>
      t.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0e8">$1</strong>');

    if (h2) return <h2 key={i} style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: "10px 0 4px" }} dangerouslySetInnerHTML={{ __html: bold(h2[1]) }} />;
    if (h3) return <h3 key={i} style={{ color: "#e0e0ea", fontSize: 12, fontWeight: 600, margin: "8px 0 2px" }} dangerouslySetInnerHTML={{ __html: bold(h3[1]) }} />;
    if (bullet) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "#00e5ff", flexShrink: 0 }}>•</span>
        <span style={{ color: "#c9cdd4", fontSize: 12 }} dangerouslySetInnerHTML={{ __html: bold(bullet[1]) }} />
      </div>
    );
    if (numbered) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "#00e5ff", flexShrink: 0, minWidth: 16, fontSize: 12 }}>{numbered[1]}.</span>
        <span style={{ color: "#c9cdd4", fontSize: 12 }} dangerouslySetInnerHTML={{ __html: bold(numbered[2]) }} />
      </div>
    );
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} style={{ color: "#c9cdd4", fontSize: 12, margin: "1px 0" }} dangerouslySetInnerHTML={{ __html: bold(line) }} />;
  });
}

function dotColor(count: number) {
  if (count === 0) return "#ff5a5a";
  if (count < 3) return "#ffb830";
  return "#00e87a";
}

// ── Single prompt container card ──────────────────────────────────────────
function PromptCard({
  container,
  index,
  runCitations,
  onUpdate,
  onRemove,
  onRun,
}: {
  container: PromptContainer;
  index: number;
  runCitations: boolean;
  onUpdate: (id: string, patch: Partial<PromptContainer>) => void;
  onRemove: (id: string) => void;
  onRun: (id: string) => void;
}) {
  const { id, prompt, status, responses, citations, error, activeProvider, activeTab, activeCitProvider } = container;

  const hasCitations = citations.length > 0;

  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  const statusColor = isRunning ? "#ffb830" : isDone ? "#00e87a" : isError ? "#ff5a5a" : "#4b5563";
  const statusLabel = isRunning ? "Running…" : isDone ? "Done" : isError ? "Error" : "Idle";

  return (
    <div
      style={{
        background: "#111219",
        border: `1px solid ${isRunning ? "rgba(255,184,48,0.25)" : isDone ? "rgba(0,232,122,0.18)" : isError ? "rgba(255,90,90,0.18)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.3s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Card top bar */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 10, fontFamily: "monospace", fontWeight: 700,
          padding: "2px 8px", borderRadius: 6,
          color: "#00e5ff", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)",
        }}>
          #{index + 1}
        </span>

        {/* Status dot */}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: statusColor }}>
          {isRunning ? (
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              display: "inline-block",
              animation: "pulse 1s ease-in-out infinite",
            }} />
          ) : (
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
            }} />
          )}
          {statusLabel}
        </span>

        <div style={{ flex: 1 }} />

        {/* Run button */}
        <button
          onClick={() => onRun(id)}
          disabled={isRunning || !prompt.trim()}
          style={{
            padding: "4px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: isRunning ? "rgba(255,184,48,0.15)" : "linear-gradient(135deg, #00e5ff, #4285f4)",
            color: isRunning ? "#ffb830" : "#000",
            border: isRunning ? "1px solid rgba(255,184,48,0.3)" : "none",
            cursor: isRunning || !prompt.trim() ? "not-allowed" : "pointer",
            opacity: !prompt.trim() ? 0.4 : 1,
            transition: "all 0.2s",
          }}
        >
          {isRunning ? "Running…" : isDone ? "↻ Re-run" : "▶ Run"}
        </button>

        {/* Remove button */}
        <button
          onClick={() => onRemove(id)}
          style={{
            width: 26, height: 26, borderRadius: 7, fontSize: 13, fontWeight: 700,
            background: "transparent", color: "#4b5563",
            border: "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Prompt textarea */}
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <textarea
          value={prompt}
          onChange={(e) => onUpdate(id, { prompt: e.target.value })}
          rows={3}
          disabled={isRunning}
          placeholder="Enter your prompt here…"
          style={{
            width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "8px 12px", fontSize: 12, fontFamily: "monospace",
            color: "#e0e0ea", resize: "vertical", outline: "none",
            caretColor: "#00e5ff", lineHeight: 1.5,
            opacity: isRunning ? 0.6 : 1,
          }}
        />
      </div>

      {/* Results area */}
      {(status !== "idle") && (
        <div style={{ flex: 1, padding: "10px 14px 12px" }}>

          {/* Error state */}
          {isError && error && (
            <div style={{
              background: "rgba(255,90,90,0.06)", border: "1px solid rgba(255,90,90,0.2)",
              borderRadius: 10, padding: "10px 14px",
            }}>
              <p style={{ color: "#ff5a5a", fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>✗ Failed</p>
              <p style={{ color: "#8b8d9e", fontSize: 11, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Loading spinner */}
          {isRunning && responses.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid rgba(0,229,255,0.15)",
                borderTopColor: "#00e5ff",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{ color: "#8b8d9e", fontSize: 12 }}>Querying providers…</span>
            </div>
          )}

          {/* Tab toggle (only when done and has citations) */}
          {isDone && hasCitations && (
            <div style={{
              display: "flex", gap: 4, marginBottom: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, padding: 3, width: "fit-content",
            }}>
              {(["responses", "citations"] as const).map((t) => (
                <button key={t}
                  onClick={() => onUpdate(id, { activeTab: t })}
                  style={{
                    padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                    background: activeTab === t ? "rgba(0,229,255,0.12)" : "transparent",
                    color: activeTab === t ? "#00e5ff" : "#6f7280",
                    border: activeTab === t ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {t === "responses" ? `Responses (${responses.length})` : `Citations (${citations.length})`}
                </button>
              ))}
            </div>
          )}

          {/* Provider responses — accordion/dropdown style */}
          {responses.length > 0 && activeTab === "responses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...responses].sort((a, b) => providerSortRank(a.provider) - providerSortRank(b.provider)).map((r) => {
                const pCfg = PROVIDER_CONFIG[r.provider] ?? DEFAULT_PROVIDER_CFG;
                const isOpen = activeProvider === r.provider;
                return (
                  <div
                    key={r.provider}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isOpen ? pCfg.border : "rgba(255,255,255,0.07)"}`,
                      background: isOpen ? pCfg.bg : "rgba(0,0,0,0.15)",
                      overflow: "hidden",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    {/* Accordion header */}
                    <button
                      onClick={() => onUpdate(id, { activeProvider: isOpen ? "" : r.provider })}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{
                        fontSize: 13, color: isOpen ? pCfg.color : "#6f7280",
                        flexShrink: 0, transition: "color 0.15s",
                      }}>
                        {pCfg.icon}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, flex: 1,
                        color: isOpen ? pCfg.color : "#9ca3af",
                        transition: "color 0.15s",
                      }}>
                        {r.provider}
                      </span>
                      {r.error ? (
                        <span style={{ fontSize: 9, color: "#ff5a5a", fontFamily: "monospace" }}>✗ failed</span>
                      ) : r.durationMs ? (
                        <span style={{ fontSize: 9, color: "#4b5563", fontFamily: "monospace" }}>
                          {(r.durationMs / 1000).toFixed(1)}s
                        </span>
                      ) : null}
                      <span style={{
                        fontSize: 10, color: isOpen ? pCfg.color : "#4b5563",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                        marginLeft: 2,
                      }}>
                        ▾
                      </span>
                    </button>

                    {/* Accordion body */}
                    {isOpen && (
                      <div style={{ padding: "0 12px 10px" }}>
                        {r.error ? (
                          <div style={{
                            background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.18)",
                            borderRadius: 8, padding: "8px 12px",
                          }}>
                            <p style={{ color: "#ff5a5a", fontSize: 11, margin: 0 }}>✗ {r.error}</p>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 5 }}>
                              <button
                                onClick={() => navigator.clipboard.writeText(r.response)}
                                style={{
                                  fontSize: 9, fontFamily: "monospace", padding: "2px 8px", borderRadius: 5,
                                  color: pCfg.color, background: "rgba(0,0,0,0.3)", border: `1px solid ${pCfg.border}`,
                                  cursor: "pointer",
                                }}
                              >Copy</button>
                            </div>
                            <div style={{
                              background: "rgba(0,0,0,0.22)", border: `1px solid ${pCfg.border}`,
                              borderRadius: 10, padding: "10px 12px", maxHeight: 260, overflowY: "auto",
                            }}>
                              {renderMarkdown(r.response)}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Citations tab — accordion style */}
          {citations.length > 0 && activeTab === "citations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...citations].sort((a, b) => providerSortRank(a.provider) - providerSortRank(b.provider)).map((c) => {
                const pCfg = PROVIDER_CONFIG[c.provider] ?? DEFAULT_PROVIDER_CFG;
                const isOpen = activeCitProvider === c.provider;
                return (
                  <div
                    key={c.provider}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isOpen ? pCfg.border : "rgba(255,255,255,0.07)"}`,
                      background: isOpen ? pCfg.bg : "rgba(0,0,0,0.15)",
                      overflow: "hidden",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    {/* Accordion header */}
                    <button
                      onClick={() => onUpdate(id, { activeCitProvider: isOpen ? "" : c.provider })}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 13, color: isOpen ? pCfg.color : "#6f7280", flexShrink: 0 }}>
                        {pCfg.icon}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, flex: 1, color: isOpen ? pCfg.color : "#9ca3af" }}>
                        {c.provider}
                      </span>
                      {c.status === "success" && (
                        <span style={{
                          fontSize: 9, fontFamily: "monospace",
                          color: dotColor(c.count),
                          background: `${dotColor(c.count)}18`,
                          border: `1px solid ${dotColor(c.count)}44`,
                          padding: "1px 6px", borderRadius: 4,
                        }}>
                          {c.count} URL{c.count !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, color: isOpen ? pCfg.color : "#4b5563",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s", marginLeft: 2,
                      }}>▾</span>
                    </button>

                    {/* Accordion body */}
                    {isOpen && (
                      <div style={{ padding: "0 12px 10px" }}>
                        {/* Citation query */}
                        <div style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 9, fontFamily: "monospace", color: "#4b5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                            Citation query
                          </p>
                          <div style={{
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#e0e0ea",
                          }}>
                            {c.query}
                          </div>
                        </div>

                        {/* Raw answer */}
                        <div style={{
                          background: "rgba(0,0,0,0.22)", border: `1px solid ${pCfg.border}`,
                          borderRadius: 10, padding: "10px 12px", maxHeight: 220, overflowY: "auto", marginBottom: 8,
                        }}>
                          {renderMarkdown(c.rawAnswer)}
                        </div>

                        {/* Citation URLs */}
                        {c.allCitationUrls.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {c.allCitationUrls.slice(0, 6).map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer"
                                style={{
                                  display: "block", padding: "4px 10px", borderRadius: 6, fontSize: 10,
                                  fontFamily: "monospace", color: pCfg.color, background: "rgba(0,0,0,0.2)",
                                  border: `1px solid ${pCfg.border}`, textDecoration: "none",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}
                              >
                                {i + 1}. {url}
                              </a>
                            ))}
                            {c.allCitationUrls.length > 6 && (
                              <span style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace", paddingLeft: 4 }}>
                                +{c.allCitationUrls.length - 6} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Idle placeholder */}
      {status === "idle" && (
        <div style={{ padding: "10px 14px 14px" }}>
          <p style={{ fontSize: 11, color: "#4b5563", margin: 0, fontFamily: "monospace" }}>
            ↑ Enter a prompt and click Run
          </p>
        </div>
      )}
    </div>
  );
}

// ── ID generator ──────────────────────────────────────────────────────────
let _id = 0;
function genId() { return `p_${++_id}_${Math.random().toString(36).slice(2, 6)}`; }
function genBatchId() { return `bulk_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function makeContainer(prompt = ""): PromptContainer {
  return {
    id: genId(),
    prompt,
    status: "idle",
    responses: [],
    citations: [],
    topic: "",
    error: null,
    activeProvider: "",
    activeTab: "responses",
    activeCitProvider: "",
  };
}

// ── PDF Export ────────────────────────────────────────────────────────────
async function exportToPdf(containers: PromptContainer[]) {
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = (window as any).jspdf;
  const doc: any = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210, PH = 297, ML = 15, MR = 15, TW = PW - ML - MR, LH = 5;
  let y = 15;

  const writeLine = (text: string, size = 9, bold = false) => {
    doc.setFontSize(size); doc.setFont("courier", bold ? "bold" : "normal"); doc.setTextColor(20, 20, 20);
    const wrapped: string[] = doc.splitTextToSize(text, TW);
    wrapped.forEach((line: string) => {
      if (y + LH > PH - 12) { doc.addPage(); y = 15; }
      doc.text(line, ML, y); y += LH;
    });
  };
  const blank = () => { y += LH; };

  writeLine("AISCOPE — MULTI-PROMPT REPORT", 11, true);
  writeLine(`Generated : ${new Date().toLocaleString()}`);
  writeLine(`Prompts run: ${containers.filter(c => c.status === "done").length} / ${containers.length}`);
  writeLine("=".repeat(76));

  containers.filter(c => c.status === "done").forEach((c, i) => {
    blank();
    writeLine(`[Prompt #${i + 1}]  ${c.prompt.slice(0, 80)}`, 9, true);
    writeLine("-".repeat(76));
    c.responses.forEach(r => {
      writeLine(`  ${r.provider}  ${r.durationMs ? `(${(r.durationMs / 1000).toFixed(1)}s)` : ""}`);
      writeLine(r.response || "(no response)");
      blank();
    });
    writeLine("=".repeat(76));
  });

  writeLine("Generated by AiScope · aiscope.io");
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setFont("courier", "normal"); doc.setTextColor(130, 130, 130);
    doc.text(`Page ${p} of ${total}`, PW - MR, PH - 6, { align: "right" });
  }
  doc.save(`aiscope-multi-prompt-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── CSV Export ───────────────────────────────────────────────────────────
function exportToCsv(containers: PromptContainer[]) {
  const escape = (v?: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    "PromptIndex",
    "Prompt",
    "Status",
    "Topic",
    "Provider",
    "Response",
    "DurationMs",
    "ResponseError",
    "CitationProvider",
    "CitationCount",
    "CitationURLs",
    "CitationError",
    "AllResponses",
  ];

  const rows: string[] = [];

  containers.forEach((c, i) => {
    const allResponses = (c.responses ?? []).map(r => `${r.provider}: ${r.response ?? ""}`).join(" ||| ");
    // For each response, pair with citation of same provider if available
    if (c.responses.length > 0) {
      c.responses.forEach((r) => {
        const cit = c.citations.find((x) => x.provider === r.provider);
        rows.push([
          i + 1,
          c.prompt,
          c.status,
          c.topic ?? "",
          r.provider,
          r.response ?? "",
          r.durationMs ?? "",
          r.error ?? "",
          cit?.provider ?? "",
          cit?.count ?? 0,
          (cit?.allCitationUrls ?? []).join(" | "),
          cit?.error ?? "",
          allResponses,
        ].map(escape).join(","));
      });
    } else if (c.citations.length > 0) {
      // No responses but citations exist — emit citation rows
      c.citations.forEach((cit) => {
        rows.push([
          i + 1,
          c.prompt,
          c.status,
          c.topic ?? "",
          "",
          "",
          "",
          "",
          cit.provider,
          cit.count,
          (cit.allCitationUrls ?? []).join(" | "),
          cit.error ?? "",
          allResponses,
        ].map(escape).join(","));
      });
    } else {
      // Empty result row
      rows.push([
        i + 1,
        c.prompt,
        c.status,
        c.topic ?? "",
        "",
        "",
        "",
        "",
        "",
        0,
        "",
        "",
        allResponses,
      ].map(escape).join(","));
    }
  });

  const csv = `${headers.join(",")}\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aiscope-multi-prompt-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// ── Main page ─────────────────────────────────────────────────────────────
export default function MultiPromptPage() {
  const [containers, setContainers] = useState<PromptContainer[]>([
    makeContainer(PROMPT_PRESETS[0]),
    makeContainer(PROMPT_PRESETS[1]),
  ]);
  const [runCitations, setRunCitations] = useState(true);
  const [globalRunning, setGlobalRunning] = useState(false);
  const [addCount, setAddCount] = useState(1);
  const runningRef = useRef<Set<string>>(new Set());
  const batchIdRef = useRef<string>(genBatchId());

  const updateContainer = useCallback((id: string, patch: Partial<PromptContainer>) => {
    setContainers(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const removeContainer = useCallback((id: string) => {
    setContainers(prev => prev.filter(c => c.id !== id));
  }, []);

  const addContainers = useCallback((count: number) => {
    const news = Array.from({ length: count }, () => makeContainer());
    setContainers(prev => [...prev, ...news]);
  }, []);

  const startNewBatch = useCallback(() => {
    batchIdRef.current = genBatchId();
    return batchIdRef.current;
  }, []);

  const runSingle = useCallback(async (id: string) => {
    if (runningRef.current.has(id)) return;
    const batchId = batchIdRef.current || startNewBatch();
    const executionId = genId();

    setContainers(prev => {
      const c = prev.find(x => x.id === id);
      if (!c || !c.prompt.trim()) return prev;
      return prev.map(x => x.id === id
        ? { ...x, status: "running", responses: [], citations: [], error: null }
        : x
      );
    });

    runningRef.current.add(id);

    // Get the prompt at call time
    const c = containers.find(x => x.id === id);
    if (!c || !c.prompt.trim()) { runningRef.current.delete(id); return; }

    try {
      const res = await fetch("/api/prompt-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: c.prompt,
          runCitations,
          batchId,
          promptId: id,
          executionId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

      const firstProvider = data.responses?.[0]?.provider ?? "";
      const firstCitProvider = data.citations?.[0]?.provider ?? "";

      setContainers(prev => prev.map(x => x.id === id ? {
        ...x,
        status: "done",
        responses: data.responses ?? [],
        citations: data.citations ?? [],
        topic: data.topic ?? c.prompt.slice(0, 80),
        activeProvider: firstProvider,
        activeCitProvider: firstCitProvider,
        activeTab: "responses",
        error: null,
      } : x));
    } catch (e) {
      setContainers(prev => prev.map(x => x.id === id ? {
        ...x,
        status: "error",
        error: String(e),
      } : x));
    } finally {
      runningRef.current.delete(id);
    }
  }, [containers, runCitations]);

  // Run all in parallel
  const runAll = useCallback(async () => {
    startNewBatch();
    setGlobalRunning(true);
    const toRun = containers.filter(c => c.prompt.trim() && c.status !== "running");
    await Promise.all(toRun.map(c => runSingle(c.id)));
    setGlobalRunning(false);
  }, [containers, runSingle, startNewBatch]);

  const clearAll = useCallback(() => {
    startNewBatch();
    setContainers([makeContainer(), makeContainer()]);
  }, [startNewBatch]);

  const doneCount = containers.filter(c => c.status === "done").length;
  const runningCount = containers.filter(c => c.status === "running").length;
  const totalWithPrompt = containers.filter(c => c.prompt.trim()).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b10", color: "#f0f0f5" }}>
      <div className="md:pl-64">
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "60px 20px 80px" }}
          className="md:!px-8 md:!pt-8"
        >

          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                padding: "3px 10px", borderRadius: 20,
                color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
                letterSpacing: 2,
              }}>
                MULTI-PROMPT
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
                Bulk Prompt Runner
              </h1>
            </div>
            <p style={{ fontSize: 13, color: "#8b8d9e", margin: 0 }}>
              Add up to 100 independent prompts · run all in parallel · each gets its own AI response
            </p>
          </div>

          {/* Global controls bar */}
          <div style={{
            background: "#111219", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "12px 14px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>

            {/* Run all */}
            <button
              onClick={runAll}
              disabled={globalRunning || totalWithPrompt === 0}
              style={{
                padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: globalRunning ? "rgba(255,184,48,0.15)" : "linear-gradient(135deg, #00e5ff, #4285f4)",
                color: globalRunning ? "#ffb830" : "#000",
                border: globalRunning ? "1px solid rgba(255,184,48,0.3)" : "none",
                cursor: globalRunning || totalWithPrompt === 0 ? "not-allowed" : "pointer",
                opacity: totalWithPrompt === 0 ? 0.4 : 1,
              }}
            >
              {globalRunning
                ? `⟳ Running ${runningCount}/${totalWithPrompt}…`
                : `⚡ Run All (${totalWithPrompt})`}
            </button>

            {/* Citations toggle */}
            <button
              onClick={() => setRunCitations(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: runCitations ? "rgba(0,229,255,0.1)" : "transparent",
                color: runCitations ? "#00e5ff" : "#8b8d9e",
                border: `1px solid ${runCitations ? "rgba(0,229,255,0.35)" : "rgba(255,255,255,0.1)"}`,
                cursor: "pointer",
              }}
            >
              {runCitations ? "✓" : "○"} Citations
              <span style={{
                fontSize: 9, fontFamily: "monospace", padding: "1px 5px", borderRadius: 4,
                background: runCitations ? "rgba(0,229,255,0.12)" : "rgba(255,184,48,0.15)",
                color: runCitations ? "#00e5ff" : "#ffb830",
              }}>
                {runCitations ? "ON" : "OFF"}
              </span>
            </button>

            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />

            {/* Add N containers */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#6f7280", fontFamily: "monospace" }}>Add</span>
              <input
                type="number" min={1} max={100} value={addCount}
                onChange={e => setAddCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                style={{
                  width: 52, background: "#0e0f17", border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 7, padding: "4px 8px", fontSize: 12, fontFamily: "monospace",
                  color: "#e0e0ea", outline: "none", textAlign: "center",
                }}
              />
              <button
                onClick={() => addContainers(addCount)}
                disabled={containers.length >= 100}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: "rgba(0,229,255,0.08)", color: "#00e5ff",
                  border: "1px solid rgba(0,229,255,0.2)", cursor: "pointer",
                  opacity: containers.length >= 100 ? 0.4 : 1,
                }}
              >
                + Add Prompt{addCount > 1 ? "s" : ""}
              </button>
            </div>

            {/* Quick presets */}
            <button
              onClick={() => setContainers(PROMPT_PRESETS.map(p => makeContainer(p)))}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11,
                background: "transparent", color: "#6f7280",
                border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
              }}
            >
              Load Presets
            </button>

            <div style={{ flex: 1 }} />

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "monospace" }}>
              <span style={{ color: "#4b5563" }}>{containers.length} prompts</span>
              {runningCount > 0 && <span style={{ color: "#ffb830" }}>⟳ {runningCount} running</span>}
              {doneCount > 0 && <span style={{ color: "#00e87a" }}>✓ {doneCount} done</span>}
            </div>

            {/* Export PDF / CSV */}
            {doneCount > 0 && (
              <>
                <button
                  onClick={() => exportToPdf(containers)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "#00e5ff", color: "#000", border: "none", cursor: "pointer",
                  }}
                >
                  ↓ Export PDF
                </button>

                <button
                  onClick={() => exportToCsv(containers)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "#00e87a", color: "#000", border: "none", cursor: "pointer", marginLeft: 8,
                  }}
                >
                  ↓ Export CSV
                </button>
              </>
            )}

            {/* Clear all */}
            {containers.length > 0 && (
              <button
                onClick={clearAll}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11,
                  background: "transparent", color: "#6f7280",
                  border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Progress bar (global) */}
          {globalRunning && (
            <div style={{
              borderRadius: 8, overflow: "hidden", marginBottom: 20,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              height: 4,
            }}>
              <div style={{
                height: "100%", transition: "width 0.5s",
                width: `${totalWithPrompt > 0 ? (doneCount / totalWithPrompt) * 100 : 0}%`,
                background: "linear-gradient(90deg, #00e5ff, #4285f4)",
              }} />
            </div>
          )}

          {/* Container grid */}
          {containers.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 240, borderRadius: 16, border: "1px dashed rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.015)",
            }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🔭</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>No prompts yet</p>
              <p style={{ fontSize: 12, color: "#8b8d9e", marginBottom: 16 }}>Add prompt containers to get started</p>
              <button
                onClick={() => addContainers(2)}
                style={{
                  padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: "linear-gradient(135deg, #00e5ff, #4285f4)", color: "#000",
                  border: "none", cursor: "pointer",
                }}
              >
                + Add 2 Prompts
              </button>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))",
              gap: 14,
            }}>
              {containers.map((c, i) => (
                <PromptCard
                  key={c.id}
                  container={c}
                  index={i}
                  runCitations={runCitations}
                  onUpdate={updateContainer}
                  onRemove={removeContainer}
                  onRun={runSingle}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}