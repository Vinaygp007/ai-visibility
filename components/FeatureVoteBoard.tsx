"use client";

import { useEffect, useRef, useState } from "react";
import {
  Layers, Terminal, Check, Lock, X, Crown,
  Vote as VoteIcon, Loader2, type LucideIcon,
} from "lucide-react";

type VotePage = "bulk" | "prompt";

interface VoteData {
  myVote: VotePage | null;
  counts: Record<VotePage, number>;
}

interface Candidate {
  key: VotePage;
  label: string;
  icon: LucideIcon;
  desc: string;
  chips: string[];
  image: { light: string; dark: string };
}

const CANDIDATES: Candidate[] = [
  {
    key: "bulk",
    label: "Bulk Scanner",
    icon: Layers,
    desc: "Scan dozens of URLs in one run — queue a list and get AI-visibility scores across your whole site.",
    chips: ["14 AI Bots Checked", "Streams results live", "CSV & PDF export"],
    image: { light: "/real-data/bulk-light.webp", dark: "/real-data/bulk-dark.webp" },
  },
  {
    key: "prompt",
    label: "Prompt Runner",
    icon: Terminal,
    desc: "Run up to 100 prompts in parallel against Gemini, ChatGPT and Perplexity to see how each cites you.",
    chips: ["Up to 100 prompts", "Runs in parallel", "AI citation research"],
    image: { light: "/real-data/prompt-light.webp", dark: "/real-data/prompt-dark.webp" },
  },
];

const INTROS: Record<"neutral" | VotePage, string> = {
  neutral:
    "We're launching with Scan only. Bulk Scanner and Prompt Runner are both built — cast your vote for the one you want first, and we'll ship the winner in v2. You get one vote, for one page, so pick carefully.",
  bulk:
    "Bulk Scanner isn't open to your account yet — it ships in v2 if it wins this vote. Pick it, or Prompt Runner, below. You get one vote, for one page, so pick carefully.",
  prompt:
    "Prompt Runner isn't open to your account yet — it ships in v2 if it wins this vote. Pick it, or Bulk Scanner, below. You get one vote, for one page, so pick carefully.",
};

// Eases 0 -> target on every change; simple and glitch-free since target only
// ever changes twice in practice (initial fetch, then a single cast vote).
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const CONFETTI_COLORS = ["var(--accent)", "var(--accent2)", "var(--success)"];

