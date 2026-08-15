"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { GeminiIcon, ChatGPTIcon, PerplexityIcon } from "./ProviderIcons";

const STEPS = [
  "Fetching robots.txt & llms.txt",
  "Scanning HTML, meta tags & structured data",
  "Checking 14 AI bot permissions",
  "Running Gemini, Groq & Perplexity in parallel",
  "Merging & averaging AI results",
];

const PROVIDERS = [
  { name: "Gemini 2.0",  color: "#4285f4", Icon: GeminiIcon },
  { name: "ChatGPT",     color: "#10a37f", Icon: ChatGPTIcon },
  { name: "Perplexity",  color: "#20b2aa", Icon: PerplexityIcon },
];

export default function LoadingSection({ url }: { url: string }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
    const interval = setInterval(() => {
      setActiveStep(prev => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [url]);

  return (
    <div className="ld-card relative overflow-hidden rounded-2xl border p-12 text-center"
      style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1" style={{ width: 260, height: 260, top: -120, left: "10%", background: "var(--accent)", opacity: 0.08 }} />
        <div className="aurora-blob aurora-blob-2" style={{ width: 220, height: 220, top: -90, right: "10%", background: "var(--accent2)", opacity: 0.07 }} />
      </div>

      <div className="relative">
        <div className="relative mx-auto mb-5" style={{ width: 56, height: 56 }}>
          <div className="ld-ring-outer absolute inset-0 rounded-full" style={{ border: "3px solid rgba(var(--overlay-rgb),0.08)" }} />
          <div className="ld-ring-spin absolute inset-0 rounded-full" style={{ border: "3px solid transparent", borderTopColor: "var(--accent)", borderRightColor: "var(--accent2)" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={20} className="ld-spin" style={{ color: "var(--accent)" }} />
          </div>
        </div>

        <p className="text-base font-medium text-[var(--text)] mb-1">Analyzing AI Visibility…</p>
        <p className="text-sm mb-6 font-mono" style={{ color: "var(--text-muted)" }}>{url}</p>

        {/* Provider badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {PROVIDERS.map(p => (
            <span key={p.name}
              className="ld-provider-badge flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
              style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}>
              <p.Icon size={11} /> {p.name}
            </span>
          ))}
          <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>running in parallel</span>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-1 text-left max-w-xs mx-auto">
          {STEPS.map((step, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div key={step} className="flex items-center gap-3 py-1.5 text-[13px] font-mono transition-colors duration-300"
                style={{ color: isDone ? "var(--success)" : isActive ? "var(--accent)" : "var(--text-dim)" }}>
                {isDone ? (
                  <CheckCircle2 size={14} className="flex-shrink-0" />
                ) : isActive ? (
                  <Loader2 size={14} className="ld-spin flex-shrink-0" />
                ) : (
                  <Circle size={7} fill="currentColor" className="flex-shrink-0" style={{ marginLeft: 3.5, marginRight: 3.5 }} />
                )}
                {step}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes ldSpin { to { transform: rotate(360deg); } }
        .ld-spin { animation: ldSpin 0.8s linear infinite; }
        .ld-ring-spin { animation: ldSpin 1.1s linear infinite; }

        .ld-provider-badge { transition: transform 0.15s ease; }
        .ld-provider-badge:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
