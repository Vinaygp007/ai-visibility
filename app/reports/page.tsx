"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ReportModal from "@/components/ReportModal";
import { AnalysisResult } from "@/types";

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
  results?: BulkResult[];
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
}

interface BulkPromptBatch {
  id: string;
  batchId: string;
  status: string;
  updatedAt: string | null;
  runs?: Record<string, BulkPromptRun>;
}

interface BulkPromptRun {
  executionId: string;
  promptId: string;
  status: string;
  url?: string | null;
  prompt?: string;
  response?: string;
  provider?: string | null;
  durationMs?: number | null;
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
  const header = ["Job ID", "URL", "Status", "Score", "Grade", "Site Name", "Duration (ms)", "Error", "Date"];
  const rows: string[] = [];
  for (const job of jobs) {
    for (const r of job.results ?? []) {
      rows.push([job.jobId, r.url, r.status, r.score ?? "", r.grade ?? "", r.site_name ?? "",
        r.duration ?? "", r.error ?? "", job.createdAt ?? ""].map(escape).join(","));
    }
  }
  const csv = [header.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `aiscope-bulk-${new Date().toISOString().slice(0,10)}.csv`);
}

function exportBulkPromptCSV(batches: BulkPromptBatch[]) {
  const header = ["Batch ID", "Execution ID", "Prompt ID", "URL", "Status", "Provider", "Duration (ms)", "Response Preview", "Date"];
  const rows: string[] = [];
  for (const batch of batches) {
    for (const run of Object.values(batch.runs ?? {})) {
      rows.push([batch.batchId, run.executionId, run.promptId, run.url ?? "", run.status,
        run.provider ?? "", run.durationMs ?? "", (run.response ?? "").slice(0, 200),
        run.createdAt ?? ""].map(escape).join(","));
    }
  }
  const csv = [header.join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `aiscope-prompts-${new Date().toISOString().slice(0,10)}.csv`);
}