// Brief radial burst behind the vote button on a successful cast — pure
// CSS keyframe per piece (.vote-confetti-piece in globals.css), no library.
function ConfettiBurst() {
  const pieces = useRef(
    Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 32 + Math.random() * 28;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.08,
      };
    })
  ).current;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="vote-confetti-piece"
          style={{ background: p.color, animationDelay: `${p.delay}s`, "--tx": `${p.tx}px`, "--ty": `${p.ty}px` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function VoteCard({
  candidate, count, pct, isMine, isLocked, isLeading, isBusy, celebrate, onVote, onZoom,
}: {
  candidate: Candidate;
  count: number;
  pct: number;
  isMine: boolean;
  isLocked: boolean;
  isLeading: boolean;
  isBusy: boolean;
  celebrate: boolean;
  onVote: () => void;
  onZoom: () => void;
}) {
  const animatedPct = useCountUp(pct);
  const glow = isMine || isLeading;

  return (
    <div
      className={`vote-card rounded-[19px] p-[2px] ${glow ? "vote-card-glow" : ""}`}
      style={!glow ? { background: "rgba(var(--overlay-rgb),0.09)" } : undefined}
    >
      <div className="rounded-[17px] overflow-hidden flex flex-col h-full" style={{ background: "var(--surface)" }}>
        <div
          className="p-3 pb-0 cursor-zoom-in"
          onClick={onZoom}
          role="button"
          tabIndex={0}
          aria-label={`View larger ${candidate.label} preview`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onZoom();
            }
          }}
        >
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(var(--overlay-rgb),0.08)" }}>
            <div className="flex items-center gap-1.5 px-3 py-2.5" style={{ background: "rgba(var(--overlay-rgb),0.04)" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <img src={candidate.image.light} alt={`${candidate.label} preview`} className="theme-img-light w-full block" />
            <img src={candidate.image.dark} alt={`${candidate.label} preview`} className="theme-img-dark w-full block" />
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.22)", color: "var(--accent)" }}
            >
              <candidate.icon size={15} />
            </div>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>{candidate.label}</h3>
            {isMine && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "rgba(0,232,122,0.14)", color: "var(--success)", border: "1px solid rgba(0,232,122,0.3)" }}
              >
                <Check size={10} /> Your vote
              </span>
            )}
            {isLeading && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "rgba(255,184,48,0.16)", color: "var(--warning)", border: "1px solid rgba(255,184,48,0.32)" }}
              >
                <Crown size={10} className="vote-crown" /> Leading
              </span>
            )}
          </div>

          <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>{candidate.desc}</p>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {candidate.chips.map((chip) => (
              <span
                key={chip}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ color: "var(--text-muted)", background: "rgba(var(--overlay-rgb),0.05)" }}
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color: "var(--text)" }}>{animatedPct}%</span>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>{count} vote{count === 1 ? "" : "s"}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "rgba(var(--overlay-rgb),0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
            />
          </div>

          <div className="relative">
            {celebrate && <ConfettiBurst />}
            <button
              onClick={onVote}
              disabled={isBusy || isMine || isLocked}
              className="dash-btn-primary w-full flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95 disabled:active:scale-100"
              style={{
                background: isMine
                  ? "var(--success)"
                  : isLocked
                  ? "rgba(var(--overlay-rgb),0.08)"
                  : "linear-gradient(135deg, var(--accent), var(--accent2))",
                color: isLocked ? "var(--text-dim)" : "var(--on-accent)",
                cursor: isMine || isLocked ? "default" : "pointer",
              }}
            >
              {isBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isMine ? (
                <><Check size={14} /> Your vote</>
              ) : isLocked ? (
                <><Lock size={13} /> Vote used</>
              ) : (
                "Vote for this"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared by app/vote (neutral entry point) and the admin-gated app/bulk /
// app/bulk-prompt layouts, which render this in place of the real tool for
// non-admin visitors instead of redirecting them elsewhere.
export default function FeatureVoteBoard({ context = "neutral" }: { context?: "neutral" | VotePage }) {
  const [data, setData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<VotePage | null>(null);
  const [zoomed, setZoomed] = useState<VotePage | null>(null);
  const [justVoted, setJustVoted] = useState<VotePage | null>(null);

  useEffect(() => {
    fetch("/api/votes")
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  async function castVote(page: VotePage) {
    if (voting || data?.myVote) return;
    setVoting(page);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });
      // A 409 (already voted, e.g. from a second tab) still carries the
      // authoritative myVote/counts in its body — use it either way.
      if (res.ok || res.status === 409) {
        setData(await res.json());
        if (res.ok) {
          setJustVoted(page);
          setTimeout(() => setJustVoted(null), 900);
        }
      }
    } finally {
      setVoting(null);
    }
  }

  const bulkCount = data?.counts.bulk ?? 0;
  const promptCount = data?.counts.prompt ?? 0;
  const total = bulkCount + promptCount;
  const pct = (page: VotePage) => (total > 0 ? Math.round(((data?.counts[page] ?? 0) / total) * 100) : 0);
  const leader: VotePage | null = total > 0 && bulkCount !== promptCount ? (bulkCount > promptCount ? "bulk" : "prompt") : null;
  const zoomedCandidate = zoomed ? CANDIDATES.find((c) => c.key === zoomed) ?? null : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-16">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative mb-8">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true" style={{ height: 220 }}>
            <div className="aurora-blob aurora-blob-1" style={{ width: 300, height: 300, top: -170, left: "0%", background: "var(--accent)", opacity: 0.1 }} />
            <div className="aurora-blob aurora-blob-2" style={{ width: 260, height: 260, top: -140, left: "24%", background: "var(--accent2)", opacity: 0.08 }} />
          </div>

          <div
            className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--success)", background: "rgba(0,232,122,0.1)", border: "1px solid rgba(0,232,122,0.25)" }}
          >
            <span className="vote-live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
            Live community vote
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              boxShadow: "0 8px 22px rgba(0,229,255,0.3)",
            }}>
              <VoteIcon size={19} color="var(--on-accent)" />
            </div>
            <h1
              className="heading-shimmer text-3xl sm:text-4xl font-bold"
              style={{
                background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}
            >
              What ships in v2?
            </h1>
          </div>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-muted)" }}>
            {INTROS[context]}
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {[0, 1].map((i) => <div key={i} className="dash-skeleton h-[460px] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {CANDIDATES.map((c) => (
              <VoteCard
                key={c.key}
                candidate={c}
                count={data?.counts[c.key] ?? 0}
                pct={pct(c.key)}
                isMine={data?.myVote === c.key}
                isLocked={!!data?.myVote && data.myVote !== c.key}
                isLeading={leader === c.key}
                isBusy={voting === c.key}
                celebrate={justVoted === c.key}
                onVote={() => castVote(c.key)}
                onZoom={() => setZoomed(c.key)}
              />
            ))}
          </div>
        )}
      </div>

      {zoomedCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10 animate-fade-up"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setZoomed(null)}
        >
          <button
            onClick={() => setZoomed(null)}
            aria-label="Close"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center justify-center w-10 h-10 rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <X size={18} />
          </button>
          <img
            src={zoomedCandidate.image.light}
            alt={`${zoomedCandidate.label} preview, enlarged`}
            className="theme-img-light rounded-xl"
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          />
          <img
            src={zoomedCandidate.image.dark}
            alt={`${zoomedCandidate.label} preview, enlarged`}
            className="theme-img-dark rounded-xl"
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
