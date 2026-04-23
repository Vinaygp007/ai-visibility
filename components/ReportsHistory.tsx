"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportSummary {
  id: string;
  url: string;
  site_name: string;
  overall_score: number;
  grade: string;
  summary: string;
  createdAt: number | null;
  _cached: boolean;
}

interface ReportsHistoryProps {
  /** Called when user clicks "View Report" on a past entry */
  onLoadReport: (url: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
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

// ── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl animate-pulse"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="w-12 h-12 rounded-xl flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-1/3 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-2.5 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="w-16 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.15)" }}
      >
        🔭
      </div>
      <p className="text-sm font-medium text-white mb-1">No reports yet</p>
      <p className="text-[12px]" style={{ color: "#8b8d9e" }}>
        Scan your first website — it will appear here for quick re-access.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsHistory({ onLoadReport }: ReportsHistoryProps) {
  const [reports, setReports]           = useState<ReportSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [nextCursor, setNextCursor]     = useState<string | null>(null);
  const [hasMore, setHasMore]           = useState(false);
  const [isOpen, setIsOpen]             = useState(false);
  const [search, setSearch]             = useState("");

  const fetchReports = useCallback(async (cursor?: string) => {
    const isFresh = !cursor;
    isFresh ? setLoading(true) : setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "15" });
      if (cursor) params.set("cursor", cursor);

      const res  = await fetch(`/api/reports?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");

      setReports(prev => isFresh ? data.reports : [...prev, ...data.reports]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports");
    } finally {
      isFresh ? setLoading(false) : setLoadingMore(false);
    }
  }, []);

  // Fetch on first open
  useEffect(() => {
    if (isOpen && reports.length === 0 && !error) {
      fetchReports();
    }
  }, [isOpen, fetchReports, reports.length, error]);

  const filtered = search.trim()
    ? reports.filter(r =>
        r.url.toLowerCase().includes(search.toLowerCase()) ||
        r.site_name.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: "#0e0f17",
        borderColor: isOpen ? "rgba(0,229,255,0.18)" : "rgba(255,255,255,0.07)",
        boxShadow: isOpen ? "0 0 0 1px rgba(0,229,255,0.06)" : "none",
      }}
    >
      {/* ── Header / toggle ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}
          >
            📋
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white leading-tight">Previous Reports</div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: "#8b8d9e" }}>
              {loading && isOpen
                ? "Loading..."
                : reports.length > 0
                  ? `${reports.length} report${reports.length !== 1 ? "s" : ""} stored`
                  : "View past analyses from the database"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              {reports.length}
            </span>
          )}
          <span
            className="text-[13px] transition-transform duration-200"
            style={{ color: "#8b8d9e", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Search bar */}
          {(reports.length > 3 || search) && (
            <div className="px-4 pt-3 pb-0">
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2"
                style={{ background: "#111219", borderColor: "rgba(255,255,255,0.09)" }}
              >
                <span style={{ color: "#8b8d9e", fontSize: 12 }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter by domain…"
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-white"
                  style={{ caretColor: "#00e5ff" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ color: "#8b8d9e", fontSize: 11 }}>✕</button>
                )}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mx-4 my-4 rounded-xl px-4 py-3 text-[13px] flex items-center gap-3"
              style={{ background: "rgba(255,90,90,0.06)", border: "1px solid rgba(255,90,90,0.15)" }}>
              <span>⚠️</span>
              <span style={{ color: "#ff5a5a" }}>{error}</span>
              <button
                onClick={() => fetchReports()}
                className="ml-auto text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all hover:border-[#ff5a5a]"
                style={{ borderColor: "rgba(255,90,90,0.3)", color: "#ff5a5a" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="flex flex-col gap-2 p-4">
              {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            search ? (
              <div className="py-10 text-center text-[13px]" style={{ color: "#8b8d9e" }}>
                No reports match &ldquo;<span className="text-white">{search}</span>&rdquo;
              </div>
            ) : <EmptyState />
          )}

          {/* Report rows */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col gap-1 p-3">
              {filtered.map((r, idx) => {
                const scoreColor = getScoreColor(r.overall_score);
                const scoreBg    = getScoreBg(r.overall_score);
                const domain     = domainFromUrl(r.url);

                return (
                  <div
                    key={r.id}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all cursor-pointer animate-fade-up"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid transparent",
                      animationDelay: `${idx * 40}ms`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.04)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,255,0.12)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                      (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                    }}
                  >
                    {/* Score badge */}
                    <div
                      className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: scoreBg, border: `1px solid ${scoreColor}30` }}
                    >
                      <span className="text-sm font-bold leading-none" style={{ color: scoreColor }}>
                        {r.overall_score}
                      </span>
                      <span className="text-[8px] font-mono mt-0.5" style={{ color: scoreColor + "99" }}>
                        {r.grade}
                      </span>
                    </div>

                    {/* Domain + summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-white truncate">{domain}</span>
                        {r._cached && (
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={{ color: "#ffb830", background: "rgba(255,184,48,0.1)" }}
                          >
                            CACHED
                          </span>
                        )}
                      </div>
                      {r.summary && (
                        <p
                          className="text-[11px] mt-0.5 leading-snug truncate"
                          style={{ color: "#8b8d9e", maxWidth: "38ch" }}
                          title={r.summary}
                        >
                          {r.summary}
                        </p>
                      )}
                      <span className="text-[10px] font-mono" style={{ color: "#555869" }}>
                        {timeAgo(r.createdAt)}
                      </span>
                    </div>

                    {/* Re-scan button */}
                    <button
                      onClick={e => { e.stopPropagation(); onLoadReport(r.url); }}
                      className="opacity-0 group-hover:opacity-100 transition-all text-[11px] font-mono px-3 py-1.5 rounded-lg border whitespace-nowrap"
                      style={{
                        color: "#00e5ff",
                        borderColor: "rgba(0,229,255,0.3)",
                        background: "rgba(0,229,255,0.07)",
                      }}
                    >
                      ↻ Re-scan
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && !error && (
            <div className="px-4 pb-4 flex justify-center">
              <button
                onClick={() => fetchReports(nextCursor ?? undefined)}
                disabled={loadingMore}
                className="text-[12px] font-mono px-5 py-2 rounded-xl border transition-all hover:border-[#00e5ff] hover:text-[#00e5ff] disabled:opacity-40"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "#8b8d9e", background: "transparent" }}
              >
                {loadingMore ? "Loading..." : "Load more →"}
              </button>
            </div>
          )}

          {/* Footer */}
          {!loading && reports.length > 0 && (
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-[10px] font-mono" style={{ color: "#555869" }}>
                Stored in Firestore · ordered by date
              </span>
              <button
                onClick={() => { setReports([]); setNextCursor(null); fetchReports(); }}
                className="text-[10px] font-mono transition-colors hover:text-white"
                style={{ color: "#555869" }}
              >
                ↺ Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}