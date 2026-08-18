"use client";

import { useEffect, useRef, useState } from "react";

const DOMAINS = ["yourbusiness.com", "acmehq.io", "shopfleet.com"];

const CHECKS = [
  "Checking GPTBot & ClaudeBot access",
  "Detecting llms.txt",
  "Auditing structured data",
  "Scanning 14 AI crawlers",
];

// Individual targets deliberately differ (each provider "sees" the site a
// little differently) but average out to TARGET_SCORE, so the combined
// ring lands on the same number the merge always used to show.
const PROVIDERS = [
  { name: "Gemini", color: "#4285f4", target: 95 },
  { name: "ChatGPT", color: "#10a37f", target: 88 },
  { name: "Perplexity", color: "#20b2aa", target: 93 },
];

const TARGET_SCORE = Math.round(PROVIDERS.reduce((s, p) => s + p.target, 0) / PROVIDERS.length);
const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const DIAL_RADIUS = 19;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

function scoreColor(score: number) {
  if (score >= 80) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

type Phase = "typing" | "checking" | "scoring" | "merging" | "hold" | "reset";

function ProviderDial({ name, color, score, active }: { name: string; color: string; score: number; active: boolean }) {
  const offset = DIAL_CIRCUMFERENCE * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 48, height: 48 }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={DIAL_RADIUS} fill="none" stroke="rgba(var(--overlay-rgb),0.08)" strokeWidth="4" />
          <circle
            cx="24" cy="24" r={DIAL_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={DIAL_CIRCUMFERENCE}
            strokeDashoffset={active ? offset : DIAL_CIRCUMFERENCE}
            transform="rotate(-90 24 24)"
            style={{ transition: "stroke-dashoffset 0.15s linear" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums"
          style={{ color: active ? color : "var(--text-dim)" }}
        >
          {active ? score : "-"}
        </div>
      </div>
      <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>{name}</span>
    </div>
  );
}

export default function HeroScanPreview() {
  const [domainIndex, setDomainIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [checkedCount, setCheckedCount] = useState(0);
  const [providerScores, setProviderScores] = useState<number[]>([0, 0, 0]);
  const [score, setScore] = useState(0);
  const [justMerged, setJustMerged] = useState(0);
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

        // Each provider scores the site independently, in parallel
        setPhase("scoring");
        setProviderScores([0, 0, 0]);
        setScore(0);
        const dialSteps = 26;
        for (let i = 1; i <= dialSteps; i++) {
          if (cancelled.current) return;
          await wait(16);
          setProviderScores(PROVIDERS.map((p) => Math.round((p.target / dialSteps) * i)));
        }

        await wait(350);
        if (cancelled.current) return;

        // Merge the three into one combined score
        setPhase("merging");
        setJustMerged((n) => n + 1);
        const steps = 26;
        for (let i = 1; i <= steps; i++) {
          if (cancelled.current) return;
          await wait(16);
          setScore(Math.round((TARGET_SCORE / steps) * i));
        }

        setPhase("hold");
        await wait(2400);
        if (cancelled.current) return;

        setPhase("reset");
        await wait(500);
        if (cancelled.current) return;
        setDomainIndex((prev) => prev + 1);
      }
    }

    // Defer the demo's start until the browser is idle. It drives frequent
    // state updates (a 16ms-interval loop during scoring/merging), which
    // otherwise compete with initial paint/hydration for main-thread time
    // right when LCP and TBT are being decided.
    let idleId: number | undefined;
    if (typeof requestIdleCallback === "function") {
      idleId = requestIdleCallback(() => run(), { timeout: 1500 });
    } else {
      timers.push(setTimeout(run, 500));
    }

    return () => {
      cancelled.current = true;
      timers.forEach(clearTimeout);
      if (idleId !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainIndex]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - score / 100);
  const isFading = phase === "reset";
  const dialsActive = phase === "scoring" || phase === "merging" || phase === "hold";
  const ringActive = phase === "merging" || phase === "hold";

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

      {/* Per-provider dials — each engine scores independently, in parallel.
          Inactive state is conveyed by the empty ring stroke and "-" readout,
          not by dimming — a container-wide opacity here would drop the
          provider name labels below WCAG AA contrast. */}
      <div
        className="flex items-center justify-around pt-4 mb-1 border-t"
        style={{ borderColor: "rgba(var(--overlay-rgb),0.08)" }}
      >
        {PROVIDERS.map((p, i) => (
          <ProviderDial key={p.name} name={p.name} color={p.color} score={providerScores[i]} active={dialsActive} />
        ))}
      </div>

      <div className="flex justify-center my-1">
        <span className="text-[9px] font-mono" style={{ color: "var(--text-dim)" }}>
          {ringActive ? "↓ merged into one score ↓" : "↓ merges into one score ↓"}
        </span>
      </div>

      {/* Combined score readout */}
      <div
        key={justMerged}
        className={`flex items-center justify-between pt-3 border-t rounded-xl ${ringActive ? "merge-pulse" : ""}`}
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
        Illustrative preview. Run a real scan after you're in
      </p>
    </div>
  );
}
