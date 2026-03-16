"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Fetching robots.txt & llms.txt",
  "Scanning HTML, meta tags & structured data",
  "Checking 14 AI bot permissions",
  "Running Gemini, Groq & Perplexity in parallel",
  "Merging & averaging AI results",
];

const PROVIDERS = [
  { name: "Gemini 2.0",  color: "#4285f4", icon: "✦" },
  { name: "ChatGPT",     color: "#10a37f", icon: "⬡" },
  { name: "Perplexity",  color: "#20b2aa", icon: "◎" },
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
    <div className="rounded-2xl border p-12 text-center"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>

      <div className="spinner w-12 h-12 rounded-full mx-auto mb-5"
        style={{ border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#00e5ff" }} />

      <p className="text-base font-medium text-white mb-1">Analyzing AI Visibility...</p>
      <p className="text-sm mb-5" style={{ color: "#8b8d9e" }}>{url}</p>

      {/* Provider badges */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-7">
        {PROVIDERS.map(p => (
          <span key={p.name}
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
            style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}>
            {p.icon} {p.name}
          </span>
        ))}
        <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>running in parallel</span>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2.5 text-left max-w-xs mx-auto">
        {STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div key={step} className="flex items-center gap-3 text-[13px] font-mono transition-colors duration-300"
              style={{ color: isDone ? "#00e87a" : isActive ? "#00e5ff" : "#8b8d9e" }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "currentColor" }} />
              {isDone ? "✓ " : ""}{step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
