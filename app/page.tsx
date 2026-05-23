"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingSection from "@/components/LoadingSection";
import ResultsSection from "@/components/ResultsSection";
import { AnalysisResult } from "@/types";
import { useAuth } from "@/components/AuthProvider";

type AppState = "idle" | "loading" | "results" | "error";

const ERROR_HINTS: Record<string, { title: string; detail: string; icon: string; canAutoRetry: boolean }> = {
  QUOTA_EXCEEDED: {
    icon: "⏱️",
    title: "Rate limit hit",
    detail: "Gemini's free tier allows ~15 requests/minute. The server already retried 3 times. Wait 60 seconds and try again.",
    canAutoRetry: true,
  },
  INVALID_KEY: {
    icon: "🔑",
    title: "Invalid API key",
    detail: "Your GEMINI_API_KEY is incorrect. Get a free key at aistudio.google.com/app/apikey and update .env.local.",
    canAutoRetry: false,
  },
  MISSING_KEY: {
    icon: "🔑",
    title: "API key missing",
    detail: "Add GEMINI_API_KEY to your .env.local file and restart the dev server.",
    canAutoRetry: false,
  },
  NETWORK_ERROR: {
    icon: "📡",
    title: "Network error",
    detail: "Could not reach the Gemini API. Check your internet connection and try again.",
    canAutoRetry: true,
  },
  PARSE_ERROR: {
    icon: "⚠️",
    title: "Unexpected response",
    detail: "Gemini returned a response we couldn't parse. Please try again.",
    canAutoRetry: true,
  },
  UNKNOWN: {
    icon: "⚠️",
    title: "Analysis failed",
    detail: "An unexpected error occurred. Please try again.",
    canAutoRetry: true,
  },
};

const AUTO_RETRY_SECONDS = 60;

const FEATURES = [
  {
    icon: "🎯",
    title: "AI Visibility Score",
    desc: "Get a 0–100 score showing exactly how visible your brand is to AI systems, with a letter grade and category breakdown.",
    color: "#00e5ff",
  },
  {
    icon: "🤖",
    title: "14 AI Bots Checked",
    desc: "We verify access from ChatGPT, Claude, Perplexity, Gemini, Bing AI, and 9 more crawlers — simultaneously.",
    color: "#7c6fff",
  },
  {
    icon: "⚡",
    title: "Bulk URL Scanner",
    desc: "Analyze up to 500 URLs in one batch with real-time streaming results and CSV/PDF export.",
    color: "#ffb830",
  },
  {
    icon: "💬",
    title: "AI Citation Research",
    desc: "Discover when and how AI systems mention or link your brand in their responses — competitive intelligence at scale.",
    color: "#00ff94",
  },
  {
    icon: "🔍",
    title: "Smart Recommendations",
    desc: "Prioritized, high/medium/low action items to boost your AI discoverability — no guessing required.",
    color: "#4285f4",
  },
  {
    icon: "📊",
    title: "Structured Data Audit",
    desc: "Verify llms.txt, robots.txt, schema markup, and Core Web Vitals to ensure AI systems can parse your content.",
    color: "#ff5a5a",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Enter your URL",
    desc: "Paste any website URL and optionally toggle AI Citations for full competitive intelligence.",
  },
  {
    num: "02",
    title: "We query 14+ AI systems",
    desc: "Gemini, ChatGPT, and Perplexity all run simultaneously. Results are merged and averaged for accuracy.",
  },
  {
    num: "03",
    title: "Get your AI Scope report",
    desc: "Receive a detailed score, category breakdown, recommendations, and citation analysis — in under 60 seconds.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "Free",
    per: "forever",
    desc: "Perfect for founders validating their AI presence.",
    features: [
      "5 scans / month",
      "Overall AI Scope score",
      "Basic category breakdown",
      "3 AI providers checked",
      "Recommendations included",
    ],
    cta: "Get Started Free",
    highlight: false,
    accentColor: "var(--c-accent3)",
  },
  {
    name: "Growth",
    price: "$29",
    per: "/ month",
    desc: "For marketers and growth teams tracking multiple properties.",
    features: [
      "100 scans / month",
      "Everything in Starter",
      "Bulk scanner (up to 100 URLs)",
      "AI Citations research",
      "CSV & PDF export",
      "Priority support",
    ],
    cta: "Start Growth Plan",
    highlight: true,
    accentColor: "var(--c-accent)",
  },
  {
    name: "Pro",
    price: "$79",
    per: "/ month",
    desc: "For agencies and teams needing scale and white-label.",
    features: [
      "Unlimited scans",
      "Everything in Growth",
      "Bulk scanner (500 URLs)",
      "API access",
      "White-label reports",
      "Dedicated support",
    ],
    cta: "Start Pro Plan",
    highlight: false,
    accentColor: "var(--c-accent2)",
  },
];

