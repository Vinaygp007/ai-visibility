"use client";

import { useState } from "react";
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

  const handleSubmit = () => {
    if (!url.trim()) return;
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    onAnalyze(u, withCitations);
  };

  return (
    <section className="relative overflow-hidden max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
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

      <div className="animate-fade-up fade-up-1 inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-6 tracking-widest"
        style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}>
        // NEW SCAN
      </div>

      <h1 className="heading-shimmer text-5xl md:text-6xl font-bold leading-none tracking-tight mb-5"
        style={{
          background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
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
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-transform hover:-translate-y-0.5"
            style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}>
            <p.Icon size={18} className="shrink-0" />{p.name}
          </span>
        ))}
      </div>
      <p className="animate-fade-up fade-up-3 text-[11px] font-mono mb-6" style={{ color: "var(--text-muted)" }}>all 3 run simultaneously · scores averaged</p>

      {/* URL input */}
      <div className="animate-fade-up fade-up-4 search-box flex items-center rounded-2xl border px-5 py-1.5 max-w-xl mx-auto transition-all"
        style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.13)" }}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="https://yourwebsite.com"
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-[var(--text)] py-2.5"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="ml-3 rounded-xl px-6 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 active:scale-95"
          style={{ background: "var(--accent)", whiteSpace: "nowrap" }}
        >
          {isLoading ? "Analyzing..." : "Analyze →"}
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
          <span style={{ fontSize: 13 }}>{withCitations ? "✓" : "○"}</span>
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
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {withCitations
            ? "Full GEO + competitive analysis included"
            : "Basic scan only: no citation research"}
        </span>
      </div>
    </section>
  );
}