// ── Shared: load jsPDF from CDN (same pattern as bulk scan page) ──────────────
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

  // Title block
  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text("AiScope — Homepage Scan Report", 16, 16);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 16, 22);
  doc.text("by Marcstrat", 16, 27);
  h.setY(33);
  h.writeSeparator();

  // Summary
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

  // All reports
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

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
    doc.text("AiScope Homepage Report — by Marcstrat", 16, 289);
    doc.text(`Page ${p} of ${pageCount}`, 194, 289, { align: "right" });
  }

  doc.save(`aiscope-homepage-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportBulkPDF(jobs: BulkJob[]) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const h = makePdfHelpers(doc);

  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text("AiScope — Bulk Scan Report", 16, 16);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 16, 22);
  doc.text("by Marcstrat", 16, 27);
  h.setY(33);
  h.writeSeparator();

  // Summary
  h.writeLabel("Summary");
  const totalUrls = jobs.reduce((s, j) => s + j.total, 0);
  const totalPassed = jobs.reduce((s, j) => s + j.passed, 0);
  const totalFailed = jobs.reduce((s, j) => s + j.failed, 0);
  h.writeLine(`Total jobs     : ${jobs.length}`, 10);
  h.writeLine(`Total URLs     : ${totalUrls}`, 10);
  h.writeLine(`Total passed   : ${totalPassed}`, 10);
  h.writeLine(`Total failed   : ${totalFailed}`, 10);
  h.setY(h.getY() + 4);

  // Each job
  jobs.forEach((job, ji) => {
    h.newPage();
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text(`Job ${ji + 1}: ${job.jobId}`, 16, h.getY()); h.setY(h.getY() + 7);
    h.writeSeparator();
    h.writeLine(`Status: ${job.status}   Total: ${job.total}   Passed: ${job.passed}   Failed: ${job.failed}`, 10, "bold");
    h.writeLine(`Date: ${job.createdAt ?? "Unknown"}`, 9);
    h.setY(h.getY() + 3);

    h.writeLabel("Results");
    (job.results ?? []).forEach((r, ri) => {
      h.needsSpace(12);
      const status = r.status === "success" ? "[PASS]" : "[FAIL]";
      h.writeLine(`${ri + 1}. ${status}  ${r.url.replace(/^https?:\/\//, "")}`, 9, "bold");
      if (r.site_name && r.site_name !== r.url) h.writeLine(`   ${r.site_name}`, 8, "normal", 4);
      if (r.score != null) h.writeLine(`   Score: ${r.score}/100   Grade: ${r.grade ?? "—"}`, 8, "normal", 4);
      if (r.summary) h.writeLine(`   ${r.summary}`, 8, "italic", 4);
      if (r.error) h.writeLine(`   Error: ${r.error}`, 8, "italic", 4);
      h.setY(h.getY() + 2);
    });
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
    doc.text("AiScope Bulk Scan Report — by Marcstrat", 16, 289);
    doc.text(`Page ${p} of ${pageCount}`, 194, 289, { align: "right" });
  }

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

  // Summary
  h.writeLabel("Summary");
  const totalRuns = batches.reduce((s, b) => s + Object.values(b.runs ?? {}).length, 0);
  h.writeLine(`Total batches : ${batches.length}`, 10);
  h.writeLine(`Total runs    : ${totalRuns}`, 10);
  h.setY(h.getY() + 4);

  // Each batch
  batches.forEach((batch, bi) => {
    h.newPage();
    doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text(`Batch ${bi + 1}: ${batch.batchId}`, 16, h.getY()); h.setY(h.getY() + 7);
    h.writeSeparator();
    h.writeLine(`Status: ${batch.status}   Updated: ${batch.updatedAt ?? "Unknown"}`, 9);
    h.setY(h.getY() + 3);

    const runs = Object.values(batch.runs ?? {});
    h.writeLabel(`Runs (${runs.length})`);

    runs.forEach((run, ri) => {
      h.needsSpace(14);
      h.writeLine(`${ri + 1}. [${run.status.toUpperCase()}]  Prompt: ${run.promptId}`, 9, "bold");
      if (run.url) h.writeLine(`   URL: ${run.url}`, 8, "normal", 4);
      if (run.provider) h.writeLine(`   Provider: ${run.provider}   Duration: ${run.durationMs != null ? `${run.durationMs}ms` : "—"}`, 8, "normal", 4);
      h.writeLine(`   Date: ${run.createdAt ?? "—"}`, 8, "normal", 4);
      if (run.response) {
        const preview = run.response.slice(0, 300);
        h.writeLine(`   Response: ${preview}${run.response.length > 300 ? "…" : ""}`, 8, "italic", 4);
      }
      h.setY(h.getY() + 3);
    });
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
    doc.text("AiScope Bulk Prompt Report — by Marcstrat", 16, 289);
    doc.text(`Page ${p} of ${pageCount}`, 194, 289, { align: "right" });
  }

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

// ── Hamburger Menu ────────────────────────────────────────────────────────────

interface HamburgerMenuProps {
  activeTab: ScanType;
  onTabChange: (tab: ScanType) => void;
  counts: { homepage: number; bulk: number; bulk_prompt: number };
}

function HamburgerMenu({ activeTab, onTabChange, counts }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const tabs: { key: ScanType; label: string; icon: string; desc: string }[] = [
    { key: "homepage", label: "Homepage Scan", icon: "🔍", desc: "Single URL analyses" },
    { key: "bulk", label: "Bulk Scan", icon: "⚡", desc: "Multi-URL batch jobs" },
    { key: "bulk_prompt", label: "Bulk Prompt", icon: "💬", desc: "AI prompt batch runs" },
  ];

  const active = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all hover:border-[#00e5ff]/40"
        style={{
          background: open ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.03)",
          borderColor: open ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.1)",
          color: "#f0f0f5",
        }}
      >
        {/* Hamburger lines */}
        <div className="flex flex-col gap-1 w-4">
          <span
            className="block h-0.5 rounded-full transition-all duration-200"
            style={{
              background: open ? "#00e5ff" : "#8b8d9e",
              transform: open ? "rotate(45deg) translate(3px, 3px)" : "none",
            }}
          />
          <span
            className="block h-0.5 rounded-full transition-all duration-200"
            style={{
              background: open ? "#00e5ff" : "#8b8d9e",
              opacity: open ? 0 : 1,
            }}
          />
          <span
            className="block h-0.5 rounded-full transition-all duration-200"
            style={{
              background: open ? "#00e5ff" : "#8b8d9e",
              transform: open ? "rotate(-45deg) translate(3px, -3px)" : "none",
            }}
          />
        </div>

        <span className="text-sm font-medium text-white">{active.icon} {active.label}</span>

        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-full ml-1"
          style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
        >
          {counts[activeTab]}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 rounded-2xl border overflow-hidden z-50 min-w-[260px]"
          style={{
            background: "#0e0f17",
            borderColor: "rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.06)",
          }}
        >
          <div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#555869" }}>
              Scan History
            </p>
          </div>

          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => { onTabChange(tab.key); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-white/[0.03] text-left"
                style={{
                  background: isActive ? "rgba(0,229,255,0.06)" : "transparent",
                  borderLeft: isActive ? "2px solid #00e5ff" : "2px solid transparent",
                }}
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
                  <div className="text-sm font-semibold" style={{ color: isActive ? "#00e5ff" : "#f0f0f5" }}>
                    {tab.label}
                  </div>
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
          style={{
            background: "#0e0f17",
            borderColor: "rgba(255,255,255,0.1)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#555869" }}>
              Export as
            </p>
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

  // Tab state
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

  // Search & modal
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
      setBulkJobs(data.jobs ?? []);
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
      setBulkPromptBatches(data.batches ?? []);
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Could not load prompt batches");
    } finally {
      setLoadingPrompt(false);
    }
  }, []);

  // Load homepage reports on mount
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Load bulk/prompt data when tab switches
  useEffect(() => {
    if (activeTab === "bulk" && bulkJobs.length === 0 && !loadingBulk) {
      fetchBulkJobs();
    }
    if (activeTab === "bulk_prompt" && bulkPromptBatches.length === 0 && !loadingPrompt) {
      fetchBulkPromptBatches();
    }
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
    ? reports.filter(
        (r) =>
          r.url.toLowerCase().includes(search.toLowerCase()) ||
          r.site_name.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const filteredBulk = search.trim()
    ? bulkJobs.filter((j) =>
        j.jobId.toLowerCase().includes(search.toLowerCase()) ||
        j.urls?.some((u) => u.toLowerCase().includes(search.toLowerCase()))
      )
    : bulkJobs;

  const filteredPrompt = search.trim()
    ? bulkPromptBatches.filter(
        (b) =>
          b.batchId.toLowerCase().includes(search.toLowerCase()) ||
          Object.values(b.runs ?? {}).some((r) =>
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

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Previous Reports</h1>
            <p className="text-sm" style={{ color: "#8b8d9e" }}>
              View and manage all your AI visibility scan results
            </p>
          </div>

          {/* Top-right controls */}
          <div className="flex items-center gap-3 flex-shrink-0 pt-1">
            <ExportMenu
              activeTab={activeTab}
              homepageReports={reports}
              bulkJobs={bulkJobs}
              bulkPromptBatches={bulkPromptBatches}
            />
          </div>
        </div>

        {/* ── Hamburger + Tab switcher ─────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <HamburgerMenu activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

          {/* Pill tab bar (alt navigation) */}
          <div
            className="flex items-center rounded-xl border p-1 gap-1"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            {(
              [
                { key: "homepage" as ScanType, label: "Homepage", icon: "🔍" },
                { key: "bulk" as ScanType, label: "Bulk Scan", icon: "⚡" },
                { key: "bulk_prompt" as ScanType, label: "Bulk Prompt", icon: "💬" },
              ] as const
            ).map((tab) => (
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
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#8b8d9e", flexShrink: 0 }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder={
                activeTab === "homepage"
                  ? "Search by URL or site name…"
                  : activeTab === "bulk"
                  ? "Search by URL or job ID…"
                  : "Search by URL or prompt…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: "#f0f0f5", caretColor: "#00e5ff" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "#8b8d9e", fontSize: 11 }}>
                ✕
              </button>
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

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            HOMEPAGE SCAN TAB
        ════════════════════════════════════════════════════════════════════ */}
        {!isLoading && activeTab === "homepage" && (
          <>
            {filteredReports.length === 0 && !reportsError ? (
              <EmptyState
                icon="🔭"
                title="No homepage scans found"
                desc={search ? "Try a different search term" : "Scan your first website to see results here"}
                action={!search ? { label: "Scan a website", onClick: () => router.push("/") } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <HomepageRow
                    key={report.id}
                    report={report}
                    onClick={() => handleReportClick(report)}
                  />
                ))}

                {hasMoreReports && (
                  <button
                    onClick={() => fetchReports(nextCursor ?? undefined)}
                    disabled={loadingMoreReports}
                    className="w-full px-5 py-3 rounded-xl border text-sm font-medium transition-all hover:border-[#00e5ff]/30"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#f0f0f5",
                    }}
                  >
                    {loadingMoreReports ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            BULK SCAN TAB
        ════════════════════════════════════════════════════════════════════ */}
        {!isLoading && activeTab === "bulk" && (
          <>
            {filteredBulk.length === 0 && !bulkError ? (
              <EmptyState
                icon="⚡"
                title="No bulk scans found"
                desc={search ? "Try a different search term" : "Run your first bulk scan to see results here"}
              />
            ) : (
              <div className="space-y-4">
                {filteredBulk.map((job) => (
                  <BulkJobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            BULK PROMPT TAB
        ════════════════════════════════════════════════════════════════════ */}
        {!isLoading && activeTab === "bulk_prompt" && (
          <>
            {filteredPrompt.length === 0 && !promptError ? (
              <EmptyState
                icon="💬"
                title="No bulk prompt runs found"
                desc={search ? "Try a different search term" : "Run your first bulk prompt to see results here"}
              />
            ) : (
              <div className="space-y-4">
                {filteredPrompt.map((batch) => (
                  <BulkPromptCard key={batch.id} batch={batch} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Report Modal ──────────────────────────────────────────────────── */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        report={selectedReport}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: string;
  title: string;
  desc: string;
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

function HomepageRow({ report, onClick }: { report: ReportSummary; onClick: () => void }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-all hover:border-[#00e5ff]/30 cursor-pointer"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
      onClick={onClick}
    >
      {/* Score Badge */}
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
        style={{
          background: getScoreBg(report.overall_score),
          border: `1px solid ${getScoreColor(report.overall_score)}33`,
        }}
      >
        <div className="text-lg font-bold leading-none" style={{ color: getScoreColor(report.overall_score) }}>
          {report.overall_score}
        </div>
        <div className="text-[9px] font-mono mt-0.5" style={{ color: getScoreColor(report.overall_score) }}>
          {report.grade}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate mb-1">{report.site_name}</div>
        <div className="text-xs font-mono truncate" style={{ color: "#8b8d9e" }}>
          {domainFromUrl(report.url)}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {report._cached && (
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(66,133,244,0.1)", color: "#4285f4", border: "1px solid rgba(66,133,244,0.2)" }}
          >
            cached
          </span>
        )}
        <div className="text-xs font-mono" style={{ color: "#6f7280" }}>
          {timeAgo(report.createdAt)}
        </div>
        <div className="text-sm" style={{ color: "#8b8d9e" }}>→</div>
      </div>
    </div>
  );
}

function BulkJobCard({ job }: { job: BulkJob }) {
  const [expanded, setExpanded] = useState(false);
  const passRate = job.total > 0 ? Math.round((job.passed / job.total) * 100) : 0;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: expanded ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.07)",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.01] transition-all"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Pass rate badge */}
        <div
          className="w-14 h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
          style={{
            background: getScoreBg(passRate),
            border: `1px solid ${getScoreColor(passRate)}33`,
          }}
        >
          <div className="text-lg font-bold leading-none" style={{ color: getScoreColor(passRate) }}>
            {passRate}%
          </div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: getScoreColor(passRate) + "99" }}>
            pass
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-white">{job.total} URLs</span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{
                background: job.status === "done" ? "rgba(0,232,122,0.1)" : "rgba(255,184,48,0.1)",
                color: job.status === "done" ? "#00e87a" : "#ffb830",
                border: `1px solid ${job.status === "done" ? "rgba(0,232,122,0.2)" : "rgba(255,184,48,0.2)"}`,
              }}
            >
              {job.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: "#8b8d9e" }}>
            <span style={{ color: "#00e87a" }}>{job.passed}✓</span>
            <span style={{ color: "#ff5a5a" }}>{job.failed}✗</span>
            <span>·</span>
            <span>{timeAgo(job.createdAt)}</span>
          </div>
        </div>

        <div
          className="text-sm transition-transform duration-200 flex-shrink-0"
          style={{ color: "#8b8d9e", transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▼
        </div>
      </div>

      {/* Expanded results */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="max-h-80 overflow-y-auto">
            {(job.results ?? []).map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-2.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <span style={{ color: r.status === "success" ? "#00e87a" : "#ff5a5a", fontSize: 12 }}>
                  {r.status === "success" ? "✓" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-mono">{domainFromUrl(r.url)}</div>
                  {r.site_name && r.site_name !== r.url && (
                    <div className="text-[10px] truncate" style={{ color: "#8b8d9e" }}>{r.site_name}</div>
                  )}
                </div>
                {r.score != null && (
                  <div
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                    style={{
                      color: getScoreColor(r.score),
                      background: getScoreBg(r.score),
                    }}
                  >
                    {r.score}
                  </div>
                )}
                {r.error && (
                  <div className="text-[10px] font-mono truncate max-w-[160px]" style={{ color: "#ff5a5a" }}>
                    {r.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!job.results?.length && (
            <p className="px-5 py-4 text-sm" style={{ color: "#8b8d9e" }}>No result details stored.</p>
          )}
        </div>
      )}
    </div>
  );
}

function BulkPromptCard({ batch }: { batch: BulkPromptBatch }) {
  const [expanded, setExpanded] = useState(false);
  const runs = Object.values(batch.runs ?? {});

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: expanded ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.07)",
      }}
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
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(0,229,255,0.1)",
                color: "#00e5ff",
                border: "1px solid rgba(0,229,255,0.2)",
              }}
            >
              {batch.status}
            </span>
          </div>
          <div className="text-xs font-mono truncate" style={{ color: "#8b8d9e" }}>
            {batch.batchId} · {timeAgo(batch.updatedAt)}
          </div>
        </div>

        <div
          className="text-sm transition-transform duration-200 flex-shrink-0"
          style={{ color: "#8b8d9e", transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▼
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="max-h-96 overflow-y-auto">
            {runs.map((run) => (
              <div
                key={run.executionId}
                className="px-5 py-3.5 border-b last:border-b-0"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{
                      background: run.status === "success" ? "rgba(0,232,122,0.1)" : "rgba(255,90,90,0.1)",
                      color: run.status === "success" ? "#00e87a" : "#ff5a5a",
                    }}
                  >
                    {run.status}
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: "#8b8d9e" }}>
                    {run.promptId}
                  </span>
                  {run.provider && (
                    <span className="text-[11px] font-mono" style={{ color: "#555869" }}>
                      via {run.provider}
                    </span>
                  )}
                  <span className="text-[11px] font-mono ml-auto" style={{ color: "#555869" }}>
                    {timeAgo(run.createdAt)}
                  </span>
                </div>
                {run.url && (
                  <div className="text-xs font-mono truncate mb-1" style={{ color: "#6f7280" }}>
                    {run.url}
                  </div>
                )}
                {run.response && (
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "#8b8d9e" }}>
                    {run.response.slice(0, 200)}{run.response.length > 200 ? "…" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
          {!runs.length && (
            <p className="px-5 py-4 text-sm" style={{ color: "#8b8d9e" }}>No run details stored.</p>
          )}
        </div>
      )}
    </div>
  );
}