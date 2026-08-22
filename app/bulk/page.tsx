"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { AnalysisResult, UserPlan, BotDetail } from "@/types";
import { toPlainText, extractProviderText } from "@/lib/plainText";
import CategoryCard from "@/components/CategoryCard";
import Recommendations from "@/components/Recommendations";
import PromptResponsePanel from "@/components/PromptResponsePanel";
import CitationsPanel from "@/components/CitationsPanel";
import SpeedSection from "@/components/SpeedSection";
import CrawlSection from "@/components/CrawlSection";
import StatCards from "@/components/StatCards";
import ProviderScoreChart from "@/components/ProviderScoreChart";
import BotCoverageTable from "@/components/BotCoverageTable";
import { GeminiIcon, ChatGPTIcon, PerplexityIcon } from "@/components/ProviderIcons";
import {
  Layers, Check, Circle, Upload, AlertTriangle, Play, Square, Download, Plus,
  ChevronRight, CheckCircle2, XCircle, Loader2, X, ArrowLeft,
} from "lucide-react";

const PROVIDERS = [
  { name: "Gemini 2.0", Icon: GeminiIcon, color: "#4285f4" },
  { name: "ChatGPT", Icon: ChatGPTIcon, color: "#10a37f" },
  { name: "Perplexity", Icon: PerplexityIcon, color: "#20b2aa" },
];

const FEATURE_CHIPS = [
  "14 AI Bots Checked",
  "llms.txt Detection",
  "Structured Data",
  "Streams results live",
  "CSV & PDF export",
];

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
  if (score == null) return "var(--text-muted)";
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

function gradeColor(grade?: string) {
  if (!grade) return "var(--text-muted)";
  if (grade.startsWith("A")) return "var(--success)";
  if (grade.startsWith("B")) return "#7ec8e3";
  if (grade.startsWith("C")) return "var(--warning)";
  return "var(--danger)";
}

