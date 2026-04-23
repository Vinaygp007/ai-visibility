"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LoadingSection from "@/components/LoadingSection";
import ResultsSection from "@/components/ResultsSection";
import ReportsHistory from "@/components/ReportsHistory";
import { AnalysisResult } from "@/types";

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

export default function HomePage() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzingUrl, setAnalyzingUrl] = useState("");
  const [analyzingCitations, setAnalyzingCitations] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState("UNKNOWN");
  const [countdown, setCountdown] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-retry countdown for rate limit errors
  useEffect(() => {
    if (state === "error" && ERROR_HINTS[errorCode]?.canAutoRetry && errorCode === "QUOTA_EXCEEDED") {
      setCountdown(AUTO_RETRY_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
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

  const handleAnalyze = async (url: string, runCitations = true) => {
    const shouldRunCitations = runCitations === true;

    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
    setAnalyzingUrl(url);
    setAnalyzingCitations(shouldRunCitations);
    setState("loading");
    setResult(null);
    setErrorMsg("");
    setErrorCode("UNKNOWN");

    setTimeout(() => mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, runCitations: shouldRunCitations }),
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
    <div className="min-h-screen" style={{ background: "#0a0b10" }}>
      <Navbar />
      <HeroSection
        onAnalyze={(url, citations) => handleAnalyze(url, citations === true)}
        isLoading={state === "loading"}
      />

      {/* ── Previous reports (shown only in idle/error state) ──────────── */}
      {(state === "idle" || state === "error") && (
        <div className="max-w-[900px] mx-auto px-6 pb-6">
          <ReportsHistory onLoadReport={(url) => handleAnalyze(url, true)} />
        </div>
      )}

      <main ref={mainRef} className="max-w-[900px] mx-auto px-6 pb-20">
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
              <h3 className="text-[17px] font-semibold mb-2" style={{ color: "#ff5a5a" }}>{hint.title}</h3>
              <p className="text-sm max-w-sm mx-auto" style={{ color: "#8b8d9e" }}>{hint.detail}</p>
            </div>

            {isRateLimit && countdown > 0 && (
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-20 h-20 mb-3"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg className="absolute inset-0" width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none" stroke="#4285f4" strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / AUTO_RETRY_SECONDS)}`}
                      transform="rotate(-90 40 40)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <span className="text-xl font-bold font-mono" style={{ color: "#4285f4" }}>{countdown}</span>
                </div>
                <p className="text-xs font-mono" style={{ color: "#8b8d9e" }}>Auto-retrying in {countdown}s...</p>
              </div>
            )}

            {isRateLimit && countdown === 0 && state === "error" && (
              <div className="flex justify-center mb-6">
                <span className="text-xs font-mono" style={{ color: "#4285f4" }}>Retrying now...</span>
              </div>
            )}

            {!isRateLimit && (
              <div className="flex justify-center mb-6">
                <span
                  className="text-[11px] font-mono px-3 py-1 rounded-full border"
                  style={{ color: "#ff5a5a", background: "rgba(255,90,90,0.08)", borderColor: "rgba(255,90,90,0.25)" }}
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
                  className="px-5 py-2.5 rounded-xl border text-sm font-medium transition-all hover:border-[#4285f4] hover:text-[#4285f4]"
                  style={{ borderColor: "rgba(255,255,255,0.13)", color: "#f0f0f5", background: "transparent" }}
                >
                  ⚡ Retry now (skip wait)
                </button>
              ) : (
                <button
                  onClick={() => handleAnalyze(analyzingUrl, analyzingCitations)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={{ background: "#00e5ff", color: "#000" }}
                >
                  ↺ Try again
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: "rgba(255,255,255,0.13)", color: "#8b8d9e", background: "transparent" }}
              >
                ← New URL
              </button>
            </div>

            {(isRateLimit || errorCode === "MISSING_KEY" || errorCode === "INVALID_KEY") && (
              <div
                className="rounded-xl p-4 text-sm text-center"
                style={{ background: "rgba(66,133,244,0.05)", border: "1px solid rgba(66,133,244,0.15)" }}
              >
                {isRateLimit ? (
                  <p style={{ color: "#8b8d9e" }}>
                    To avoid rate limits, upgrade to a{" "}
                    <a href="https://ai.google.dev/pricing" target="_blank" rel="noreferrer" style={{ color: "#4285f4" }}>
                      paid Gemini API plan
                    </a>{" "}for higher quotas.
                  </p>
                ) : (
                  <p style={{ color: "#8b8d9e" }}>
                    Get your free Gemini API key at{" "}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#4285f4" }}>
                      aistudio.google.com/app/apikey
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer
        className="text-center py-8 text-[13px] border-t"
        style={{ color: "#8b8d9e", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="mb-1">Powered by Gemini · ChatGPT · Perplexity — results merged &amp; averaged</div>
        <div className="text-[15px] font-bold" style={{ color: "#6f7280" }}>By Marcstrat</div>
      </footer>
    </div>
  );
}