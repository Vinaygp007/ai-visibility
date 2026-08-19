"use client";

import { useState } from "react";
import { Sparkles, Search, ArrowRight, Loader2, Check, Circle, X } from "lucide-react";
import { GeminiIcon, ChatGPTIcon, PerplexityIcon } from "./ProviderIcons";

interface HeroSectionProps {
  onAnalyze: (url: string, runCitations: boolean) => void;
  isLoading: boolean;
}

const PROVIDERS = [
  { name: "Gemini 2.0", Icon: GeminiIcon, color: "#4285f4" },
  { name: "ChatGPT",    Icon: ChatGPTIcon, color: "#10a37f" },
  { name: "Perplexity", Icon: PerplexityIcon, color: "#20b2aa" },
];

export default function HeroSection({ onAnalyze, isLoading }: HeroSectionProps) {
  const [url, setUrl] = useState("");
  // ← KEY CHANGE: was false, now true so citations always run by default
  const [withCitations, setWithCitations] = useState(true);
  const [showCitationsInfo, setShowCitationsInfo] = useState(false);

  const handleSubmit = () => {
    if (!url.trim()) return;
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    onAnalyze(u, withCitations);
  };

  return (
    <section className="relative overflow-hidden max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 md:pt-20 pb-12 text-center">
      {/* Aurora background, same treatment as the homepage hero */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="aurora-blob aurora-blob-1"
          style={{ width: 420, height: 420, top: -140, left: "2%", background: "var(--accent)", opacity: 0.16 }}
        />
        <div
          className="aurora-blob aurora-blob-2"
          style={{ width: 380, height: 380, top: 20, right: "4%", background: "var(--accent2)", opacity: 0.14 }}
        />
        <div
          className="aurora-blob aurora-blob-3"
          style={{ width: 340, height: 340, bottom: -140, left: "38%", background: "var(--success)", opacity: 0.12 }}
        />
      </div>

      <div className="animate-fade-up fade-up-1 inline-flex items-center gap-1.5 text-xs font-mono px-4 py-1.5 rounded-full border mb-6 tracking-widest"
        style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}>
        <Sparkles size={11} /> NEW SCAN
      </div>

      <h1 className="heading-shimmer text-4xl sm:text-5xl md:text-6xl font-bold leading-none tracking-tight mb-4 sm:mb-5"
        style={{
          background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
        Run Your AI<br />Visibility Scan
      </h1>

      <p className="animate-fade-up fade-up-3 text-[17px] leading-relaxed max-w-lg mx-auto mb-7" style={{ color: "var(--text-muted)" }}>
        Drop in a URL and we'll check crawler access, structured data and how Gemini, ChatGPT and Perplexity already talk about your site.
      </p>

      {/* Provider badges */}
      <div className="animate-fade-up fade-up-3 flex items-center justify-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>POWERED BY</span>
        {PROVIDERS.map((p) => (
          <span key={p.name}
            className="hero-provider-badge flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border"
            style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}>
            <p.Icon size={18} className="shrink-0" />{p.name}
          </span>
        ))}
      </div>
      <p className="animate-fade-up fade-up-3 text-[11px] font-mono mb-6" style={{ color: "var(--text-muted)" }}>all 3 run simultaneously · scores averaged</p>

      {/* URL input */}
      <div className="animate-fade-up fade-up-4 search-box flex flex-col sm:flex-row sm:items-center rounded-2xl border p-2 sm:pl-4 sm:pr-1.5 sm:py-1.5 gap-2 sm:gap-0 max-w-xl mx-auto transition-all"
        style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.13)" }}>
        <div className="flex items-center gap-2 px-1 sm:px-0 sm:flex-1 min-w-0">
          <Search size={16} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="https://yourwebsite.com"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] text-[var(--text)] py-2 px-1 sm:py-2.5 sm:px-3"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="hero-analyze-btn w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", whiteSpace: "nowrap" }}
        >
          {isLoading ? (
            <><Loader2 size={14} className="hero-spin" /> Analyzing…</>
          ) : (
            <>Analyze <ArrowRight size={14} /></>
          )}
        </button>
      </div>

      {/* Citations toggle — on by default, user can opt out */}
      <div className="animate-fade-up fade-up-4 flex items-center justify-center gap-3 mt-4 mb-1">
        <button
          onClick={() => setWithCitations(!withCitations)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all"
          style={{
            background: withCitations ? "rgba(0,229,255,0.1)" : "transparent",
            borderColor: withCitations ? "rgba(0,229,255,0.4)" : "rgba(var(--overlay-rgb),0.12)",
            color: withCitations ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {withCitations ? <Check size={13} strokeWidth={3} /> : <Circle size={11} />}
          AI Citations
          {withCitations ? (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,229,255,0.12)", color: "var(--accent)" }}
            >
              ON
            </span>
          ) : (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,184,48,0.15)", color: "var(--warning)" }}
            >
              OFF
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowCitationsInfo(true)}
          aria-label="What does AI Citations include?"
          title="What does AI Citations include?"
          className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold shrink-0 transition-colors"
          style={{
            color: "var(--text-muted)",
            border: "1px solid rgba(var(--overlay-rgb),0.25)",
          }}
        >
          i
        </button>
      </div>

      {showCitationsInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowCitationsInfo(false)}
        >
          <div
            className="hero-modal-pop w-full max-w-md rounded-2xl border p-6 text-left"
            style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>AI Citations</h3>
              <button
                onClick={() => setShowCitationsInfo(false)}
                className="hero-icon-btn flex items-center justify-center"
                style={{ width: 26, height: 26, borderRadius: 7, color: "var(--text-muted)", background: "transparent", border: "1px solid transparent" }}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
              When this is on, we send real prompts to Gemini, ChatGPT and Perplexity to see whether — and how often — they cite your site, plus which competitors show up instead.
            </p>

            <ul className="text-[13px] leading-relaxed mb-4 space-y-1.5 list-disc pl-4" style={{ color: "var(--text-muted)" }}>
              <li>Full GEO (Generative Engine Optimization) analysis</li>
              <li>Citation counts across all 3 AI providers</li>
              <li>Competitive analysis: see who&apos;s winning your AI visibility</li>
            </ul>

            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Turning it off runs a faster, basic scan that only checks crawler access and structured data — no live AI citation research.
            </p>

            <button
              onClick={() => setShowCitationsInfo(false)}
              className="hero-analyze-btn w-full mt-5 rounded-lg py-2.5 text-sm font-semibold text-[var(--on-accent)]"
              style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hero-spin { animation: spin 0.8s linear infinite; }

        .hero-provider-badge { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .hero-provider-badge:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }

        .hero-analyze-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease; }
        .hero-analyze-btn:not(:disabled):hover { filter: brightness(1.06); box-shadow: 0 6px 20px rgba(0,229,255,0.3); transform: translateY(-1px); }
        .hero-analyze-btn:not(:disabled):active { transform: translateY(0); }

        .hero-icon-btn:hover { background: rgba(var(--overlay-rgb),0.07); color: var(--text); }

        @keyframes heroModalPop { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .hero-modal-pop { animation: heroModalPop 0.18s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
    </section>
  );
}