function durationLabel(ms?: number) {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// using shared plain-text helpers from lib/plainText

// ── PDF Export ─────────────────────────────────────────────────────────────
// Branding follows the pricing page tiers: Free carries a watermark on top
// of the branded footer, Starter/Growth keep the branded footer only, and
// Agency/Scale are white-label (no AiScope branding).
async function exportPdf(rows: BulkRow[], plan: UserPlan) {
  const isWhiteLabel = plan === "agency" || plan === "scale";
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
  doc.text(isWhiteLabel ? "AI Visibility Bulk Report" : "AiScope: AI Visibility Bulk Report", MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
  y += 5;
  if (!isWhiteLabel) {
    doc.text("by Marcstrat", MARGIN, y);
    y += 5;
  }
  y += 3;

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
      writeLine(`${i + 1}. ${name}: Score: ${row.score ?? "-"}  Grade: ${row.grade ?? "-"}`, 9);
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
    if (row.score != null) writeLine(`   Score: ${row.score}/100   Grade: ${row.grade ?? "-"}   Time: ${dur}`, 8, "normal", 4);
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
    writeLine(`Score: ${row.score ?? "-"} / 100   Grade: ${row.grade ?? "-"}`, 10, "bold");
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
        writeLine(`${p.name}  [${status2}]  Score: ${p.score ?? "-"}  Time: ${p.durationMs}ms`, 9, "bold");

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
        writeLine(`${cat.name}: ${cat.score}/100`, 10, "bold");
        cat.checks.forEach((check) => {
          const sym = check.status === "pass" ? "[+]" : check.status === "warn" ? "[!]" : "[x]";
          const detail = check.detail ? `: ${check.detail}` : "";
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

    if (plan === "free") {
      doc.setFontSize(58);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(235, 235, 235);
      doc.text("AISCOPE", PAGE_W / 2, PAGE_H / 2, { align: "center", angle: 45 });
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    if (!isWhiteLabel) doc.text("AiScope Bulk Report · by Marcstrat", MARGIN, PAGE_H - 8);
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  // Save
  doc.save(`aiscope-bulk-report-${Date.now()}.pdf`);
}

// ── CSV Export ───────────────────────────────────────────────────────────
function exportCsv(rows: BulkRow[]) {
  const escape = (v?: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const extractProviderText = (raw?: string) => {
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      return (
        parsed?.choices?.[0]?.message?.content ||
        parsed?.candidates?.[0]?.content?.parts?.[0]?.text ||
        parsed?.content || parsed?.answer || parsed?.text || JSON.stringify(parsed)
      );
    } catch {
      return raw;
    }
  };

  const headers = [
    "URL",
    "Status",
    "Score",
    "Grade",
    "SiteName",
    "Summary",
    "DurationMs",
    "Error",
    "AllResponses",
    "ProviderResponsesJSON",
    "CitationCount",
    "CitationURLs",
  ];

  const rowsOut: string[] = [];

  rows.forEach((r) => {
    const fd = r.fullData;
    let allResponses = "";
    let citCount = 0;
    let citUrls: string[] = [];
    // provMap is used below when creating the CSV row; declare it here
    // so it's available whether or not `fd` is present.
    let provMap: Record<string, string> = {};

    if (fd) {
      const providers = fd._providers ?? [];
      allResponses = providers
        .map((p: any) => {
          const text = extractProviderText(p.rawResponse);
          return `${p.name}: ${toPlainText(text).replace(/\s+/g, " ").slice(0, 10000)}`;
        })
        .join(" ||| ");

      provMap = {};
      (fd._providers ?? []).forEach((p: any) => {
        provMap[p.name] = toPlainText(extractProviderText(p.rawResponse)).replace(/\s+/g, " ");
      });

      const citations = fd.citations ?? [];
      citCount = citations.reduce((s: number, c: any) => s + (c.count ?? 0), 0);
      citUrls = citations.flatMap((c: any) => c.allCitationUrls ?? []);
    }

    const row = [
      r.url,
      r.status,
      r.score ?? "",
      r.grade ?? "",
      r.site_name ?? "",
      r.summary ?? "",
      r.duration ?? "",
      r.error ?? "",
      allResponses,
      JSON.stringify(provMap ?? {}),
      citCount,
      (citUrls ?? []).join(" | "),
    ].map(escape).join(",");

    rowsOut.push(row);
  });

  const csv = `${headers.join(",")}\n${rowsOut.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aiscope-bulk-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

// Subtle elevation so result panels read as distinct cards against the page
// background, on top of their existing border — matches the card treatment
// used across the rest of the bulk-scan results UI.
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.05)";

function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div
      className="bk-stat-tile rounded-2xl border p-4"
      style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: CARD_SHADOW }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wide mb-1.5" style={{ color: "var(--text-dim)" }}>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Ring({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(var(--overlay-rgb),0.07)" strokeWidth={5} />
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

// ── Full detail panel rendered beneath an expanded row ─────────────────────
// Mirrors ResultsSection.tsx (the single-scan results view) section-for-section
// and component-for-component, minus its page-level header, so an expanded
// bulk row looks identical to a single scan's results.
function BulkDetailPanel({ result }: { result: AnalysisResult }) {
  const scoreColorValue = scoreColor(result.overall_score);
  const totalChecks =
    (result.stats?.checks_passed ?? 0) +
    (result.stats?.checks_failed ?? 0) +
    (result.stats?.checks_warned ?? 0);

  const coverage = result.ai_platform_coverage ?? {};
  const coverageEntries = Object.entries(coverage);
  const providers = result._providers ?? [];

  // Enhanced bot coverage — use rich _botResults when available, fall back to ai_platform_coverage
  const rawBotResults = result._botResults ?? null;
  const fallbackBots = (key: string, allowed: boolean): BotDetail => ({
    key, label: key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    company: "", allowed, reason: "", directive: null, blockType: "not_mentioned",
  });
  const botAccessible: BotDetail[] = rawBotResults
    ? rawBotResults.filter(b => b.allowed)
    : coverageEntries.filter(([, v]) => v === "indexed").map(([k]) => fallbackBots(k, true));
  const botBlocked: BotDetail[] = rawBotResults
    ? rawBotResults.filter(b => !b.allowed)
    : coverageEntries.filter(([, v]) => v === "blocked").map(([k]) => fallbackBots(k, false));

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

  return (
    <div
      className="animate-fade-up px-6 pb-8 pt-6"
      style={{ background: "rgba(var(--overlay-rgb),0.03)", borderTop: "1px solid rgba(var(--overlay-rgb),0.05)" }}
    >
      {/* ── Prompts & Responses ── */}
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
          className="rounded-2xl border p-6 text-center mb-6"
          style={{
            background: "rgba(0,229,255,0.03)",
            borderColor: "rgba(0,229,255,0.12)",
            borderStyle: "dashed",
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--accent)" }}>
            AI Citations not included
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Re-run with the <span style={{ color: "var(--accent)" }}>&ldquo;Include AI Citations&rdquo;</span> toggle on to see how many times each AI agent cites this site.
          </p>
        </div>
      )}

      {/* ── Stats ── */}
      <StatCards
        score={result.overall_score}
        grade={result.grade}
        scoreColor={scoreColorValue}
        passed={result.stats?.checks_passed ?? 0}
        warned={result.stats?.checks_warned ?? 0}
        failed={result.stats?.checks_failed ?? 0}
        total={totalChecks}
      />

      {/* ── AI Provider Results ── */}
      <ProviderScoreChart providers={providers} />

      {/* ── AI Platform Coverage ── */}
      <BotCoverageTable accessible={botAccessible} blocked={botBlocked} />

      {/* ── Category Breakdown ── */}
      <div
        className="text-[13px] font-mono tracking-widest mb-3.5 uppercase"
        style={{ color: "var(--text-muted)" }}
      >
        Category Breakdown
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {result.categories?.map((cat) => (
          <CategoryCard key={cat.name} category={cat} />
        ))}
      </div>

      <Recommendations recommendations={result.recommendations} />

      {/* ── Keyword Intelligence ── */}
      {result.keywords && result.keywords.length > 0 && (
        <div className="rounded-2xl border p-5 mt-6" style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
          <div className="text-[13px] font-mono tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>
            Keyword Intelligence
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map(kw => (
              <div
                key={kw.word}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px]"
                style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
                title={`In title: ${kw.inTitle} · In H1: ${kw.inH1} · In meta: ${kw.inMeta}`}
              >
                <span className="font-medium" style={{ color: "var(--text)" }}>{kw.word}</span>
                <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>{kw.count}×</span>
                {kw.inTitle && <span title="In title" style={{ color: "var(--success)", fontSize: 8 }}>T</span>}
                {kw.inH1    && <span title="In H1"    style={{ color: "#4285f4", fontSize: 8 }}>H1</span>}
                {kw.inMeta  && <span title="In meta"  style={{ color: "var(--warning)", fontSize: 8 }}>M</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--success)" }}>T</span> = in title · <span style={{ color: "#4285f4" }}>H1</span> = in H1 · <span style={{ color: "var(--warning)" }}>M</span> = in meta description
          </p>
        </div>
      )}

      {/* ── Core Web Vitals & Speed ── */}
      <SpeedSection url={result.url} autoRun />

      {/* ── Technical Crawl ── */}
      <CrawlSection url={result.url} autoRun />
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
  const [plan, setPlan] = useState<UserPlan>("free");
  const [showCitationsInfo, setShowCitationsInfo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.plan) setPlan(data.plan); })
      .catch(() => {});
  }, []);

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

    // Initialize all rows upfront
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

    // Batch into chunks of 50
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    for (let i = 0; i < parsedUrls.length; i += BATCH_SIZE) {
      batches.push(parsedUrls.slice(i, i + BATCH_SIZE));
    }

    let allRows = [...initialRows];
    let totalCompleted = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    try {
      // Process each batch sequentially
      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        if (abortRef.current.signal.aborted) break;

        const batch = batches[batchIdx];

        const res = await fetch("/api/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: batch, runCitations, concurrency }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          setFatalError(err.error ?? `Batch ${batchIdx + 1} server error`);
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
              allRows = allRows.map((r) => r.url === data.url ? { ...r, status: "running" } : r);
              setRows([...allRows]);
            }

            if (event === "result") {
              totalCompleted++;
              if (data.status === "success") totalPassed++;
              else if (data.status === "failed") totalFailed++;

              allRows = allRows.map((r) =>
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
                      fullData: data.fullData ?? undefined,
                    }
                  : r
              );
              setRows([...allRows]);
              setCompleted(totalCompleted);
              setPassed(totalPassed);
              setFailed(totalFailed);
            }
          }
        }
      }

      setPhase("done");
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
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-20">

          <div className="relative mb-10">
            {/* Ambient glow */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true" style={{ height: 220 }}>
              <div className="aurora-blob aurora-blob-1" style={{ width: 320, height: 320, top: -170, left: "0%", background: "var(--accent)", opacity: 0.09 }} />
              <div className="aurora-blob aurora-blob-2" style={{ width: 280, height: 280, top: -140, left: "26%", background: "var(--accent2)", opacity: 0.08 }} />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                boxShadow: "0 6px 18px rgba(0,229,255,0.25)",
              }}>
                <Layers size={19} color="var(--on-accent)" />
              </div>
              <div
                className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border tracking-widest"
                style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
              >
                BULK AI VISIBILITY SCANNER
              </div>
            </div>
            <h1
              className="heading-shimmer text-4xl font-bold tracking-tight mb-3"
              style={{
                background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              Scan Up to 500 Sites<br />at Once
            </h1>
            <p className="text-[15px] leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
              Paste URLs (one per line or comma-separated), or upload a .txt / .csv file.
              Results stream in real-time as each site is analysed.
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>POWERED BY</span>
              {PROVIDERS.map((p) => (
                <span
                  key={p.name}
                  className="bk-provider-badge flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border"
                  style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}
                >
                  <p.Icon size={18} className="shrink-0" />{p.name}
                </span>
              ))}
            </div>
            <p className="text-[11px] font-mono mb-4" style={{ color: "var(--text-muted)" }}>
              every URL scanned by all 3, in parallel · scores averaged
            </p>

            <div className="flex flex-wrap gap-4">
              {FEATURE_CHIPS.map((feat) => (
                <div key={feat} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{
                    width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,232,122,0.15)", color: "var(--success)",
                  }}>
                    <Check size={9} strokeWidth={3} />
                  </span>
                  {feat}
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border mb-4 overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)", boxShadow: CARD_SHADOW }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }}
            >
              <span className="text-[11px] font-mono tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                URLs to scan
              </span>
              <span className="text-[11px] font-mono" style={{ color: parsedUrls.length > 400 ? "var(--warning)" : "var(--text-muted)" }}>
                {parsedUrls.length} / 500
              </span>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"https://example.com\nhttps://another-site.io\nhttps://third.co"}
              className="bk-field w-full bg-transparent border-none outline-none text-[13px] font-mono text-[var(--text)] resize-none p-5"
              rows={12}
              style={{ caretColor: "var(--accent)" }}
            />
          </div>

          <label
            className="bk-upload-label flex items-center gap-3 px-5 py-3 rounded-xl border mb-6 cursor-pointer transition-colors"
            style={{ borderColor: "rgba(var(--overlay-rgb),0.1)", background: "rgba(var(--overlay-rgb),0.02)" }}
          >
            <Upload size={17} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Upload <span style={{ color: "var(--accent)" }}>.txt</span> or <span style={{ color: "var(--accent)" }}>.csv</span> file
            </span>
            <input type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              onClick={() => setRunCitations(!runCitations)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all"
              style={{
                background: runCitations ? "rgba(0,229,255,0.1)" : "transparent",
                borderColor: runCitations ? "rgba(0,229,255,0.4)" : "rgba(var(--overlay-rgb),0.12)",
                color: runCitations ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {runCitations ? <Check size={13} strokeWidth={3} /> : <Circle size={11} />}
              AI Citations
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: runCitations ? "rgba(0,229,255,0.12)" : "rgba(255,184,48,0.15)",
                  color: runCitations ? "var(--accent)" : "var(--warning)",
                }}
              >
                {runCitations ? "ON" : "OFF"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowCitationsInfo(true)}
              aria-label="What does AI Citations include?"
              title="What does AI Citations include?"
              className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold shrink-0 transition-colors self-center"
              style={{
                color: "var(--text-muted)",
                border: "1px solid rgba(var(--overlay-rgb),0.25)",
              }}
            >
              i
            </button>

            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
              style={{ borderColor: "rgba(var(--overlay-rgb),0.12)", background: "transparent" }}
            >
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Concurrency</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConcurrency(n)}
                    className="w-7 h-7 rounded-md text-xs font-mono transition-all"
                    style={{
                      background: concurrency === n ? "rgba(0,229,255,0.15)" : "rgba(var(--overlay-rgb),0.04)",
                      color: concurrency === n ? "var(--accent)" : "var(--text-muted)",
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
              <AlertTriangle size={15} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: "var(--warning)" }}>
                High concurrency may hit API rate limits. Start with 3 for reliability.
              </span>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={parsedUrls.length === 0}
            className="bk-btn-primary w-full py-4 rounded-2xl text-base font-semibold tracking-wide flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "var(--on-accent)",
              boxShadow: parsedUrls.length === 0 ? "none" : "0 6px 20px rgba(0,229,255,0.25)",
            }}
          >
            {parsedUrls.length === 0 ? (
              "Paste URLs to begin"
            ) : (
              <>
                <Play size={15} fill="currentColor" />
                Start Bulk Scan: {parsedUrls.length} site{parsedUrls.length > 1 ? "s" : ""}
              </>
            )}
          </button>

          <div className="flex flex-wrap gap-4 justify-center mt-6">
            {["Real-time streaming results", "Up to 500 URLs", "CSV export", "Saved to Reports"].map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <span style={{
                  width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,232,122,0.15)", color: "var(--success)",
                }}>
                  <Check size={9} strokeWidth={3} />
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>

        {showCitationsInfo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowCitationsInfo(false)}
          >
            <div
              className="bk-modal-pop w-full max-w-md rounded-2xl border p-6 text-left"
              style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>AI Citations</h3>
                <button
                  onClick={() => setShowCitationsInfo(false)}
                  className="bk-icon-btn"
                  style={{
                    width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-muted)", background: "transparent", border: "1px solid transparent",
                  }}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
                When this is on, we send real prompts to Gemini, ChatGPT and Perplexity for each URL to see whether (and how often) they cite that site, plus which competitors show up instead.
              </p>

              <ul className="text-[13px] leading-relaxed mb-4 space-y-1.5 list-disc pl-4" style={{ color: "var(--text-muted)" }}>
                <li>Full GEO (Generative Engine Optimization) analysis</li>
                <li>Citation counts across all 3 AI providers</li>
                <li>Competitive analysis: see who&apos;s winning your AI visibility</li>
              </ul>

              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Turning it off runs a faster, basic scan across all URLs that only checks crawler access and structured data, with no live AI citation research.
              </p>

              <button
                onClick={() => setShowCitationsInfo(false)}
                className="bk-btn-primary w-full mt-5 rounded-lg py-2.5 text-sm font-semibold text-[var(--on-accent)]"
                style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        <style>{`
          .bk-field { transition: box-shadow 0.15s ease; }
          .bk-upload-label:hover { background: rgba(var(--overlay-rgb),0.05) !important; border-color: rgba(0,229,255,0.25) !important; }
          .bk-provider-badge { transition: transform 0.15s ease; }
          .bk-provider-badge:hover { transform: translateY(-2px); }
          .bk-btn-primary:not(:disabled):hover { filter: brightness(1.05); transform: translateY(-1px); }
          .bk-btn-primary:not(:disabled):active { transform: translateY(0); }
          .bk-icon-btn:hover { background: rgba(var(--overlay-rgb),0.07); color: var(--text); }
          @keyframes bkModalPop { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .bk-modal-pop { animation: bkModalPop 0.18s cubic-bezier(0.16,1,0.3,1) both; }
        `}</style>
      </div>
    );
  }

  // ── RUNNING / DONE PHASE ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="max-w-[1100px] mx-auto px-6 pt-10 pb-20">

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div
            className="bk-stat-tile rounded-2xl border p-4"
            style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40 }}>
                <Ring pct={pct} color={phase === "done" ? "var(--success)" : "var(--accent)"} size={40} />
                <span
                  className="absolute text-[9px] font-mono font-bold"
                  style={{ color: phase === "done" ? "var(--success)" : "var(--accent)" }}
                >
                  {pct}%
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wide truncate" style={{ color: "var(--text-dim)" }}>
                  {phase === "done" ? "Complete" : "Scanning…"}
                </div>
                <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                  {completed} / {total}
                </div>
              </div>
            </div>
          </div>

          <StatTile label="Passed" value={passed} color="var(--success)" />
          <StatTile label="Failed" value={failed} color="var(--danger)" />
          <StatTile label="Queued" value={total - completed} color="var(--text-muted)" />
        </div>

        {/* Progress bar */}
        <div className="w-full rounded-full mb-6 overflow-hidden" style={{ background: "rgba(var(--overlay-rgb),0.06)", height: 6 }}>
          <div
            className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
            style={{
              width: `${pct}%`,
              background: phase === "done"
                ? "linear-gradient(90deg, var(--success), var(--accent))"
                : "linear-gradient(90deg, var(--accent), var(--accent2))",
            }}
          >
            {phase === "running" && <div className="bk-progress-shimmer" />}
          </div>
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
                  className="bk-chip-btn px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                  style={{
                    background: filter === f ? "rgba(0,229,255,0.12)" : "rgba(var(--overlay-rgb),0.04)",
                    color: filter === f ? "var(--accent)" : "var(--text-muted)",
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
                className="bk-chip-btn px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                style={{
                  background: sortBy === s ? "rgba(var(--overlay-rgb),0.07)" : "transparent",
                  color: sortBy === s ? "var(--text)" : "var(--text-muted)",
                }}
              >
                Sort: {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: CARD_SHADOW }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b"
            style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Scan Results</span>
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                style={{ color: "var(--text-muted)", background: "rgba(var(--overlay-rgb),0.05)" }}
              >
                {rows.length} URL{rows.length !== 1 ? "s" : ""}
              </span>
              {jobId && (
                <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>· job {jobId}</span>
              )}
            </div>

            <div className="flex gap-2">
              {phase === "running" && (
                <button
                  onClick={handleStop}
                  className="bk-danger-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[12px] transition-all"
                  style={{ borderColor: "rgba(255,90,90,0.3)", color: "var(--danger)", background: "rgba(255,90,90,0.05)" }}
                >
                  <Square size={11} fill="currentColor" /> Stop
                </button>
              )}
              {phase === "done" && (
                <>
                  <button
                    onClick={() => exportPdf(rows, plan)}
                    className="bk-export-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[12px] transition-all"
                    style={{ borderColor: "rgba(0,232,122,0.3)", color: "var(--success)", background: "rgba(0,232,122,0.05)" }}
                  >
                    <Download size={11} /> PDF
                  </button>
                  <button
                    onClick={() => exportCsv(rows)}
                    className="bk-export-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[12px] transition-all"
                    style={{ borderColor: "rgba(0,232,122,0.3)", color: "var(--success)", background: "rgba(0,232,122,0.05)" }}
                  >
                    <Download size={11} /> CSV
                  </button>
                  <button
                    onClick={handleReset}
                    className="bk-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    <Plus size={11} /> New Scan
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
          {/* Table header */}
          <div
            className="grid text-[10px] font-mono tracking-widest uppercase px-5 py-3 border-b"
            style={{
              gridTemplateColumns: "2fr 90px 60px 60px 1fr 110px",
              minWidth: 600,
              borderColor: "rgba(var(--overlay-rgb),0.07)",
              color: "var(--text-dim)",
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
              <div className="py-12 text-center text-sm" style={{ color: "var(--text-dim)" }}>
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
                    style={{ borderColor: "rgba(var(--overlay-rgb),0.04)" }}
                  >
                    {/* Summary row — clickable if success */}
                    <div
                      className="bk-row grid items-center px-5 py-3.5 transition-colors"
                      style={{
                        gridTemplateColumns: "2fr 90px 60px 60px 1fr 110px",
                        minWidth: 600,
                        background: isRunning
                          ? "rgba(0,229,255,0.03)"
                          : isExpanded
                          ? "rgba(var(--overlay-rgb),0.03)"
                          : "transparent",
                        cursor: canExpand ? "pointer" : "default",
                      }}
                      onClick={() => canExpand && setExpandedUrl(isExpanded ? null : row.url)}
                    >
                      {/* URL */}
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          {isRunning && (
                            <Loader2 size={11} className="bk-spin" style={{ color: "var(--accent)", flexShrink: 0 }} />
                          )}
                          {canExpand && (
                            <ChevronRight
                              size={12}
                              style={{
                                color: "var(--text-muted)", flexShrink: 0,
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                transition: "transform 0.2s",
                              }}
                            />
                          )}
                          <span
                            className="text-[12px] font-mono truncate"
                            style={{ color: isQueued ? "var(--text-dim)" : "var(--text)" }}
                          >
                            {row.url.replace(/^https?:\/\//, "")}
                          </span>
                        </div>
                        {row.site_name && row.site_name !== row.url && (
                          <div className="text-[11px] mt-0.5 truncate pl-4" style={{ color: "var(--text-muted)" }}>
                            {row.site_name}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {row.status === "success" && (
                          <span className="flex items-center gap-1 w-fit text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "var(--success)", background: "rgba(0,232,122,0.1)" }}>
                            <CheckCircle2 size={10} /> done
                          </span>
                        )}
                        {row.status === "failed" && (
                          <span className="flex items-center gap-1 w-fit text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "var(--danger)", background: "rgba(255,90,90,0.1)" }}>
                            <XCircle size={10} /> failed
                          </span>
                        )}
                        {row.status === "running" && (
                          <span className="flex items-center gap-1 w-fit text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "var(--accent)", background: "rgba(0,229,255,0.1)" }}>
                            <Loader2 size={10} className="bk-spin" /> scanning
                          </span>
                        )}
                        {row.status === "queued" && (
                          <span className="flex items-center gap-1 w-fit text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{ color: "var(--text-dim)", background: "rgba(var(--overlay-rgb),0.04)" }}>
                            <Circle size={7} fill="currentColor" /> queued
                          </span>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-sm font-bold font-mono" style={{ color: sc }}>
                        {row.score != null ? row.score : "-"}
                      </div>

                      {/* Grade */}
                      <div className="text-sm font-bold font-mono" style={{ color: gc }}>
                        {row.grade ?? "-"}
                      </div>

                      {/* Summary / error */}
                      <div
                        className="text-[11px] leading-snug pr-4 truncate"
                        style={{ color: row.error ? "var(--danger)" : "var(--text-muted)" }}
                      >
                        {row.error ? `✕ ${row.error}` : row.summary ?? ""}
                      </div>

                      {/* Duration + expand hint */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>
                          {durationLabel(row.duration)}
                        </span>
                        {canExpand && (
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                            style={{
                              color: isExpanded ? "var(--accent)" : "var(--text-dim)",
                              background: isExpanded ? "rgba(0,229,255,0.1)" : "rgba(var(--overlay-rgb),0.03)",
                              border: isExpanded ? "1px solid rgba(0,229,255,0.2)" : "1px solid rgba(var(--overlay-rgb),0.05)",
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
          </div>{/* end overflow-x-auto */}
        </div>

        {/* Tip */}
        {phase === "done" && rows.some((r) => r.fullData) && (
          <p className="text-center text-[12px] mt-4" style={{ color: "var(--text-dim)" }}>
            Click any done row to expand the full analysis report
          </p>
        )}

        {/* Fatal error */}
        {phase === "error" && fatalError && (
          <div
            className="rounded-2xl border p-6 mt-6 text-center"
            style={{ background: "rgba(255,90,90,0.04)", borderColor: "rgba(255,90,90,0.2)" }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: "var(--danger)" }}>Bulk scan failed</p>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>{fatalError}</p>
            <button
              onClick={handleReset}
              className="bk-btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--danger)", color: "var(--on-accent)" }}
            >
              <ArrowLeft size={13} /> Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .bk-spin { animation: spin 0.8s linear infinite; }

        @keyframes bkShimmerSlide { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .bk-progress-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: bkShimmerSlide 1.2s linear infinite;
        }

        .bk-stat-tile { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .bk-stat-tile:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }

        .bk-row:hover { background: rgba(var(--overlay-rgb),0.025) !important; }

        .bk-chip-btn:hover { filter: brightness(1.1); }
        .bk-danger-btn:hover { filter: brightness(1.1); }
        .bk-export-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .bk-btn-primary:not(:disabled):hover { filter: brightness(1.05); transform: translateY(-1px); }
        .bk-btn-primary:not(:disabled):active { transform: translateY(0); }
      `}</style>
    </div>
  );
}
