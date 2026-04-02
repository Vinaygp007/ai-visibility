"use client";

import { useState } from "react";

interface HeroSectionProps {
  onAnalyze: (url: string, runCitations: boolean) => void;
  isLoading: boolean;
}

const FEATURE_CHIPS = [
  "14 AI Bots Checked",
  "llms.txt Detection",
  "Structured Data",
  "3 AI Providers",
  "Merged Analysis",
];

const PROVIDERS = [
  { name: "Gemini 2.0", icon: "✦", color: "#4285f4" },
  { name: "ChatGPT",    icon: "⬡", color: "#10a37f" },
  { name: "Perplexity", icon: "◎", color: "#20b2aa" },
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
    <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
      <div className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-6 tracking-widest"
        style={{ color: "#00e5ff", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}>
        // AI VISIBILITY SCANNER
      </div>

      <h1 className="text-5xl md:text-6xl font-bold leading-none tracking-tight mb-5"
        style={{
          background: "linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.45))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
        Is Your Website<br />Visible to AI?
      </h1>

      <p className="text-[17px] leading-relaxed max-w-lg mx-auto mb-7" style={{ color: "#8b8d9e" }}>
        Audit how ChatGPT, Claude, Perplexity, Gemini and 10+ other AI systems discover and reference your website.
      </p>

      {/* Provider badges */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-mono" style={{ color: "#8b8d9e" }}>POWERED BY</span>
        {PROVIDERS.map((p) => (
          <span key={p.name}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border"
            style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}>
            <span style={{ fontSize: 13 }}>{p.icon}</span>{p.name}
          </span>
        ))}
      </div>
      <p className="text-[11px] font-mono mb-6" style={{ color: "#8b8d9e" }}>all 3 run simultaneously · scores averaged</p>

      {/* URL input */}
      <div className="search-box flex items-center rounded-2xl border px-5 py-1.5 max-w-xl mx-auto transition-all"
        style={{ background: "#111219", borderColor: "rgba(255,255,255,0.13)" }}>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="https://yourwebsite.com"
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-white py-2.5"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="ml-3 rounded-xl px-6 py-2.5 text-sm font-semibold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 active:scale-95"
          style={{ background: "#00e5ff", whiteSpace: "nowrap" }}
        >
          {isLoading ? "Analyzing..." : "Analyze →"}
        </button>
      </div>

      {/* Citations toggle — on by default, user can opt out */}
      <div className="flex items-center justify-center gap-3 mt-4 mb-1">
        <button
          onClick={() => setWithCitations(!withCitations)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all"
          style={{
            background: withCitations ? "rgba(0,229,255,0.1)" : "transparent",
            borderColor: withCitations ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.12)",
            color: withCitations ? "#00e5ff" : "#8b8d9e",
          }}
        >
          <span style={{ fontSize: 13 }}>{withCitations ? "✓" : "○"}</span>
          AI Citations
          {withCitations ? (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff" }}
            >
              ON
            </span>
          ) : (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,184,48,0.15)", color: "#ffb830" }}
            >
              OFF
            </span>
          )}
        </button>
        <span className="text-[11px]" style={{ color: "#8b8d9e" }}>
          {withCitations
            ? "Full GEO + competitive analysis included"
            : "Basic scan only — no citation research"}
        </span>
      </div>

      {/* Feature chips */}
      <div className="flex flex-wrap gap-4 justify-center mt-5">
        {FEATURE_CHIPS.map(feat => (
          <div key={feat} className="flex items-center gap-2 text-xs" style={{ color: "#8b8d9e" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00ff94" }} />
            {feat}
          </div>
        ))}
      </div>
    </section>
  );
}