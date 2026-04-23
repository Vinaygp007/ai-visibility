"use client";

import { useState, useRef, useCallback } from "react";

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

// ── CSV Export ─────────────────────────────────────────────────────────────
function exportCsv(rows: BulkRow[]) {
  const headers = ["URL", "Status", "Score", "Grade", "Site Name", "Summary", "Duration (ms)", "Error"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `"${r.url}"`,
        r.status,
        r.score ?? "",
        r.grade ?? "",
        `"${(r.site_name ?? "").replace(/"/g, '""')}"`,
        `"${(r.summary ?? "").replace(/"/g, '""')}"`,
        r.duration ?? "",
        `"${(r.error ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bulk-analysis-${Date.now()}.csv`;
  a.click();
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

    // Reset state
    const initialRows: BulkRow[] = parsedUrls.map((url) => ({ url, status: "queued" }));
    setRows(initialRows);
    setPhase("running");
    setTotal(parsedUrls.length);
    setCompleted(0);
    setPassed(0);
    setFailed(0);
    setFatalError("");
    setJobId("");

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
              prev.map((r) =>
                r.url === data.url ? { ...r, status: "running" } : r
              )
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
  };

  // Filtered + sorted rows
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

          {/* Header */}
          <div className="mb-10">
            <div
              className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
              style={{ color: "#00e5ff", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
            >
              // BULK AI VISIBILITY SCANNER
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3"
              style={{
                background: "linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.45))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              Scan Up to 500 Sites<br />at Once
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: "#8b8d9e" }}>
              Paste URLs (one per line or comma-separated), or upload a .txt / .csv file.
              Results stream in real-time as each site is analysed.
            </p>
          </div>

          {/* URL input */}
          <div
            className="rounded-2xl border mb-4 overflow-hidden"
            style={{ background: "#111219", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}>
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

          {/* File upload */}
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

          {/* Options */}
          <div className="flex flex-wrap gap-3 mb-8">
            {/* Citations toggle */}
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

            {/* Concurrency */}
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

          {/* Concurrency warning */}
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

          {/* Start button */}
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

          {/* Info chips */}
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
          {/* Ring + pct */}
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

          {/* Stats */}
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

          {/* Job ID */}
          {jobId && (
            <div className="ml-2">
              <div className="text-[10px] font-mono" style={{ color: "#8b8d9e" }}>JOB</div>
              <div className="text-[11px] font-mono" style={{ color: "#4b5563" }}>{jobId}</div>
            </div>
          )}

          {/* Actions */}
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
                  onClick={() => exportCsv(rows)}
                  className="px-4 py-2 rounded-xl border text-sm transition-all hover:opacity-80"
                  style={{ borderColor: "rgba(0,232,122,0.3)", color: "#00e87a", background: "rgba(0,232,122,0.05)" }}
                >
                  ↓ Export CSV
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
              const count =
                f === "all" ? rows.length : rows.filter((r) => r.status === f).length;
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
              onClick={() => exportCsv(rows)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
              style={{ color: "#00e87a", background: "rgba(0,232,122,0.06)", border: "1px solid rgba(0,232,122,0.2)" }}
            >
              ↓ CSV
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
              gridTemplateColumns: "2fr 80px 60px 60px 1fr 100px",
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
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
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

                return (
                  <div
                    key={row.url}
                    className="grid items-center px-5 py-3 transition-colors"
                    style={{
                      gridTemplateColumns: "2fr 80px 60px 60px 1fr 100px",
                      background: isRunning ? "rgba(0,229,255,0.03)" : "transparent",
                    }}
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
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-mono truncate hover:underline"
                          style={{ color: isQueued ? "#4b5563" : "#c9cdd4" }}
                        >
                          {row.url.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                      {row.site_name && row.site_name !== row.url && (
                        <div className="text-[11px] mt-0.5 truncate" style={{ color: "#8b8d9e" }}>
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
                      {row.score != null ? row.score : isQueued || isRunning ? "—" : "—"}
                    </div>

                    {/* Grade */}
                    <div className="text-sm font-bold font-mono" style={{ color: gc }}>
                      {row.grade ?? "—"}
                    </div>

                    {/* Summary / error */}
                    <div className="text-[11px] leading-snug pr-4 truncate"
                      style={{ color: row.error ? "#ff5a5a" : "#8b8d9e" }}>
                      {row.error ? `✕ ${row.error}` : row.summary ?? ""}
                    </div>

                    {/* Duration */}
                    <div className="text-[11px] font-mono" style={{ color: "#4b5563" }}>
                      {durationLabel(row.duration)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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