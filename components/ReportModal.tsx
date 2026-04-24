"use client";

import { useEffect } from "react";
import { AnalysisResult } from "@/types";
import ScoreGauge from "./ScoreGauge";
import CategoryCard from "./CategoryCard";
import Recommendations from "./Recommendations";
import PromptResponsePanel from "./PromptResponsePanel";
import CitationsPanel from "./CitationsPanel";

function extractResponseText(rawResponse: string): string {
  try {
    const json = JSON.parse(rawResponse);
    if (json?.candidates?.[0]?.content?.parts?.[0]?.text) return json.candidates[0].content.parts[0].text;
    if (json?.choices?.[0]?.message?.content) return json.choices[0].message.content;
    if (json?.content?.[0]?.text) return json.content[0].text;
    return JSON.stringify(json, null, 2);
  } catch {
    return rawResponse;
  }
}

async function exportDocx(report: AnalysisResult) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TableRow, TableCell, Table, WidthType, ShadingType } = await import("docx");

  const scannedAt = report.createdAt ? new Date(report.createdAt).toLocaleString() : "Unknown";

  const h1 = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 } });

  const h2 = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });

  const body = (text: string) =>
    new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 80 } });

  const label = (lbl: string, val: string) =>
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${lbl}  `, bold: true, size: 22 }),
        new TextRun({ text: val, size: 22 }),
      ],
    });

  const mono = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, font: "Courier New", size: 20, color: "444466" })],
      spacing: { after: 60 },
      shading: { type: ShadingType.SOLID, color: "F4F4F8", fill: "F4F4F8" },
      indent: { left: 360 },
    });

  const checkRow = (status: string, lbl: string, detail?: string) => {
    const icon = status === "pass" ? "✓" : status === "warn" ? "⚠" : "✗";
    const color = status === "pass" ? "1a7f4b" : status === "warn" ? "b45309" : "b91c1c";
    return new Paragraph({
      spacing: { after: 50 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: `${icon}  `, bold: true, color, size: 21 }),
        new TextRun({ text: lbl, size: 21 }),
        ...(detail ? [new TextRun({ text: `  — ${detail}`, color: "888888", size: 20 })] : []),
      ],
    });
  };

  const divider = () =>
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "DDDDEE" } },
      spacing: { before: 120, after: 120 },
      children: [],
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  // ── Title ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "AI Visibility Report", bold: true, size: 52, color: "1a1a2e" })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 160 },
    })
  );

  // ── Meta ──
  children.push(label("Site:", report.site_name));
  children.push(label("URL:", report.url));
  children.push(label("Score:", `${report.overall_score} / 100  —  Grade: ${report.grade}`));
  children.push(label("Scanned:", scannedAt));
  children.push(divider());

  // ── Summary ──
  children.push(h1("Summary"));
  children.push(body(report.summary));
  children.push(divider());

  // ── Checks stats ──
  if (report.stats) {
    children.push(h1("Checks Overview"));
    children.push(label("Passed:", String(report.stats.checks_passed)));
    children.push(label("Warnings:", String(report.stats.checks_warned)));
    children.push(label("Failed:", String(report.stats.checks_failed)));
    children.push(divider());
  }

  // ── AI Platform Coverage ──
  if (report.ai_platform_coverage) {
    children.push(h1("AI Platform Coverage"));
    for (const [platform, status] of Object.entries(report.ai_platform_coverage)) {
      const icon = status === "indexed" ? "✓" : "✗";
      const color = status === "indexed" ? "1a7f4b" : "b91c1c";
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${icon}  `, bold: true, color, size: 21 }),
            new TextRun({ text: platform.replace(/_/g, " "), size: 21, bold: true }),
            new TextRun({ text: `  —  ${status}`, size: 21, color: "888888" }),
          ],
        })
      );
    }
    children.push(divider());
  }

  // ── Detailed Analysis ──
  if (report.categories?.length) {
    children.push(h1("Detailed Analysis"));
    for (const cat of report.categories) {
      children.push(h2(`${cat.icon ?? ""} ${cat.name}  —  ${cat.score}/100`));
      for (const chk of cat.checks ?? []) {
        children.push(checkRow(chk.status, chk.label, chk.detail));
      }
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }
    children.push(divider());
  }

  // ── Recommendations ──
  if (report.recommendations?.length) {
    children.push(h1("Recommendations"));
    for (const rec of report.recommendations) {
      const priorityColor = rec.priority === "high" ? "b91c1c" : rec.priority === "medium" ? "b45309" : "1a7f4b";
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({ text: `[${rec.priority.toUpperCase()}]  `, bold: true, color: priorityColor, size: 21 }),
            new TextRun({ text: rec.title, bold: true, size: 22 }),
          ],
        })
      );
      children.push(body(rec.description));
      if (rec.impact) children.push(label("Impact:", rec.impact));
    }
    children.push(divider());
  }

  // ── AI Prompts & Responses ──
  if (report._providers?.length) {
    children.push(h1("AI Analysis Prompts & Responses"));
    for (const p of report._providers) {
      children.push(h2(`${p.name}  (${p.durationMs}ms)`));
      children.push(new Paragraph({ children: [new TextRun({ text: "Prompt", bold: true, size: 20, color: "555577" })], spacing: { after: 40 } }));
      for (const line of p.prompt.split("\n")) children.push(mono(line));
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      if (p.status === "success") {
        children.push(new Paragraph({ children: [new TextRun({ text: "Response", bold: true, size: 20, color: "555577" })], spacing: { after: 40 } }));
        for (const line of extractResponseText(p.rawResponse).split("\n")) children.push(body(line));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: `✗ Failed: ${p.error ?? "Unknown error"}`, color: "b91c1c", size: 21 })], spacing: { after: 80 } }));
      }
    }
    children.push(divider());
  }

  // ── Citation Queries ──
  if (report.citations?.length) {
    children.push(h1("AI Citation Queries"));
    for (const c of report.citations) {
      children.push(h2(`${c.provider}  —  ${c.count} citation${c.count !== 1 ? "s" : ""}`));
      if (c.systemPrompt) {
        children.push(new Paragraph({ children: [new TextRun({ text: "System Prompt", bold: true, size: 20, color: "555577" })], spacing: { after: 40 } }));
        for (const line of c.systemPrompt.split("\n")) children.push(mono(line));
        children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      }
      children.push(new Paragraph({ children: [new TextRun({ text: "Query", bold: true, size: 20, color: "555577" })], spacing: { after: 40 } }));
      children.push(body(c.query));
      children.push(new Paragraph({ children: [new TextRun({ text: "Response", bold: true, size: 20, color: "555577" })], spacing: { after: 40 } }));
      for (const line of c.rawAnswer.split("\n")) children.push(body(line));
      if (c.allCitationUrls?.length) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Cited URLs (${c.allCitationUrls.length})`, bold: true, size: 20, color: "555577" })], spacing: { before: 100, after: 40 } }));
        c.allCitationUrls.forEach((url, i) => {
          children.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [new TextRun({ text: `${i + 1}.  ${url}`, size: 20, color: "1a56db" })] }));
        });
      }
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  }

  // ── Footer ──
  children.push(divider());
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated by AI Visibility Scope  ·  ${new Date().toLocaleDateString()}`, size: 18, color: "aaaaaa" })],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        heading1: { run: { bold: true, size: 28, color: "1a1a2e" }, paragraph: { spacing: { before: 280, after: 100 } } },
        heading2: { run: { bold: true, size: 24, color: "333355" }, paragraph: { spacing: { before: 180, after: 60 } } },
      },
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  a.href = url;
  const slug = report.site_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  a.download = `ai-visibility-${slug}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

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

            {/* Prompts & Responses */}
            {(providers.length > 0 || citations.length > 0) && (
              <PromptResponsePanel providers={providers} citations={citations} />
            )}

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

            

            

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
              <Recommendations recommendations={report.recommendations} />
            </div>

            
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportDocx(report)}
                className="px-5 py-2.5 rounded-xl border text-sm font-medium transition-all hover:border-white/30 flex items-center gap-2"
                style={{
                  borderColor: "rgba(255,255,255,0.13)",
                  color: "#c9cdd4",
                  background: "transparent",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M6.5 1v7M3.5 5.5L6.5 9l3-3.5M1.5 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Export .docx
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
    </div>
  );
}