const PROVIDERS = [
  { name: "ChatGPT", icon: "⬡", color: "#10a37f" },
  { name: "Gemini", icon: "✦", color: "#4285f4" },
  { name: "Perplexity", icon: "◎", color: "#20b2aa" },
  { name: "Claude", icon: "◈", color: "#c96442" },
  { name: "Bing AI", icon: "⬒", color: "#0078d4" },
  { name: "Grok", icon: "✕", color: "#1da1f2" },
];

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [url, setUrl] = useState("");
  const [withCitations, setWithCitations] = useState(true);
  const [analyzingUrl, setAnalyzingUrl] = useState("");
  const [analyzingCitations, setAnalyzingCitations] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState("UNKNOWN");
  const [countdown, setCountdown] = useState(0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((data) => { if (data.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (state === "error" && ERROR_HINTS[errorCode]?.canAutoRetry && errorCode === "QUOTA_EXCEEDED") {
      setCountdown(AUTO_RETRY_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [state, errorCode]);

  useEffect(() => {
    if (countdown === 0 && state === "error" && errorCode === "QUOTA_EXCEEDED" && analyzingUrl) {
      const timer = setTimeout(() => handleAnalyze(analyzingUrl, analyzingCitations), 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleAnalyze = async (targetUrl: string, runCitations = true) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
    setAnalyzingUrl(targetUrl);
    setAnalyzingCitations(runCitations);
    setState("loading");
    setResult(null);
    setErrorMsg("");
    setErrorCode("UNKNOWN");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, runCitations }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorCode(data.errorCode ?? "UNKNOWN");
        throw new Error(data.error || "Analysis failed");
      }
      setResult(data);
      setState("results");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    if (!user && !isAdmin) { setShowAuthGate(true); return; }
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    handleAnalyze(u, withCitations);
  };

  const handleReset = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setState("idle");
    setResult(null);
    setErrorMsg("");
    setCountdown(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hint = ERROR_HINTS[errorCode] ?? ERROR_HINTS.UNKNOWN;
  const isRateLimit = errorCode === "QUOTA_EXCEEDED";

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* ── AUTH GATE MODAL ── */}
      {showAuthGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowAuthGate(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border p-8 text-center"
            style={{ background: "var(--c-surface)", borderColor: "var(--c-border-strong)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAuthGate(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-sm"
              style={{ color: "var(--c-muted)", background: "var(--c-surface2)" }}
            >
              ×
            </button>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4"
              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              🔒
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>
              Sign in to scan
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--c-muted)" }}>
              Create a free account or sign in to start auditing your AI visibility.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/signup"
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-85"
                style={{ background: "var(--c-accent)", color: "#000", display: "block" }}
              >
                Create Free Account →
              </Link>
              <Link
                href="/login"
                className="w-full py-3 rounded-xl text-sm font-medium text-center border transition-all hover:opacity-80"
                style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)", display: "block" }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section
        id="hero-tool"
        className="relative overflow-hidden pt-20 pb-16 px-6 text-center"
      >
        {/* Gradient background blob */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,111,255,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          className="inline-block text-[11px] font-mono px-4 py-1.5 rounded-full border mb-6 tracking-widest uppercase"
          style={{
            color: "var(--c-accent)",
            background: "rgba(0,229,255,0.06)",
            borderColor: "rgba(0,229,255,0.2)",
          }}
        >
          AI Visibility Platform — by Marcstrat
        </div>

        {/* Headline */}
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6 max-w-4xl mx-auto"
          style={{ color: "var(--c-text)" }}
        >
          Know Where Your{" "}
          <span
            style={{
              background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Brand Stands
          </span>
          <br />
          in the AI Age
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
          style={{ color: "var(--c-muted)" }}
        >
          AI Scope audits how ChatGPT, Claude, Perplexity, Gemini and{" "}
          <strong style={{ color: "var(--c-text-sub)" }}>10+ AI systems</strong>{" "}
          discover and reference your website — so you&apos;re always in the conversation.
        </p>

        {/* URL Input Card */}
        <div
          className="max-w-2xl mx-auto rounded-2xl border p-3 mb-5 shadow-lg"
          style={{
            background: "var(--c-surface)",
            borderColor: "var(--c-border-strong)",
          }}
        >
          <div
            className="search-box flex items-center rounded-xl border px-4 py-1 mb-3 transition-all"
            style={{
              background: "var(--c-bg)",
              borderColor: "var(--c-border-strong)",
            }}
          >
            <span style={{ color: "var(--c-muted)", marginRight: 8, fontSize: 14 }}>🌐</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="https://yourwebsite.com"
              className="flex-1 bg-transparent border-none outline-none text-[15px] py-2.5"
              style={{ color: "var(--c-text)" }}
            />
            <button
              onClick={handleSubmit}
              disabled={state === "loading" || authLoading}
              className="ml-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 active:scale-95"
              style={{ background: "var(--c-accent)", color: "#000", whiteSpace: "nowrap" }}
            >
              {state === "loading" ? "Analyzing..." : "Analyze →"}
            </button>
          </div>

          {/* Citations toggle */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setWithCitations(!withCitations)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all"
              style={{
                background: withCitations ? "rgba(0,229,255,0.08)" : "transparent",
                borderColor: withCitations ? "rgba(0,229,255,0.3)" : "var(--c-border-strong)",
                color: withCitations ? "var(--c-accent)" : "var(--c-muted)",
              }}
            >
              <span style={{ fontSize: 12 }}>{withCitations ? "✓" : "○"}</span>
              AI Citations
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: withCitations ? "rgba(0,229,255,0.12)" : "rgba(255,184,48,0.12)",
                  color: withCitations ? "var(--c-accent)" : "var(--c-warning)",
                }}
              >
                {withCitations ? "ON" : "OFF"}
              </span>
            </button>
            <span className="text-[11px]" style={{ color: "var(--c-muted)" }}>
              {withCitations
                ? "Full GEO + competitive analysis"
                : "Basic scan only"}
            </span>
          </div>
        </div>

        {/* Provider badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
          <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>
            ANALYZED ACROSS
          </span>
          {PROVIDERS.map((p) => (
            <span
              key={p.name}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border"
              style={{
                color: p.color,
                background: `${p.color}12`,
                borderColor: `${p.color}30`,
              }}
            >
              <span style={{ fontSize: 11 }}>{p.icon}</span>
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>
          all providers run simultaneously · scores merged &amp; averaged
        </p>
      </section>

      {/* ── RESULTS / LOADING / ERROR (inline below hero) ── */}
      <div ref={resultsRef} className="max-w-[900px] mx-auto px-6 pb-12">
        {state === "loading" && <LoadingSection url={analyzingUrl} />}

        {state === "results" && result && (
          <ResultsSection result={result} onReset={handleReset} />
        )}

        {state === "error" && (
          <div
            className="rounded-2xl border p-8"
            style={{
              background: "rgba(255,90,90,0.04)",
              borderColor: "rgba(255,90,90,0.18)",
            }}
          >
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">{hint.icon}</div>
              <h3 className="text-[17px] font-semibold mb-2" style={{ color: "var(--c-error)" }}>
                {hint.title}
              </h3>
              <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--c-muted)" }}>
                {hint.detail}
              </p>
            </div>

            {isRateLimit && countdown > 0 && (
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-20 h-20 mb-3 flex items-center justify-center">
                  <svg className="absolute inset-0" width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none" stroke="var(--c-blue)" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / AUTO_RETRY_SECONDS)}`}
                      transform="rotate(-90 40 40)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <span className="text-xl font-bold font-mono" style={{ color: "var(--c-blue)" }}>
                    {countdown}
                  </span>
                </div>
                <p className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>
                  Auto-retrying in {countdown}s...
                </p>
              </div>
            )}

            {!isRateLimit && (
              <div className="flex justify-center mb-6">
                <span
                  className="text-[11px] font-mono px-3 py-1 rounded-full border"
                  style={{
                    color: "var(--c-error)",
                    background: "rgba(255,90,90,0.08)",
                    borderColor: "rgba(255,90,90,0.25)",
                  }}
                >
                  {errorMsg}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {isRateLimit && countdown > 0 ? (
                <button
                  onClick={() => {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    handleAnalyze(analyzingUrl, analyzingCitations);
                  }}
                  className="px-5 py-2.5 rounded-xl border text-sm font-medium transition-all"
                  style={{
                    borderColor: "var(--c-border-strong)",
                    color: "var(--c-text)",
                    background: "transparent",
                  }}
                >
                  ⚡ Retry now (skip wait)
                </button>
              ) : (
                <button
                  onClick={() => handleAnalyze(analyzingUrl, analyzingCitations)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={{ background: "var(--c-accent)", color: "#000" }}
                >
                  ↺ Try again
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border text-sm"
                style={{
                  borderColor: "var(--c-border-strong)",
                  color: "var(--c-muted)",
                  background: "transparent",
                }}
              >
                ← New URL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Show marketing sections only when idle */}
      {state === "idle" && (
        <>
          {/* ── STATS STRIP ── */}
          <section
            className="border-t border-b py-6 px-6"
            style={{ borderColor: "var(--c-border)" }}
          >
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "14+", label: "AI Bots Checked" },
                { value: "3", label: "Providers Simultaneously" },
                { value: "500", label: "Bulk URLs Supported" },
                { value: "<60s", label: "Full Audit Time" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div
                    className="text-3xl font-bold font-mono mb-1"
                    style={{ color: "var(--c-accent)" }}
                  >
                    {value}
                  </div>
                  <div className="text-sm" style={{ color: "var(--c-muted)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section id="features" className="py-24 px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{
                    color: "var(--c-accent2)",
                    background: "rgba(124,111,255,0.06)",
                    borderColor: "rgba(124,111,255,0.2)",
                  }}
                >
                  Features
                </div>
                <h2
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                  style={{ color: "var(--c-text)" }}
                >
                  Everything you need to{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, var(--c-accent2), var(--c-accent))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    own AI search
                  </span>
                </h2>
                <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--c-muted)" }}>
                  Built for marketers, founders, and SEO teams navigating the AI-first web.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((feat) => (
                  <div
                    key={feat.title}
                    className="rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
                    style={{
                      background: "var(--c-surface)",
                      borderColor: "var(--c-border)",
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                      style={{
                        background: `${feat.color}12`,
                        border: `1px solid ${feat.color}25`,
                      }}
                    >
                      {feat.icon}
                    </div>
                    <h3
                      className="text-[15px] font-semibold mb-2"
                      style={{ color: "var(--c-text)" }}
                    >
                      {feat.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--c-muted)" }}>
                      {feat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section
            className="py-24 px-6 border-t"
            style={{ borderColor: "var(--c-border)" }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{
                    color: "var(--c-accent3)",
                    background: "rgba(0,255,148,0.06)",
                    borderColor: "rgba(0,255,148,0.2)",
                  }}
                >
                  How It Works
                </div>
                <h2
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                  style={{ color: "var(--c-text)" }}
                >
                  Your AI Scope report{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, var(--c-accent3), var(--c-accent))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    in 3 steps
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {STEPS.map((step, i) => (
                  <div key={step.num} className="relative text-center">
                    {/* connector line */}
                    {i < STEPS.length - 1 && (
                      <div
                        className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px"
                        style={{
                          background: "linear-gradient(90deg, var(--c-border-strong), transparent)",
                        }}
                      />
                    )}
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold font-mono mx-auto mb-5"
                      style={{
                        background: "var(--c-surface2)",
                        border: "1px solid var(--c-border-strong)",
                        color: "var(--c-accent)",
                      }}
                    >
                      {step.num}
                    </div>
                    <h3
                      className="text-[16px] font-semibold mb-2"
                      style={{ color: "var(--c-text)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--c-muted)" }}>
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PRICING ── */}
          <section
            id="pricing"
            className="py-24 px-6 border-t"
            style={{ borderColor: "var(--c-border)" }}
          >
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{
                    color: "var(--c-accent)",
                    background: "rgba(0,229,255,0.06)",
                    borderColor: "rgba(0,229,255,0.2)",
                  }}
                >
                  Pricing
                </div>
                <h2
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                  style={{ color: "var(--c-text)" }}
                >
                  Simple, transparent{" "}
                  <span
                    style={{
                      background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    pricing
                  </span>
                </h2>
                <p className="text-lg max-w-lg mx-auto" style={{ color: "var(--c-muted)" }}>
                  Start free. Scale when you&apos;re ready. No hidden fees.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {PRICING.map((plan) => (
                  <div
                    key={plan.name}
                    className="rounded-2xl border p-7 relative transition-all"
                    style={{
                      background: plan.highlight ? "var(--c-surface2)" : "var(--c-surface)",
                      borderColor: plan.highlight
                        ? "rgba(0,229,255,0.35)"
                        : "var(--c-border)",
                      boxShadow: plan.highlight
                        ? "0 0 40px rgba(0,229,255,0.06)"
                        : "none",
                    }}
                  >
                    {plan.highlight && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-mono px-3 py-1 rounded-full border"
                        style={{
                          background: "var(--c-accent)",
                          color: "#000",
                          borderColor: "transparent",
                          fontWeight: 700,
                        }}
                      >
                        MOST POPULAR
                      </div>
                    )}

                    <div className="mb-5">
                      <h3
                        className="text-sm font-mono font-semibold mb-3 uppercase tracking-widest"
                        style={{ color: plan.accentColor }}
                      >
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span
                          className="text-4xl font-bold"
                          style={{ color: "var(--c-text)" }}
                        >
                          {plan.price}
                        </span>
                        <span className="text-sm" style={{ color: "var(--c-muted)" }}>
                          {plan.per}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                        {plan.desc}
                      </p>
                    </div>

                    <ul className="space-y-2.5 mb-7">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2.5 text-sm"
                          style={{ color: "var(--c-text-sub)" }}
                        >
                          <span style={{ color: "var(--c-accent3)", fontSize: 12 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                      style={
                        plan.highlight
                          ? { background: "var(--c-accent)", color: "#000" }
                          : {
                              background: "transparent",
                              color: "var(--c-text)",
                              border: "1px solid var(--c-border-strong)",
                            }
                      }
                    >
                      {plan.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section
            className="py-24 px-6 border-t"
            style={{ borderColor: "var(--c-border)" }}
          >
            <div
              className="max-w-3xl mx-auto rounded-3xl border p-12 text-center relative overflow-hidden"
              style={{
                background: "var(--c-surface)",
                borderColor: "var(--c-border-strong)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(124,111,255,0.4) 0%, transparent 70%)",
                }}
              />
              <div
                className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-6 tracking-widest uppercase"
                style={{
                  color: "var(--c-accent)",
                  background: "rgba(0,229,255,0.06)",
                  borderColor: "rgba(0,229,255,0.2)",
                }}
              >
                Get Started Free
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
                style={{ color: "var(--c-text)" }}
              >
                Get your AI Scope score
                <br />
                in 30 seconds
              </h2>
              <p className="text-lg mb-8" style={{ color: "var(--c-muted)" }}>
                Free account required. Paste your URL and see exactly how AI systems
                see your website.
              </p>

              {/* Inline URL tool */}
              <div
                className="search-box flex items-center rounded-2xl border px-4 py-1.5 max-w-lg mx-auto transition-all"
                style={{
                  background: "var(--c-bg)",
                  borderColor: "var(--c-border-strong)",
                }}
              >
                <input
                  id="cta-url-input"
                  type="text"
                  placeholder="https://yourwebsite.com"
                  className="flex-1 bg-transparent border-none outline-none text-[15px] py-2.5"
                  style={{ color: "var(--c-text)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (!val) return;
                      if (!user && !isAdmin) { setShowAuthGate(true); return; }
                      let u = val;
                      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
                      setUrl(u);
                      handleAnalyze(u, withCitations);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>("#cta-url-input");
                    const val = input?.value.trim() || "";
                    if (!val) return;
                    if (!user && !isAdmin) { setShowAuthGate(true); return; }
                    let u = val;
                    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
                    setUrl(u);
                    handleAnalyze(u, withCitations);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="ml-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={{ background: "var(--c-accent)", color: "#000", whiteSpace: "nowrap" }}
                >
                  Analyze →
                </button>
              </div>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <Footer />
        </>
      )}
    </div>
  );
}
