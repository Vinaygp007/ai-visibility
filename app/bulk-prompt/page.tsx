"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PROMPT_CHAR_LIMIT } from "@/lib/limits";
import { UserPlan } from "@/types";
import { GeminiIcon, ChatGPTIcon, PerplexityIcon } from "@/components/ProviderIcons";

const PROVIDERS = [
  { name: "Gemini 2.0", Icon: GeminiIcon, color: "#4285f4" },
  { name: "ChatGPT", Icon: ChatGPTIcon, color: "#10a37f" },
  { name: "Perplexity", Icon: PerplexityIcon, color: "#20b2aa" },
];

const FEATURE_CHIPS = ["Up to 100 prompts", "Runs in parallel", "AI citation research", "CSV & PDF export"];

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
  url: string;
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

const DEFAULT_PROVIDER_CFG = { color: "var(--text-muted)", bg: "rgba(var(--overlay-rgb),0.05)", border: "rgba(var(--overlay-rgb),0.12)", icon: "◎" };

const PROMPT_PRESETS = [
  "Best 5 CRM platforms for startups: rank them with pros, cons, and pricing URL.",
  "Top 5 AI writing tools in 2025: who are they best for? Include website URLs.",
  "Best project management software for remote teams: compare features and pricing.",
  "Top 5 email marketing platforms: rank by deliverability, ease of use, and cost.",
];

// ── Markdown renderer ─────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^(\d+)\. (.+)/);
    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bold = (t: string) =>
      escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>');

    if (h2) return <h2 key={i} style={{ color: "var(--text)", fontSize: 13, fontWeight: 700, margin: "10px 0 4px" }} dangerouslySetInnerHTML={{ __html: bold(h2[1]) }} />;
    if (h3) return <h3 key={i} style={{ color: "var(--text)", fontSize: 12, fontWeight: 600, margin: "8px 0 2px" }} dangerouslySetInnerHTML={{ __html: bold(h3[1]) }} />;
    if (bullet) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "var(--accent)", flexShrink: 0 }}>•</span>
        <span style={{ color: "var(--text)", fontSize: 12 }} dangerouslySetInnerHTML={{ __html: bold(bullet[1]) }} />
      </div>
    );
    if (numbered) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "var(--accent)", flexShrink: 0, minWidth: 16, fontSize: 12 }}>{numbered[1]}.</span>
        <span style={{ color: "var(--text)", fontSize: 12 }} dangerouslySetInnerHTML={{ __html: bold(numbered[2]) }} />
      </div>
    );
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} style={{ color: "var(--text)", fontSize: 12, margin: "1px 0" }} dangerouslySetInnerHTML={{ __html: bold(line) }} />;
  });
}

