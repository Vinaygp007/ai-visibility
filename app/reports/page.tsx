"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReportModal from "@/components/ReportModal";
import { AnalysisResult } from "@/types";

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

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl animate-pulse"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-1/3 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-2.5 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="w-16 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

export default function PreviousReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReports = useCallback(async (cursor?: string) => {
    const isFresh = !cursor;
    isFresh ? setLoading(true) : setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "15" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();

      // Console.log the data so we can see what's coming
      console.log("📋 REPORTS API RESPONSE:", data);
      console.log("📋 Number of reports:", data.reports?.length);
      console.log("📋 First report (full structure):", data.reports?.[0]);
      console.log("📋 Has more:", data.hasMore);
      console.log("📋 Next cursor:", data.nextCursor);

      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");

      setReports((prev) => (isFresh ? data.reports : [...prev, ...data.reports]));
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError(err instanceof Error ? err.message : "Could not load reports");
    } finally {
      isFresh ? setLoading(false) : setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = search.trim()
    ? reports.filter(
        (r) =>
          r.url.toLowerCase().includes(search.toLowerCase()) ||
          r.site_name.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  const handleReportClick = (report: ReportSummary) => {
    console.log("🔍 Clicked report (full data):", report);
    // The report already has all the data we need from the API
    setSelectedReport(report as AnalysisResult);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedReport(null), 300);
  };

  return (
    <div className="min-h-screen pl-64" style={{ background: "#0a0b10" }}>
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Previous Reports</h1>
          <p className="text-sm" style={{ color: "#8b8d9e" }}>
            View and manage all your AI visibility scan results
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by URL or site name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-sm"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.1)",
              color: "#f0f0f5",
            }}
          />
        </div>

        {/* Error State */}
        {error && (
          <div
            className="rounded-xl border p-6 mb-6"
            style={{
              background: "rgba(255,90,90,0.04)",
              borderColor: "rgba(255,90,90,0.18)",
            }}
          >
            <p className="text-sm" style={{ color: "#ff5a5a" }}>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && !error && (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{
                background: "rgba(0,229,255,0.07)",
                border: "1px solid rgba(0,229,255,0.15)",
              }}
            >
              🔭
            </div>
            <p className="text-sm font-medium text-white mb-1">No reports found</p>
            <p className="text-[12px] mb-4" style={{ color: "#8b8d9e" }}>
              {search ? "Try a different search term" : "Scan your first website to see results here"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
                style={{ background: "#00e5ff", color: "#000" }}
              >
                Scan a website
              </button>
            )}
          </div>
        )}

        {/* Reports List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div
                key={report.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-all hover:border-[#00e5ff]/30 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.07)",
                }}
                onClick={() => handleReportClick(report)}
              >
                {/* Score Badge */}
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                  style={{
                    background: getScoreBg(report.overall_score),
                    border: `1px solid ${getScoreColor(report.overall_score)}33`,
                  }}
                >
                  <div
                    className="text-lg font-bold leading-none"
                    style={{ color: getScoreColor(report.overall_score) }}
                  >
                    {report.overall_score}
                  </div>
                  <div
                    className="text-[9px] font-mono mt-0.5"
                    style={{ color: getScoreColor(report.overall_score) }}
                  >
                    {report.grade}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate mb-1">
                    {report.site_name}
                  </div>
                  <div
                    className="text-xs font-mono truncate"
                    style={{ color: "#8b8d9e" }}
                  >
                    {domainFromUrl(report.url)}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {report._cached && (
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(66,133,244,0.1)",
                        color: "#4285f4",
                        border: "1px solid rgba(66,133,244,0.2)",
                      }}
                    >
                      cached
                    </span>
                  )}
                  <div className="text-xs font-mono" style={{ color: "#6f7280" }}>
                    {timeAgo(report.createdAt)}
                  </div>
                  <div className="text-sm" style={{ color: "#8b8d9e" }}>
                    →
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <button
                onClick={() => fetchReports(nextCursor ?? undefined)}
                disabled={loadingMore}
                className="w-full px-5 py-3 rounded-xl border text-sm font-medium transition-all hover:border-[#00e5ff]/30"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#f0f0f5",
                }}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        report={selectedReport}
      />
    </div>
  );
}
