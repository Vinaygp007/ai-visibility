"use client";

import { useState, useRef, useEffect } from "react";
import { ProviderMeta } from "@/types";

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)", icon: "✦" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)", icon: "⬡" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)", icon: "⬡" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)", icon: "◎" },
  "Claude 3.5 Sonnet":     { color: "#c17c4e", bg: "rgba(193,124,78,0.08)",  border: "rgba(193,124,78,0.25)", icon: "◈" },
  "Microsoft Copilot":     { color: "#0078d4", bg: "rgba(0,120,212,0.08)",   border: "rgba(0,120,212,0.25)", icon: "⊞" },
};

interface PromptResponsePanelProps {
  providers: ProviderMeta[];
}

export default function PromptResponsePanel({ providers }: PromptResponsePanelProps) {
  const [activeProvider, setActiveProvider] = useState<string>(providers[0]?.name || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeProviderData = providers.find((p) => p.name === activeProvider);
  const cfg = PROVIDER_COLORS[activeProvider] ?? {
    color: "#8b8d9e",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.1)",
    icon: "◎",
  };

  if (providers.length === 0) return null;

  return (
    <div
      className="rounded-2xl border mb-6 overflow-hidden"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3.5 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)" }}
      >
        {/* Left: title */}
        <div className="flex items-center gap-3">
          <span
            className="text-[13px] font-mono tracking-widest uppercase"
            style={{ color: "#8b8d9e" }}
          >
            AI Prompts &amp; Responses
          </span>
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded-full"
            style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.05)" }}
          >
            {providers.length} {providers.length === 1 ? "model" : "models"}
          </span>
        </div>

        {/* Right: provider dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all hover:opacity-90"
            style={{
              color: cfg.color,
              background: cfg.bg,
              borderColor: cfg.border,
            }}
          >
            <span style={{ fontSize: 12 }}>{cfg.icon}</span>
            <span>{activeProvider}</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{
                color: cfg.color,
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 rounded-xl border z-20 overflow-hidden min-w-[220px]"
              style={{
                background: "#181a25",
                borderColor: "rgba(255,255,255,0.1)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {providers.map((p) => {
                const pCfg = PROVIDER_COLORS[p.name] ?? {
                  color: "#8b8d9e", bg: "rgba(255,255,255,0.03)",
                  border: "rgba(255,255,255,0.1)", icon: "◎",
                };
                const isSelected = activeProvider === p.name;
                const isOk = p.status === "success";
                return (
                  <button
                    key={p.name}
                    onClick={() => {
                      setActiveProvider(p.name);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-all hover:bg-white/5"
                    style={{
                      color: isSelected ? pCfg.color : "#c9cdd4",
                      background: isSelected ? pCfg.bg : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 11 }}>{pCfg.icon}</span>
                      <span className="font-medium">{p.name}</span>
                      {!isOk && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.1)" }}
                        >
                          failed
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono" style={{ color: "#4b5563" }}>
                      {p.durationMs}ms
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Response Body ── */}
      <div className="p-5">
        {activeProviderData ? (
          activeProviderData.status === "failed" ? (
            <div
              className="rounded-xl p-5 text-center"
              style={{
                background: "rgba(255,90,90,0.05)",
                border: "1px solid rgba(255,90,90,0.2)",
              }}
            >
              <p className="text-[13px] font-medium mb-2" style={{ color: "#ff5a5a" }}>
                ✗ Request Failed
              </p>
              <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                {activeProviderData.error || "No error details available"}
              </p>
            </div>
          ) : (
            <div>
              {/* Response label + copy */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-mono uppercase tracking-wider"
                  style={{ color: "#8b8d9e" }}
                >
                  Response from {activeProviderData.name}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(activeProviderData.rawResponse)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                  style={{
                    color: cfg.color,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  Copy JSON
                </button>
              </div>

              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-xl overflow-x-auto"
                style={{
                  color: "#c9cdd4",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${cfg.border}`,
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
              >
                {activeProviderData.rawResponse || "{}"}
              </pre>
            </div>
          )
        ) : (
          <p className="text-[12px] text-center py-8" style={{ color: "#8b8d9e" }}>
            No provider data available
          </p>
        )}
      </div>

      {/* ── Tip Footer ── */}
      <div
        className="px-5 py-3 border-t"
        style={{
          borderColor: "rgba(255,255,255,0.07)",
          background: "rgba(0,229,255,0.02)",
        }}
      >
        <p className="text-[11px]" style={{ color: "#8b8d9e" }}>
          <strong style={{ color: "#00e5ff" }}>💡 Tip:</strong> Raw JSON responses from each AI model used to generate your analysis. Copy and reuse for testing.
        </p>
      </div>
    </div>
  );
}