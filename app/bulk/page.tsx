"use client";

import { useState, useRef, useCallback } from "react";
import { AnalysisResult } from "@/types";
import CategoryCard from "@/components/CategoryCard";
import Recommendations from "@/components/Recommendations";
import ScoreGauge from "@/components/ScoreGauge";
import PromptResponsePanel from "@/components/PromptResponsePanel";
import CitationsPanel from "@/components/CitationsPanel";

// ── Types ──────────────────────────────────────────────────────────────────
type RowStatus = "queued" | "running" | "success" | "failed";

interface BulkRow {
  url: string;
  status: RowStatus;
  score?: number;
  grade?: string;
  site_name?: string;
  summary?: string;
  error?: string;
  duration?: number;
  /** Full analysis result — only present after a successful scan */
  fullData?: AnalysisResult;
}

type JobPhase = "idle" | "running" | "done" | "error";

function scoreColor(score?: number) {
  if (score == null) return "#8b8d9e";
  if (score >= 70) return "#00e87a";
  if (score >= 40) return "#ffb830";
  return "#ff5a5a";
}

function gradeColor(grade?: string) {
  if (!grade) return "#8b8d9e";
  if (grade.startsWith("A")) return "#00e87a";
  if (grade.startsWith("B")) return "#7ec8e3";
  if (grade.startsWith("C")) return "#ffb830";
  return "#ff5a5a";
}

