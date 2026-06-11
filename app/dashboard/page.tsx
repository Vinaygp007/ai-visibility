"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";

interface Report {
  id: string;
  url: string;
  site_name?: string;
  overall_score?: number;
  grade?: string;
  createdAt?: string;
  summary?: string;
  categories?: Record<string, number>;
}

const TOOL_LINKS = [
  { href: "/",            icon: "🔍", label: "New Scan",       desc: "Audit any URL",          color: "#00e5ff" },
  { href: "/bulk",        icon: "⚡", label: "Bulk Scan",      desc: "Up to 500 URLs at once", color: "#ffb830" },
  { href: "/bulk-prompt", icon: "✦", label: "Prompt Runner",  desc: "Multi-prompt analysis",  color: "#7c6fff" },
  { href: "/reports",     icon: "📋", label: "All Reports",   desc: "Full history & export",  color: "#00ff94" },
];

function scoreColor(s?: number) {
  if (s == null) return "var(--c-muted)";
  if (s >= 70) return "#00e87a";
  if (s >= 40) return "#ffb830";
  return "#ff5a5a";
}

function gradeColor(g?: string) {
  if (!g) return "var(--c-muted)";
  if (g.startsWith("A")) return "#00e87a";
  if (g.startsWith("B")) return "#7ec8e3";
  if (g.startsWith("C")) return "#ffb830";
  return "#ff5a5a";
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetch("/api/reports?limit=10")
        .then((r) => r.json())
        .then((d) => setReports(d.reports ?? []))
        .catch(() => setReports([]))
        .finally(() => setReportsLoading(false));
    }
  }, [user]);

  const handleScan = () => {
    if (!url.trim()) return;
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    router.push(`/?url=${encodeURIComponent(u)}`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--c-bg)" }}>
        <div className="spinner w-10 h-10 rounded-full"
          style={{ border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)" }} />
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + (r.overall_score ?? 0), 0) / reports.filter((r) => r.overall_score != null).length)
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Dashboard header */}
      <div className="border-b" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7c6fff, #00e5ff)", color: "#fff" }}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--c-text)" }}>
                Welcome back, {displayName.split(" ")[0]}
              </h1>
              <p className="text-sm" style={{ color: "var(--c-muted)" }}>{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] font-mono px-2.5 py-1 rounded-full border"
              style={{ color: "var(--c-success)", background: "rgba(0,232,122,0.08)", borderColor: "rgba(0,232,122,0.25)" }}
            >
              ● Active
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-75"
              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-muted)", background: "transparent" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Scans",  value: String(reports.length), icon: "🔍", color: "var(--c-accent)" },
            { label: "Avg Score",    value: avgScore != null ? `${avgScore}/100` : "—", icon: "🎯", color: avgScore != null ? scoreColor(avgScore) : "var(--c-muted)" },
            { label: "Latest Scan",  value: reports[0] ? timeAgo(reports[0].createdAt) : "—", icon: "🕐", color: "var(--c-accent2)" },
            { label: "Top Grade",    value: reports.find((r) => r.grade?.startsWith("A"))?.grade ?? (reports[0]?.grade ?? "—"), icon: "🏆", color: gradeColor(reports.find((r) => r.grade?.startsWith("A"))?.grade ?? reports[0]?.grade) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-4"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
            >
              <div className="text-xl mb-2">{stat.icon}</div>
              <div className="text-xl font-bold font-mono mb-0.5" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: "var(--c-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: quick scan + tools */}
          <div className="space-y-5">
            {/* Quick scan */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
            >
              <h2 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>Quick Scan</h2>
              <div
                className="flex items-center rounded-xl border px-3 py-1 mb-3"
                style={{ background: "var(--c-bg)", borderColor: "var(--c-border-strong)" }}
              >
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="https://yoursite.com"
                  className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                  style={{ color: "var(--c-text)" }}
                />
              </div>
              <button
                onClick={handleScan}
                disabled={!url.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-40"
                style={{ background: "var(--c-accent)", color: "#000" }}
              >
                Analyze →
              </button>
            </div>

            {/* Tool links */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
            >
              <h2 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>Tools</h2>
              <div className="space-y-2">
                {TOOL_LINKS.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
                    style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: `${t.color}15` }}
                    >
                      {t.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{t.label}</div>
                      <div className="text-[11px]" style={{ color: "var(--c-muted)" }}>{t.desc}</div>
                    </div>
                    <span className="ml-auto text-xs" style={{ color: "var(--c-muted)" }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: recent reports */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl border h-full"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
                <h2 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Recent Reports</h2>
                <Link
                  href="/reports"
                  className="text-xs font-medium hover:opacity-70"
                  style={{ color: "var(--c-accent)" }}
                >
                  View all →
                </Link>
              </div>

              {reportsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="spinner w-8 h-8 rounded-full"
                    style={{ border: "2px solid var(--c-border)", borderTopColor: "var(--c-accent)" }} />
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="text-4xl mb-3">🔭</div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-text)" }}>No scans yet</p>
                  <p className="text-xs mb-4" style={{ color: "var(--c-muted)" }}>Run your first AI Scope audit above</p>
                  <Link
                    href="/"
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-85"
                    style={{ background: "var(--c-accent)", color: "#000" }}
                  >
                    Start Scanning
                  </Link>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
                  {reports.map((report) => (
                    <div key={report.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--c-surface2)] transition-colors">
                      {/* Score ring */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
                        style={{
                          background: `${scoreColor(report.overall_score)}15`,
                          border: `1px solid ${scoreColor(report.overall_score)}35`,
                          color: scoreColor(report.overall_score),
                        }}
                      >
                        {report.overall_score ?? "—"}
                      </div>

                      {/* URL + summary */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate" style={{ color: "var(--c-text)" }}>
                            {report.site_name || new URL(report.url.startsWith("http") ? report.url : "https://" + report.url).hostname}
                          </span>
                          {report.grade && (
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: `${gradeColor(report.grade)}15`, color: gradeColor(report.grade) }}
                            >
                              {report.grade}
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: "var(--c-muted)" }}>
                          {report.summary || report.url}
                        </p>
                      </div>

                      {/* Time */}
                      <span className="text-[11px] font-mono flex-shrink-0" style={{ color: "var(--c-muted)" }}>
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
