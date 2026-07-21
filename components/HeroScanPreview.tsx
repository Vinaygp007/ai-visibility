"use client";

import { useEffect, useRef, useState } from "react";

const DOMAINS = ["yourbusiness.com", "acmehq.io", "shopfleet.com"];

const CHECKS = [
  "Checking GPTBot & ClaudeBot access",
  "Detecting llms.txt",
  "Auditing structured data",
  "Scanning 14 AI crawlers",
];

const PROVIDERS = [
  { name: "Gemini", color: "#4285f4" },
  { name: "ChatGPT", color: "#10a37f" },
  { name: "Perplexity", color: "#20b2aa" },
];

const TARGET_SCORE = 92;
const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function scoreColor(score: number) {
  if (score >= 80) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

type Phase = "typing" | "checking" | "scoring" | "hold" | "reset";

export default function HeroScanPreview() {
  const [domainIndex, setDomainIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [checkedCount, setCheckedCount] = useState(0);
  const [score, setScore] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));

    async function run() {
      while (!cancelled.current) {
        const domain = DOMAINS[domainIndex % DOMAINS.length];

        // Type out the domain
        setPhase("typing");
        setTyped("");
        for (let i = 1; i <= domain.length; i++) {
          if (cancelled.current) return;
          await wait(45);
          setTyped(domain.slice(0, i));
        }

        await wait(400);
        if (cancelled.current) return;

        // Tick through the checklist
        setPhase("checking");
        setCheckedCount(0);
        for (let i = 1; i <= CHECKS.length; i++) {
          if (cancelled.current) return;
          await wait(450);
          setCheckedCount(i);
        }

        await wait(300);
        if (cancelled.current) return;

        // Count the score up
        setPhase("scoring");
        setScore(0);
        const steps = 30;
        for (let i = 1; i <= steps; i++) {
          if (cancelled.current) return;
          await wait(18);
          setScore(Math.round((TARGET_SCORE / steps) * i));
        }

        setPhase("hold");
        await wait(2600);
        if (cancelled.current) return;

        setPhase("reset");
        await wait(500);
        if (cancelled.current) return;
        setDomainIndex((prev) => prev + 1);
      }
    }

    run();
    return () => {
      cancelled.current = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainIndex]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - score / 100);
  const isFading = phase === "reset";

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6 transition-opacity duration-500"
      style={{
        background: "var(--surface)",
        borderColor: "rgba(var(--overlay-rgb),0.08)",
        boxShadow: "0 20px 60px -20px rgba(0,229,255,0.15), 0 8px 24px rgba(0,0,0,0.08)",
        opacity: isFading ? 0.3 : 1,
      }}
    >
      {/* Fake browser chrome */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        <div
          className="flex-1 ml-2 rounded-lg px-3 py-1.5 text-[12px] font-mono truncate"
          style={{ background: "rgba(var(--overlay-rgb),0.05)", color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text-dim)" }}>https://</span>
          <span style={{ color: "var(--text)" }}>{typed}</span>
          <span className="type-cursor" style={{ color: "var(--accent)" }}>▍</span>
        </div>
      </div>

      {/* Provider row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {PROVIDERS.map((p) => (
          <span
            key={p.name}
            className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}
          >
            {p.name}
          </span>
        ))}
        <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>running in parallel</span>
      </div>

      {/* Checklist */}
      <div className="space-y-2 mb-5">
        {CHECKS.map((check, i) => {
          const isDone = i < checkedCount;
          const isActive = i === checkedCount && phase === "checking";
          return (
            <div
              key={check}
              className="flex items-center gap-2.5 text-[12.5px] font-mono transition-colors duration-300"
              style={{ color: isDone ? "var(--success)" : isActive ? "var(--accent)" : "var(--text-dim)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "currentColor" }} />
              {isDone ? "✓ " : ""}{check}
            </div>
          );
        })}
      </div>

      {/* Score readout */}
      <div
        className="flex items-center justify-between pt-4 border-t"
        style={{ borderColor: "rgba(var(--overlay-rgb),0.08)" }}
      >
        <div>
          <div className="text-[10px] font-mono tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
            AI VISIBILITY SCORE
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: scoreColor(score) }}>
            {score}
            <span className="text-base" style={{ color: "var(--text-dim)" }}>/100</span>
          </div>
        </div>
        <svg width="96" height="96" viewBox="0 0 96 96" className="flex-shrink-0">
          <circle cx="48" cy="48" r={RING_RADIUS} fill="none" stroke="rgba(var(--overlay-rgb),0.08)" strokeWidth="7" />
          <circle
            cx="48" cy="48" r={RING_RADIUS}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.4s ease" }}
          />
        </svg>
      </div>

      <p className="text-[10px] text-center mt-4" style={{ color: "var(--text-dim)" }}>
        Illustrative preview — run a real scan after you're in
      </p>
    </div>
  );
}
