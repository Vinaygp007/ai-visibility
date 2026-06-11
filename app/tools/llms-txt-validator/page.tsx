"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

interface ValidationResult {
  domain: string;
  llmsUrl: string;
  found: boolean;
  statusCode: number;
  content: string | null;
  contentLength: number;
  validation: {
    issues: string[];
    score: number;
    passed: string[];
  } | null;
}

export default function LlmsTxtValidatorPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tools/fetch-llms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 75 ? "var(--c-accent3)" : score >= 50 ? "var(--c-warning)" : "var(--c-error)";

  const scoreLabel = (score: number) =>
    score === 100 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs work" : "Poor";

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-14 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ background: "radial-gradient(ellipse 55% 40% at 50% 0%, rgba(124,111,255,0.4), transparent 70%)" }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.06)", borderColor: "rgba(124,111,255,0.2)" }}
          >
            Free Tool
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
            llms.txt Validator
          </h1>
          <p className="text-lg" style={{ color: "var(--c-muted)" }}>
            Check if your website has a valid llms.txt file. See exactly what AI systems read about your site — and what&apos;s missing.
          </p>
        </div>
      </section>

      {/* Tool */}
      <section className="py-8 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Input */}
          <div
            className="rounded-2xl border p-6 mb-6"
            style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
          >
            <label className="block text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>
              Enter your domain or URL
            </label>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--c-bg)",
                  borderColor: "var(--c-border-strong)",
                  color: "var(--c-text)",
                }}
                placeholder="example.com or https://example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCheck()}
              />
              <button
                onClick={handleCheck}
                disabled={loading || !url.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
                style={{ background: "var(--c-accent2)", color: "#fff" }}
              >
                {loading ? "Checking…" : "Check →"}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--c-muted)" }}>
              We&apos;ll check <span className="font-mono" style={{ color: "var(--c-accent)" }}>yourdomain.com/llms.txt</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-2xl border p-5 mb-6 text-sm"
              style={{ background: "rgba(255,90,90,0.06)", borderColor: "rgba(255,90,90,0.2)", color: "var(--c-error)" }}
            >
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">

              {/* Status banner */}
              <div
                className="rounded-2xl border p-5 flex items-start gap-4"
                style={{
                  background: result.found ? "rgba(0,255,148,0.04)" : "rgba(255,90,90,0.04)",
                  borderColor: result.found ? "rgba(0,255,148,0.2)" : "rgba(255,90,90,0.2)",
                }}
              >
                <div className="text-2xl">{result.found ? "✅" : "❌"}</div>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: "var(--c-text)" }}>
                    {result.found ? "llms.txt found" : "No llms.txt detected"}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>
                    {result.llmsUrl} — HTTP {result.statusCode || "timeout"}
                  </p>
                  {!result.found && (
                    <p className="text-xs mt-2" style={{ color: "var(--c-muted)" }}>
                      AI systems have no structured context for this site.{" "}
                      <Link href="/tools/llms-txt-generator" style={{ color: "var(--c-accent2)" }}>
                        Generate one for free →
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              {/* Validation score */}
              {result.found && result.validation && (
                <>
                  <div
                    className="rounded-2xl border p-5"
                    style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Format validation</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold" style={{ color: scoreColor(result.validation.score) }}>
                          {result.validation.score}/100
                        </span>
                        <span className="text-xs font-mono" style={{ color: scoreColor(result.validation.score) }}>
                          {scoreLabel(result.validation.score)}
                        </span>
                      </div>
                    </div>

                    {result.validation.passed.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--c-accent3)" }}>Passing</p>
                        <ul className="space-y-1.5">
                          {result.validation.passed.map((p) => (
                            <li key={p} className="flex items-start gap-2 text-xs" style={{ color: "var(--c-text)" }}>
                              <span style={{ color: "var(--c-accent3)" }}>✓</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.validation.issues.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--c-warning)" }}>Improvements needed</p>
                        <ul className="space-y-1.5">
                          {result.validation.issues.map((issue) => (
                            <li key={issue} className="flex items-start gap-2 text-xs" style={{ color: "var(--c-text)" }}>
                              <span style={{ color: "var(--c-warning)" }}>⚠</span> {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Content preview */}
                  {result.content && (
                    <div
                      className="rounded-2xl border p-5"
                      style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Content preview</h3>
                        <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>
                          {result.contentLength.toLocaleString()} chars
                        </span>
                      </div>
                      <pre
                        className="text-xs font-mono overflow-auto max-h-64 rounded-xl p-4"
                        style={{
                          background: "var(--c-bg)",
                          color: "var(--c-text)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.7,
                        }}
                      >
                        {result.content}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {/* CTA */}
              <div
                className="rounded-2xl border p-5 text-center"
                style={{ background: "var(--c-surface2)", borderColor: "var(--c-border)" }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-text)" }}>
                  Want the full AI visibility picture?
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--c-muted)" }}>
                  Run a complete audit — AI Visibility Score, 14 bot checks, structured data, and recommendations.
                </p>
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
                  style={{ background: "var(--c-accent)", color: "#000" }}
                >
                  Run Full Audit →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* What to check for */}
      <section className="py-16 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--c-text)" }}>A valid llms.txt includes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { check: "# Title line", desc: "Starts with # followed by your site or company name." },
              { check: "> Description", desc: "A > blockquote line giving a one-sentence summary of what the site does." },
              { check: "## Sections", desc: "## headings like ## Pages, ## Topics, ## Contact to organise content." },
              { check: "- List items", desc: "Bullet points linking to key pages or listing topics and expertise." },
            ].map((item) => (
              <div
                key={item.check}
                className="rounded-2xl border p-5"
                style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}
              >
                <p className="text-xs font-mono font-bold mb-1" style={{ color: "var(--c-accent2)" }}>{item.check}</p>
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6" style={{ color: "var(--c-muted)" }}>
            Don&apos;t have an llms.txt yet?{" "}
            <Link href="/tools/llms-txt-generator" style={{ color: "var(--c-accent2)" }}>
              Generate one for free →
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
