"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingSection from "@/components/LoadingSection";
import ResultsSection from "@/components/ResultsSection";
import FaqAccordion from "@/components/FaqAccordion";
import { AnalysisResult } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { getScansThisMonth, incrementScanUsage, type ScanUsage } from "@/lib/scanUsage";

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
    icon: "🌐",
    title: "Enter your URL",
    desc: "Paste any website URL and optionally toggle AI Citations for full competitive intelligence.",
  },
  {
    num: "02",
    icon: "⚡",
    title: "We query 14+ AI systems",
    desc: "Gemini, ChatGPT, and Perplexity all run simultaneously. Results are merged and averaged for accuracy.",
  },
  {
    num: "03",
    icon: "📊",
    title: "Get your AI Scope report",
    desc: "Receive a detailed score, category breakdown, recommendations, and citation analysis — in under 60 seconds.",
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

const TESTIMONIALS = [
  {
    quote: "Our AI citation rate went from 2% to 31% in six weeks. The recommendations were incredibly precise and actionable.",
    name: "Sarah Chen",
    role: "CMO, TechFlow SaaS",
    initials: "SC",
    color: "#7c6fff",
  },
  {
    quote: "AI Scope showed us exactly which pages were blocking crawler access. Fixed it in a day, ranked in AI responses within the week.",
    name: "Marcus Rodriguez",
    role: "SEO Director, ShopNova",
    initials: "MR",
    color: "#00e5ff",
  },
  {
    quote: "The competitor citation analysis is a game changer. We finally know what AI recommends us vs. rivals — and how to close the gap.",
    name: "Priya Nair",
    role: "Brand Strategy Lead",
    initials: "PN",
    color: "#4285f4",
  },
];

const PREVIEW_CATEGORIES = [
  { label: "Content Quality", score: 85, color: "#00e5ff" },
  { label: "Technical Setup", score: 72, color: "#7c6fff" },
  { label: "AI Citations", score: 90, color: "#00ff94" },
  { label: "Page Speed", score: 88, color: "#4285f4" },
];

const FAQS = [
  {
    q: "What is AI Visibility and why does it matter?",
    a: "AI Visibility is how discoverable and well-represented your brand is when people ask AI systems like ChatGPT, Claude, Perplexity, or Gemini about your industry, products, or competitors. As users increasingly bypass traditional search and go straight to AI assistants for recommendations, being cited by AI is becoming as important as Google rankings.",
  },
  {
    q: "Is AI Scope free to use?",
    a: "Yes — the Starter plan is free forever. You get 5 full AI Visibility audits per month with no credit card required. Paid plans (Growth and Pro) unlock more scans, bulk scanning, AI Citations Research, and export features.",
  },
  {
    q: "Which AI systems does AI Scope check?",
    a: "AI Scope verifies access and discoverability across 14+ AI crawlers and assistants — including GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Gemini, Bingbot, Applebot, Meta-ExternalAgent, and more. Analysis runs across Gemini 2.0, GPT-4o, and Perplexity Sonar simultaneously.",
  },
  {
    q: "How long does a full audit take?",
    a: "A standard AI Visibility audit completes in under 60 seconds. With AI Citations Research enabled (which queries live AI systems for brand mentions), it may take up to 90 seconds. Bulk scans process multiple URLs in parallel so you can audit hundreds of pages in minutes.",
  },
  {
    q: "What is llms.txt and do I need one?",
    a: "llms.txt is an emerging standard (similar to robots.txt) that tells AI language models how to interact with your site — what content they can use, what to avoid, and how to credit you. AI Scope detects and audits your llms.txt as part of every scan, and our recommendations tell you exactly what to include.",
  },
  {
    q: "Can I scan competitor websites?",
    a: "Yes. You can scan any publicly accessible URL — your own sites, competitor domains, or client websites. The AI Citations Research feature goes further by showing you how AI systems compare and rank your brand against competitors in live responses.",
  },
];

const AUDIENCES = [
  {
    icon: "🚀",
    title: "Founders & Startups",
    desc: "Know how AI sees your brand before you invest in content. Fix the fundamentals fast — free.",
    tags: ["Quick audits", "Competitive intel", "5 free scans"],
    color: "#00e5ff",
  },
  {
    icon: "📈",
    title: "Growth Marketers",
    desc: "Track your AI citation share-of-voice across ChatGPT, Perplexity, and Gemini. Benchmark against competitors monthly.",
    tags: ["Bulk scanning", "Monthly tracking", "CSV export"],
    color: "#7c6fff",
  },
  {
    icon: "🔍",
    title: "SEO Teams",
    desc: "Extend your SEO strategy to AI-era search. Audit structured data, llms.txt, and bot access in one scan.",
    tags: ["Bot access checks", "Schema audit", "llms.txt"],
    color: "#00ff94",
  },
  {
    icon: "🏢",
    title: "Agencies",
    desc: "White-label reports, bulk URL scanning, and client dashboards — built for teams managing multiple brands.",
    tags: ["White-label PDFs", "500 URL bulk", "API access"],
    color: "#ffb830",
  },
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
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [scanUsage, setScanUsage] = useState<ScanUsage | null>(null);
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

  useEffect(() => {
    if (!user) { setScanUsage(null); return; }
    getScansThisMonth(user.uid).then(setScanUsage);
  }, [user]);

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
      if (user) {
        await incrementScanUsage(user.uid);
        getScansThisMonth(user.uid).then(setScanUsage);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    if (!user && !isAdmin) { setShowAuthGate(true); return; }
    if (scanUsage?.isAtLimit && !isAdmin) { setShowUpgradeGate(true); return; }
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      {/* ── AUTH GATE MODAL ── */}
      {showAuthGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
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
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              🔒
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>Sign in to scan</h2>
            <p className="text-sm mb-6" style={{ color: "var(--c-muted)" }}>
              Create a free account or sign in to start auditing your AI visibility.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/signup"
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-85"
                style={{ background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))", color: "#fff", display: "block" }}
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

      {/* ── UPGRADE GATE MODAL ── */}
      {showUpgradeGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowUpgradeGate(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border p-8 text-center"
            style={{ background: "var(--c-surface)", borderColor: "var(--c-border-strong)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUpgradeGate(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-sm"
              style={{ color: "var(--c-muted)", background: "var(--c-surface2)" }}
            >
              ×
            </button>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: "rgba(124,111,255,0.08)", border: "1px solid rgba(124,111,255,0.2)" }}
            >
              🚀
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>
              {scanUsage?.limit ?? 5} free scans used
            </h2>
            <p className="text-sm mb-2" style={{ color: "var(--c-muted)" }}>
              You&apos;ve used all {scanUsage?.limit ?? 5} free scans for this month.
              Upgrade to Growth for 100 scans/month.
            </p>
            <p className="text-[11px] font-mono mb-6" style={{ color: "var(--c-muted)", opacity: 0.6 }}>
              Free scans reset on the 1st of each month.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/pricing"
                onClick={() => setShowUpgradeGate(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-85"
                style={{ background: "linear-gradient(135deg, var(--c-accent2), var(--c-accent))", color: "#000", display: "block" }}
              >
                View Plans & Pricing →
              </Link>
              <button
                onClick={() => setShowUpgradeGate(false)}
                className="w-full py-3 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
                style={{ borderColor: "var(--c-border-strong)", color: "var(--c-muted)", background: "transparent" }}
              >
                Maybe next month
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section
        id="hero-tool"
        className="relative overflow-hidden hero-grid"
        style={{
          minHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 80,
          paddingBottom: 80,
          textAlign: "center",
        }}
      >
        {/* Glowing orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="float-slow absolute -top-40 -left-20 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,111,255,0.18) 0%, transparent 65%)" }}
          />
          <div
            className="float-slow-delay absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 65%)" }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px]"
            style={{ background: "radial-gradient(ellipse, rgba(66,133,244,0.08) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-48"
            style={{ background: "linear-gradient(to bottom, transparent, var(--c-bg))" }}
          />
        </div>

        <div className="relative px-6 w-full max-w-5xl mx-auto">
          {/* Live badge */}
          <div
            className="inline-flex items-center gap-2 text-[11px] font-mono px-4 py-1.5 rounded-full border mb-8 tracking-widest uppercase"
            style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.25)" }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: "var(--c-accent)", boxShadow: "0 0 8px var(--c-accent)", animation: "pulse 2s ease-in-out infinite" }}
            />
            AI Visibility Platform — by Marcstrat
          </div>

          {/* Headline */}
          <h1
            className="font-extrabold leading-[1.0] tracking-tight mb-6 mx-auto"
            style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)", maxWidth: 900 }}
          >
            <span style={{ color: "var(--c-text)" }}>Know Where Your</span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #00e5ff 0%, #7c6fff 55%, #4285f4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Brand Stands
            </span>
            <br />
            <span
              style={{
                fontSize: "clamp(1.6rem, 4.5vw, 3.2rem)",
                color: "var(--c-muted)",
                display: "block",
                marginTop: 8,
                fontWeight: 700,
              }}
            >
              in the AI Age
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-12"
            style={{ color: "var(--c-muted)" }}
          >
            AI Scope audits how ChatGPT, Claude, Perplexity, Gemini and{" "}
            <strong style={{ color: "var(--c-text-sub)" }}>10+ AI systems</strong>{" "}
            discover your website — so you&apos;re always in the conversation.
          </p>

          {/* URL Input Card */}
          <div
            className="max-w-2xl mx-auto rounded-2xl border p-3 mb-5"
            style={{
              background: "var(--c-surface)",
              borderColor: "var(--c-border-strong)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--c-border)",
            }}
          >
            <div
              className="search-box flex items-center rounded-xl border px-4 py-1 mb-3 transition-all"
              style={{ background: "var(--c-bg)", borderColor: "var(--c-border-strong)" }}
            >
              <span style={{ color: "var(--c-muted)", marginRight: 8, fontSize: 14 }}>🌐</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="https://yourwebsite.com"
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] py-2.5"
                style={{ color: "var(--c-text)" }}
              />
              <button
                onClick={handleSubmit}
                disabled={state === "loading" || authLoading}
                className="ml-2 flex-shrink-0 rounded-xl px-3 sm:px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-85 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
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
              <span className="hidden sm:inline text-[11px]" style={{ color: "var(--c-muted)" }}>
                {withCitations ? "Full GEO + competitive analysis" : "Basic scan only"}
              </span>
            </div>
          </div>

          {/* Trust strip / scan counter */}
          {user && scanUsage ? (
            <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
              <div
                className="flex items-center gap-2 text-[12px] font-mono px-3 py-1.5 rounded-full border"
                style={{
                  background: scanUsage.remaining <= 1 ? "rgba(255,90,90,0.06)" : "rgba(0,229,255,0.06)",
                  borderColor: scanUsage.remaining <= 1 ? "rgba(255,90,90,0.25)" : "rgba(0,229,255,0.2)",
                  color: scanUsage.remaining <= 1 ? "var(--c-error)" : "var(--c-accent)",
                }}
              >
                {scanUsage.scansUsed} / {scanUsage.limit} scans used this month
              </div>
              {scanUsage.remaining <= 1 && (
                <Link
                  href="/pricing"
                  className="text-[12px] font-semibold hover:underline"
                  style={{ color: "var(--c-accent3)" }}
                >
                  Upgrade for more →
                </Link>
              )}
              <span className="text-[12px]" style={{ color: "var(--c-muted)", opacity: 0.65 }}>
                · Results in under 60 seconds
              </span>
            </div>
          ) : (
            <p className="text-[12px] mb-8" style={{ color: "var(--c-muted)", opacity: 0.65 }}>
              No credit card required · 5 free scans/month · Results in under 60 seconds
            </p>
          )}

          {/* Provider pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-mono" style={{ color: "var(--c-muted)", opacity: 0.55 }}>ANALYZED ACROSS</span>
            {PROVIDERS.map((p) => (
              <span
                key={p.name}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border"
                style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}30` }}
              >
                <span style={{ fontSize: 11 }}>{p.icon}</span>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTS / LOADING / ERROR ── */}
      <div ref={resultsRef} className="max-w-[900px] mx-auto px-6 pb-12">
        {state === "loading" && <LoadingSection url={analyzingUrl} />}
        {state === "results" && result && (
          <ResultsSection result={result} onReset={handleReset} />
        )}
        {state === "error" && (
          <div
            className="rounded-2xl border p-8"
            style={{ background: "rgba(255,90,90,0.04)", borderColor: "rgba(255,90,90,0.18)" }}
          >
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">{hint.icon}</div>
              <h3 className="text-[17px] font-semibold mb-2" style={{ color: "var(--c-error)" }}>{hint.title}</h3>
              <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--c-muted)" }}>{hint.detail}</p>
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
                  <span className="text-xl font-bold font-mono" style={{ color: "var(--c-blue)" }}>{countdown}</span>
                </div>
                <p className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>Auto-retrying in {countdown}s...</p>
              </div>
            )}

            {!isRateLimit && (
              <div className="flex justify-center mb-6">
                <span
                  className="text-[11px] font-mono px-3 py-1 rounded-full border"
                  style={{ color: "var(--c-error)", background: "rgba(255,90,90,0.08)", borderColor: "rgba(255,90,90,0.25)" }}
                >
                  {errorMsg}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {isRateLimit && countdown > 0 ? (
                <button
                  onClick={() => { if (countdownRef.current) clearInterval(countdownRef.current); handleAnalyze(analyzingUrl, analyzingCitations); }}
                  className="px-5 py-2.5 rounded-xl border text-sm font-medium transition-all"
                  style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)", background: "transparent" }}
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
                style={{ borderColor: "var(--c-border-strong)", color: "var(--c-muted)", background: "transparent" }}
              >
                ← New URL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MARKETING SECTIONS (idle only) ── */}
      {state === "idle" && (
        <>
          {/* ── PRODUCT PREVIEW ── */}
          <section className="pb-20 px-6">
            <div className="max-w-4xl mx-auto">
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: "var(--c-surface)",
                  borderColor: "var(--c-border-strong)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.12), 0 0 0 1px var(--c-border)",
                }}
              >
                {/* Browser chrome */}
                <div
                  className="px-5 py-3 border-b flex items-center gap-3"
                  style={{ background: "var(--c-surface2)", borderColor: "var(--c-border)" }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,90,90,0.5)" }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,184,48,0.5)" }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "rgba(0,232,122,0.5)" }} />
                  </div>
                  <div
                    className="flex-1 min-w-0 mx-3 px-3 py-1 rounded-md text-[12px] font-mono flex items-center gap-2 overflow-hidden"
                    style={{ background: "var(--c-bg)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}
                  >
                    <span className="flex-shrink-0">🌐</span>
                    <span className="truncate">aiscope.marcstrat.com · Sample Report</span>
                  </div>
                  <span
                    className="flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(0,232,122,0.1)", color: "var(--c-success)", border: "1px solid rgba(0,232,122,0.3)" }}
                  >
                    ● LIVE
                  </span>
                </div>

                {/* Report content */}
                <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-center">
                  {/* Score dial */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--c-border-strong)" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="50"
                          fill="none" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray="314" strokeDashoffset="57"
                          stroke="url(#preview-grad)"
                        />
                        <defs>
                          <linearGradient id="preview-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00e5ff" />
                            <stop offset="100%" stopColor="#7c6fff" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-extrabold font-mono" style={{ color: "var(--c-text)" }}>82</span>
                        <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>/ 100</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className="text-xl font-bold mb-1"
                        style={{ background: "linear-gradient(135deg, #00e5ff, #7c6fff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                      >
                        B+ · Good
                      </div>
                      <div className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>AI Visibility Score</div>
                    </div>
                  </div>

                  {/* Category bars */}
                  <div className="md:col-span-2 flex flex-col gap-5">
                    <div className="text-sm font-semibold mb-1" style={{ color: "var(--c-text)" }}>Category Breakdown</div>
                    {PREVIEW_CATEGORIES.map(({ label, score, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="text-[12px] w-32 shrink-0" style={{ color: "var(--c-muted)" }}>{label}</div>
                        <div className="flex-1 h-2 rounded-full" style={{ background: "var(--c-border-strong)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                          />
                        </div>
                        <div className="text-[12px] font-mono font-semibold w-8 text-right" style={{ color: "var(--c-text)" }}>{score}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-3 mt-1 border-t flex-wrap" style={{ borderColor: "var(--c-border)" }}>
                      <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>Verified across:</span>
                      {["ChatGPT ✓", "Gemini ✓", "Perplexity ✓"].map((p) => (
                        <span key={p} className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                          style={{ background: "rgba(0,229,255,0.08)", color: "var(--c-accent)", border: "1px solid rgba(0,229,255,0.2)" }}
                        >
                          {p}
                        </span>
                      ))}
                      <span className="text-[11px]" style={{ color: "var(--c-muted)" }}>+11 more</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-[11px] mt-4 font-mono" style={{ color: "var(--c-muted)", opacity: 0.45 }}>
                Sample AI Scope report — your results appear in under 60 seconds
              </p>
            </div>
          </section>

          {/* ── STATS ── */}
          <section className="py-16 px-6 border-y" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "14+", label: "AI Bots Checked", icon: "🤖" },
                { value: "3", label: "Providers Simultaneously", icon: "⚡" },
                { value: "500", label: "Bulk URLs Supported", icon: "📦" },
                { value: "<60s", label: "Full Audit Time", icon: "⏱️" },
              ].map(({ value, label, icon }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div
                    className="text-4xl md:text-5xl font-extrabold font-mono"
                    style={{
                      background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {value}
                  </div>
                  <div className="text-sm" style={{ color: "var(--c-muted)" }}>{label}</div>
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
                  style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.06)", borderColor: "rgba(124,111,255,0.2)" }}
                >
                  Features
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
                  Everything you need to{" "}
                  <span style={{ background: "linear-gradient(135deg, var(--c-accent2), var(--c-accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
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
                    className="rounded-2xl border p-6 transition-all hover:-translate-y-1"
                    style={{
                      background: "var(--c-surface)",
                      borderColor: "var(--c-border)",
                      borderTop: `3px solid ${feat.color}`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4"
                      style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}
                    >
                      {feat.icon}
                    </div>
                    <h3 className="text-[15px] font-semibold mb-2" style={{ color: "var(--c-text)" }}>
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

          {/* ── TESTIMONIALS ── */}
          <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{ color: "var(--c-accent3)", background: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.2)" }}
                >
                  Testimonials
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ color: "var(--c-text)" }}>
                  Trusted by{" "}
                  <span style={{ background: "linear-gradient(135deg, var(--c-accent3), var(--c-accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    growth teams
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {TESTIMONIALS.map((t) => (
                  <div
                    key={t.name}
                    className="rounded-2xl border p-7 flex flex-col gap-4"
                    style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}
                  >
                    <div className="text-4xl font-serif" style={{ color: t.color, opacity: 0.35 }}>&ldquo;</div>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--c-text-sub)" }}>
                      {t.quote}
                    </p>
                    <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "var(--c-border)" }}>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}35` }}
                      >
                        {t.initials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{t.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--c-muted)" }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── BUILT FOR ── */}
          <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.06)", borderColor: "rgba(124,111,255,0.2)" }}
                >
                  Built For
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
                  The right tool for{" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, var(--c-accent2), var(--c-accent))" }}
                  >
                    your team
                  </span>
                </h2>
                <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--c-muted)" }}>
                  Whether you&apos;re validating a new brand or managing 50 client accounts, AI Scope scales with you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {AUDIENCES.map((a) => (
                  <div
                    key={a.title}
                    className="rounded-2xl border p-6 flex flex-col gap-4 transition-all hover:-translate-y-1"
                    style={{ background: "var(--c-surface)", borderColor: "var(--c-border)", borderTop: `3px solid ${a.color}` }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${a.color}15`, border: `1px solid ${a.color}30` }}
                    >
                      {a.icon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold mb-2" style={{ color: "var(--c-text)" }}>{a.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--c-muted)" }}>{a.desc}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {a.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono px-2 py-1 rounded-lg"
                          style={{ background: `${a.color}12`, color: a.color, border: `1px solid ${a.color}25` }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
                >
                  How It Works
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
                  Your AI Scope report{" "}
                  <span style={{ background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    in 3 steps
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {STEPS.map((step, i) => (
                  <div key={step.num} className="relative text-center">
                    {i < STEPS.length - 1 && (
                      <div
                        className="hidden md:block absolute top-10 left-[62%] w-[76%] h-px"
                        style={{ background: "linear-gradient(90deg, var(--c-border-strong), transparent)" }}
                      />
                    )}
                    <div
                      className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center mx-auto mb-5"
                      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border-strong)" }}
                    >
                      <span className="text-2xl mb-1">{step.icon}</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: "var(--c-accent)" }}>{step.num}</span>
                    </div>
                    <h3 className="text-[16px] font-semibold mb-2" style={{ color: "var(--c-text)" }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--c-muted)" }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <div
                  className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
                  style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
                >
                  FAQ
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
                  Common{" "}
                  <span style={{ background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    questions
                  </span>
                </h2>
                <p className="text-lg" style={{ color: "var(--c-muted)" }}>
                  Everything you need to know about AI Scope.
                </p>
              </div>
              <FaqAccordion faqs={FAQS} />
              <div className="text-center mt-8">
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                  More questions?{" "}
                  <a href="mailto:team@marcstrat.com" style={{ color: "var(--c-accent)" }} className="hover:underline">
                    Contact the Marcstrat team →
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section className="py-28 px-6 border-t relative overflow-hidden" style={{ borderColor: "var(--c-border)" }}>
            <div className="pointer-events-none absolute inset-0 opacity-40"
              style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(124,111,255,0.15) 0%, transparent 70%)" }}
            />
            <div className="pointer-events-none absolute inset-0 opacity-25"
              style={{ background: "radial-gradient(ellipse 60% 60% at 30% 40%, rgba(0,229,255,0.12) 0%, transparent 70%)" }}
            />

            <div className="relative max-w-3xl mx-auto text-center">
              <div
                className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-6 tracking-widest uppercase"
                style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
              >
                Get Started Free
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
                Get your AI Scope score{" "}
                <br className="hidden sm:block" />
                <span style={{ background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  in 30 seconds
                </span>
              </h2>
              <p className="text-lg mb-10" style={{ color: "var(--c-muted)" }}>
                Free account required. Paste your URL and see exactly how AI systems see your website.
              </p>

              <div
                className="search-box flex items-center rounded-2xl border px-4 py-1.5 max-w-lg mx-auto transition-all mb-4"
                style={{
                  background: "var(--c-surface)",
                  borderColor: "var(--c-border-strong)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
                }}
              >
                <input
                  id="cta-url-input"
                  type="text"
                  placeholder="https://yourwebsite.com"
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] py-2.5"
                  style={{ color: "var(--c-text)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (!val) return;
                      if (!user && !isAdmin) { setShowAuthGate(true); return; }
                      if (scanUsage?.isAtLimit && !isAdmin) { setShowUpgradeGate(true); return; }
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
                    if (scanUsage?.isAtLimit && !isAdmin) { setShowUpgradeGate(true); return; }
                    let u = val;
                    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
                    setUrl(u);
                    handleAnalyze(u, withCitations);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="ml-2 flex-shrink-0 rounded-xl px-3 sm:px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={{ background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))", color: "#fff", whiteSpace: "nowrap" }}
                >
                  Analyze →
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--c-muted)", opacity: 0.55 }}>
                No credit card required · 5 free scans/month
              </p>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <Footer />
        </>
      )}
    </div>
  );
}
