"use client";

import { useEffect, useState } from "react";
import { initConsoleCapture, getRecentConsoleErrors } from "@/lib/consoleCapture";

export default function BugReportWidget() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initConsoleCapture();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report-bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          severity,
          url: window.location.href,
          userAgent: navigator.userAgent,
          consoleLogs: getRecentConsoleErrors(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Failed to submit — try again.");
        return;
      }
      setDone(true);
      setTitle("");
      setDescription("");
      setSeverity("medium");
    } catch {
      setError("Failed to submit — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setDone(false);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg"
        style={{ background: "#1a1b23", border: "1px solid rgba(var(--overlay-rgb),0.12)", color: "var(--text-muted)" }}
        aria-label="Report a bug"
        title="Report a bug"
      >
        🐞
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: "#0f1017", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">Report a bug</h3>
              <button onClick={handleClose} className="text-xl leading-none" style={{ color: "var(--text-muted)" }}>×</button>
            </div>

            {done ? (
              <div className="text-[13px] rounded-lg px-3 py-3 border text-center" style={{ color: "var(--accent)", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }}>
                Thanks — we&apos;ll take a look.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What went wrong?"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What were you doing when it happened?"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as typeof severity)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                >
                  <option value="low">Low — minor annoyance</option>
                  <option value="medium">Medium — got in the way</option>
                  <option value="high">High — blocked me</option>
                  <option value="critical">Critical — lost data / broken</option>
                </select>

                {error && (
                  <div className="text-[12px] rounded-lg px-3 py-2 border" style={{ color: "var(--danger)", background: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
                >
                  {submitting ? "Sending…" : "Send report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
