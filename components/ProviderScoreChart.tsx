"use client";

import { ProviderMeta } from "@/types";

const CHART_HEIGHT = 160;
const GRID_LINES = [0, 25, 50, 75, 100];

function colorFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("chatgpt") || n.includes("gpt")) return "#10a37f";
  if (n.includes("gemini")) return "#4285f4";
  if (n.includes("perplexity")) return "#20b2aa";
  if (n.includes("claude")) return "#c17c4e";
  return "var(--text-dim)";
}

function shortLabel(name: string): string {
  return name.replace(/\s*\(.+?\)\s*/g, "").trim();
}

export default function ProviderScoreChart({ providers }: { providers: ProviderMeta[] }) {
  if (providers.length === 0) return null;

  const scored = providers.filter((p) => p.status === "success" && p.score != null);
  const best = scored.length ? Math.max(...scored.map((p) => p.score as number)) : null;
  const avg = scored.length
    ? Math.round(scored.reduce((s, p) => s + (p.score as number), 0) / scored.length)
    : null;

  return (
    <div
      className="rounded-2xl border p-5 mb-6"
      style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
    >
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div
            className="text-[13px] font-mono tracking-widest uppercase mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            AI Provider Results
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            Score out of 100, per AI provider
          </p>
        </div>
        {best != null && avg != null && (
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--success)" }} />
              <div>
                <div className="text-sm font-bold leading-none" style={{ color: "var(--text)" }}>{best}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Best score</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
              <div>
                <div className="text-sm font-bold leading-none" style={{ color: "var(--text)" }}>{avg}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>Average</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex" style={{ height: CHART_HEIGHT }}>
        {/* Y axis labels */}
        <div className="flex flex-col justify-between pr-3 w-8 shrink-0 text-right">
          {[...GRID_LINES].reverse().map((g) => (
            <span key={g} className="text-[10px] font-mono leading-none" style={{ color: "var(--text-dim)" }}>
              {g}
            </span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {GRID_LINES.map((g) => (
              <div key={g} className="w-full h-px" style={{ background: "rgba(var(--overlay-rgb),0.06)" }} />
            ))}
          </div>

          <div className="relative h-full flex items-end justify-around gap-4 px-2">
            {providers.map((p) => {
              const ok = p.status === "success" && p.score != null;
              const color = colorFor(p.name);
              const barHeight = ok ? Math.max(4, ((p.score as number) / 100) * CHART_HEIGHT) : 0;
              return (
                <div
                  key={p.name}
                  className="flex flex-col items-center justify-end h-full flex-1 max-w-[72px]"
                  title={p.name}
                >
                  {ok ? (
                    <>
                      <span className="text-[11px] font-mono font-semibold mb-1.5" style={{ color }}>
                        {p.score}
                      </span>
                      <div
                        className="w-full rounded-t-lg transition-all duration-700"
                        style={{ height: barHeight, background: color, opacity: 0.85 }}
                      />
                    </>
                  ) : (
                    <span
                      className="text-[10px] font-mono px-2 py-1 rounded-md mb-1"
                      style={{ color: "var(--danger)", background: "rgba(255,90,90,0.08)" }}
                    >
                      failed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis labels */}
      <div className="flex mt-2.5">
        <div className="w-8 shrink-0" />
        <div className="flex-1 flex justify-around gap-4 px-2">
          {providers.map((p) => (
            <span
              key={p.name}
              className="text-[10px] font-medium text-center flex-1 max-w-[72px] truncate"
              style={{ color: "var(--text-muted)" }}
              title={p.name}
            >
              {shortLabel(p.name)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
