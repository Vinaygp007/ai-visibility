"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Fetching robots.txt & llms.txt",            detail: "checking crawler permissions" },
  { label: "Scanning HTML, meta tags & structured data", detail: "schema markup, Open Graph, Core Web Vitals" },
  { label: "Auditing 14 AI bot permissions",             detail: "GPTBot, ClaudeBot, PerplexityBot & more" },
  { label: "Querying Gemini, ChatGPT & Perplexity",      detail: "running in parallel simultaneously" },
  { label: "Scoring & generating your AI Scope report",  detail: "merging results, calculating grade" },
];

const PROVIDERS = [
  { name: "Gemini 2.0", color: "#4285f4", icon: "✦" },
  { name: "ChatGPT",    color: "#10a37f", icon: "⬡" },
  { name: "Perplexity", color: "#20b2aa", icon: "◎" },
];

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function LoadingSection({ url }: { url: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const domain = extractDomain(url);

  useEffect(() => {
    setActiveStep(0);
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [url]);

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <div
      className="rounded-2xl border p-10"
      style={{
        background: "var(--c-surface)",
        borderColor: "var(--c-border-strong)",
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        {/* Spinner */}
        <div
          className="spinner w-14 h-14 rounded-full mx-auto mb-5"
          style={{
            border: "3px solid var(--c-border-strong)",
            borderTopColor: "var(--c-accent)",
          }}
        />

        <p className="text-lg font-semibold mb-1" style={{ color: "var(--c-text)" }}>
          Auditing AI Visibility
        </p>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono mt-1"
          style={{
            background: "var(--c-surface2)",
            borderColor: "var(--c-border)",
            color: "var(--c-muted)",
          }}
        >
          <span style={{ color: "var(--c-accent)", fontSize: 12 }}>🌐</span>
          {domain}
        </div>
      </div>

      {/* Provider badges */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-7">
        {PROVIDERS.map((p) => (
          <span
            key={p.name}
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
            style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}
          >
            {p.icon} {p.name}
          </span>
        ))}
        <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>
          running in parallel
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full max-w-sm mx-auto rounded-full mb-7 overflow-hidden"
        style={{ height: 4, background: "var(--c-border-strong)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--c-accent2), var(--c-accent))",
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        {STEPS.map((step, i) => {
          const isDone   = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div
              key={step.label}
              className="flex items-start gap-3 transition-all duration-300"
              style={{ opacity: isDone || isActive ? 1 : 0.35 }}
            >
              {/* Dot / check */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold transition-all duration-300"
                style={{
                  background: isDone
                    ? "var(--c-accent)"
                    : isActive
                    ? "rgba(0,229,255,0.15)"
                    : "var(--c-surface2)",
                  border: isActive
                    ? "1.5px solid var(--c-accent)"
                    : isDone
                    ? "none"
                    : "1.5px solid var(--c-border-strong)",
                  color: isDone ? "#000" : "var(--c-accent)",
                }}
              >
                {isDone ? "✓" : isActive ? <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--c-accent)" }} /> : ""}
              </div>

              {/* Text */}
              <div>
                <div
                  className="text-[13px] font-medium leading-tight"
                  style={{
                    color: isDone
                      ? "var(--c-text)"
                      : isActive
                      ? "var(--c-accent)"
                      : "var(--c-muted)",
                  }}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--c-muted)" }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] font-mono mt-8" style={{ color: "var(--c-muted)" }}>
        This usually takes 15–45 seconds · please don&apos;t close this tab
      </p>
    </div>
  );
}
