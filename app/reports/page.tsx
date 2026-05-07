"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ReportModal from "@/components/ReportModal";
import { AnalysisResult } from "@/types";
import { toPlainText, extractProviderText } from "@/lib/plainText";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanType = "homepage" | "bulk" | "bulk_prompt";

interface ReportSummary {
  id: string;
  url: string;
  site_name: string;
  overall_score: number;
  grade: string;
  summary: string;
  createdAt: number | null;
  _cached?: boolean;
  stats?: any;
  categories?: any[];
  recommendations?: any[];
  ai_platform_coverage?: any;
  citations?: any[];
  _providers?: any[];
}

interface BulkJob {
  id: string;
  jobId: string;
  total: number;
  passed: number;
  failed: number;
  status: string;
  runCitations: boolean;
  concurrency: number;
  urls: string[];
  results: BulkResult[]; // ✅ always an array now (from subcollection)
  createdAt: string | null;
}

interface BulkResult {
  url: string;
  status: "success" | "failed";
  score?: number;
  grade?: string;
  site_name?: string;
  summary?: string;
  error?: string;
  duration?: number;
  fullData?: AnalysisResult | null;
}

// ✅ runs is now an array (from subcollection), not a map
interface BulkPromptBatch {
  id: string;
  batchId: string;
  status: string;
  promptId?: string;
  url?: string | null;
  topic?: string;
  runCitations?: boolean;
  providerCount?: number;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  createdAt: string | null;
  updatedAt: string | null;
  runs: BulkPromptRun[]; // ✅ array, not Record<string, ...>
}

interface BulkPromptRun {
  executionId: string;
  promptId: string;
  status: string;
  url?: string | null;
  hasUrl?: boolean;
  prompt?: string;
  finalPrompt?: string;
  topic?: string;
  runCitations?: boolean;
  response?: string;
  provider?: string | null;
  durationMs?: number | null;
  responses?: { provider: string; response: string; durationMs?: number; error?: string }[];
  citations?: { provider: string; status: string; count: number; allCitationUrls?: string[]; rawAnswer?: string }[];
  error?: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
  if (score >= 70) return "#00e87a";
  if (score >= 40) return "#ffb830";
  return "#ff5a5a";
}

function getScoreBg(score: number) {
  if (score >= 70) return "rgba(0,232,122,0.1)";
  if (score >= 40) return "rgba(255,184,48,0.1)";
  return "rgba(255,90,90,0.1)";
}

function timeAgo(ms: number | string | null): string {
  if (!ms) return "Unknown date";
  const ts = typeof ms === "string" ? new Date(ms).getTime() : ms;
  const diff = Date.now() - ts;
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

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeBulkAnalysisResult(
  data: any,
  fallback?: Partial<BulkResult>
): AnalysisResult | null {
  if (!data && !fallback) return null;

  const stats = data?.stats ?? {};
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : [];
  const citations = Array.isArray(data?.citations) ? data.citations : [];
  const providers = Array.isArray(data?._providers) ? data._providers : [];

  return {
    site_name: (data?.site_name as string) ?? fallback?.site_name ?? fallback?.url ?? "",
    url: (data?.url as string) ?? fallback?.url ?? "",
    overall_score: Number(data?.overall_score ?? data?.score ?? fallback?.score ?? 0),
    grade: (data?.grade as string) ?? fallback?.grade ?? "—",
    summary: (data?.summary as string) ?? fallback?.summary ?? "",
    stats: {
      checks_passed: Number(stats.checks_passed ?? 0),
      checks_failed: Number(stats.checks_failed ?? 0),
      checks_warned: Number(stats.checks_warned ?? 0),
    },
    categories,
    ai_platform_coverage: data?.ai_platform_coverage ?? undefined,
    recommendations,
    citations,
    _providers: providers,
    _cached: data?._cached ?? false,
    createdAt: (data?.createdAt as number | null | undefined) ?? null,
  };
}

// Using shared plain-text helpers from lib/plainText

// ── Export helpers ────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const escape = (v?: string | number | null) => {
  if (v === null || v === undefined) return '""';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
};

function exportHomepageCSV(reports: ReportSummary[]) {
  const header = ["ID", "URL", "Site Name", "Score", "Grade", "Summary", "Cached", "Date"];
  const rows = reports.map((r) =>
    [r.id, r.url, r.site_name, r.overall_score, r.grade, r.summary ?? "", r._cached ? "Yes" : "No",
     r.createdAt ? new Date(r.createdAt).toISOString() : ""].map(escape).join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `aiscope-homepage-${new Date().toISOString().slice(0,10)}.csv`);
}

function exportBulkCSV(jobs: BulkJob[]) {
  // Determine max category count across all results for dynamic columns
  let maxCategories = 0;
  for (const job of jobs) {
    for (const r of job.results) {
      const cats = (r.fullData as any)?.categories ?? [];
      if (cats.length > maxCategories) maxCategories = cats.length;
    }
  }

  // Collect all unique AI platform keys
  const aiPlatformKeys = new Set<string>();
  for (const job of jobs) {
    for (const r of job.results) {
      const coverage = (r.fullData as any)?.ai_platform_coverage ?? {};
      Object.keys(coverage).forEach((k) => aiPlatformKeys.add(k));
    }
  }
  const aiKeys = [...aiPlatformKeys];

  const categoryHeaders = Array.from({ length: maxCategories }, (_, i) => [
    `Category ${i + 1} Name`, `Category ${i + 1} Score`,
  ]).flat();
  const aiHeaders = aiKeys.map((k) => `AI: ${k}`);

  const header = [
    "Job ID", "Job Date", "URL", "Status", "Score", "Grade", "Site Name",
    "Summary", "Duration (ms)", "Providers",
    ...categoryHeaders,
    ...aiHeaders,
    "Recommendations",
    "Citation Count", "Citation URLs",
    "Error",
  ];

  const rows: string[] = [];
  for (const job of jobs) {
    for (const r of job.results) {
      const fd = r.fullData as any;

      // Category columns
      const catCols: (string | number)[] = [];
      const cats: any[] = fd?.categories ?? [];
      for (let i = 0; i < maxCategories; i++) {
        catCols.push(cats[i]?.name ?? cats[i]?.category ?? "", cats[i]?.score ?? "");
      }

      // AI platform coverage columns
      const aiCols = aiKeys.map((k) => {
        const val = fd?.ai_platform_coverage?.[k];
        return val === true ? "Yes" : val === false ? "No" : "";
      });

      // Recommendations — join all into one cell
      const recs: any[] = fd?.recommendations ?? [];
      const recsText = recs
        .map((rec: any) => rec?.text ?? rec?.recommendation ?? String(rec))
        .join(" | ");

      // Citations
      const citations: any[] = fd?.citations ?? [];
      const citationUrls = citations
        .map((c: any) => c?.url ?? c?.source ?? String(c))
        .join(" | ");

      // Providers
      const providers: string[] = fd?._providers ?? [];

      rows.push([
        job.jobId,
        job.createdAt ?? "",
        r.url,
        r.status,
        r.score ?? "",
        r.grade ?? "",
        r.site_name ?? "",
        r.summary ?? fd?.summary ?? "",
        r.duration ?? "",
        providers.join(" | "),
        ...catCols,
        ...aiCols,
        recsText,
        citations.length,
        citationUrls,
        r.error ?? "",
      ].map(escape).join(","));
    }
  }

  const csv = [header.join(","), ...rows].join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `aiscope-bulk-${new Date().toISOString().slice(0, 10)}.csv`
  );
}