function dotColor(count: number) {
  if (count === 0) return "var(--danger)";
  if (count < 3) return "var(--warning)";
  return "var(--success)";
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
  const { id, prompt, url, status, responses, citations, error, activeProvider, activeTab, activeCitProvider } = container;

  const hasCitations = citations.length > 0;

  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  const statusColor = isRunning ? "var(--warning)" : isDone ? "var(--success)" : isError ? "var(--danger)" : "var(--text-dim)";
  const statusLabel = isRunning ? "Running…" : isDone ? "Done" : isError ? "Error" : "Idle";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${isRunning ? "rgba(255,184,48,0.25)" : isDone ? "rgba(0,232,122,0.18)" : isError ? "rgba(255,90,90,0.18)" : "rgba(var(--overlay-rgb),0.08)"}`,
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
        borderBottom: "1px solid rgba(var(--overlay-rgb),0.06)",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 10, fontFamily: "monospace", fontWeight: 700,
          padding: "2px 8px", borderRadius: 6,
          color: "var(--accent)", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)",
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
            background: isRunning ? "rgba(255,184,48,0.15)" : "linear-gradient(135deg, var(--accent), #4285f4)",
            color: isRunning ? "var(--warning)" : "var(--on-accent)",
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
            background: "transparent", color: "var(--text-dim)",
            border: "1px solid rgba(var(--overlay-rgb),0.07)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* URL input (optional — fills any {url} placeholder in the prompt, tags the JSON export) */}
      <div style={{ padding: "10px 14px 0" }}>
        <input
          type="text"
          value={url}
          onChange={(e) => onUpdate(id, { url: e.target.value })}
          disabled={isRunning}
          placeholder="URL (optional), e.g. https://example.com"
          style={{
            width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(var(--overlay-rgb),0.07)",
            borderRadius: 8, padding: "6px 12px", fontSize: 11, fontFamily: "monospace",
            color: "var(--text)", outline: "none",
            caretColor: "var(--accent)",
            opacity: isRunning ? 0.6 : 1,
          }}
        />
      </div>

      {/* Prompt textarea */}
      <div style={{ padding: "8px 14px 8px", borderBottom: "1px solid rgba(var(--overlay-rgb),0.05)" }}>
        <textarea
          value={prompt}
          onChange={(e) => onUpdate(id, { prompt: e.target.value.slice(0, PROMPT_CHAR_LIMIT) })}
          maxLength={PROMPT_CHAR_LIMIT}
          rows={3}
          disabled={isRunning}
          placeholder="Enter your prompt here…"
          style={{
            width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(var(--overlay-rgb),0.07)",
            borderRadius: 10, padding: "8px 12px", fontSize: 12, fontFamily: "monospace",
            color: "var(--text)", resize: "vertical", outline: "none",
            caretColor: "var(--accent)", lineHeight: 1.5,
            opacity: isRunning ? 0.6 : 1,
          }}
        />
        <div style={{
          textAlign: "right", fontSize: 10, fontFamily: "monospace", marginTop: 3,
          color: prompt.length >= PROMPT_CHAR_LIMIT ? "var(--danger)" : "rgba(var(--overlay-rgb),0.3)",
        }}>
          {prompt.length} / {PROMPT_CHAR_LIMIT}
        </div>
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
              <p style={{ color: "var(--danger)", fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>✗ Failed</p>
              <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Loading spinner */}
          {isRunning && responses.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid rgba(0,229,255,0.15)",
                borderTopColor: "var(--accent)",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Querying providers…</span>
            </div>
          )}

          {/* Tab toggle (only when done and has citations) */}
          {isDone && hasCitations && (
            <div style={{
              display: "flex", gap: 4, marginBottom: 10,
              background: "rgba(var(--overlay-rgb),0.03)", border: "1px solid rgba(var(--overlay-rgb),0.07)",
              borderRadius: 8, padding: 3, width: "fit-content",
            }}>
              {(["responses", "citations"] as const).map((t) => (
                <button key={t}
                  onClick={() => onUpdate(id, { activeTab: t })}
                  style={{
                    padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                    background: activeTab === t ? "rgba(0,229,255,0.12)" : "transparent",
                    color: activeTab === t ? "var(--accent)" : "var(--text-dim)",
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
                      border: `1px solid ${isOpen ? pCfg.border : "rgba(var(--overlay-rgb),0.07)"}`,
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
                        fontSize: 13, color: isOpen ? pCfg.color : "var(--text-dim)",
                        flexShrink: 0, transition: "color 0.15s",
                      }}>
                        {pCfg.icon}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, flex: 1,
                        color: isOpen ? pCfg.color : "var(--text-dim)",
                        transition: "color 0.15s",
                      }}>
                        {r.provider}
                      </span>
                      {r.error ? (
                        <span style={{ fontSize: 9, color: "var(--danger)", fontFamily: "monospace" }}>✗ failed</span>
                      ) : r.durationMs ? (
                        <span style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "monospace" }}>
                          {(r.durationMs / 1000).toFixed(1)}s
                        </span>
                      ) : null}
                      <span style={{
                        fontSize: 10, color: isOpen ? pCfg.color : "var(--text-dim)",
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
                            <p style={{ color: "var(--danger)", fontSize: 11, margin: 0 }}>✗ {r.error}</p>
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
                      border: `1px solid ${isOpen ? pCfg.border : "rgba(var(--overlay-rgb),0.07)"}`,
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
                      <span style={{ fontSize: 13, color: isOpen ? pCfg.color : "var(--text-dim)", flexShrink: 0 }}>
                        {pCfg.icon}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, flex: 1, color: isOpen ? pCfg.color : "var(--text-dim)" }}>
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
                        fontSize: 10, color: isOpen ? pCfg.color : "var(--text-dim)",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s", marginLeft: 2,
                      }}>▾</span>
                    </button>

                    {/* Accordion body */}
                    {isOpen && (
                      <div style={{ padding: "0 12px 10px" }}>
                        {/* Citation query */}
                        <div style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                            Citation query
                          </p>
                          <div style={{
                            background: "rgba(var(--overlay-rgb),0.03)", border: "1px solid rgba(var(--overlay-rgb),0.07)",
                            borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "var(--text)",
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
                              <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace", paddingLeft: 4 }}>
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
          <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, fontFamily: "monospace" }}>
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// /api/prompt-run 429s when a user's request rate crosses its bucket limit. Without
// this, a worker in the concurrency pool (see runWithConcurrency) just treats a 429
// as a normal failure and immediately grabs the next queued item — since 429s come
// back in ~1-2s (a DB check) vs. ~15s for a real provider round trip, that turns one
// rate-limit hit into a rapid-fire loop that burns through the rest of the queue as
// failures instead of actually slowing down. Backing off and retrying in place keeps
// the worker's concurrency slot occupied so the pool self-throttles instead.
const RATE_LIMIT_MAX_RETRIES = 5;
async function fetchPromptRun(body: unknown): Promise<{ res: Response; data: any }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("/api/prompt-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
      await sleep(2000 * (attempt + 1)); // 2s, 4s, 6s, 8s, 10s
      continue;
    }
    return { res, data };
  }
}

// Runs `worker` over `items` with at most `limit` in flight at once. Firing all N
// prompts via Promise.all floods every provider at once (each prompt already makes
// ~3-4 provider calls); a small worker pool keeps real concurrent API load bounded.
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const poolSize = Math.max(1, Math.min(limit, queue.length));
  const workers = Array.from({ length: poolSize }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function makeContainer(prompt = ""): PromptContainer {
  return {
    id: genId(),
    prompt,
    url: "",
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

// Parses a [{ url, prompt }, ...] JSON blob (from a file or pasted text) into prompt
// cards. Entries with an empty/missing prompt are dropped — they can't be run anyway.
function parseImportJson(jsonText: string): PromptContainer[] {
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of { url, prompt } objects");

  return parsed
    .filter((item) => typeof item?.prompt === "string" && item.prompt.trim())
    .map((item) => {
      const c = makeContainer(item.prompt);
      c.url = typeof item?.url === "string" ? item.url : "";
      return c;
    });
}

// ── PDF Export ────────────────────────────────────────────────────────────
// Branding follows the pricing page tiers: Free carries a watermark on top
// of the branded footer, Starter/Growth keep the branded footer only, and
// Agency/Scale are white-label (no AiScope branding).
async function exportToPdf(containers: PromptContainer[], plan: UserPlan) {
  const isWhiteLabel = plan === "agency" || plan === "scale";
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

  writeLine(isWhiteLabel ? "MULTI-PROMPT REPORT" : "AISCOPE: MULTI-PROMPT REPORT", 11, true);
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

  if (!isWhiteLabel) writeLine("Generated by AiScope · aiscope.io");
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    if (plan === "free") {
      doc.setFontSize(58); doc.setFont("helvetica", "bold"); doc.setTextColor(235, 235, 235);
      doc.text("AISCOPE", PW / 2, PH / 2, { align: "center", angle: 45 });
    }

    doc.setFontSize(7); doc.setFont("courier", "normal"); doc.setTextColor(130, 130, 130);
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

// Citation text lists one entry (name + reason) per URL, in order. Slicing the
// text between consecutive URLs recovers just the reason for each specific URL,
// instead of repeating the whole multi-entry block on every record.
function extractCitationSnippets(rawAnswer: string): { url: string; snippet: string }[] {
  const urlRegex = /https?:\/\/[^\s\)\"\]]+/g;
  const matches = [...rawAnswer.matchAll(urlRegex)];
  if (matches.length === 0) return [];

  const results: { url: string; snippet: string }[] = [];
  let cursor = 0;
  matches.forEach((m) => {
    const idx = m.index ?? 0;
    const url = m[0].replace(/[.,;]+$/, "");
    const chunk = rawAnswer.slice(cursor, idx).trim();
    // Drop any leading intro paragraph (only relevant for the first entry)
    const snippet = chunk.split(/\n{2,}/).pop()?.trim() || chunk;
    results.push({ url, snippet });
    cursor = idx + m[0].length;
  });
  return results;
}

// Turns a raw snippet like "1. **Gartner**\n   - Reason: ...\n   - Sentiment: ...\n   - URL:"
// into a structured { name, reason, sentiment } object instead of a leftover markdown string.
function parseCitationSnippet(snippet: string): { name: string; reason: string; sentiment: string } {
  let text = snippet.replace(/[-•]?\s*URL:\s*$/i, "").trim();

  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  let name = "";
  if (boldMatch) {
    name = boldMatch[1].replace(/^\d+\.\s*/, "").trim();
    text = text.slice(boldMatch.index! + boldMatch[0].length);

    // Some providers bold a generic label ("Source:", "Name:") instead of the
    // actual entity, e.g. "**Source:** Genetec\n- Reason: ...", leaving the
    // real name as plain text right after it. Recover it from there instead
    // of keeping the label — otherwise "Genetec" never gets extracted and
    // leaks into `reason` as "Genetec - Reason: ...".
    if (/^(source|name|brand)s?:?$/i.test(name)) {
      const leadMatch = text.match(/^\s*[:\-]?\s*([^\n-]+)/);
      if (leadMatch) {
        name = leadMatch[1].trim();
        text = text.slice(leadMatch[0].length);
      }
    }
  }

  // Pull out a labelled "Sentiment: ..." segment, wherever it falls in the text
  let sentiment = "";
  const sentimentMatch = text.match(/[-—•]?\s*Sentiment:\s*([^\n]+)/i);
  if (sentimentMatch) {
    sentiment = sentimentMatch[1].replace(/\*\*/g, "").trim();
    text = text.slice(0, sentimentMatch.index!) + text.slice(sentimentMatch.index! + sentimentMatch[0].length);
  }

  const reason = text
    .replace(/^\s*[-—•]\s*/, "")
    .replace(/^\s*Reason:\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { name, reason: reason || text.trim(), sentiment };
}

// ── Shared citation record builder ────────────────────────────────────────
// Loops over every container passed in (i.e. every prompt that was run), so
// running N prompts and exporting/sharing once always covers all of them.
// Containers with an empty prompt never reach "done", so they're naturally skipped.
interface CitationRecord {
  prompt: string;
  inputUrl: string;
  citationUrl: string;
  provider: string;
  response: { name: string; reason: string; sentiment: string };
}

function buildCitationRecords(containers: PromptContainer[]): CitationRecord[] {
  const records: CitationRecord[] = [];

  containers
    .filter(c => c.status === "done" && c.prompt.trim())
    .forEach(c => {
      c.citations
        .filter(cit => cit.status === "success" && cit.rawAnswer)
        .forEach(cit => {
          // Cap at top 5 even if a provider ignores the "top 5" instruction in the prompt
          const snippets = extractCitationSnippets(cit.rawAnswer).slice(0, 5);
          if (snippets.length > 0) {
            snippets.forEach(({ url, snippet }) => {
              records.push({ prompt: c.prompt, inputUrl: c.url, citationUrl: url, provider: cit.provider, response: parseCitationSnippet(snippet) });
            });
          } else {
            records.push({ prompt: c.prompt, inputUrl: c.url, citationUrl: "", provider: cit.provider, response: { name: "", reason: cit.rawAnswer, sentiment: "" } });
          }
        });
    });

  return records;
}

// ── JSON Export ──────────────────────────────────────────────────────────
function exportToJson(containers: PromptContainer[]) {
  const records = buildCitationRecords(containers);

  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aiscope-multi-prompt-${new Date().toISOString().slice(0, 10)}.json`;
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
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const runningRef = useRef<Set<string>>(new Set());
  const batchIdRef = useRef<string>(genBatchId());
  const importInputRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<UserPlan>("free");

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.plan) setPlan(data.plan); })
      .catch(() => {});
  }, []);

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
      const { res, data } = await fetchPromptRun({
        prompt: c.prompt,
        url: c.url,
        runCitations,
        batchId,
        promptId: id,
        executionId,
      });
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

      const firstProvider = data.responses?.[0]?.provider ?? "";
      const firstCitProvider = data.citations?.[0]?.provider ?? "";

      setContainers(prev => prev.map(x => x.id === id ? {
        ...x,
        status: "done",
        responses: data.responses ?? [],
        citations: data.citations ?? [],
        url: data.url ?? x.url,
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

  // Run all, throttled to a small pool — see runWithConcurrency for why
  const RUN_ALL_CONCURRENCY = 5;
  const runAll = useCallback(async () => {
    startNewBatch();
    setGlobalRunning(true);
    const toRun = containers.filter(c => c.prompt.trim() && c.status !== "running");
    await runWithConcurrency(toRun, RUN_ALL_CONCURRENCY, (c) => runSingle(c.id));
    setGlobalRunning(false);
  }, [containers, runSingle, startNewBatch]);

  const clearAll = useCallback(() => {
    startNewBatch();
    setContainers([makeContainer(), makeContainer()]);
  }, [startNewBatch]);

  // Bulk-import a [{ url, prompt }, ...] JSON file — one prompt card per entry, appended to the list
  const importFromJsonFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setContainers(prev => [...prev, ...parseImportJson(String(reader.result))]);
      } catch (e) {
        window.alert(`Couldn't import JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    reader.readAsText(file);
  }, []);

  // Same import, but from JSON pasted directly into the textarea below (no file needed)
  const importFromJsonText = useCallback((text: string) => {
    try {
      const imported = parseImportJson(text);
      setContainers(prev => [...prev, ...imported]);
      setPasteModalOpen(false);
      setPasteText("");
    } catch (e) {
      window.alert(`Couldn't import JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const doneCount = containers.filter(c => c.status === "done").length;
  const runningCount = containers.filter(c => c.status === "running").length;
  const totalWithPrompt = containers.filter(c => c.prompt.trim()).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 20px 80px" }}
          className="md:!px-8"
        >

          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                padding: "3px 10px", borderRadius: 20,
                color: "var(--accent)", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
                letterSpacing: 2,
              }}>
                MULTI-PROMPT
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
                Bulk Prompt Runner
              </h1>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Add up to 100 independent prompts · run all in parallel · each gets its own AI response
            </p>

            <div style={{
              background: "var(--surface)", border: "1px solid rgba(var(--overlay-rgb),0.08)",
              borderRadius: 14, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>POWERED BY</span>
                {PROVIDERS.map((p) => (
                  <span
                    key={p.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 13, fontWeight: 500, padding: "6px 12px", borderRadius: 12,
                      color: p.color, background: `${p.color}12`, border: `1px solid ${p.color}35`,
                    }}
                  >
                    <p.Icon size={14} />{p.name}
                  </span>
                ))}
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(var(--overlay-rgb),0.08)" }} />

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {FEATURE_CHIPS.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: "var(--success)" }} />
                    {feat}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Global controls bar */}
          <div style={{
            background: "var(--surface)", border: "1px solid rgba(var(--overlay-rgb),0.08)",
            borderRadius: 14, padding: "12px 14px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>

            {/* Run all */}
            <button
              onClick={runAll}
              disabled={globalRunning || totalWithPrompt === 0}
              style={{
                padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: globalRunning ? "rgba(255,184,48,0.15)" : "linear-gradient(135deg, var(--accent), #4285f4)",
                color: globalRunning ? "var(--warning)" : "var(--on-accent)",
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
                color: runCitations ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${runCitations ? "rgba(0,229,255,0.35)" : "rgba(var(--overlay-rgb),0.1)"}`,
                cursor: "pointer",
              }}
            >
              {runCitations ? "✓" : "○"} Citations
              <span style={{
                fontSize: 9, fontFamily: "monospace", padding: "1px 5px", borderRadius: 4,
                background: runCitations ? "rgba(0,229,255,0.12)" : "rgba(255,184,48,0.15)",
                color: runCitations ? "var(--accent)" : "var(--warning)",
              }}>
                {runCitations ? "ON" : "OFF"}
              </span>
            </button>

            <div style={{ width: 1, height: 28, background: "rgba(var(--overlay-rgb),0.07)" }} />

            {/* Add N containers */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace" }}>Add</span>
              <input
                type="number" min={1} max={100} value={addCount}
                onChange={e => setAddCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                style={{
                  width: 52, background: "var(--surface)", border: "1px solid rgba(var(--overlay-rgb),0.09)",
                  borderRadius: 7, padding: "4px 8px", fontSize: 12, fontFamily: "monospace",
                  color: "var(--text)", outline: "none", textAlign: "center",
                }}
              />
              <button
                onClick={() => addContainers(addCount)}
                disabled={containers.length >= 100}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: "rgba(0,229,255,0.08)", color: "var(--accent)",
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
                background: "transparent", color: "var(--text-dim)",
                border: "1px solid rgba(var(--overlay-rgb),0.07)", cursor: "pointer",
              }}
            >
              Load Presets
            </button>

            {/* Bulk import [{url, prompt}, ...] JSON */}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importFromJsonFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11,
                background: "transparent", color: "var(--text-dim)",
                border: "1px solid rgba(var(--overlay-rgb),0.07)", cursor: "pointer",
              }}
            >
              ↑ Import JSON
            </button>

            {/* Paste JSON directly, no file needed */}
            <button
              onClick={() => setPasteModalOpen(true)}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11,
                background: "transparent", color: "var(--text-dim)",
                border: "1px solid rgba(var(--overlay-rgb),0.07)", cursor: "pointer",
              }}
            >
              📋 Paste JSON
            </button>

            <div style={{ flex: 1 }} />

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "monospace" }}>
              <span style={{ color: "var(--text-dim)" }}>{containers.length} prompts</span>
              {runningCount > 0 && <span style={{ color: "var(--warning)" }}>⟳ {runningCount} running</span>}
              {doneCount > 0 && <span style={{ color: "var(--success)" }}>✓ {doneCount} done</span>}
            </div>

            {/* Export PDF / CSV */}
            {doneCount > 0 && (
              <>
                <button
                  onClick={() => exportToPdf(containers, plan)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "var(--accent)", color: "var(--on-accent)", border: "none", cursor: "pointer",
                  }}
                >
                  ↓ Export PDF
                </button>

                <button
                  onClick={() => exportToCsv(containers)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "var(--success)", color: "var(--on-accent)", border: "none", cursor: "pointer", marginLeft: 8,
                  }}
                >
                  ↓ Export CSV
                </button>

                <button
                  onClick={() => exportToJson(containers)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "#4285f4", color: "var(--on-accent)", border: "none", cursor: "pointer", marginLeft: 8,
                  }}
                >
                  ↓ Export JSON
                </button>
              </>
            )}

            {/* Clear all */}
            {containers.length > 0 && (
              <button
                onClick={clearAll}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11,
                  background: "transparent", color: "var(--text-dim)",
                  border: "1px solid rgba(var(--overlay-rgb),0.07)", cursor: "pointer",
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
              background: "rgba(var(--overlay-rgb),0.04)", border: "1px solid rgba(var(--overlay-rgb),0.07)",
              height: 4,
            }}>
              <div style={{
                height: "100%", transition: "width 0.5s",
                width: `${totalWithPrompt > 0 ? (doneCount / totalWithPrompt) * 100 : 0}%`,
                background: "linear-gradient(90deg, var(--accent), #4285f4)",
              }} />
            </div>
          )}

          {/* Container grid */}
          {containers.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 240, borderRadius: 16, border: "1px dashed rgba(var(--overlay-rgb),0.07)",
              background: "rgba(var(--overlay-rgb),0.015)",
            }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🔭</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>No prompts yet</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Add prompt containers to get started</p>
              <button
                onClick={() => addContainers(2)}
                style={{
                  padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: "linear-gradient(135deg, var(--accent), #4285f4)", color: "var(--on-accent)",
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

      {/* Paste-JSON modal */}
      {pasteModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setPasteModalOpen(false)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid rgba(var(--overlay-rgb),0.1)",
              borderRadius: 16, padding: 20, width: "min(640px, 92vw)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
              Paste JSON
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 10px" }}>
              Paste a [&#123; url, prompt &#125;, ...] array. One prompt card gets added per entry.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              autoFocus
              rows={10}
              placeholder='[{"url": "https://example.com", "prompt": "..."}]'
              style={{
                width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(var(--overlay-rgb),0.08)",
                borderRadius: 10, padding: "10px 12px", fontSize: 12, fontFamily: "monospace",
                color: "var(--text)", resize: "vertical", outline: "none", caretColor: "var(--accent)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => { setPasteModalOpen(false); setPasteText(""); }}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: "transparent", color: "var(--text-muted)",
                  border: "1px solid rgba(var(--overlay-rgb),0.1)", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => importFromJsonText(pasteText)}
                disabled={!pasteText.trim()}
                style={{
                  padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: "linear-gradient(135deg, var(--accent), #4285f4)", color: "var(--on-accent)",
                  border: "none", cursor: pasteText.trim() ? "pointer" : "not-allowed",
                  opacity: pasteText.trim() ? 1 : 0.4,
                }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

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