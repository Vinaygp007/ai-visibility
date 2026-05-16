"use client";

import { useState, useEffect } from "react";
import type { CrawlResult, CrawlPage } from "@/types";

type SortKey = keyof Pick<
  CrawlPage,
  "url" | "status" | "responseTimeMs" | "wordCount" | "h1Count" | "h2Count" | "textRatioPercent" | "metaTitleLength" | "linkDepth" | "inboundLinkCount"
>;

type CrawlState = "idle" | "loading" | "done" | "error";

const STATUS_BUCKETS = ["2xx", "3xx", "4xx", "5xx", "error"] as const;
const BUCKET_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  "2xx":   { color: "#00e87a", bg: "rgba(0,232,122,0.08)",  border: "rgba(0,232,122,0.2)"  },
  "3xx":   { color: "#ffb830", bg: "rgba(255,184,48,0.08)", border: "rgba(255,184,48,0.2)" },
  "4xx":   { color: "#ff5a5a", bg: "rgba(255,90,90,0.08)",  border: "rgba(255,90,90,0.2)"  },
  "5xx":   { color: "#ff2222", bg: "rgba(255,34,34,0.08)",  border: "rgba(255,34,34,0.2)"  },
  "error": { color: "#8b8d9e", bg: "rgba(139,141,158,0.08)", border: "rgba(139,141,158,0.2)" },
};

const ISSUE_COLORS: Record<string, string> = {
  "broken link":         "#ff5a5a",
  "server error":        "#ff2222",
  "timeout / unreachable": "#8b8d9e",
  "missing H1":          "#ff5a5a",
  "multiple H1s":        "#ffb830",
  "no title tag":        "#ff5a5a",
  "title too long":      "#ffb830",
  "title too short":     "#ffb830",
  "no meta description": "#ff5a5a",
  "description too long":"#ffb830",
  "noindex":             "#ffb830",
  "thin content":        "#ffb830",
};

function statusColor(code: number): string {
  if (code === 0)         return "#8b8d9e";
  if (code < 300)         return "#00e87a";
  if (code < 400)         return "#ffb830";
  if (code < 500)         return "#ff5a5a";
  return "#ff2222";
}

function fmt(ms: number): string {
  return ms >= 1000 ? (ms / 1000).toFixed(1) + "s" : ms + "ms";
}

function shortUrl(url: string, base: string): string {
  const path = url.replace(base, "") || "/";
  return path.length > 45 ? path.slice(0, 43) + "…" : path;
}

