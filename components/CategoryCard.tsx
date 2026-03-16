import { Category, CheckStatus } from "@/types";

interface CategoryCardProps {
  category: Category;
}

const STATUS_CONFIG: Record<CheckStatus, { cls: string; sym: string; bg: string }> = {
  pass: { cls: "text-[#00e87a]", sym: "✓", bg: "rgba(0,232,122,0.12)" },
  warn: { cls: "text-[#ffb830]", sym: "!", bg: "rgba(255,184,48,0.1)" },
  fail: { cls: "text-[#ff5a5a]", sym: "✕", bg: "rgba(255,90,90,0.12)" },
};

const COLOR_CONFIG = {
  green: { text: "#00e87a", iconBg: "rgba(0,232,122,0.1)" },
  yellow: { text: "#ffb830", iconBg: "rgba(255,184,48,0.1)" },
  red: { text: "#ff5a5a", iconBg: "rgba(255,90,90,0.1)" },
};

export default function CategoryCard({ category }: CategoryCardProps) {
  const colorCfg = COLOR_CONFIG[category.color] ?? COLOR_CONFIG.green;

  return (
    <div
      className="cat-card rounded-2xl border p-5 transition-colors"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px]"
            style={{ background: colorCfg.iconBg }}
          >
            {category.icon}
          </div>
          {category.name}
        </div>
        <span className="font-mono text-[13px] font-medium" style={{ color: colorCfg.text }}>
          {category.score}/100
        </span>
      </div>

      {/* Checks */}
      <div className="flex flex-col gap-2">
        {category.checks.map((check, i) => {
          const cfg = STATUS_CONFIG[check.status];
          return (
            <div key={i} className="flex items-start gap-2.5 text-[13px]">
              <div
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-[1px] ${cfg.cls}`}
                style={{ background: cfg.bg }}
              >
                {cfg.sym}
              </div>
              <div style={{ color: "#8b8d9e" }} className="leading-snug">
                <span className="font-medium text-white">{check.label}</span>
                {check.detail ? ` — ${check.detail}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
