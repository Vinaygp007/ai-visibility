"use client";

import { useEffect } from "react";
import { AnalysisResult } from "@/types";
import ScoreGauge from "./ScoreGauge";
import CategoryCard from "./CategoryCard";
import Recommendations from "./Recommendations";
import PromptResponsePanel from "./PromptResponsePanel";
import CitationsPanel from "./CitationsPanel";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AnalysisResult | null;
}

function getScoreColor(score: number) {
  if (score >= 70) return "#00e87a";
  if (score >= 40) return "#ffb830";
  return "#ff5a5a";
}

function timeAgo(ms: number | null): string {
  if (!ms) return "Unknown date";
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export default function ReportModal({ isOpen, onClose, report }: ReportModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  console.log("📊 MODAL - Full Report Data:", report);
  console.log("📊 Categories:", report.categories);
  console.log("📊 Citations:", report.citations);
  console.log("📊 AI Platform Coverage:", report.ai_platform_coverage);
  console.log("📊 Providers:", report._providers);

  // Normalize providers & citations to match ResultsSection behavior
  const providers = report._providers ?? [];
  const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const enabledKeys = new Set(providers.map((p) => normName(p.name)));
  const isCitationEnabled = (citProvider: string) => {
    const citKey = normName(citProvider);
    for (const key of enabledKeys) {
      const minLen = Math.min(key.length, citKey.length, 6);
      if (key.slice(0, minLen) === citKey.slice(0, minLen)) return true;
    }
    return false;
  };

  const citations = (report.citations ?? []).filter((c) => isCitationEnabled(c.provider));
  const maxCitations = Math.max(...citations.map((c) => c.count), 1);
  const totalCitations = citations.reduce((sum, c) => sum + c.count, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{ color: "#f0f0f5" }}
        >
          <span className="text-2xl">×</span>
        </button>

        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "#0e0f17",
            borderColor: "rgba(0,229,255,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            className="px-8 py-6 border-b"
            style={{
              background: "linear-gradient(135deg, rgba(66,133,244,0.08) 0%, rgba(0,229,255,0.08) 100%)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-white mb-2">{report.site_name}</h2>
                <a
                  href={report.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-mono hover:underline"
                  style={{ color: "#4285f4" }}
                >
                  {report.url}
                </a>
                <p className="text-sm mt-3" style={{ color: "#8b8d9e" }}>
                  {report.summary}
                </p>
                {report.createdAt && (
                  <div className="flex items-center gap-3 mt-3">
                    <span
                      className="text-xs font-mono px-2 py-1 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#8b8d9e",
                      }}
                    >
                      Scanned {timeAgo(report.createdAt)}
                    </span>
                    {report._cached && (
                      <span
                        className="text-xs font-mono px-2 py-1 rounded-full"
                        style={{
                          background: "rgba(66,133,244,0.1)",
                          color: "#4285f4",
                          border: "1px solid rgba(66,133,244,0.2)",
                        }}
                      >
                        Cached
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="flex-shrink-0">
                <ScoreGauge
                  value={report.overall_score}
                  label={report.grade}
                  color={getScoreColor(report.overall_score)}
                  fillPercent={report.overall_score}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-8 max-h-[70vh] overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "rgba(0,232,122,0.08)",
                  border: "1px solid rgba(0,232,122,0.2)",
                }}
              >
                <div className="text-2xl font-bold" style={{ color: "#00e87a" }}>
                  {report.stats.checks_passed}
                </div>
                <div className="text-xs mt-1" style={{ color: "#8b8d9e" }}>
                  Passed
                </div>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "rgba(255,184,48,0.08)",
                  border: "1px solid rgba(255,184,48,0.2)",
                }}
              >
                <div className="text-2xl font-bold" style={{ color: "#ffb830" }}>
                  {report.stats.checks_warned}
                </div>
                <div className="text-xs mt-1" style={{ color: "#8b8d9e" }}>
                  Warnings
                </div>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "rgba(255,90,90,0.08)",
                  border: "1px solid rgba(255,90,90,0.2)",
                }}
              >
                <div className="text-2xl font-bold" style={{ color: "#ff5a5a" }}>
                  {report.stats.checks_failed}
                </div>
                <div className="text-xs mt-1" style={{ color: "#8b8d9e" }}>
                  Failed
                </div>
              </div>
            </div>

            {/* Prompts & Responses (reuse Results styling) */}
            {providers.length > 0 && <PromptResponsePanel providers={providers} />}

            {/* Citations (reuse Results styling) */}
            {citations.length > 0 ? (
              <CitationsPanel
                citations={citations}
                maxCitations={maxCitations}
                totalCitations={totalCitations}
              />
            ) : (
              <div
                className="rounded-2xl border p-6 text-center mb-6"
                style={{
                  background: "rgba(0,229,255,0.03)",
                  borderColor: "rgba(0,229,255,0.12)",
                  borderStyle: "dashed",
                }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: "#00e5ff" }}>
                  AI Citations not included
                </p>
                <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
                  Re-scan with the <span style={{ color: "#00e5ff" }}>&ldquo;Include AI Citations&rdquo;</span> toggle on to see how many times each AI agent cites this site.
                </p>
              </div>
            )}

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Detailed Analysis</h3>
              <div className="space-y-4">
                {report.categories.map((cat, idx) => (
                  <CategoryCard key={idx} category={cat} />
                ))}
              </div>
            </div>

            {/* AI Platform Coverage */}
            {report.ai_platform_coverage && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">AI Platform Coverage</h3>
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(report.ai_platform_coverage).map(([platform, status]) => (
                      <div
                        key={platform}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{
                          background:
                            status === "indexed"
                              ? "rgba(0,232,122,0.08)"
                              : "rgba(255,90,90,0.08)",
                          border:
                            status === "indexed"
                              ? "1px solid rgba(0,232,122,0.2)"
                              : "1px solid rgba(255,90,90,0.2)",
                        }}
                      >
                        <span className="text-sm">
                          {status === "indexed" ? "✓" : "✗"}
                        </span>
                        <span
                          className="text-xs font-medium capitalize"
                          style={{
                            color: status === "indexed" ? "#00e87a" : "#ff5a5a",
                          }}
                        >
                          {platform.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            

            {/* AI Prompts & Responses */}
            {report._providers && report._providers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">AI Prompts & Responses</h3>
                <div className="space-y-3">
                  {report._providers.map((provider, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">{provider.name}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: provider.status === "success" ? "rgba(0,232,122,0.1)" : "rgba(255,90,90,0.1)", color: provider.status === "success" ? "#00e87a" : "#ff5a5a" }}>{provider.status}</span>
                        </div>
                        <div className="text-xs font-mono" style={{ color: "#8b8d9e" }}>{(provider.durationMs / 1000).toFixed(1)}s</div>
                      </div>

                      {provider.prompt && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-white mb-1">Prompt</div>
                          <pre className="text-xs p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", color: "#f0f0f5" }}>{provider.prompt}</pre>
                        </div>
                      )}

                      {provider.rawResponse && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-white mb-1">Raw Response</div>
                          <pre className="text-xs p-3 rounded" style={{ background: "rgba(255,255,255,0.02)", color: "#f0f0f5" }}>{provider.rawResponse}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
              <Recommendations recommendations={report.recommendations} />
            </div>

            {/* Providers Debug Info */}
            {report._providers && report._providers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Provider Analysis</h3>
                <div className="space-y-2">
                  {report._providers.map((provider, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">
                          {provider.name}
                        </span>
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              provider.status === "success"
                                ? "rgba(0,232,122,0.1)"
                                : "rgba(255,90,90,0.1)",
                            color:
                              provider.status === "success" ? "#00e87a" : "#ff5a5a",
                          }}
                        >
                          {provider.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {provider.score !== null && (
                          <span className="text-sm font-semibold" style={{ color: getScoreColor(provider.score) }}>
                            {provider.score}
                          </span>
                        )}
                        <span className="text-xs font-mono" style={{ color: "#8b8d9e" }}>
                          {(provider.durationMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-8 py-4 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border text-sm font-medium transition-all hover:border-[#00e5ff]/50"
              style={{
                borderColor: "rgba(255,255,255,0.13)",
                color: "#f0f0f5",
                background: "transparent",
              }}
            >
              Close
            </button>
            <a
              href={report.url}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
              style={{ background: "#00e5ff", color: "#000" }}
            >
              Visit Site →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