function ColHeader({
  label, col, current, dir, onSort,
}: {
  label: string; col: SortKey; current: SortKey; dir: "asc" | "desc"; onSort: (c: SortKey) => void;
}) {
  const active = current === col;
  return (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
      style={{ color: active ? "#00e5ff" : "#8b8d9e" }}
      onClick={() => onSort(col)}
    >
      {label}{active ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );
}

export default function CrawlSection({ url, autoRun = false }: { url: string; autoRun?: boolean }) {
  const [state, setState] = useState<CrawlState>("idle");
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { if (autoRun) runCrawl(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  const [sortCol, setSortCol] = useState<SortKey>("url");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState<"all" | "issues" | "broken">("all");

  const runCrawl = async () => {
    setState("loading");
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crawl failed");
      setState("error");
    }
  };

  const handleSort = (col: SortKey) => {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const filteredPages = result
    ? result.pages.filter(p => {
        if (filter === "broken") return p.status === 0 || p.status >= 400;
        if (filter === "issues") return p.issues.length > 0;
        return true;
      })
    : [];

  const sorted = [...filteredPages].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === "number" && typeof bv === "number")
      return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const baseUrl = (() => { try { return new URL(url).origin; } catch { return url; } })();

  return (
    <div
      className="rounded-2xl border mt-6"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div>
          <div className="text-[13px] font-mono tracking-widest uppercase" style={{ color: "#8b8d9e" }}>
            Technical Crawl
          </div>
          {state === "done" && result && (
            <div className="text-[11px] mt-0.5" style={{ color: "#8b8d9e" }}>
              {result.pagesCrawled} pages · {fmt(result.crawlDurationMs)} total
            </div>
          )}
        </div>
        {state !== "loading" && (
          <button
            onClick={runCrawl}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: state === "done" ? "rgba(0,229,255,0.1)" : "#00e5ff", color: state === "done" ? "#00e5ff" : "#000", border: state === "done" ? "1px solid rgba(0,229,255,0.3)" : "none" }}
          >
            {state === "done" ? "↺ Re-crawl" : "Run Technical Crawl"}
          </button>
        )}
      </div>

      {/* ── Idle state ─────────────────────────────────────────────────── */}
      {state === "idle" && (
        <div className="px-5 py-10 text-center">
          <div className="text-2xl mb-3">🕷️</div>
          <p className="text-sm font-medium text-white mb-1">Deep Technical Crawl</p>
          <p className="text-[12px] max-w-sm mx-auto leading-relaxed" style={{ color: "#8b8d9e" }}>
            Crawls up to 20 pages — checks status codes, broken links, word count, H1/H2 structure,
            text ratio, meta titles, and more. Takes 10–30 seconds.
          </p>
        </div>
      )}

      {/* ── Loading state ──────────────────────────────────────────────── */}
      {state === "loading" && (
        <div className="px-5 py-10 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(0,229,255,0.3)", borderTopColor: "#00e5ff" }}
            />
            <span className="text-sm font-medium" style={{ color: "#00e5ff" }}>Crawling pages…</span>
          </div>
          <p className="text-[12px]" style={{ color: "#8b8d9e" }}>Following internal links, analysing each page</p>
        </div>
      )}

      {/* ── Error state ────────────────────────────────────────────────── */}
      {state === "error" && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: "#ff5a5a" }}>Crawl failed</p>
          <p className="text-[11px]" style={{ color: "#8b8d9e" }}>{error}</p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────── */}
      {state === "done" && result && (
        <div className="px-5 pb-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-5">
            {[
              { label: "Pages Crawled",   value: result.pagesCrawled,   color: "#00e5ff" },
              { label: "Broken Pages",    value: result.pagesBroken,    color: result.pagesBroken > 0 ? "#ff5a5a" : "#00e87a" },
              { label: "Avg Response",    value: fmt(result.avgResponseTimeMs), color: result.avgResponseTimeMs > 800 ? "#ff5a5a" : result.avgResponseTimeMs > 400 ? "#ffb830" : "#00e87a" },
              { label: "Orphan Pages",    value: result.orphanPages.length, color: result.orphanPages.length > 0 ? "#ffb830" : "#00e87a" },
              { label: "Total Issues",    value: result.totalIssues,    color: result.totalIssues > 0 ? "#ffb830" : "#00e87a" },
              { label: "Avg Link Depth",  value: result.avgLinkDepth,   color: result.avgLinkDepth > 3 ? "#ffb830" : "#00e87a" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border px-4 py-3 text-center"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider mt-0.5" style={{ color: "#8b8d9e" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* robots.txt + sitemap status */}
          <div className="flex flex-wrap gap-2 mb-4 -mt-1">
            {[
              { label: "robots.txt", found: result.robotsTxtFound },
              { label: "sitemap.xml", found: result.sitemapFound  },
            ].map(({ label, found }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono"
                style={{
                  background: found ? "rgba(0,232,122,0.06)" : "rgba(255,90,90,0.06)",
                  borderColor: found ? "rgba(0,232,122,0.2)" : "rgba(255,90,90,0.2)",
                  color: found ? "#00e87a" : "#ff5a5a",
                }}
              >
                <span>{found ? "✓" : "✕"}</span>
                <span>{label}</span>
                <span style={{ color: found ? "#00e87a" : "#ff5a5a", opacity: 0.7 }}>
                  {found ? "found" : "missing"}
                </span>
              </div>
            ))}
          </div>

          {/* Status code breakdown */}
          {Object.keys(result.statusBreakdown).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {STATUS_BUCKETS.filter(b => result.statusBreakdown[b]).map(bucket => {
                const cfg = BUCKET_COLORS[bucket];
                return (
                  <div
                    key={bucket}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono"
                    style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
                  >
                    <span className="font-bold">{bucket}</span>
                    <span style={{ color: "#d0d0dc" }}>{result.statusBreakdown[bucket]} pages</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Orphan pages */}
          {result.orphanPages.length > 0 && (
            <div className="rounded-xl border p-4 mb-4" style={{ background: "rgba(255,184,48,0.04)", borderColor: "rgba(255,184,48,0.15)" }}>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: "#ffb830" }}>
                Orphan Pages — {result.orphanPages.length} (no inbound links)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.orphanPages.map(u => (
                  <a key={u} href={u} target="_blank" rel="noreferrer"
                    className="text-[10px] font-mono px-2 py-1 rounded hover:underline"
                    style={{ background: "rgba(255,184,48,0.08)", color: "#ffb830", border: "1px solid rgba(255,184,48,0.2)" }}>
                    {u.replace(result.baseUrl, "") || "/"}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {(["all", "issues", "broken"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: filter === f ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)",
                  color: filter === f ? "#00e5ff" : "#8b8d9e",
                  border: filter === f ? "1px solid rgba(0,229,255,0.25)" : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {f === "all" ? `All pages (${result.pages.length})`
                  : f === "issues" ? `Has issues (${result.pages.filter(p => p.issues.length > 0).length})`
                  : `Broken (${result.pagesBroken})`}
              </button>
            ))}
          </div>

          {/* Page table */}
          <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <ColHeader label="URL"     col="url"              current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Status"  col="status"           current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Time"    col="responseTimeMs"   current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Words"   col="wordCount"        current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="H1"      col="h1Count"          current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="H2s"     col="h2Count"          current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Text%"   col="textRatioPercent" current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Title"   col="metaTitleLength"  current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Depth"   col="linkDepth"        current={sortCol} dir={sortDir} onSort={handleSort} />
                  <ColHeader label="Inbound" col="inboundLinkCount" current={sortCol} dir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8b8d9e" }}>Issues</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-[12px]" style={{ color: "#8b8d9e" }}>
                      No pages match this filter
                    </td>
                  </tr>
                ) : sorted.map((page, i) => {
                  const isOk = page.status >= 200 && page.status < 400;
                  const sColor = statusColor(page.status);
                  const titleLen = page.metaTitleLength;
                  const titleColor = !titleLen ? "#ff5a5a" : titleLen < 30 || titleLen > 60 ? "#ffb830" : "#00e87a";
                  return (
                    <tr
                      key={page.url}
                      style={{
                        borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      {/* URL */}
                      <td className="px-3 py-2.5 font-mono max-w-[220px]">
                        <a
                          href={page.url} target="_blank" rel="noreferrer"
                          className="hover:underline truncate block"
                          style={{ color: isOk ? "#d0d0dc" : "#ff5a5a" }}
                          title={page.url}
                        >
                          {shortUrl(page.url, baseUrl)}
                        </a>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap" style={{ color: sColor }}>
                        {page.status || "err"}
                      </td>

                      {/* Response time */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: page.responseTimeMs > 800 ? "#ff5a5a" : page.responseTimeMs > 400 ? "#ffb830" : "#8b8d9e" }}>
                        {fmt(page.responseTimeMs)}
                      </td>

                      {/* Word count */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: isOk ? (page.wordCount < 100 ? "#ffb830" : "#8b8d9e") : "#8b8d9e" }}>
                        {isOk ? page.wordCount : "—"}
                      </td>

                      {/* H1 */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {!isOk ? <span style={{ color: "#8b8d9e" }}>—</span>
                          : page.h1Count === 0 ? <span style={{ color: "#ff5a5a" }}>✕</span>
                          : page.h1Count > 1 ? <span style={{ color: "#ffb830" }}>{page.h1Count}x</span>
                          : <span style={{ color: "#00e87a" }}>✓</span>}
                      </td>

                      {/* H2 count */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: "#8b8d9e" }}>
                        {isOk ? page.h2Count : "—"}
                      </td>

                      {/* Text ratio */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: isOk ? (page.textRatioPercent < 10 ? "#ffb830" : "#8b8d9e") : "#8b8d9e" }}>
                        {isOk ? page.textRatioPercent + "%" : "—"}
                      </td>

                      {/* Title length */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: titleColor }}>
                        {titleLen > 0 ? titleLen + " ch" : "—"}
                      </td>

                      {/* Link depth */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: page.linkDepth > 3 ? "#ffb830" : "#8b8d9e" }}>
                        {page.linkDepth}
                      </td>

                      {/* Inbound links */}
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: page.inboundLinkCount === 0 && page.linkDepth > 0 ? "#ffb830" : "#8b8d9e" }}>
                        {page.inboundLinkCount}
                      </td>

                      {/* Issues */}
                      <td className="px-3 py-2.5">
                        {page.issues.length === 0 ? (
                          <span className="text-[10px] font-mono" style={{ color: "#00e87a" }}>clean</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {page.issues.slice(0, 3).map(issue => (
                              <span
                                key={issue}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                style={{ background: `${ISSUE_COLORS[issue] ?? "#ffb830"}18`, color: ISSUE_COLORS[issue] ?? "#ffb830", border: `1px solid ${ISSUE_COLORS[issue] ?? "#ffb830"}30` }}
                              >
                                {issue}
                              </span>
                            ))}
                            {page.issues.length > 3 && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: "#8b8d9e" }}>
                                +{page.issues.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.pagesCrawled >= 20 && (
            <p className="text-[10px] mt-3 text-center font-mono" style={{ color: "#8b8d9e" }}>
              Crawl capped at 20 pages. Deeper crawls available via the API with maxPages parameter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