function exportBulkPromptCSV(batches: BulkPromptBatch[]) {
  // Determine max providers & max citation providers across all runs for dynamic columns
  let maxProviders = 1;
  let maxCitationProviders = 1;
  for (const batch of batches) {
    for (const run of batch.runs) {
      if (run.responses && run.responses.length > maxProviders) maxProviders = run.responses.length;
      if (run.citations && run.citations.length > maxCitationProviders) maxCitationProviders = run.citations.length;
    }
  }

  const providerResponseHeaders = Array.from({ length: maxProviders }, (_, i) => [
    `Provider ${i + 1} Name`, `Provider ${i + 1} Response`, `Provider ${i + 1} Duration (ms)`, `Provider ${i + 1} Error`,
  ]).flat();

  const citationHeaders = Array.from({ length: maxCitationProviders }, (_, i) => [
    `Citation Provider ${i + 1}`, `Citation ${i + 1} Count`, `Citation ${i + 1} URLs`, `Citation ${i + 1} Raw Answer`,
  ]).flat();

  const header = [
    "Batch ID", "Batch Topic", "Execution ID", "Prompt ID", "Prompt Text", "Final Prompt", "URL", "Status",
    "Primary Provider", "Primary Response (Full)", "Duration (ms)",
    ...providerResponseHeaders,
    "Total Citations", "All Cited URLs",
    ...citationHeaders,
    "Date",
  ];

  const rows: string[] = [];
  for (const batch of batches) {
    for (const run of batch.runs) {
      // Per-provider response columns
      const providerCols: (string | number)[] = [];
      for (let i = 0; i < maxProviders; i++) {
        const r = run.responses?.[i];
        providerCols.push(r?.provider ?? "", r?.response ?? "", r?.durationMs ?? "", r?.error ?? "");
      }

      // Per-provider citation columns
      const citationCols: (string | number)[] = [];
      const totalCitationCount = run.citations?.reduce((s, c) => s + (c.count ?? 0), 0) ?? 0;
      const allCitedUrls = run.citations?.flatMap((c) => c.allCitationUrls ?? []).join(" | ") ?? "";
      for (let i = 0; i < maxCitationProviders; i++) {
        const c = run.citations?.[i];
        citationCols.push(
          c?.provider ?? "",
          c?.count ?? "",
          (c?.allCitationUrls ?? []).join(" | "),
          c?.rawAnswer ?? "",
        );
      }

      rows.push([
        batch.batchId, batch.topic ?? "", run.executionId, run.promptId,
        run.prompt ?? "", run.finalPrompt ?? "", run.url ?? "",
        run.status, run.provider ?? "", run.response ?? "", run.durationMs ?? "",
        ...providerCols,
        totalCitationCount, allCitedUrls,
        ...citationCols,
        run.createdAt ?? "",
      ].map(escape).join(","));
    }
  }
  const csv = [header.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `aiscope-prompts-${new Date().toISOString().slice(0,10)}.csv`);
}

// ── Shared: load jsPDF from CDN ───────────────────────────────────────────────
async function loadJsPDF(): Promise<any> {
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(script);
    });
  }
  return (window as any).jspdf.jsPDF;
}

// ── Shared PDF helpers ────────────────────────────────────────────────────────
function makePdfHelpers(doc: any) {
  const PAGE_W = 210, PAGE_H = 297, MARGIN = 16, LINE = 5.5;
  const COL_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const newPage = () => { doc.addPage(); y = MARGIN; };
  const needsSpace = (n: number) => { if (y + n > PAGE_H - MARGIN) newPage(); };

  const writeLine = (text: string, fontSize: number, style: "normal" | "bold" | "italic" = "normal", indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    doc.setTextColor(30, 30, 30);
    const lines: string[] = doc.splitTextToSize(text, COL_W - indent);
    lines.forEach((line: string) => { needsSpace(LINE); doc.text(line, MARGIN + indent, y); y += LINE; });
  };

  const writeLabel = (text: string) => {
    y += 2; needsSpace(LINE + 1);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
    doc.text(text.toUpperCase(), MARGIN, y); y += LINE;
    doc.setDrawColor(180, 180, 180); doc.line(MARGIN, y - 1, MARGIN + COL_W, y - 1); y += 2;
  };

  const writeSeparator = () => {
    needsSpace(6); doc.setDrawColor(210, 210, 210);
    doc.line(MARGIN, y, MARGIN + COL_W, y); y += 5;
  };

  const addPageNumbers = (label: string) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
      doc.text(`AiScope — ${label} — by Marcstrat`, MARGIN, PAGE_H - 8);
      doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
    }
  };

  return { writeLine, writeLabel, writeSeparator, addPageNumbers, newPage, needsSpace, getY: () => y, setY: (v: number) => { y = v; } };
}

