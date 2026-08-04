"use client";

interface StatCardsProps {
  score: number;
  grade: string;
  scoreColor: string;
  passed: number;
  warned: number;
  failed: number;
  total: number;
}

const TIER_STYLES = {
  success: { color: "var(--success)", iconBg: "rgba(0,232,122,0.1)", pillBg: "rgba(0,232,122,0.08)" },
  warning: { color: "var(--warning)", iconBg: "rgba(255,184,48,0.12)", pillBg: "rgba(255,184,48,0.1)" },
  danger: { color: "var(--danger)", iconBg: "rgba(255,90,90,0.1)", pillBg: "rgba(255,90,90,0.08)" },
  accent: { color: "var(--accent)", iconBg: "rgba(0,229,255,0.1)", pillBg: "rgba(0,229,255,0.08)" },
} as const;

type Tier = keyof typeof TIER_STYLES;

function scoreTier(score: number): Tier {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

export default function StatCards({ score, grade, passed, warned, failed, total }: StatCardsProps) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const tier = scoreTier(score);

  const cards: { key: string; label: string; value: string | number; hint: string; icon: string; tier: Tier }[] = [
    { key: "score", label: "AI Score", value: score, hint: `Grade ${grade}`, icon: "◎", tier },
    { key: "grade", label: "Grade", value: grade, hint: "Overall letter grade", icon: "★", tier },
    { key: "passed", label: "Passed", value: passed, hint: `${pct(passed)}% of checks`, icon: "✓", tier: "success" },
    { key: "warned", label: "Warnings", value: warned, hint: `${pct(warned)}% of checks`, icon: "⚠", tier: "warning" },
    { key: "failed", label: "Failed", value: failed, hint: `${pct(failed)}% of checks`, icon: "✕", tier: "danger" },
    { key: "total", label: "Total checks", value: total, hint: "across all categories", icon: "▤", tier: "accent" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
      {cards.map((c) => {
        const style = TIER_STYLES[c.tier];
        return (
          <div
            key={c.key}
            className="rounded-2xl border p-5"
            style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
          >
            <div className="flex items-center justify-between mb-3.5">
              <span
                className="text-[11px] font-mono uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                {c.label}
              </span>
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
                style={{ background: style.iconBg, color: style.color }}
              >
                {c.icon}
              </span>
            </div>
            <div className="text-3xl font-bold tracking-tight" style={{ color: style.color }}>
              {c.value}
            </div>
            <div
              className="inline-block mt-2.5 text-[11px] font-mono px-2 py-0.5 rounded-full"
              style={{ color: style.color, background: style.pillBg }}
            >
              {c.hint}
            </div>
          </div>
        );
      })}
    </div>
  );
}
