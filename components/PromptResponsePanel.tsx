"use client";

import { useState } from "react";
import { ProviderMeta } from "@/types";

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  "Gemini 2.0 Flash":    { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)"  },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "Perplexity Sonar":    { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)"  },
  "Claude 3.5 Sonnet":   { color: "#c17c4e", bg: "rgba(193,124,78,0.08)",  border: "rgba(193,124,78,0.25)"  },
  "Microsoft Copilot":   { color: "#0078d4", bg: "rgba(0,120,212,0.08)",   border: "rgba(0,120,212,0.25)"   },
};

interface PromptResponsePanelProps {
  providers: ProviderMeta[];
}

export default function PromptResponsePanel({ providers }: PromptResponsePanelProps) {
  const [activeProvider, setActiveProvider] = useState<string>(providers[0]?.name || "");
  const [activeTab, setActiveTab] = useState<"prompt" | "response">("prompt");

  const activeProviderData = providers.find(p => p.name === activeProvider);
  const cfg = PROVIDER_COLORS[activeProvider] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border mb-6" style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-mono tracking-widest uppercase mb-1" style={{ color: "#8b8d9e" }}>
              AI Prompts & Responses
            </div>
            <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
              View the exact prompts sent to each AI model and their raw JSON responses
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md" style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.03)" }}>
            {providers.length} {providers.length === 1 ? "model" : "models"}
          </span>
        </div>
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-0 overflow-x-auto border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {providers.map((provider) => {
          const providerCfg = PROVIDER_COLORS[provider.name] ?? { color: "#8b8d9e", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
          const isActive = activeProvider === provider.name;
          const isSuccess = provider.status === "success";

          return (
            <button
              key={provider.name}
              onClick={() => setActiveProvider(provider.name)}
              className="px-5 py-3 text-[12px] font-medium transition-all whitespace-nowrap flex items-center gap-2"
              style={{
                color: isActive ? providerCfg.color : "#8b8d9e",
                background: isActive ? providerCfg.bg : "transparent",
                borderBottom: isActive ? `2px solid ${providerCfg.color}` : "2px solid transparent",
              }}
            >
              <span>{provider.name}</span>
              {!isSuccess && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.1)" }}>
                  failed
                </span>
              )}
              {isSuccess && (
                <span className="text-[9px] font-mono" style={{ color: "#8b8d9e" }}>
                  {provider.durationMs}ms
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {(["prompt", "response"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-all"
              style={{
                color: isActive ? cfg.color : "#8b8d9e",
                background: isActive ? cfg.bg : "transparent",
                borderBottom: isActive ? `2px solid ${cfg.color}` : "2px solid transparent",
              }}
            >
              {tab === "prompt" ? "→ Prompt Sent" : "← Response Received"}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-5">
        {activeProviderData ? (
          <div>
            {activeTab === "prompt" ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>
                    Prompt sent to {activeProviderData.name}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeProviderData.prompt);
                    }}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                    style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    Copy
                  </button>
                </div>
                <pre
                  className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-xl overflow-x-auto"
                  style={{
                    color: "#f0f0f5",
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${cfg.border}`,
                    maxHeight: "500px",
                    overflowY: "auto",
                  }}
                >
                  {activeProviderData.prompt || "No prompt captured"}
                </pre>
              </div>
            ) : (
              <div>
                {activeProviderData.status === "failed" ? (
                  <div className="rounded-xl p-5 text-center" style={{ background: "rgba(255,90,90,0.05)", border: "1px solid rgba(255,90,90,0.2)" }}>
                    <p className="text-[13px] font-medium mb-2" style={{ color: "#ff5a5a" }}>
                      ✗ Request Failed
                    </p>
                    <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                      {activeProviderData.error || "No error details available"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>
                        Raw JSON response from {activeProviderData.name}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeProviderData.rawResponse);
                        }}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity"
                        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
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
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-center py-8" style={{ color: "#8b8d9e" }}>
            No provider data available
          </p>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,229,255,0.02)" }}>
        <p className="text-[11px]" style={{ color: "#8b8d9e" }}>
          <strong style={{ color: "#00e5ff" }}>💡 Tip:</strong> These are the actual prompts and responses used to generate your analysis. 
          You can copy and reuse these prompts for testing or debugging.
        </p>
      </div>
    </div>
  );
}