async function exportHomepagePDF(reports: ReportSummary[]) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h = makePdfHelpers(doc);

  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text("AiScope — Homepage Scan Report", 16, 16);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 16, 22);
  doc.text("by Marcstrat", 16, 27);
  h.setY(33);
  h.writeSeparator();

  h.writeLabel("Summary");
  h.writeLine(`Total reports : ${reports.length}`, 10);
  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + r.overall_score, 0) / reports.length)
    : 0;
  h.writeLine(`Average score : ${avgScore} / 100`, 10);
  const gradeA = reports.filter(r => r.overall_score >= 70).length;
  const gradeB = reports.filter(r => r.overall_score >= 40 && r.overall_score < 70).length;
  const gradeC = reports.filter(r => r.overall_score < 40).length;
  h.writeLine(`Good (70-100) : ${gradeA}  ·  Fair (40-69) : ${gradeB}  ·  Poor (0-39) : ${gradeC}`, 10);
  h.setY(h.getY() + 4);

  h.newPage();
  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text("All Reports", 16, h.getY()); h.setY(h.getY() + 8);
  h.writeSeparator();

  reports.forEach((r, idx) => {
    h.needsSpace(18);
    const date = r.createdAt ? new Date(r.createdAt).toLocaleString() : "Unknown";
    h.writeLine(`${idx + 1}. [${r.grade}]  ${r.site_name}`, 10, "bold");
    h.writeLine(`   ${r.url}`, 9, "normal", 4);
    h.writeLine(`   Score: ${r.overall_score}/100   ${r._cached ? "· Cached" : ""}   Scanned: ${date}`, 8, "normal", 4);
    if (r.summary) h.writeLine(`   ${r.summary}`, 8, "italic", 4);
    h.setY(h.getY() + 3);
  });

  h.addPageNumbers("Homepage Report");
  doc.save(`aiscope-homepage-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportBulkPDF(jobs: BulkJob[]) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h = makePdfHelpers(doc);

  const rows = jobs.flatMap((job) =>
    job.results.map((r) => ({
      job,
      r,
      fd: normalizeBulkAnalysisResult(r.fullData, r),
    }))
  );

  const successRows = rows.filter(({ r }) => r.status === "success");
  const failedRows = rows.filter(({ r }) => r.status === "failed");
  const avgScore = successRows.length
    ? Math.round(successRows.reduce((sum, { r }) => sum + (r.score ?? 0), 0) / successRows.length)
    : 0;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("AiScope — AI Visibility Bulk Report", 16, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 16, 22);
  doc.text("by Marcstrat", 16, 27);
  h.setY(33);
  h.writeSeparator();

  h.writeLabel("Summary");
  h.writeLine(`Total URLs scanned : ${rows.length}`, 10);
  h.writeLine(`Passed             : ${successRows.length}`, 10);
  h.writeLine(`Failed             : ${failedRows.length}`, 10);
  h.writeLine(`Average score      : ${avgScore} / 100`, 10);
  h.setY(h.getY() + 4);

  const bucketA = successRows.filter(({ r }) => (r.score ?? 0) >= 70).length;
  const bucketB = successRows.filter(({ r }) => (r.score ?? 0) >= 40 && (r.score ?? 0) < 70).length;
  const bucketC = successRows.filter(({ r }) => (r.score ?? 0) < 40).length;

  h.writeLabel("Score Distribution");
  h.writeLine(`Good  (70-100) : ${bucketA} site${bucketA !== 1 ? "s" : ""}`, 10);
  h.writeLine(`Fair  (40-69)  : ${bucketB} site${bucketB !== 1 ? "s" : ""}`, 10);
  h.writeLine(`Poor  (0-39)   : ${bucketC} site${bucketC !== 1 ? "s" : ""}`, 10);
  h.setY(h.getY() + 4);

  const topRows = [...successRows].sort((a, b) => (b.r.score ?? 0) - (a.r.score ?? 0)).slice(0, 5);
  if (topRows.length) {
    h.writeLabel("Top Performers");
    topRows.forEach(({ r, fd }, i) => {
      const name = (fd?.site_name || r.site_name || r.url.replace(/^https?:\/\//, "")).slice(0, 60);
      h.writeLine(`${i + 1}. ${name}  —  Score: ${r.score ?? "—"}  Grade: ${r.grade ?? "—"}`, 9);
    });
    h.setY(h.getY() + 4);
  }

  if (failedRows.length) {
    h.writeLabel("Failed Sites");
    failedRows.slice(0, 10).forEach(({ r }) => {
      h.writeLine(`• ${r.url.replace(/^https?:\/\//, "").slice(0, 60)}`, 9);
      if (r.error) h.writeLine(`  Error: ${r.error.slice(0, 80)}`, 8, "italic", 4);
    });
    h.setY(h.getY() + 4);
  }

  h.newPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("All Results", 16, h.getY());
  h.setY(h.getY() + 8);
  h.writeSeparator();

  rows.forEach(({ r, fd }, idx) => {
    h.needsSpace(16);
    const status = r.status === "success" ? "PASS" : "FAIL";
    const name = r.site_name && r.site_name !== r.url ? r.site_name : "";
    const url = r.url.replace(/^https?:\/\//, "");
    const dur = r.duration ? (r.duration < 1000 ? `${r.duration}ms` : `${(r.duration / 1000).toFixed(1)}s`) : "";

    h.writeLine(`${idx + 1}. [${status}]  ${url}`, 9, "bold");
    if (name) h.writeLine(`   ${name}`, 8, "normal", 4);
    if (r.score != null) h.writeLine(`   Score: ${r.score}/100   Grade: ${r.grade ?? "—"}   Time: ${dur}`, 8, "normal", 4);
    if (r.summary || fd?.summary) h.writeLine(`   ${r.summary ?? fd?.summary ?? ""}`, 8, "italic", 4);
    if (r.error) h.writeLine(`   Error: ${r.error}`, 8, "italic", 4);
    h.setY(h.getY() + 3);
  });

  rows.filter(({ r, fd }) => r.status === "success" && fd).forEach(({ r, fd }) => {
    const report = fd!;
    h.newPage();

    const siteName = report.site_name || r.site_name || r.url;
    h.writeLine(siteName, 16, "bold");
    h.writeLine(r.url, 9, "normal");
    h.setY(h.getY() + 2);
    h.writeLine(`Score: ${r.score ?? "—"} / 100   Grade: ${r.grade ?? "—"}`, 10, "bold");
    if (report.summary) {
      h.setY(h.getY() + 2);
      h.writeLine(report.summary, 9, "italic");
    }
    h.writeSeparator();

    h.writeLabel("Checks");
    h.writeLine(`Passed: ${report.stats?.checks_passed ?? 0}   Warnings: ${report.stats?.checks_warned ?? 0}   Failed: ${report.stats?.checks_failed ?? 0}`, 10);
    h.setY(h.getY() + 3);

    const providers = report._providers ?? [];
    if (providers.length > 0) {
      h.writeLabel("AI Provider Results");
      providers.forEach((provider: any) => {
        const providerName = provider.name ?? provider.provider ?? "Provider";
        const status2 = provider.status === "success" ? "OK" : "FAILED";
        h.writeLine(`${providerName}  [${status2}]  Score: ${provider.score ?? "—"}  Time: ${provider.durationMs ?? "—"}ms`, 9, "bold");

        const responseText = extractProviderText(provider.rawResponse ?? "");
        const cleanText = toPlainText(responseText);
        if (cleanText) {
          h.writeLine(cleanText, 8, "normal", 4);
        } else if (provider.error) {
          h.writeLine(`Error: ${provider.error}`, 8, "italic", 4);
        }
        h.setY(h.getY() + 3);
      });
    }

    const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const enabledKeys = new Set(providers.map((p: any) => normName(p.name ?? p.provider ?? "")));
    const isCitationEnabled = (citProvider: string) => {
      const citKey = normName(citProvider);
      for (const key of enabledKeys) {
        const minLen = Math.min(key.length, citKey.length, 6);
        if (key.slice(0, minLen) === citKey.slice(0, minLen)) return true;
      }
      return false;
    };
    const filteredCitations = (report.citations ?? []).filter((c: any) => isCitationEnabled(c.provider));

    if (filteredCitations.length > 0) {
      const totalCit = filteredCitations.reduce((sum: number, c: any) => sum + (c.count ?? 0), 0);
      h.writeLabel(`AI Citations  (${totalCit} total)`);
      filteredCitations.forEach((cit: any) => {
        h.writeLine(`${cit.provider}:  ${cit.count} citation${cit.count !== 1 ? "s" : ""}`, 9, "bold");
        if (cit.rawAnswer) {
          h.writeLine(toPlainText(cit.rawAnswer), 8, "normal", 4);
        }
        if (cit.allCitationUrls?.length) {
          h.setY(h.getY() + 1);
          h.writeLine(`Sources cited (${cit.allCitationUrls.length}):`, 8, "bold", 4);
          cit.allCitationUrls.forEach((u: string) => {
            let domain = u;
            try {
              domain = new URL(u).hostname.replace(/^www\./, "");
            } catch {
              // keep original string when URL parsing fails
            }
            h.writeLine(`• ${domain}`, 7, "normal", 8);
          });
        }
        h.setY(h.getY() + 3);
      });
    } else {
      h.writeLabel("AI Citations");
      h.writeLine("Not included in this scan. Re-scan with AI Citations toggle ON.", 9, "italic");
      h.setY(h.getY() + 3);
    }

    const coverage = report.ai_platform_coverage ?? {};
    const covEntries = Object.entries(coverage);
    if (covEntries.length) {
      h.writeLabel("AI Platform Coverage");
      covEntries.forEach(([platform, status]) => {
        const label = platform.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        h.writeLine(`${status === "indexed" ? "[Indexed]" : "[Blocked]"}  ${label}`, 9);
      });
      h.setY(h.getY() + 3);
    }

    if (report.categories?.length) {
      h.writeLabel("Category Breakdown");
      report.categories.forEach((cat: any) => {
        h.needsSpace(10);
        h.writeLine(`${cat.name ?? cat.category ?? "Unknown"}  —  ${cat.score}/100`, 10, "bold");
        cat.checks?.forEach((check: any) => {
          const sym = check.status === "pass" ? "[+]" : check.status === "warn" ? "[!]" : "[x]";
          const detail = check.detail ? ` — ${check.detail}` : "";
          h.writeLine(`  ${sym} ${check.label}${detail}`, 8, "normal", 4);
        });
        h.setY(h.getY() + 2);
      });
    }

    if (report.recommendations?.length) {
      h.writeLabel("Recommendations");
      report.recommendations.forEach((rec: any, ri: number) => {
        h.needsSpace(10);
        const priority = (rec.priority ?? "medium").toUpperCase();
        h.writeLine(`${ri + 1}. [${priority}] ${rec.title ?? rec.text ?? rec.recommendation ?? "Recommendation"}`, 9, "bold");
        if (rec.description) h.writeLine(rec.description, 8, "normal", 4);
        if (rec.impact) h.writeLine(`Impact: ${rec.impact}`, 8, "italic", 4);
        h.setY(h.getY() + 2);
      });
    }
  });

  h.addPageNumbers("Bulk Scan Report");
  doc.save(`aiscope-bulk-${new Date().toISOString().slice(0, 10)}.pdf`);
}
async function exportBulkPromptPDF(batches: BulkPromptBatch[]) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h = makePdfHelpers(doc);

  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text("AiScope — Bulk Prompt Report", 16, 16);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 16, 22);
  doc.text("by Marcstrat", 16, 27);
  h.setY(33);
  h.writeSeparator();

  h.writeLabel("Summary");
  // ✅ runs is an array now
  const totalRuns = batches.reduce((s, b) => s + b.runs.length, 0);
  const totalPassed = batches.reduce((s, b) => s + b.passedRuns, 0);
  const totalFailed = batches.reduce((s, b) => s + b.failedRuns, 0);
  h.writeLine(`Total batches : ${batches.length}`, 10);
  h.writeLine(`Total runs    : ${totalRuns}`, 10);
  h.writeLine(`Passed        : ${totalPassed}`, 10);
  h.writeLine(`Failed        : ${totalFailed}`, 10);
  h.setY(h.getY() + 4);

  batches.forEach((batch, bi) => {
    h.newPage();
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text(`Batch ${bi + 1}: ${batch.batchId}`, 16, h.getY()); h.setY(h.getY() + 7);
    h.writeSeparator();
    h.writeLine(`Status: ${batch.status}   Runs: ${batch.runs.length}   Passed: ${batch.passedRuns}   Failed: ${batch.failedRuns}`, 9, "bold");
    if (batch.topic) h.writeLine(`Topic: ${batch.topic}`, 9);
    h.writeLine(`Date: ${batch.createdAt ?? "Unknown"}`, 9);
    h.setY(h.getY() + 3);

    // ✅ iterate over array, not Object.values(map)
    h.writeLabel(`Runs (${batch.runs.length})`);
    if (batch.runs.length === 0) {
      h.writeLine("No runs available.", 9, "italic");
    } else {
      batch.runs.forEach((run, ri) => {
        h.needsSpace(16);
        h.writeLine(`${ri + 1}. [${run.status.toUpperCase()}]  Prompt: ${run.promptId}`, 9, "bold");
        if (run.url) h.writeLine(`   URL: ${run.url}`, 8, "normal", 4);
        if (run.provider) h.writeLine(`   Provider: ${run.provider}   Duration: ${run.durationMs != null ? `${run.durationMs}ms` : "—"}`, 8, "normal", 4);
        h.writeLine(`   Date: ${run.createdAt ?? "—"}`, 8, "normal", 4);

        // All provider responses
        if (run.responses && run.responses.length > 0) {
          h.writeLine(`   Responses from ${run.responses.length} provider(s):`, 8, "bold", 4);
          run.responses.forEach((resp) => {
            if (resp.response) {
              const preview = resp.response.slice(0, 400);
              h.writeLine(`   [${resp.provider}]: ${preview}${resp.response.length > 400 ? "…" : ""}`, 8, "italic", 8);
            } else if (resp.error) {
              h.writeLine(`   [${resp.provider}] Error: ${resp.error}`, 8, "italic", 8);
            }
          });
        } else if (run.response) {
          const preview = run.response.slice(0, 400);
          h.writeLine(`   Response: ${preview}${run.response.length > 400 ? "…" : ""}`, 8, "italic", 4);
        }

        // Citations summary
        if (run.citations && run.citations.length > 0) {
          const totalCited = run.citations.reduce((s, c) => s + (c.count ?? 0), 0);
          h.writeLine(`   Citations: ${totalCited} URL(s) across ${run.citations.length} provider(s)`, 8, "normal", 4);
          run.citations.forEach((c) => {
            if (c.allCitationUrls && c.allCitationUrls.length > 0) {
              h.writeLine(`   [${c.provider}]: ${c.allCitationUrls.slice(0, 5).join(", ")}${c.allCitationUrls.length > 5 ? " …" : ""}`, 7, "normal", 8);
            }
          });
        }

        h.setY(h.getY() + 3);
      });
    }
  });

  h.addPageNumbers("Bulk Prompt Report");
  doc.save(`aiscope-prompts-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl animate-pulse"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-1/3 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-2.5 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="w-16 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({
  icon, title, desc, action,
}: {
  icon: string; title: string; desc: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="rounded-2xl border p-12 text-center"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
        style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.15)" }}
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-white mb-1">{title}</p>
      <p className="text-[12px] mb-4" style={{ color: "#8b8d9e" }}>{desc}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
          style={{ background: "#00e5ff", color: "#000" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── HamburgerMenu ─────────────────────────────────────────────────────────────

function HamburgerMenu({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: ScanType;
  onTabChange: (t: ScanType) => void;
  counts: Record<ScanType, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const tabs = [
    { key: "homepage" as ScanType, label: "Homepage Scans", icon: "🔍", desc: "Individual URL analyses" },
    { key: "bulk" as ScanType, label: "Bulk Scans", icon: "⚡", desc: "Multi-URL batch jobs" },
    { key: "bulk_prompt" as ScanType, label: "Bulk Prompts", icon: "💬", desc: "Custom prompt runs" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
        style={{
          background: open ? "rgba(0,229,255,0.07)" : "rgba(255,255,255,0.03)",
          borderColor: open ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.1)",
          color: "#f0f0f5",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 rounded-xl border overflow-hidden z-50 min-w-[240px]"
          style={{ background: "#0e0f17", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#555869" }}>View type</p>
          </div>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { onTabChange(tab.key); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/[0.04] text-left"
                style={{ background: isActive ? "rgba(0,229,255,0.05)" : "transparent" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{
                    background: isActive ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1px solid rgba(0,229,255,0.25)" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {tab.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: isActive ? "#00e5ff" : "#f0f0f5" }}>{tab.label}</div>
                  <div className="text-[11px]" style={{ color: "#8b8d9e" }}>{tab.desc}</div>
                </div>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: isActive ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.05)",
                    color: isActive ? "#00e5ff" : "#6f7280",
                    border: isActive ? "1px solid rgba(0,229,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Export Menu ───────────────────────────────────────────────────────────────

interface ExportMenuProps {
  activeTab: ScanType;
  homepageReports: ReportSummary[];
  bulkJobs: BulkJob[];
  bulkPromptBatches: BulkPromptBatch[];
}

function ExportMenu({ activeTab, homepageReports, bulkJobs, bulkPromptBatches }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    setOpen(false);
    try {
      if (activeTab === "homepage") {
        format === "csv" ? exportHomepageCSV(homepageReports) : await exportHomepagePDF(homepageReports);
      } else if (activeTab === "bulk") {
        format === "csv" ? exportBulkCSV(bulkJobs) : await exportBulkPDF(bulkJobs);
      } else {
        format === "csv" ? exportBulkPromptCSV(bulkPromptBatches) : await exportBulkPromptPDF(bulkPromptBatches);
      }
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!exporting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all hover:border-[#00e5ff]/40 disabled:opacity-50"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderColor: open ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.1)",
          color: "#f0f0f5",
        }}
      >
        {exporting ? (
          <>
            <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6.5L7 10l3-3.5M1.5 12.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
            <span style={{ color: "#8b8d9e", fontSize: 10 }}>▾</span>
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl border overflow-hidden z-50 min-w-[160px]"
          style={{ background: "#0e0f17", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#555869" }}>Export as</p>
          </div>
          {(["csv", "pdf"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/[0.04] text-left"
              style={{ color: "#f0f0f5" }}
            >
              <span className="text-base">{fmt === "csv" ? "📊" : "📄"}</span>
              <div>
                <div className="font-medium">.{fmt.toUpperCase()}</div>
                <div className="text-[11px]" style={{ color: "#8b8d9e" }}>
                  {fmt === "csv" ? "Spreadsheet data" : "Formatted document"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PreviousReportsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ScanType>("homepage");

  // Homepage scan state
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreReports, setHasMoreReports] = useState(false);

  // Bulk scan state
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Bulk prompt state
  const [bulkPromptBatches, setBulkPromptBatches] = useState<BulkPromptBatch[]>([]);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Fetch homepage reports ─────────────────────────────────────────────────
  const fetchReports = useCallback(async (cursor?: string) => {
    const isFresh = !cursor;
    isFresh ? setLoadingReports(true) : setLoadingMoreReports(true);
    setReportsError(null);
    try {
      const params = new URLSearchParams({ limit: "15" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
      setReports((prev) => (isFresh ? data.reports : [...prev, ...data.reports]));
      setNextCursor(data.nextCursor ?? null);
      setHasMoreReports(data.hasMore ?? false);
    } catch (err) {
      setReportsError(err instanceof Error ? err.message : "Could not load reports");
    } finally {
      isFresh ? setLoadingReports(false) : setLoadingMoreReports(false);
    }
  }, []);

  // ── Fetch bulk jobs ────────────────────────────────────────────────────────
  const fetchBulkJobs = useCallback(async () => {
    setLoadingBulk(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/bulk-history?limit=20");
      if (!res.ok) throw new Error("Failed to fetch bulk history");
      const data = await res.json();
      // ✅ results[] always present (from subcollection), never undefined
      setBulkJobs((data.jobs ?? []).map((j: any) => ({
        ...j,
        results: (j.results ?? []).map((r: any) => ({
          ...r,
          fullData: r.fullData ?? null,
        })),
      })));
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Could not load bulk jobs");
    } finally {
      setLoadingBulk(false);
    }
  }, []);

  // ── Fetch bulk prompt batches ──────────────────────────────────────────────
  const fetchBulkPromptBatches = useCallback(async () => {
    setLoadingPrompt(true);
    setPromptError(null);
    try {
      const res = await fetch("/api/bulk-prompt-history?limit=20");
      if (!res.ok) throw new Error("Failed to fetch prompt history");
      const data = await res.json();
      // ✅ runs[] always present (from subcollection), never undefined
      setBulkPromptBatches((data.batches ?? []).map((b: any) => ({ ...b, runs: b.runs ?? [] })));
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Could not load prompt batches");
    } finally {
      setLoadingPrompt(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    if (activeTab === "bulk" && bulkJobs.length === 0 && !loadingBulk) fetchBulkJobs();
    if (activeTab === "bulk_prompt" && bulkPromptBatches.length === 0 && !loadingPrompt) fetchBulkPromptBatches();
    setSearch("");
  }, [activeTab]);

  const handleReportClick = (report: ReportSummary) => {
    setSelectedReport(report as AnalysisResult);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedReport(null), 300);
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredReports = search.trim()
    ? reports.filter((r) =>
        r.url.toLowerCase().includes(search.toLowerCase()) ||
        r.site_name.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const filteredBulk = search.trim()
    ? bulkJobs.filter((j) =>
        j.jobId.toLowerCase().includes(search.toLowerCase()) ||
        j.urls?.some((u) => u.toLowerCase().includes(search.toLowerCase())) ||
        j.results.some((r) => r.url.toLowerCase().includes(search.toLowerCase()))
      )
    : bulkJobs;

  const filteredPrompt = search.trim()
    ? bulkPromptBatches.filter(
        (b) =>
          b.batchId.toLowerCase().includes(search.toLowerCase()) ||
          (b.topic ?? "").toLowerCase().includes(search.toLowerCase()) ||
          // ✅ iterate array, not Object.values(map)
          b.runs.some(
            (r) =>
              (r.url ?? "").toLowerCase().includes(search.toLowerCase()) ||
              (r.prompt ?? "").toLowerCase().includes(search.toLowerCase())
          )
      )
    : bulkPromptBatches;

  const counts = {
    homepage: reports.length,
    bulk: bulkJobs.length,
    bulk_prompt: bulkPromptBatches.length,
  };

  const isLoading =
    (activeTab === "homepage" && loadingReports) ||
    (activeTab === "bulk" && loadingBulk) ||
    (activeTab === "bulk_prompt" && loadingPrompt);

  const currentError =
    activeTab === "homepage" ? reportsError :
    activeTab === "bulk" ? bulkError :
    promptError;

  return (
    <div className="min-h-screen pl-64" style={{ background: "#0a0b10" }}>
      <div className="max-w-5xl mx-auto px-8 py-12">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Previous Reports</h1>
            <p className="text-sm" style={{ color: "#8b8d9e" }}>
              View and manage all your AI visibility scan results
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 pt-1">
            <ExportMenu
              activeTab={activeTab}
              homepageReports={reports}
              bulkJobs={bulkJobs}
              bulkPromptBatches={bulkPromptBatches}
            />
          </div>
        </div>

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <HamburgerMenu activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
          <div
            className="flex items-center rounded-xl border p-1 gap-1"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            {([
              { key: "homepage" as ScanType, label: "Homepage", icon: "🔍" },
              { key: "bulk" as ScanType, label: "Bulk Scan", icon: "⚡" },
              { key: "bulk_prompt" as ScanType, label: "Bulk Prompt", icon: "💬" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeTab === tab.key ? "rgba(0,229,255,0.12)" : "transparent",
                  color: activeTab === tab.key ? "#00e5ff" : "#8b8d9e",
                  border: activeTab === tab.key ? "1px solid rgba(0,229,255,0.25)" : "1px solid transparent",
                }}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-3"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#8b8d9e", flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder={
                activeTab === "homepage" ? "Search by URL or site name…" :
                activeTab === "bulk" ? "Search by URL or job ID…" :
                "Search by URL, topic or prompt…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: "#f0f0f5", caretColor: "#00e5ff" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "#8b8d9e", fontSize: 11 }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {currentError && (
          <div
            className="rounded-xl border p-5 mb-6 flex items-center gap-3"
            style={{ background: "rgba(255,90,90,0.04)", borderColor: "rgba(255,90,90,0.18)" }}
          >
            <span>⚠️</span>
            <p className="text-sm flex-1" style={{ color: "#ff5a5a" }}>{currentError}</p>
            <button
              onClick={() =>
                activeTab === "homepage" ? fetchReports() :
                activeTab === "bulk" ? fetchBulkJobs() :
                fetchBulkPromptBatches()
              }
              className="text-[11px] font-mono px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "rgba(255,90,90,0.3)", color: "#ff5a5a" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* ── Homepage Tab ─────────────────────────────────────────────────── */}
        {!isLoading && activeTab === "homepage" && (
          <>
            {filteredReports.length === 0 && !reportsError ? (
              <EmptyState
                icon="🔭" title="No homepage scans found"
                desc={search ? "Try a different search term" : "Scan your first website to see results here"}
                action={!search ? { label: "Scan a website", onClick: () => router.push("/") } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <HomepageRow key={report.id} report={report} onClick={() => handleReportClick(report)} />
                ))}
                {hasMoreReports && (
                  <button
                    onClick={() => fetchReports(nextCursor ?? undefined)}
                    disabled={loadingMoreReports}
                    className="w-full px-5 py-3 rounded-xl border text-sm font-medium transition-all hover:border-[#00e5ff]/30"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.1)", color: "#f0f0f5" }}
                  >
                    {loadingMoreReports ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Bulk Scan Tab ────────────────────────────────────────────────── */}
        {!isLoading && activeTab === "bulk" && (
          <>
            {filteredBulk.length === 0 && !bulkError ? (
              <EmptyState
                icon="⚡" title="No bulk scans found"
                desc={search ? "Try a different search term" : "Run your first bulk scan to see results here"}
              />
            ) : (
              <div className="space-y-4">
                {filteredBulk.map((job) => <BulkJobCard key={job.id} job={job} />)}
              </div>
            )}
          </>
        )}

        {/* ── Bulk Prompt Tab ──────────────────────────────────────────────── */}
        {!isLoading && activeTab === "bulk_prompt" && (
          <>
            {filteredPrompt.length === 0 && !promptError ? (
              <EmptyState
                icon="💬" title="No bulk prompt runs found"
                desc={search ? "Try a different search term" : "Run your first bulk prompt to see results here"}
              />
            ) : (
              <div className="space-y-4">
                {filteredPrompt.map((batch) => <BulkPromptCard key={batch.id} batch={batch} />)}
              </div>
            )}
          </>
        )}
      </div>

      <ReportModal isOpen={isModalOpen} onClose={handleCloseModal} report={selectedReport} />
    </div>
  );
}

// ── HomepageRow ───────────────────────────────────────────────────────────────

function HomepageRow({ report, onClick }: { report: ReportSummary; onClick: () => void }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-all hover:border-[#00e5ff]/30 cursor-pointer"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
      onClick={onClick}
    >
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
        style={{ background: getScoreBg(report.overall_score), border: `1px solid ${getScoreColor(report.overall_score)}33` }}
      >
        <div className="text-lg font-bold leading-none" style={{ color: getScoreColor(report.overall_score) }}>
          {report.overall_score}
        </div>
        <div className="text-[9px] font-mono mt-0.5" style={{ color: getScoreColor(report.overall_score) }}>
          {report.grade}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate mb-1">{report.site_name}</div>
        <div className="text-xs font-mono truncate" style={{ color: "#8b8d9e" }}>{domainFromUrl(report.url)}</div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {report._cached && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(66,133,244,0.1)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.2)" }}>
            cached
          </span>
        )}
        <div className="text-xs font-mono" style={{ color: "#6f7280" }}>{timeAgo(report.createdAt)}</div>
        <div className="text-sm" style={{ color: "#8b8d9e" }}>→</div>
      </div>
    </div>
  );
}

// ── BulkResultRow ─────────────────────────────────────────────────────────────

function BulkResultRow({
  r,
  onViewReport,
}: {
  r: BulkResult;
  onViewReport: (data: AnalysisResult) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fd = normalizeBulkAnalysisResult(r.fullData, r);
  const providers = fd?._providers ?? [];
  const recommendations = fd?.recommendations ?? [];
  const categories = fd?.categories ?? [];
  const citations = fd?.citations ?? [];

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      {/* ── Summary row ── */}
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-white/[0.01] transition-all"
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ color: r.status === "success" ? "#00e87a" : "#ff5a5a", fontSize: 13, flexShrink: 0 }}>
          {r.status === "success" ? "✓" : "✗"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white truncate font-mono">{domainFromUrl(r.url)}</div>
          {r.site_name && r.site_name !== r.url && (
            <div className="text-[10px] truncate" style={{ color: "#8b8d9e" }}>{r.site_name}</div>
          )}
          {r.summary && (
            <div className="text-[10px] truncate mt-0.5" style={{ color: "#555869" }}>{r.summary}</div>
          )}
          {r.error && (
            <div className="text-[10px] truncate mt-0.5" style={{ color: "#ff5a5a" }}>{r.error}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {r.score != null && (
            <div
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg"
              style={{ color: getScoreColor(r.score), background: getScoreBg(r.score) }}
            >
              {r.score} {r.grade ? `· ${r.grade}` : ""}
            </div>
          )}
          {r.fullData && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewReport(r.fullData as AnalysisResult); }}
              className="text-[10px] font-mono px-2 py-1 rounded transition-all"
              style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              Full Report →
            </button>
          )}
          <span className="text-[10px]" style={{ color: "#555869" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 space-y-3" style={{ background: "rgba(0,0,0,0.15)" }}>

          {/* Full URL */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: "#555869" }}>URL</div>
            <a href={r.url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-mono break-all hover:underline"
              style={{ color: "#00e5ff" }}
              onClick={(e) => e.stopPropagation()}
            >{r.url}</a>
          </div>

          {/* Duration */}
          {r.duration != null && (
            <div className="text-[10px] font-mono" style={{ color: "#555869" }}>
              Scan duration: <span style={{ color: "#8b8d9e" }}>{(r.duration / 1000).toFixed(1)}s</span>
            </div>
          )}

          {fd?.stats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(0,232,122,0.08)", border: "1px solid rgba(0,232,122,0.2)" }}>
                <div className="text-sm font-bold" style={{ color: "#00e87a" }}>{fd.stats.checks_passed}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#8b8d9e" }}>Passed</div>
              </div>
              <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,184,48,0.08)", border: "1px solid rgba(255,184,48,0.2)" }}>
                <div className="text-sm font-bold" style={{ color: "#ffb830" }}>{fd.stats.checks_warned}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#8b8d9e" }}>Warnings</div>
              </div>
              <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.2)" }}>
                <div className="text-sm font-bold" style={{ color: "#ff5a5a" }}>{fd.stats.checks_failed}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#8b8d9e" }}>Failed</div>
              </div>
            </div>
          )}

          {/* If no fullData, show what we have */}
          {!r.fullData && r.status === "success" && (
            <p className="text-[10px] font-mono" style={{ color: "#555869" }}>
              Full analysis data not stored. Re-run with <code>disableFirestoreWrite: false</code> to persist.
            </p>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "#555869" }}>
                Category Scores
              </div>
              <div className="space-y-2">
                {categories.map((cat: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] truncate pr-2" style={{ color: "#f0f0f5" }}>
                        {cat.icon ? `${cat.icon} ` : ""}{cat.name ?? cat.category ?? "Unknown"}
                      </span>
                      <span
                        className="text-[10px] font-mono font-bold flex-shrink-0"
                        style={{ color: getScoreColor(cat.score ?? 0) }}
                      >
                        {cat.score ?? "—"}
                      </span>
                    </div>
                    {Array.isArray(cat.checks) && cat.checks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {cat.checks.slice(0, 4).map((check: any, ci: number) => (
                          <div key={ci} className="flex items-start gap-2 text-[10px] leading-relaxed">
                            <span style={{ color: check.status === "pass" ? "#00e87a" : check.status === "warn" ? "#ffb830" : "#ff5a5a" }}>
                              {check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "✗"}
                            </span>
                            <span style={{ color: "#8b8d9e" }}>
                              {check.label}
                              {check.detail ? ` — ${check.detail}` : ""}
                            </span>
                          </div>
                        ))}
                        {cat.checks.length > 4 && (
                          <div className="text-[10px] font-mono" style={{ color: "#555869" }}>
                            +{cat.checks.length - 4} more checks
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Platform Coverage */}
          {fd?.ai_platform_coverage && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "#555869" }}>
                AI Platform Coverage
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(fd.ai_platform_coverage).map(([platform, present]: [string, any]) => (
                  <span key={platform}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{
                      background: present ? "rgba(0,232,122,0.08)" : "rgba(255,90,90,0.08)",
                      color: present ? "#00e87a" : "#ff5a5a",
                      border: `1px solid ${present ? "rgba(0,232,122,0.2)" : "rgba(255,90,90,0.2)"}`,
                    }}>
                    {present ? "✓" : "✗"} {platform}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Citations */}
          {citations.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "#555869" }}>
                Citations ({citations.length})
              </div>
              <div className="space-y-1">
                {citations.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="text-[10px] font-mono flex items-center gap-2">
                    <span style={{ color: "#555869" }}>{i + 1}.</span>
                    <a href={c.url ?? c.source ?? c.allCitationUrls?.[0] ?? c} target="_blank" rel="noopener noreferrer"
                      className="truncate hover:underline"
                      style={{ color: "#00e5ff" }}
                      onClick={(e) => e.stopPropagation()}>
                      {c.url ?? c.source ?? c.allCitationUrls?.[0] ?? String(c)}
                    </a>
                  </div>
                ))}
                {citations.length > 5 && (
                  <div className="text-[10px] font-mono" style={{ color: "#555869" }}>
                    +{citations.length - 5} more — click "Full Report" to see all
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "#555869" }}>
                Top Recommendations
              </div>
              <div className="space-y-1.5">
                {recommendations.slice(0, 3).map((rec: any, i: number) => (
                  <div key={i} className="text-[10px] leading-relaxed rounded-lg px-2.5 py-1.5"
                    style={{ background: "rgba(255,184,48,0.05)", border: "1px solid rgba(255,184,48,0.1)", color: "#c8a840" }}>
                    {rec.title ?? rec.text ?? rec.recommendation ?? String(rec)}
                    {(rec.description || rec.impact) && (
                      <div className="mt-1 text-[10px] leading-relaxed" style={{ color: "#8b8d9e" }}>
                        {rec.description ?? ""}
                        {rec.impact ? ` ${rec.impact}` : ""}
                      </div>
                    )}
                  </div>
                ))}
                {recommendations.length > 3 && (
                  <div className="text-[10px] font-mono" style={{ color: "#555869" }}>
                    +{recommendations.length - 3} more in full report
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Providers used */}
          {providers.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "#555869" }}>
                AI Provider Results
              </div>
              <div className="space-y-2">
                {providers.map((provider: any, i: number) => (
                  <div key={i} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-bold" style={{ color: "#00e5ff" }}>
                        {provider.name ?? provider.provider ?? `Provider ${i + 1}`}
                      </span>
                      {provider.status && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                          {provider.status}
                        </span>
                      )}
                      {provider.durationMs != null && (
                        <span className="text-[9px] font-mono" style={{ color: "#555869" }}>
                          {provider.durationMs}ms
                        </span>
                      )}
                      {provider.score != null && (
                        <span className="text-[9px] font-mono" style={{ color: getScoreColor(provider.score) }}>
                          {provider.score}/100
                        </span>
                      )}
                    </div>
                    {provider.error ? (
                      <p className="text-[10px] font-mono" style={{ color: "#ff5a5a" }}>{provider.error}</p>
                    ) : (
                      <p className="text-[10px] leading-relaxed whitespace-pre-wrap" style={{ color: "#8b8d9e" }}>
                        {extractProviderText(provider.rawResponse).slice(0, 300)}
                        {extractProviderText(provider.rawResponse).length > 300 ? "…" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Report button (bottom) */}
          {fd && r.fullData && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewReport(fd); }}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-85 mt-1"
              style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.25)" }}
            >
              View Full Report →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── BulkJobCard ───────────────────────────────────────────────────────────────

function BulkJobCard({ job }: { job: BulkJob }) {
  const [expanded, setExpanded] = useState(false);
  const [modalReport, setModalReport] = useState<AnalysisResult | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const passRate = job.total > 0 ? Math.round((job.passed / job.total) * 100) : 0;

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      if (format === "csv") {
        exportBulkCSV([job]);
      } else {
        await exportBulkPDF([job]);
      }
    } catch (e) {
      console.error("Bulk job export error:", e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div
        className="rounded-xl border overflow-hidden transition-all"
        style={{ background: "rgba(255,255,255,0.02)", borderColor: expanded ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.07)" }}
      >
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.01] transition-all"
          onClick={() => setExpanded((e) => !e)}
        >
          <div
            className="w-14 h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
            style={{ background: getScoreBg(passRate), border: `1px solid ${getScoreColor(passRate)}33` }}
          >
            <div className="text-lg font-bold leading-none" style={{ color: getScoreColor(passRate) }}>{passRate}%</div>
            <div className="text-[9px] font-mono mt-0.5" style={{ color: getScoreColor(passRate) + "99" }}>pass</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-semibold text-white">{job.total} URLs</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: job.status === "done" ? "rgba(0,232,122,0.1)" : "rgba(255,184,48,0.1)",
                  color: job.status === "done" ? "#00e87a" : "#ffb830",
                  border: `1px solid ${job.status === "done" ? "rgba(0,232,122,0.2)" : "rgba(255,184,48,0.2)"}`,
                }}>
                {job.status}
              </span>
              {job.results.length > 0 && (
                <span className="text-[10px] font-mono" style={{ color: "#555869" }}>
                  {job.results.length} result{job.results.length !== 1 ? "s" : ""} loaded
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono" style={{ color: "#8b8d9e" }}>
              <span style={{ color: "#00e87a" }}>{job.passed}✓</span>
              <span style={{ color: "#ff5a5a" }}>{job.failed}✗</span>
              <span>·</span>
              <span>{timeAgo(job.createdAt)}</span>
            </div>
          </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); void handleExport("csv"); }}
                disabled={!!exporting}
                className="text-[10px] font-mono px-2.5 py-1 rounded transition-all disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.04)", color: "#f0f0f5", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {exporting === "csv" ? "Exporting…" : "CSV"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); void handleExport("pdf"); }}
                disabled={!!exporting}
                className="text-[10px] font-mono px-2.5 py-1 rounded transition-all disabled:opacity-50"
                style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.18)" }}
              >
                {exporting === "pdf" ? "Exporting…" : "PDF"}
              </button>
              <div
                className="text-sm transition-transform duration-200 flex-shrink-0"
                style={{ color: "#8b8d9e", transform: expanded ? "rotate(180deg)" : "none" }}
              >
                ▼
              </div>
            </div>
        </div>

        {expanded && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="max-h-[600px] overflow-y-auto">
              {job.results.length > 0 ? job.results.map((r, i) => (
                <BulkResultRow key={i} r={r} onViewReport={setModalReport} />
              )) : (
                <p className="px-5 py-4 text-sm" style={{ color: "#8b8d9e" }}>No result details stored.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Per-job full-report modal */}
      <ReportModal
        isOpen={!!modalReport}
        onClose={() => setModalReport(null)}
        report={modalReport}
      />
    </>
  );
}

// ── BulkPromptRunDetail ───────────────────────────────────────────────────────

function BulkPromptRunDetail({ run }: { run: BulkPromptRun }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="px-5 py-3.5 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{
            background: run.status === "success" ? "rgba(0,232,122,0.1)" : "rgba(255,90,90,0.1)",
            color: run.status === "success" ? "#00e87a" : "#ff5a5a",
          }}>
          {run.status}
        </span>
        <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>{run.promptId}</span>
        {run.provider && (
          <span className="text-[11px] font-mono" style={{ color: "#555869" }}>via {run.provider}</span>
        )}
        {run.responses && run.responses.length > 1 && (
          <span className="text-[10px] font-mono" style={{ color: "#555869" }}>
            +{run.responses.length - 1} more provider{run.responses.length > 2 ? "s" : ""}
          </span>
        )}
        <span className="text-[11px] font-mono ml-auto" style={{ color: "#555869" }}>
          {timeAgo(run.createdAt)}
        </span>
      </div>

      {run.url && (
        <div className="text-xs font-mono truncate mb-1" style={{ color: "#6f7280" }}>{run.url}</div>
      )}

      {/* Prompt text */}
      {run.prompt && (
        <div className="text-[10px] font-mono mb-1.5 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "#6f7280", border: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ color: "#555869" }}>Prompt: </span>{run.prompt}
        </div>
      )}

      {/* Primary response preview */}
      {run.response && (
        <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "#8b8d9e" }}>
          {showDetail ? run.response : `${run.response.slice(0, 300)}${run.response.length > 300 ? "…" : ""}`}
        </p>
      )}

      {/* Citations summary badges */}
      {run.citations && run.citations.length > 0 && (
        <div className="flex items-center gap-2 mt-1 mb-1.5 flex-wrap">
          {run.citations.map((c) => (
            <span key={c.provider} className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,229,255,0.07)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.15)" }}>
              {c.provider}: {c.count} citation{c.count !== 1 ? "s" : ""}
            </span>
          ))}
        </div>
      )}

      {/* Toggle full details */}
      <button
        onClick={() => setShowDetail((v) => !v)}
        className="text-[10px] font-mono mt-1 px-2 py-1 rounded transition-all"
        style={{ background: showDetail ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.04)", color: showDetail ? "#00e5ff" : "#8b8d9e", border: `1px solid ${showDetail ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.07)"}` }}
      >
        {showDetail ? "▲ Hide details" : "▼ Show full details"}
      </button>

      {showDetail && (
        <div className="mt-3 space-y-3">
          {/* All provider responses */}
          {run.responses && run.responses.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#555869" }}>
                All Provider Responses ({run.responses.length})
              </div>
              {run.responses.map((resp, i) => (
                <div key={i} className="mb-2 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold" style={{ color: "#00e5ff" }}>{resp.provider}</span>
                    {resp.durationMs != null && (
                      <span className="text-[10px] font-mono" style={{ color: "#555869" }}>{resp.durationMs}ms</span>
                    )}
                    {resp.error && (
                      <span className="text-[10px] font-mono" style={{ color: "#ff5a5a" }}>ERROR</span>
                    )}
                  </div>
                  {resp.error ? (
                    <p className="text-[10px] font-mono" style={{ color: "#ff5a5a" }}>{resp.error}</p>
                  ) : (
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "#8b8d9e" }}>{resp.response}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full citations with raw answers */}
          {run.citations && run.citations.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#555869" }}>
                Citation Details
              </div>
              {run.citations.map((c, i) => (
                <div key={i} className="mb-2 rounded-lg p-2.5" style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.08)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold" style={{ color: "#00e5ff" }}>{c.provider}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                      {c.count} URL{c.count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: c.status === "success" ? "#00e87a" : "#ff5a5a" }}>{c.status}</span>
                  </div>
                  {c.allCitationUrls && c.allCitationUrls.length > 0 && (
                    <div className="mb-1.5">
                      <div className="text-[9px] font-mono uppercase mb-1" style={{ color: "#555869" }}>Cited URLs</div>
                      <div className="space-y-0.5">
                        {c.allCitationUrls.map((u, j) => (
                          <div key={j} className="text-[10px] font-mono truncate" style={{ color: "#6f7280" }}>{u}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.rawAnswer && (
                    <div>
                      <div className="text-[9px] font-mono uppercase mb-1" style={{ color: "#555869" }}>Raw Answer</div>
                      <p className="text-[10px] leading-relaxed whitespace-pre-wrap" style={{ color: "#8b8d9e" }}>{c.rawAnswer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── BulkPromptCard ────────────────────────────────────────────────────────────

function BulkPromptCard({ batch }: { batch: BulkPromptBatch }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  // ✅ batch.runs is an array now
  const runs = batch.runs;

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      if (format === "csv") {
        exportBulkPromptCSV([batch]);
      } else {
        await exportBulkPromptPDF([batch]);
      }
    } catch (e) {
      console.error("Bulk prompt export error:", e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: expanded ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.01] transition-all"
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
          style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.15)" }}
        >
          💬
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-white">{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}>
              {batch.status}
            </span>
            {batch.passedRuns > 0 && (
              <span className="text-[10px] font-mono" style={{ color: "#00e87a" }}>{batch.passedRuns}✓</span>
            )}
            {batch.failedRuns > 0 && (
              <span className="text-[10px] font-mono" style={{ color: "#ff5a5a" }}>{batch.failedRuns}✗</span>
            )}
          </div>
          <div className="text-xs font-mono truncate" style={{ color: "#8b8d9e" }}>
            {batch.topic ? `${batch.topic.slice(0, 60)}${batch.topic.length > 60 ? "…" : ""}` : batch.batchId}
            {" · "}
            {timeAgo(batch.createdAt ?? batch.updatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); void handleExport("csv"); }}
            disabled={!!exporting}
            className="text-[10px] font-mono px-2.5 py-1 rounded transition-all disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", color: "#f0f0f5", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {exporting === "csv" ? "Exporting…" : "CSV"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); void handleExport("pdf"); }}
            disabled={!!exporting}
            className="text-[10px] font-mono px-2.5 py-1 rounded transition-all disabled:opacity-50"
            style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.18)" }}
          >
            {exporting === "pdf" ? "Exporting…" : "PDF"}
          </button>
          <div
            className="text-sm transition-transform duration-200 flex-shrink-0"
            style={{ color: "#8b8d9e", transform: expanded ? "rotate(180deg)" : "none" }}
          >
            ▼
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="max-h-[640px] overflow-y-auto">
            {/* ✅ iterate array directly — each run has its own expand toggle */}
            {runs.length > 0 ? runs.map((run) => (
              <BulkPromptRunDetail key={run.executionId} run={run} />
            )) : (
              <p className="px-5 py-4 text-sm" style={{ color: "#8b8d9e" }}>No run details stored.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}