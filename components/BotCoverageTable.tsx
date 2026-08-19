"use client";

import { BotDetail } from "@/types";

const COMPANY_COLORS: Record<string, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#c87533",
  Perplexity: "#20b2aa",
  Google: "#4285f4",
  Meta: "#0082fb",
  "You.com": "#ff6b35",
  DuckDuckGo: "#de5833",
  Apple: "#888",
  Cohere: "#4db69e",
  ByteDance: "#ff0050",
  CommonCrawl: "#9b9b9b",
  Amazon: "#ff9900",
};

export default function BotCoverageTable({
  accessible,
  blocked,
}: {
  accessible: BotDetail[];
  blocked: BotDetail[];
}) {
  const total = accessible.length + blocked.length;
  if (total === 0) return null;

  const rows = [...accessible, ...blocked];

  return (
    <div
      className="rounded-2xl border mb-6 overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
    >
      <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-2">
        <div>
          <div
            className="text-[13px] font-mono tracking-widest uppercase mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            AI Platform Coverage
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            Which AI crawlers can access this site, per robots.txt
          </p>
        </div>
        <span
          className="text-[11px] font-mono px-2.5 py-1 rounded-full"
          style={{ color: "var(--text-muted)", background: "rgba(var(--overlay-rgb),0.05)" }}
        >
          {accessible.length}/{total} accessible
        </span>
      </div>

      <div className="h-1 mx-5 rounded-full mb-1" style={{ background: "rgba(var(--overlay-rgb),0.06)" }}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{
            width: `${Math.round((accessible.length / total) * 100)}%`,
            background:
              accessible.length === total ? "var(--success)"
              : accessible.length > total / 2 ? "var(--warning)"
              : "var(--danger)",
          }}
        />
      </div>

      {/* Mobile list */}
      <div className="sm:hidden mt-3 divide-y" style={{ borderColor: "rgba(var(--overlay-rgb),0.06)" }}>
        {rows.map((bot) => {
          const dotColor = COMPANY_COLORS[bot.company] ?? "var(--text-dim)";
          const isGlobal = bot.blockType === "global_block";
          return (
            <div key={bot.key} className="flex items-center gap-3 px-5 py-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: `${dotColor}22`, color: dotColor, border: `1px solid ${dotColor}44` }}
              >
                {bot.label[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--text)" }}>
                  {bot.label}
                </div>
                <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  {bot.company || "—"}
                </div>
              </div>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                style={
                  bot.allowed
                    ? { color: "var(--success)", background: "rgba(0,232,122,0.08)" }
                    : { color: "var(--danger)", background: "rgba(255,90,90,0.08)" }
                }
              >
                {bot.allowed ? "Accessible" : isGlobal ? "Blocked (wildcard)" : "Blocked"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full mt-3" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              <th className="text-left font-medium px-5 py-2">Bot</th>
              <th className="text-left font-medium px-5 py-2">Company</th>
              <th className="text-left font-medium px-5 py-2">Access</th>
              <th className="text-left font-medium px-5 py-2 hidden sm:table-cell">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bot) => {
              const dotColor = COMPANY_COLORS[bot.company] ?? "var(--text-dim)";
              const isGlobal = bot.blockType === "global_block";
              return (
                <tr
                  key={bot.key}
                  className="border-t transition-colors hover:bg-[rgba(var(--overlay-rgb),0.02)]"
                  style={{ borderColor: "rgba(var(--overlay-rgb),0.06)" }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${dotColor}22`, color: dotColor, border: `1px solid ${dotColor}44` }}
                      >
                        {bot.label[0]?.toUpperCase()}
                      </span>
                      <span className="text-[12.5px] font-medium" style={{ color: "var(--text)" }}>
                        {bot.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                      {bot.company || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                      style={
                        bot.allowed
                          ? { color: "var(--success)", background: "rgba(0,232,122,0.08)" }
                          : { color: "var(--danger)", background: "rgba(255,90,90,0.08)" }
                      }
                    >
                      {bot.allowed ? "Accessible" : isGlobal ? "Blocked (wildcard)" : "Blocked"}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span
                      className="text-[11px] font-mono truncate block max-w-[260px]"
                      style={{ color: "var(--text-dim)" }}
                      title={bot.directive ?? bot.reason}
                    >
                      {bot.directive ?? bot.reason ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
