"use client";

import { useState, useRef } from "react";

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

interface RunResult {
  url: string | null;
  hasUrl: boolean;
  topic: string;
  responses: ProviderResponse[];
  citations: CitationResult[];
}

// ── Provider colours (matches rest of app) ────────────────────────────────
const PROVIDER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.1)",  border: "rgba(66,133,244,0.28)", icon: "✦" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.1)", border: "rgba(16,163,127,0.28)", icon: "⬡" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.1)",  border: "rgba(32,178,170,0.28)", icon: "◎" },
  "Claude 3.5 Sonnet":     { color: "#c17c4e", bg: "rgba(193,124,78,0.1)",  border: "rgba(193,124,78,0.28)", icon: "◈" },
  "Microsoft Copilot":     { color: "#0078d4", bg: "rgba(0,120,212,0.1)",   border: "rgba(0,120,212,0.28)", icon: "⊞" },
};

const DEFAULT_PROMPT = `You are an AI Visibility Auditor. Analyse the website at {url} and answer the following:

1. Is this website likely to be cited or referenced by AI assistants (ChatGPT, Gemini, Perplexity)?
2. What is the primary topic or industry of this site?
3. List 3 specific improvements that would increase its AI discoverability.
4. Rate its current AI visibility: Poor / Fair / Good / Excellent — and explain why.

Be concise but specific. Format your response clearly with numbered sections.`;

const DEFAULT_PROMPT_NO_URL = `You are a market research expert. Answer the following clearly and specifically:

Best 5 selling booking platforms — rank them, explain what makes each one stand out, who they are best for, and provide their website URL.`;

// ── Helpers ───────────────────────────────────────────────────────────────
function dotColor(count: number) {
  if (count === 0) return "#ff5a5a";
  if (count < 3) return "#ffb830";
  return "#00e87a";
}

function parseDomain(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const bullet = line.match(/^[*-] (.+)/);
    const numbered = line.match(/^(\d+)\. (.+)/);
    const bold = (t: string) =>
      t.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0e8">$1</strong>');

    if (h2) return <h2 key={i} style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "12px 0 4px" }} dangerouslySetInnerHTML={{ __html: bold(h2[1]) }} />;
    if (h3) return <h3 key={i} style={{ color: "#e0e0ea", fontSize: 13, fontWeight: 600, margin: "10px 0 3px" }} dangerouslySetInnerHTML={{ __html: bold(h3[1]) }} />;
    if (bullet) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
        <span style={{ color: "#00e5ff", flexShrink: 0 }}>•</span>
        <span style={{ color: "#c9cdd4", fontSize: 13 }} dangerouslySetInnerHTML={{ __html: bold(bullet[1]) }} />
      </div>
    );
    if (numbered) return (
      <div key={i} style={{ display: "flex", gap: 6, margin: "3px 0" }}>
        <span style={{ color: "#00e5ff", flexShrink: 0, minWidth: 18, fontSize: 13 }}>{numbered[1]}.</span>
        <span style={{ color: "#c9cdd4", fontSize: 13 }} dangerouslySetInnerHTML={{ __html: bold(numbered[2]) }} />
      </div>
    );
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} style={{ color: "#c9cdd4", fontSize: 13, margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: bold(line) }} />;
  });
}