function durationLabel(ms?: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Strip HTML / markdown to plain text ────────────────────────────────────
function toPlainText(raw: string): string {
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── PDF Export ─────────────────────────────────────────────────────────────
async function exportPdf(rows: BulkRow[]) {
  // Dynamically load jsPDF from CDN
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 16;
  const COL_W = PAGE_W - MARGIN * 2;
  const LINE = 5.5;   // normal line height
  let y = MARGIN;

  // ── Plain-text helpers ──────────────────────────────────────────────────

  const newPage = () => {
    doc.addPage();
    y = MARGIN;
  };

  const needsSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) newPage();
  };

  // Write one line of text; auto-wraps via splitTextToSize; returns after last line
  const writeLine = (text: string, fontSize: number, style: "normal" | "bold" | "italic" = "normal", indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setTextColor(30, 30, 30);
    const lines: string[] = doc.splitTextToSize(text, COL_W - indent);
    lines.forEach((line: string) => {
      needsSpace(LINE);
      doc.text(line, MARGIN + indent, y);
      y += LINE;
    });
  };

  const writeLabel = (text: string) => {
    y += 2;
    needsSpace(LINE + 1);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += LINE;
    // underline
    doc.setDrawColor(180, 180, 180);
    doc.line(MARGIN, y - 1, MARGIN + COL_W, y - 1);
    y += 2;
  };

  const writeSeparator = () => {
    needsSpace(6);
    doc.setDrawColor(210, 210, 210);
    doc.line(MARGIN, y, MARGIN + COL_W, y);
    y += 5;
  };

  const successRows = rows.filter((r) => r.status === "success");
  const failedRows  = rows.filter((r) => r.status === "failed");
  const avgScore    = successRows.length
    ? Math.round(successRows.reduce((s, r) => s + (r.score ?? 0), 0) / successRows.length)
    : 0;

  // ══════════════════════════════════════════════════════════════════
  // PAGE 1 — SUMMARY
  // ══════════════════════════════════════════════════════════════════

  // Title block
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("AiScope — AI Visibility Bulk Report", MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
  y += 5;
  doc.text("by Marcstrat", MARGIN, y);
  y += 8;

  writeSeparator();

  // Summary stats
  writeLabel("Summary");
  writeLine(`Total URLs scanned : ${rows.length}`, 10);
  writeLine(`Passed             : ${successRows.length}`, 10);
  writeLine(`Failed             : ${failedRows.length}`, 10);
  writeLine(`Average score      : ${avgScore} / 100`, 10);
  y += 4;

  // Score distribution
  const bucketA = successRows.filter((r) => (r.score ?? 0) >= 70).length;
  const bucketB = successRows.filter((r) => (r.score ?? 0) >= 40 && (r.score ?? 0) < 70).length;
  const bucketC = successRows.filter((r) => (r.score ?? 0) < 40).length;

  writeLabel("Score Distribution");
  writeLine(`Good  (70-100) : ${bucketA} site${bucketA !== 1 ? "s" : ""}`, 10);
  writeLine(`Fair  (40-69)  : ${bucketB} site${bucketB !== 1 ? "s" : ""}`, 10);
  writeLine(`Poor  (0-39)   : ${bucketC} site${bucketC !== 1 ? "s" : ""}`, 10);
  y += 4;

  // Top performers
  const topRows = [...successRows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
  if (topRows.length) {
    writeLabel("Top Performers");
    topRows.forEach((row, i) => {
      const name = (row.site_name || row.url.replace(/^https?:\/\//, "")).slice(0, 60);
      writeLine(`${i + 1}. ${name}  —  Score: ${row.score ?? "—"}  Grade: ${row.grade ?? "—"}`, 9);
    });
    y += 4;
  }

  // Failed sites
  if (failedRows.length) {
    writeLabel("Failed Sites");
    failedRows.slice(0, 10).forEach((row) => {
      writeLine(`• ${row.url.replace(/^https?:\/\//, "").slice(0, 60)}`, 9);
      if (row.error) writeLine(`  Error: ${row.error.slice(0, 80)}`, 8, "italic", 4);
    });
    y += 4;
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 2 — FULL RESULTS TABLE
  // ══════════════════════════════════════════════════════════════════
  newPage();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("All Results", MARGIN, y);
  y += 8;
  writeSeparator();

  rows.forEach((row, idx) => {
    needsSpace(16);
    const status = row.status === "success" ? "PASS" : row.status === "failed" ? "FAIL" : row.status.toUpperCase();
    const name = (row.site_name && row.site_name !== row.url) ? row.site_name : "";
    const url = row.url.replace(/^https?:\/\//, "");
    const dur = row.duration ? (row.duration < 1000 ? `${row.duration}ms` : `${(row.duration / 1000).toFixed(1)}s`) : "";

    writeLine(`${idx + 1}. [${status}]  ${url}`, 9, "bold");
    if (name) writeLine(`   ${name}`, 8, "normal", 4);
    if (row.score != null) writeLine(`   Score: ${row.score}/100   Grade: ${row.grade ?? "—"}   Time: ${dur}`, 8, "normal", 4);
    if (row.summary) writeLine(`   ${row.summary}`, 8, "italic", 4);
    if (row.error)   writeLine(`   Error: ${row.error}`, 8, "italic", 4);
    y += 3;
  });

  // ══════════════════════════════════════════════════════════════════
  // DETAIL PAGES — one per successful row with fullData
  // ══════════════════════════════════════════════════════════════════
  const detailRows = rows.filter((r) => r.status === "success" && r.fullData);

  detailRows.forEach((row) => {
    const fd = row.fullData!;
    newPage();

    // Site header
    const siteName = fd.site_name || row.url;
    writeLine(siteName, 16, "bold");
    writeLine(row.url, 9, "normal");
    y += 2;
    writeLine(`Score: ${row.score ?? "—"} / 100   Grade: ${row.grade ?? "—"}`, 10, "bold");
    if (fd.summary) {
      y += 2;
      writeLine(fd.summary, 9, "italic");
    }
    writeSeparator();

    // Stats
    writeLabel("Checks");
    writeLine(`Passed: ${fd.stats?.checks_passed ?? 0}   Warnings: ${fd.stats?.checks_warned ?? 0}   Failed: ${fd.stats?.checks_failed ?? 0}`, 10);
    y += 3;

    // AI Provider Results
    const providers = fd._providers ?? [];
    if (providers.length > 0) {
      writeLabel("AI Provider Results");
      providers.forEach((p) => {
        const status2 = p.status === "success" ? "OK" : "FAILED";
        writeLine(`${p.name}  [${status2}]  Score: ${p.score ?? "—"}  Time: ${p.durationMs}ms`, 9, "bold");

        let responseText = "";
        if (p.rawResponse) {
          try {
            const parsed = JSON.parse(p.rawResponse);
            responseText =
              parsed?.choices?.[0]?.message?.content ||
              parsed?.candidates?.[0]?.content?.parts?.[0]?.text ||
              parsed?.content || parsed?.answer || parsed?.text ||
              JSON.stringify(parsed, null, 2);
          } catch {
            responseText = p.rawResponse;
          }
        }
        const cleanText = toPlainText(responseText);
        if (cleanText) {
          writeLine(cleanText, 8, "normal", 4);
        } else if (p.error) {
          writeLine(`Error: ${p.error}`, 8, "italic", 4);
        }
        y += 3;
      });
    }

    // AI Citations
    const normName2 = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const enabledKeys2 = new Set(providers.map((p) => normName2(p.name)));
    const isCitEnabled = (citProvider: string) => {
      const citKey = normName2(citProvider);
      for (const key of enabledKeys2) {
        const minLen = Math.min(key.length, citKey.length, 6);
        if (key.slice(0, minLen) === citKey.slice(0, minLen)) return true;
      }
      return false;
    };
    const fdCitations = (fd.citations ?? []).filter((c) => isCitEnabled(c.provider));

    if (fdCitations.length > 0) {
      const totalCit = fdCitations.reduce((s, c) => s + c.count, 0);
      writeLabel(`AI Citations  (${totalCit} total)`);
      fdCitations.forEach((cit) => {
        writeLine(`${cit.provider}:  ${cit.count} citation${cit.count !== 1 ? "s" : ""}`, 9, "bold");
        if (cit.rawAnswer) {
          writeLine(toPlainText(cit.rawAnswer), 8, "normal", 4);
        }
        if (cit.allCitationUrls?.length) {
          y += 1;
          writeLine(`Sources cited (${cit.allCitationUrls.length}):`, 8, "bold", 4);
          cit.allCitationUrls.forEach((u) => {
            let domain = u;
            try { domain = new URL(u).hostname.replace(/^www\./, ""); } catch {}
            writeLine(`• ${domain}`, 7, "normal", 8);
          });
        }
        y += 3;
      });
    } else {
      writeLabel("AI Citations");
      writeLine("Not included in this scan. Re-scan with AI Citations toggle ON.", 9, "italic");
      y += 3;
    }

    // AI Platform Coverage
    const coverage = fd.ai_platform_coverage ?? {};
    const covEntries = Object.entries(coverage);
    if (covEntries.length) {
      writeLabel("AI Platform Coverage");
      covEntries.forEach(([platform, status]) => {
        const label = platform.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        writeLine(`${status === "indexed" ? "[Indexed]" : "[Blocked]"}  ${label}`, 9);
      });
      y += 3;
    }

    // Category Breakdown
    if (fd.categories?.length) {
      writeLabel("Category Breakdown");
      fd.categories.forEach((cat) => {
        needsSpace(10);
        writeLine(`${cat.name}  —  ${cat.score}/100`, 10, "bold");
        cat.checks.forEach((check) => {
          const sym = check.status === "pass" ? "[+]" : check.status === "warn" ? "[!]" : "[x]";
          const detail = check.detail ? ` — ${check.detail}` : "";
          writeLine(`  ${sym} ${check.label}${detail}`, 8, "normal", 4);
        });
        y += 2;
      });
    }

    // Recommendations
    if (fd.recommendations?.length) {
      writeLabel("Recommendations");
      fd.recommendations.forEach((rec, ri) => {
        needsSpace(10);
        const priority = (rec.priority ?? "medium").toUpperCase();
        writeLine(`${ri + 1}. [${priority}] ${rec.title}`, 9, "bold");
        if (rec.description) writeLine(rec.description, 8, "normal", 4);
        if (rec.impact) writeLine(`Impact: ${rec.impact}`, 8, "italic", 4);
        y += 2;
      });
    }
  });

  // Page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("AiScope Bulk Report — by Marcstrat", MARGIN, PAGE_H - 8);
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  // Save
  doc.save(`aiscope-bulk-report-${Date.now()}.pdf`);
}

// ── Parse URLs from textarea ───────────────────────────────────────────────
function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (u.startsWith("http") ? u : "https://" + u))
    .filter((u) => {
      try { new URL(u); return true; } catch { return false; }
    })
    .slice(0, 500);
}

// ── Mini progress ring ─────────────────────────────────────────────────────
function Ring({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

// ── AI Platform Coverage (inline, no extra import needed) ──────────────────
const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: "⬡", claude: "◈", perplexity: "◎", gemini: "✦",
  meta_ai: "⬟", you_com: "◉", duckduckgo: "⊙", apple: "◆",
};

const PROVIDER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  "Gemini 2.0 Flash":      { color: "#4285f4", bg: "rgba(66,133,244,0.08)",  border: "rgba(66,133,244,0.25)" },
  "ChatGPT (GPT-4o)":      { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "ChatGPT (GPT-4o-mini)": { color: "#10a37f", bg: "rgba(16,163,127,0.08)", border: "rgba(16,163,127,0.25)" },
  "Perplexity Sonar":      { color: "#20b2aa", bg: "rgba(32,178,170,0.08)",  border: "rgba(32,178,170,0.25)" },
};

// ── Full detail panel rendered beneath an expanded row ─────────────────────
function BulkDetailPanel({ result }: { result: AnalysisResult }) {
  const sc = scoreColor(result.overall_score);

  const providers = result._providers ?? [];
  const successfulProviders = providers.filter((p) => p.status === "success");

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

  const citations = (result.citations ?? []).filter((c) => isCitationEnabled(c.provider));
  const maxCitations = Math.max(...citations.map((c) => c.count), 1);
  const totalCitations = citations.reduce((sum, c) => sum + c.count, 0);

  const coverage = result.ai_platform_coverage ?? {};
  const coverageEntries = Object.entries(coverage);
  const indexedCount = coverageEntries.filter(([, v]) => v === "indexed").length;

  return (
    <div
      className="px-6 pb-8 pt-2"
      style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* ── Score gauges ── */}
      <div className="flex gap-3 flex-wrap pt-6 pb-6">
        <ScoreGauge
          value={result.overall_score}
          label="AI SCORE"
          color={sc}
          fillPercent={result.overall_score}
        />
        <ScoreGauge
          value={result.grade}
          label="GRADE"
          color={gradeColor(result.grade)}
          fillPercent={100}
        />
        {/* Quick stat pills */}
        <div className="flex gap-3 items-center flex-wrap ml-2">
          {[
            { val: result.stats?.checks_passed ?? 0, label: "PASSED", color: "#00e87a" },
            { val: result.stats?.checks_warned ?? 0, label: "WARNINGS", color: "#ffb830" },
            { val: result.stats?.checks_failed ?? 0, label: "FAILED",  color: "#ff5a5a" },
          ].map(({ val, label, color }) => (
            <div
              key={label}
              className="rounded-xl border px-4 py-3 text-center min-w-[80px]"
              style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <div className="text-xl font-bold" style={{ color }}>{val}</div>
              <div className="text-[10px] font-mono mt-0.5 tracking-wide" style={{ color: "#8b8d9e" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Prompts & Responses ── */}
      {providers.length > 0 && <PromptResponsePanel providers={providers} />}

      {/* ── Citations panel ── */}
      {citations.length > 0 ? (
        <CitationsPanel
          citations={citations}
          maxCitations={maxCitations}
          totalCitations={totalCitations}
        />
      ) : (
        <div
          className="rounded-2xl border p-5 text-center mb-6"
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
            Re-run with the <span style={{ color: "#00e5ff" }}>&ldquo;AI Citations&rdquo;</span> toggle on to see citation data.
          </p>
        </div>
      )}

      {/* ── AI Provider Results ── */}
      {providers.length > 0 && (
        <div
          className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
              AI Provider Results
            </div>
            <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
              {successfulProviders.length}/{providers.length} succeeded · scores averaged
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {providers.map((p) => {
              const cfg = PROVIDER_COLORS[p.name] ?? {
                color: "#8b8d9e",
                bg: "rgba(255,255,255,0.03)",
                border: "rgba(255,255,255,0.1)",
              };
              const isOk = p.status === "success";
              return (
                <div
                  key={p.name}
                  className="rounded-xl border p-4"
                  style={{
                    background: isOk ? cfg.bg : "rgba(255,90,90,0.04)",
                    borderColor: isOk ? cfg.border : "rgba(255,90,90,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium" style={{ color: isOk ? cfg.color : "#ff5a5a" }}>
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "#8b8d9e" }}>{p.durationMs}ms</span>
                  </div>
                  {isOk ? (
                    <div>
                      <div
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: p.score != null ? scoreColor(p.score) : "#8b8d9e" }}
                      >
                        {p.score ?? "—"}
                      </div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: "#8b8d9e" }}>score / 100</div>
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: "#ff5a5a" }}>
                      {p.error?.slice(0, 60) ?? "Failed"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI Platform Coverage ── */}
      {coverageEntries.length > 0 && (
        <div
          className="rounded-2xl border p-5 mb-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
              AI Platform Coverage
            </div>
            <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
              {indexedCount}/{coverageEntries.length} indexed
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {coverageEntries.map(([platform, status]) => {
              const isIndexed = status === "indexed";
              const label = platform.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <div
                  key={platform}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 border"
                  style={{
                    background: isIndexed ? "rgba(0,232,122,0.06)" : "rgba(255,90,90,0.06)",
                    borderColor: isIndexed ? "rgba(0,232,122,0.2)" : "rgba(255,90,90,0.2)",
                  }}
                >
                  <span style={{ fontSize: 12, color: isIndexed ? "#00e87a" : "#ff5a5a" }}>
                    {PLATFORM_ICONS[platform] ?? "◎"}
                  </span>
                  <div>
                    <div className="text-[11px] font-medium text-white">{label}</div>
                    <div className="text-[10px] font-mono" style={{ color: isIndexed ? "#00e87a" : "#ff5a5a" }}>
                      {isIndexed ? "indexed" : "blocked"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {result.categories?.length > 0 && (
        <div className="mb-6">
          <div className="text-[13px] font-mono tracking-widest mb-3.5 uppercase" style={{ color: "#8b8d9e" }}>
            Category Breakdown
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.categories.map((cat) => (
              <CategoryCard key={cat.name} category={cat} />
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendations ── */}
      <Recommendations recommendations={result.recommendations} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BulkPage() {
  const [rawInput, setRawInput] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [phase, setPhase] = useState<JobPhase>("idle");
  const [jobId, setJobId] = useState("");
  const [runCitations, setRunCitations] = useState(false);
  const [concurrency, setConcurrency] = useState(3);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [passed, setPassed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [fatalError, setFatalError] = useState("");
  const [filter, setFilter] = useState<"all" | "success" | "failed" | "running" | "queued">("all");
  const [sortBy, setSortBy] = useState<"url" | "score" | "status">("status");
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const parsedUrls = parseUrls(rawInput);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawInput((prev) => prev + "\n" + (ev.target?.result as string));
    reader.readAsText(file);
  }, []);

  const handleStart = async () => {
    if (parsedUrls.length === 0) return;
    abortRef.current = new AbortController();

    const initialRows: BulkRow[] = parsedUrls.map((url) => ({ url, status: "queued" }));
    setRows(initialRows);
    setPhase("running");
    setTotal(parsedUrls.length);
    setCompleted(0);
    setPassed(0);
    setFailed(0);
    setFatalError("");
    setJobId("");
    setExpandedUrl(null);

    try {
      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: parsedUrls, runCitations, concurrency }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        setFatalError(err.error ?? "Server error");
        setPhase("error");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const lines = raw.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "));
          const dataLine = lines.find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event: ", "").trim();
          const data = JSON.parse(dataLine.replace("data: ", "").trim());

          if (event === "start") {
            setJobId(data.jobId);
          }

          if (event === "progress") {
            setRows((prev) =>
              prev.map((r) => r.url === data.url ? { ...r, status: "running" } : r)
            );
          }

          if (event === "result") {
            setCompleted(data.completed);
            setPassed(data.passed);
            setFailed(data.failed);
            setRows((prev) =>
              prev.map((r) =>
                r.url === data.url
                  ? {
                      ...r,
                      status: data.status,
                      score: data.score,
                      grade: data.grade,
                      site_name: data.site_name,
                      summary: data.summary,
                      error: data.error,
                      duration: data.duration,
                      // Store full analysis result
                      fullData: data.fullData ?? undefined,
                    }
                  : r
              )
            );
          }

          if (event === "done") {
            setPhase("done");
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        setPhase("done");
      } else {
        setFatalError(String(err));
        setPhase("error");
      }
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setPhase("done");
  };

  const handleReset = () => {
    setRows([]);
    setPhase("idle");
    setRawInput("");
    setCompleted(0);
    setPassed(0);
    setFailed(0);
    setFatalError("");
    setJobId("");
    setExpandedUrl(null);
  };

  const visibleRows = [...rows]
    .filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => {
      if (sortBy === "score") return (b.score ?? -1) - (a.score ?? -1);
      if (sortBy === "status") {
        const order: Record<RowStatus, number> = { running: 0, queued: 1, success: 2, failed: 3 };
        return order[a.status] - order[b.status];
      }
      return a.url.localeCompare(b.url);
    });

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // ── IDLE / INPUT PHASE ─────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="min-h-screen pl-64" style={{ background: "#0a0b10" }}>
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-20">

          <div className="mb-10">
            <div
              className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
              style={{ color: "#00e5ff", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
            >
              // BULK AI VISIBILITY SCANNER
            </div>
            <h1
              className="text-4xl font-bold tracking-tight mb-3"
              style={{
                background: "linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.45))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              Scan Up to 500 Sites<br />at Once
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: "#8b8d9e" }}>
              Paste URLs (one per line or comma-separated), or upload a .txt / .csv file.
              Results stream in real-time as each site is analysed.
            </p>
          </div>

          <div
            className="rounded-2xl border mb-4 overflow-hidden"
            style={{ background: "#111219", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <span className="text-[11px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
                URLs to scan
              </span>
              <span className="text-[11px] font-mono" style={{ color: parsedUrls.length > 400 ? "#ffb830" : "#8b8d9e" }}>
                {parsedUrls.length} / 500
              </span>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"https://example.com\nhttps://another-site.io\nhttps://third.co"}
              className="w-full bg-transparent border-none outline-none text-[13px] font-mono text-white resize-none p-5"
              rows={12}
              style={{ caretColor: "#00e5ff" }}
            />
          </div>

          <label
            className="flex items-center gap-3 px-5 py-3 rounded-xl border mb-6 cursor-pointer transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
          >
            <span style={{ color: "#8b8d9e", fontSize: 18 }}>📂</span>
            <span className="text-sm" style={{ color: "#8b8d9e" }}>
              Upload <span style={{ color: "#00e5ff" }}>.txt</span> or <span style={{ color: "#00e5ff" }}>.csv</span> file
            </span>
            <input type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => setRunCitations(!runCitations)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all"
              style={{
                background: runCitations ? "rgba(0,229,255,0.1)" : "transparent",
                borderColor: runCitations ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.12)",
                color: runCitations ? "#00e5ff" : "#8b8d9e",
              }}
            >
              <span>{runCitations ? "✓" : "○"}</span>
              AI Citations
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: runCitations ? "rgba(0,229,255,0.12)" : "rgba(255,184,48,0.15)",
                  color: runCitations ? "#00e5ff" : "#ffb830",
                }}
              >
                {runCitations ? "ON" : "OFF"}
              </span>
            </button>

            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "transparent" }}
            >
              <span className="text-sm" style={{ color: "#8b8d9e" }}>Concurrency</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConcurrency(n)}
                    className="w-7 h-7 rounded-md text-xs font-mono transition-all"
                    style={{
                      background: concurrency === n ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.04)",
                      color: concurrency === n ? "#00e5ff" : "#8b8d9e",
                      border: concurrency === n ? "1px solid rgba(0,229,255,0.35)" : "1px solid transparent",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {concurrency >= 5 && (
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 text-[12px]"
              style={{ background: "rgba(255,184,48,0.07)", border: "1px solid rgba(255,184,48,0.2)" }}
            >
              <span>⚠️</span>
              <span style={{ color: "#ffb830" }}>
                High concurrency may hit API rate limits. Start with 3 for reliability.
              </span>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={parsedUrls.length === 0}
            className="w-full py-4 rounded-2xl text-base font-semibold tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-85 active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, #00e5ff, #4285f4)", color: "#000" }}
          >
            {parsedUrls.length === 0
              ? "Paste URLs to begin"
              : `▶ Start Bulk Scan — ${parsedUrls.length} site${parsedUrls.length > 1 ? "s" : ""}`}
          </button>

          <div className="flex flex-wrap gap-4 justify-center mt-6">
            {["Real-time streaming results", "Up to 500 URLs", "CSV export", "Saved to Reports"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "#8b8d9e" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff94" }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RUNNING / DONE PHASE ───────────────────────────────────────────────
  return (
    <div className="min-h-screen pl-64" style={{ background: "#0a0b10" }}>
      <div className="max-w-[1100px] mx-auto px-6 pt-10 pb-20">

        {/* Top stats bar */}
        <div
          className="rounded-2xl border p-5 mb-6 flex flex-wrap items-center gap-6"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
              <Ring pct={pct} color={phase === "done" ? "#00e87a" : "#00e5ff"} />
              <span
                className="absolute text-[10px] font-mono font-bold"
                style={{ color: phase === "done" ? "#00e87a" : "#00e5ff" }}
              >
                {pct}%
              </span>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: phase === "done" ? "#00e87a" : "#fff" }}>
                {phase === "done" ? "Scan Complete" : "Scanning…"}
              </div>
              <div className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
                {completed} / {total} processed
              </div>
            </div>
          </div>

          <div className="flex gap-6 ml-2">
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "#00e87a" }}>{passed}</div>
              <div className="text-[10px] font-mono tracking-wide" style={{ color: "#8b8d9e" }}>PASSED</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "#ff5a5a" }}>{failed}</div>
              <div className="text-[10px] font-mono tracking-wide" style={{ color: "#8b8d9e" }}>FAILED</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "#8b8d9e" }}>{total - completed}</div>
              <div className="text-[10px] font-mono tracking-wide" style={{ color: "#8b8d9e" }}>QUEUED</div>
            </div>
          </div>

          {jobId && (
            <div className="ml-2">
              <div className="text-[10px] font-mono" style={{ color: "#8b8d9e" }}>JOB</div>
              <div className="text-[11px] font-mono" style={{ color: "#4b5563" }}>{jobId}</div>
            </div>
          )}

          <div className="ml-auto flex gap-3">
            {phase === "running" && (
              <button
                onClick={handleStop}
                className="px-4 py-2 rounded-xl border text-sm transition-all"
                style={{ borderColor: "rgba(255,90,90,0.3)", color: "#ff5a5a", background: "rgba(255,90,90,0.05)" }}
              >
                ■ Stop
              </button>
            )}
            {phase === "done" && (
              <>
                <button
                  onClick={() => exportPdf(rows)}
                  className="px-4 py-2 rounded-xl border text-sm transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(0,232,122,0.3)", color: "#00e87a", background: "rgba(0,232,122,0.05)" }}
                >
                  ↓ Export PDF
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-85"
                  style={{ background: "#00e5ff", color: "#000" }}
                >
                  + New Scan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: phase === "done"
                ? "linear-gradient(90deg, #00e87a, #00e5ff)"
                : "linear-gradient(90deg, #00e5ff, #4285f4)",
            }}
          />
        </div>

        {/* Filter + sort bar */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="flex gap-1">
            {(["all", "running", "success", "failed", "queued"] as const).map((f) => {
              const count = f === "all" ? rows.length : rows.filter((r) => r.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                  style={{
                    background: filter === f ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)",
                    color: filter === f ? "#00e5ff" : "#8b8d9e",
                    border: filter === f ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
                  }}
                >
                  {f.toUpperCase()} {count > 0 && <span>({count})</span>}
                </button>
              );
            })}
          </div>

          <div className="flex gap-1 ml-auto">
            {(["status", "score", "url"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                style={{
                  background: sortBy === s ? "rgba(255,255,255,0.07)" : "transparent",
                  color: sortBy === s ? "#fff" : "#8b8d9e",
                }}
              >
                Sort: {s}
              </button>
            ))}
          </div>

          {phase === "done" && (
            <button
              onClick={() => exportPdf(rows)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
              style={{ color: "#00e87a", background: "rgba(0,232,122,0.06)", border: "1px solid rgba(0,232,122,0.2)" }}
            >
              ↓ PDF
            </button>
          )}
        </div>

        {/* Results table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
        >
          {/* Table header */}
          <div
            className="grid text-[10px] font-mono tracking-widest uppercase px-5 py-3 border-b"
            style={{
              gridTemplateColumns: "2fr 90px 60px 60px 1fr 110px",
              borderColor: "rgba(255,255,255,0.07)",
              color: "#4b5563",
            }}
          >
            <span>URL</span>
            <span>STATUS</span>
            <span>SCORE</span>
            <span>GRADE</span>
            <span>SUMMARY</span>
            <span>TIME</span>
          </div>

          {/* Rows */}
          <div>
            {visibleRows.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "#4b5563" }}>
                No rows match filter
              </div>
            ) : (
              visibleRows.map((row) => {
                const sc = scoreColor(row.score);
                const gc = gradeColor(row.grade);
                const isRunning = row.status === "running";
                const isQueued = row.status === "queued";
                const isSuccess = row.status === "success";
                const isExpanded = expandedUrl === row.url;
                const canExpand = isSuccess && !!row.fullData;

                return (
                  <div
                    key={row.url}
                    className="border-b"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    {/* Summary row — clickable if success */}
                    <div
                      className="grid items-center px-5 py-3.5 transition-colors"
                      style={{
                        gridTemplateColumns: "2fr 90px 60px 60px 1fr 110px",
                        background: isRunning
                          ? "rgba(0,229,255,0.03)"
                          : isExpanded
                          ? "rgba(255,255,255,0.03)"
                          : "transparent",
                        cursor: canExpand ? "pointer" : "default",
                      }}
                      onClick={() => canExpand && setExpandedUrl(isExpanded ? null : row.url)}
                    >
                      {/* URL */}
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          {isRunning && (
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                              style={{ background: "#00e5ff" }}
                            />
                          )}
                          {canExpand && (
                            <span
                              className="text-[10px] font-mono flex-shrink-0 transition-transform"
                              style={{
                                color: "#8b8d9e",
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                display: "inline-block",
                              }}
                            >
                              ▶
                            </span>
                          )}
                          <span
                            className="text-[12px] font-mono truncate"
                            style={{ color: isQueued ? "#4b5563" : "#c9cdd4" }}
                          >
                            {row.url.replace(/^https?:\/\//, "")}
                          </span>
                        </div>
                        {row.site_name && row.site_name !== row.url && (
                          <div className="text-[11px] mt-0.5 truncate pl-4" style={{ color: "#8b8d9e" }}>
                            {row.site_name}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {row.status === "success" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "#00e87a", background: "rgba(0,232,122,0.1)" }}>✓ done</span>
                        )}
                        {row.status === "failed" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.1)" }}>✕ failed</span>
                        )}
                        {row.status === "running" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "#00e5ff", background: "rgba(0,229,255,0.1)" }}>⟳ scanning</span>
                        )}
                        {row.status === "queued" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "#4b5563", background: "rgba(255,255,255,0.04)" }}>· queued</span>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-sm font-bold font-mono" style={{ color: sc }}>
                        {row.score != null ? row.score : "—"}
                      </div>

                      {/* Grade */}
                      <div className="text-sm font-bold font-mono" style={{ color: gc }}>
                        {row.grade ?? "—"}
                      </div>

                      {/* Summary / error */}
                      <div
                        className="text-[11px] leading-snug pr-4 truncate"
                        style={{ color: row.error ? "#ff5a5a" : "#8b8d9e" }}
                      >
                        {row.error ? `✕ ${row.error}` : row.summary ?? ""}
                      </div>

                      {/* Duration + expand hint */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono" style={{ color: "#4b5563" }}>
                          {durationLabel(row.duration)}
                        </span>
                        {canExpand && (
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{
                              color: isExpanded ? "#00e5ff" : "#4b5563",
                              background: isExpanded ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)",
                              border: isExpanded ? "1px solid rgba(0,229,255,0.2)" : "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            {isExpanded ? "▲ collapse" : "▼ details"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable detail panel */}
                    {isExpanded && row.fullData && (
                      <BulkDetailPanel result={row.fullData} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tip */}
        {phase === "done" && rows.some((r) => r.fullData) && (
          <p className="text-center text-[12px] mt-4" style={{ color: "#4b5563" }}>
            Click any ✓ done row to expand the full analysis report
          </p>
        )}

        {/* Fatal error */}
        {phase === "error" && fatalError && (
          <div
            className="rounded-2xl border p-6 mt-6 text-center"
            style={{ background: "rgba(255,90,90,0.04)", borderColor: "rgba(255,90,90,0.2)" }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: "#ff5a5a" }}>Bulk scan failed</p>
            <p className="text-[12px] mb-4" style={{ color: "#8b8d9e" }}>{fatalError}</p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "#ff5a5a", color: "#000" }}
            >
              ← Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}