// ── Single result card ────────────────────────────────────────────────────
function ResultCard({ result }: { result: RunResult }) {
  const [tab, setTab] = useState<"responses" | "citations">("responses");
  const [activeResp, setActiveResp] = useState(result.responses[0]?.provider ?? "");
  const [activeCit, setActiveCit] = useState(result.citations[0]?.provider ?? "");

  const respData = result.responses.find((r) => r.provider === activeResp);
  const citData = result.citations.find((c) => c.provider === activeCit);
  const hasCitations = result.citations.length > 0;

  const cfg = PROVIDER_CONFIG[activeResp] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
  const citCfg = PROVIDER_CONFIG[activeCit] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };

  return (
    <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: "#111219", borderColor: "rgba(255,255,255,0.08)" }}>
      {/* Card header */}
      <div className="px-5 py-3.5 border-b flex items-center justify-between flex-wrap gap-3"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
        <div className="flex items-center gap-3">
          {result.hasUrl ? (
            <>
              <span className="text-sm font-semibold text-white">{parseDomain(result.url!)}</span>
              <a href={result.url!} target="_blank" rel="noreferrer"
                className="text-[11px] font-mono hover:underline" style={{ color: "#4285f4" }}>
                {result.url}
              </a>
            </>
          ) : (
            <span className="text-sm font-semibold text-white truncate max-w-xs" title={result.topic}>
              {result.topic.length > 60 ? result.topic.slice(0, 60) + "…" : result.topic}
            </span>
          )}
        </div>

        {/* Tab toggle */}
        {hasCitations && (
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["responses", "citations"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: tab === t ? "rgba(0,229,255,0.12)" : "transparent",
                  color: tab === t ? "#00e5ff" : "#6f7280",
                  border: tab === t ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                }}>
                {t === "responses" ? `Responses (${result.responses.length})` : `Citations (${result.citations.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── RESPONSES TAB ── */}
      {tab === "responses" && (
        <>
          {/* Provider tabs */}
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {result.responses.map((r) => {
              const pCfg = PROVIDER_CONFIG[r.provider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
              const isActive = activeResp === r.provider;
              return (
                <button key={r.provider} onClick={() => setActiveResp(r.provider)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border"
                  style={{
                    color: isActive ? pCfg.color : "#6f7280",
                    background: isActive ? pCfg.bg : "transparent",
                    borderColor: isActive ? pCfg.border : "rgba(255,255,255,0.07)",
                  }}>
                  <span style={{ fontSize: 10 }}>{pCfg.icon}</span>
                  {r.provider}
                  {r.error && <span className="text-[9px] font-mono px-1 rounded ml-0.5" style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.12)" }}>✗</span>}
                </button>
              );
            })}
          </div>

          <div className="p-5 pt-4">
            {respData?.error ? (
              <div className="rounded-xl p-4" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.18)" }}>
                <p className="text-[13px] font-medium mb-1" style={{ color: "#ff5a5a" }}>✗ Request Failed</p>
                <p className="text-[12px]" style={{ color: "#8b8d9e" }}>{respData.error}</p>
              </div>
            ) : respData ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>Response</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: "#4b5563" }}>{cfg.icon} {respData.durationMs}ms</span>
                    <button onClick={() => navigator.clipboard.writeText(respData.response)}
                      className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg hover:opacity-80"
                      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      Copy
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl overflow-y-auto" style={{ background: "rgba(0,0,0,0.22)", border: `1px solid ${cfg.border}`, maxHeight: 400 }}>
                  {renderMarkdown(respData.response)}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* ── CITATIONS TAB ── */}
      {tab === "citations" && hasCitations && (
        <>
          <div className="flex flex-wrap gap-2 px-5 pt-4">
            {result.citations.map((c) => {
              const pCfg = PROVIDER_CONFIG[c.provider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "◎" };
              const isActive = activeCit === c.provider;
              return (
                <button key={c.provider} onClick={() => setActiveCit(c.provider)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border"
                  style={{
                    color: isActive ? pCfg.color : "#6f7280",
                    background: isActive ? pCfg.bg : "transparent",
                    borderColor: isActive ? pCfg.border : "rgba(255,255,255,0.07)",
                  }}>
                  <span style={{ fontSize: 10 }}>{pCfg.icon}</span>
                  {c.provider}
                  {c.status === "success" && (
                    <span className="text-[10px] font-mono ml-1" style={{ color: isActive ? pCfg.color : "#4b5563" }}>
                      {c.count} URL{c.count !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5 pt-4 space-y-4">
            {citData?.status === "failed" ? (
              <div className="rounded-xl p-4" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.18)" }}>
                <p className="text-[13px] font-medium" style={{ color: "#ff5a5a" }}>✗ Citation query failed</p>
                <p className="text-[12px] mt-1" style={{ color: "#8b8d9e" }}>{citData.error}</p>
              </div>
            ) : citData ? (
              <>
                {/* Query shown */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>Citation query sent</p>
                  <div className="text-[13px] px-4 py-3 rounded-xl leading-relaxed" style={{ color: "#e0e0ea", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {citData.query}
                  </div>
                </div>

                {/* Response */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>
                      Response
                      <span className="ml-2 normal-case" style={{ color: dotColor(citData.count) }}>
                        · {citData.count} URL{citData.count !== 1 ? "s" : ""} detected
                      </span>
                    </p>
                    <button onClick={() => navigator.clipboard.writeText(citData.rawAnswer)}
                      className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg hover:opacity-80"
                      style={{ color: citCfg.color, background: citCfg.bg, border: `1px solid ${citCfg.border}` }}>
                      Copy
                    </button>
                  </div>
                  <div className="px-4 py-3 rounded-xl overflow-y-auto" style={{ background: "rgba(0,0,0,0.22)", border: `1px solid ${citCfg.border}`, maxHeight: 360 }}>
                    {renderMarkdown(citData.rawAnswer)}
                  </div>
                </div>

                {/* Cited URLs */}
                {citData.allCitationUrls.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8b8d9e" }}>
                      Cited URLs ({citData.allCitationUrls.length})
                    </p>
                    <div className="space-y-1.5">
                      {citData.allCitationUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-mono hover:opacity-80 transition-opacity truncate"
                          style={{ color: citCfg.color, background: citCfg.bg, border: `1px solid ${citCfg.border}` }}>
                          <span style={{ color: "#4b5563" }}>{i + 1}.</span>
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-5 pt-1">
                  {[{ color: "#00e87a", label: "3+ = well sourced" }, { color: "#ffb830", label: "1–2 = partial" }, { color: "#ff5a5a", label: "0 = no URLs" }].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[11px]" style={{ color: "#8b8d9e" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function BulkPromptPage() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [urlMode, setUrlMode] = useState<"with-url" | "no-url">("with-url");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [runCitations, setRunCitations] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // When toggling URL mode, switch default prompt and clear stale results
  const handleUrlModeChange = (next: "with-url" | "no-url") => {
    setUrlMode(next);
    setResults([]);
    setError(null);
    if (next === "no-url") {
      setPrompt(DEFAULT_PROMPT_NO_URL);
    } else {
      setPrompt(DEFAULT_PROMPT);
    }
  };

  const hasUrlPlaceholder = prompt.includes("{url}");
  const charCount = prompt.length;
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;

  async function runPrompt() {
    if (!prompt.trim()) return;

    // Collect URLs
    let urls: string[] = [];
    if (urlMode === "with-url") {
      if (mode === "single") {
        if (!singleUrl.trim()) { setError("Please enter a URL"); return; }
        urls = [singleUrl.trim()];
      } else {
        urls = bulkUrls
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0)
          .slice(0, 50);
        if (urls.length === 0) { setError("Please enter at least one URL"); return; }
      }
    } else {
      // No-URL mode: single run
      urls = [""]; // placeholder so we loop once
    }

    setIsRunning(true);
    setError(null);
    setResults([]);

    try {
      const newResults: RunResult[] = [];

      for (const rawUrl of urls) {
        const body: Record<string, unknown> = {
          prompt,
          runCitations,
        };
        if (urlMode === "with-url" && rawUrl) {
          body.url = rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;
        }

        const res = await fetch("/api/prompt-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

        newResults.push({
          url: data.url ?? null,
          hasUrl: data.hasUrl ?? false,
          topic: data.topic ?? prompt.slice(0, 80),
          responses: data.responses ?? [],
          citations: data.citations ?? [],
        });

        // Stream results as they come
        setResults([...newResults]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0b10", color: "#f0f0f5" }}>
      {/* Content offset for sidebar */}
      <div className="pl-64">
        <div className="max-w-5xl mx-auto px-8 py-10">

          {/* Page header */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border tracking-widest"
              style={{ color: "#00e5ff", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.2)" }}>
              NEW
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Bulk Prompt Runner</h1>
          </div>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm mb-8" style={{ color: "#8b8d9e" }}>
              Write your own AI prompt · run it against one or many URLs, or without any URL · get AI citations
            </p>
            {results.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => void exportToPdf(results, prompt)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
                  style={{ background: "#00e5ff", color: "#000" }}
                >
                  ↓ Export PDF
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* ── Left panel: prompt + controls ── */}
            <div className="col-span-3 space-y-4">

              {/* URL mode toggle */}
              <div className="flex items-center gap-2 p-1 rounded-xl w-fit"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {(["with-url", "no-url"] as const).map((m) => (
                  <button key={m} onClick={() => handleUrlModeChange(m)}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
                    style={{
                      background: urlMode === m ? "rgba(0,229,255,0.12)" : "transparent",
                      color: urlMode === m ? "#00e5ff" : "#6f7280",
                      border: urlMode === m ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                    }}>
                    {m === "with-url" ? "🔗 With URL" : "✦ No URL (general query)"}
                  </button>
                ))}
              </div>

              {/* Prompt editor */}
              <div className="rounded-2xl border overflow-hidden"
                style={{ background: "#111219", borderColor: "rgba(255,255,255,0.09)" }}>
                <div className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#8b8d9e" }}>
                    CUSTOM PROMPT
                  </span>
                  <div className="flex items-center gap-2">
                    {urlMode === "with-url" && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ color: "#00e5ff", background: "rgba(0,229,255,0.1)" }}>
                        {"{url}"} = replaced with each website
                      </span>
                    )}
                    <button
                      onClick={() => setPrompt(urlMode === "with-url" ? DEFAULT_PROMPT : DEFAULT_PROMPT_NO_URL)}
                      className="text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all hover:border-white/20"
                      style={{ color: "#8b8d9e", borderColor: "rgba(255,255,255,0.1)" }}>
                      Reset default
                    </button>
                  </div>
                </div>

                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={10}
                  className="w-full bg-transparent outline-none resize-none px-5 py-4 text-[13px] leading-relaxed font-mono"
                  style={{ color: "#e0e0ea", caretColor: "#00e5ff" }}
                  placeholder={urlMode === "with-url"
                    ? "Write your prompt here. Use {url} as a placeholder for each website."
                    : "Write any question or prompt — no URL needed."
                  }
                />

                <div className="px-5 py-2.5 border-t flex items-center justify-between"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="text-[11px] font-mono" style={{ color: "#4b5563" }}>
                    {charCount} chars · {wordCount} words
                  </span>
                  {urlMode === "with-url" ? (
                    hasUrlPlaceholder ? (
                      <span className="text-[11px] font-mono" style={{ color: "#00e87a" }}>
                        ✓ {"{url}"} placeholder found
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono" style={{ color: "#ffb830" }}>
                        ⚠ No {"{url}"} placeholder — same prompt for all URLs
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
                      ✦ General prompt mode
                    </span>
                  )}
                </div>
              </div>

              {/* URL input area — only shown in with-url mode */}
              {urlMode === "with-url" && (
                <div className="rounded-2xl border overflow-hidden"
                  style={{ background: "#111219", borderColor: "rgba(255,255,255,0.09)" }}>
                  {/* Mode tabs */}
                  <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {(["single", "bulk"] as const).map((m) => (
                      <button key={m} onClick={() => setMode(m)}
                        className="flex-1 py-3 text-[12px] font-semibold transition-all"
                        style={{
                          background: mode === m ? "rgba(0,229,255,0.06)" : "transparent",
                          color: mode === m ? "#00e5ff" : "#6f7280",
                          borderBottom: mode === m ? "2px solid #00e5ff" : "2px solid transparent",
                        }}>
                        {m === "single" ? "Single URL" : "Bulk URLs"}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {mode === "single" ? (
                      <div className="flex items-center gap-3 rounded-xl border px-4 py-2.5"
                        style={{ background: "#0e0f17", borderColor: "rgba(255,255,255,0.09)" }}>
                        <span style={{ color: "#8b8d9e", fontSize: 14 }}>🌐</span>
                        <input
                          type="text"
                          value={singleUrl}
                          onChange={(e) => setSingleUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && runPrompt()}
                          placeholder="https://yourwebsite.com"
                          className="flex-1 bg-transparent outline-none text-[13px] text-white"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        rows={5}
                        placeholder={"https://site1.com\nhttps://site2.com\nhttps://site3.com"}
                        className="w-full bg-transparent outline-none resize-none text-[13px] font-mono leading-relaxed"
                        style={{ color: "#e0e0ea", caretColor: "#00e5ff" }}
                      />
                    )}
                  </div>

                  {mode === "bulk" && (
                    <div className="px-4 pb-3">
                      <span className="text-[11px] font-mono" style={{ color: "#4b5563" }}>
                        {bulkUrls.split("\n").filter((u) => u.trim()).length} URLs entered · max 50
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Options row */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setRunCitations(!runCitations)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all"
                  style={{
                    background: runCitations ? "rgba(0,229,255,0.1)" : "transparent",
                    borderColor: runCitations ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.12)",
                    color: runCitations ? "#00e5ff" : "#8b8d9e",
                  }}>
                  <span style={{ fontSize: 13 }}>{runCitations ? "✓" : "○"}</span>
                  AI Citations
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: runCitations ? "rgba(0,229,255,0.12)" : "rgba(255,184,48,0.15)", color: runCitations ? "#00e5ff" : "#ffb830" }}>
                    {runCitations ? "ON" : "OFF"}
                  </span>
                </button>
                <span className="text-[11px]" style={{ color: "#8b8d9e" }}>
                  {runCitations ? "Citation sources will be listed per provider" : "Skip citation queries"}
                </span>
              </div>

              {/* Run button */}
              <button
                onClick={runPrompt}
                disabled={isRunning || !prompt.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg, #00e5ff, #4285f4)", color: "#000" }}>
                {isRunning
                  ? "Running…"
                  : urlMode === "no-url"
                    ? "✦ Run Prompt →"
                    : mode === "bulk"
                      ? `⚡ Run on ${bulkUrls.split("\n").filter((u) => u.trim()).length || 1} URL${bulkUrls.split("\n").filter((u) => u.trim()).length !== 1 ? "s" : ""} →`
                      : "Run Prompt →"
                }
              </button>

              {error && (
                <div className="rounded-xl p-4 text-[13px]"
                  style={{ background: "rgba(255,90,90,0.06)", border: "1px solid rgba(255,90,90,0.2)", color: "#ff5a5a" }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* ── Right panel: results ── */}
            <div className="col-span-2">
              {results.length === 0 && !isRunning ? (
                <div className="flex flex-col items-center justify-center h-full min-h-64 text-center rounded-2xl border"
                  style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}>
                  <div className="text-4xl mb-4">🔭</div>
                  <p className="text-sm font-semibold text-white mb-1">Results will appear here</p>
                  <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                    {urlMode === "no-url"
                      ? "Write a prompt, then hit Run"
                      : "Write a prompt, add URLs, then hit Run"}
                  </p>
                </div>
              ) : isRunning && results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 rounded-2xl border"
                  style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="spinner w-10 h-10 rounded-full mb-4"
                    style={{ border: "3px solid rgba(255,255,255,0.08)", borderTopColor: "#00e5ff" }} />
                  <p className="text-sm font-medium text-white">Running prompt…</p>
                  <p className="text-[12px] mt-1" style={{ color: "#8b8d9e" }}>Querying all enabled providers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {isRunning && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{ background: "rgba(0,229,255,0.04)", borderColor: "rgba(0,229,255,0.15)" }}>
                      <div className="spinner w-4 h-4 rounded-full flex-shrink-0"
                        style={{ border: "2px solid rgba(0,229,255,0.2)", borderTopColor: "#00e5ff" }} />
                      <span className="text-[12px]" style={{ color: "#00e5ff" }}>Still running…</span>
                    </div>
                  )}
                  {results.map((r, i) => <ResultCard key={i} result={r} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spinner { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── PDF Export (plain text) ───────────────────────────────────────────────
async function exportToPdf(results: RunResult[], prompt: string) {
  // Load jsPDF from CDN if not already present
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(script);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { jsPDF } = (window as any).jspdf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PW = 210;
  const PH = 297;
  const ML = 15;
  const MR = 15;
  const TW = PW - ML - MR;
  const LH = 5;
  let y = 15;

  const sep = "=".repeat(76);
  const thin = "-".repeat(76);

  const writeLine = (text: string, size = 9, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setTextColor(20, 20, 20);
    const wrapped: string[] = doc.splitTextToSize(text, TW);
    wrapped.forEach((line: string) => {
      if (y + LH > PH - 12) {
        doc.addPage();
        y = 15;
      }
      doc.text(line, ML, y);
      y += LH;
    });
  };

  const blankLine = () => { y += LH; };

  // Header
  writeLine("AISCOPE — BULK PROMPT REPORT", 11, true);
  writeLine(`Generated : ${new Date().toLocaleString()}`);
  writeLine(`Total     : ${results.length}`);
  writeLine(sep);
  blankLine();

  writeLine("PROMPT USED", 9, true);
  writeLine(thin);
  writeLine(prompt.trim());
  blankLine();
  writeLine(sep);
  writeLine("RESULTS", 9, true);
  writeLine(sep);

  results.forEach((r, idx) => {
    blankLine();
    writeLine(`[${idx + 1}] ${r.hasUrl ? (r.url ?? "(no url)") : (r.topic || "(general)")}`, 9, true);

    // Responses
    if (r.responses && r.responses.length > 0) {
      r.responses.forEach((p) => {
        const meta = [p.provider, p.durationMs ? `${(p.durationMs/1000).toFixed(1)}s` : ""].filter(Boolean).join("  |  ");
        if (meta) writeLine(`    ${meta}`);
        writeLine(thin);
        writeLine(p.response || "(no response)");
        blankLine();
      });
    } else {
      writeLine(thin);
      writeLine("(no provider responses)");
      blankLine();
    }

    // Citations
    if (r.citations && r.citations.length > 0) {
      writeLine("CITATIONS", 9, true);
      r.citations.forEach((c) => {
        writeLine(`  Provider: ${c.provider}  ·  ${c.count} URLs`);
        writeLine(thin);
        writeLine(c.rawAnswer || "(no answer)");
        if (c.allCitationUrls && c.allCitationUrls.length > 0) {
          writeLine("  Cited URLs:");
          c.allCitationUrls.forEach((u) => writeLine(`    - ${u}`));
        }
        blankLine();
      });
    }

    writeLine(sep);
  });

  writeLine("Generated by AiScope  ·  aiscope.io");

  // page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text(`Page ${p} of ${totalPages}`, PW - MR, PH - 6, { align: "right" });
  }

  doc.save(`aiscope-prompt-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}