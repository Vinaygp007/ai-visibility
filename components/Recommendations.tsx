import { Recommendation } from "@/types";

interface RecommendationsProps {
  recommendations: Recommendation[];
}

const PRIORITY_CONFIG = {
  high: { cls: "text-[#ff5a5a]", bg: "rgba(255,90,90,0.1)", label: "HIGH" },
  medium: { cls: "text-[#ffb830]", bg: "rgba(255,184,48,0.1)", label: "MEDIUM" },
  low: { cls: "text-[#00e87a]", bg: "rgba(0,232,122,0.1)", label: "LOW" },
};

export default function Recommendations({ recommendations }: RecommendationsProps) {
  if (!recommendations?.length) return null;

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ background: "#111219", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <h3 className="text-base font-semibold flex items-center gap-2.5 mb-4">
        🎯 Recommendations to Boost AI Visibility
      </h3>

      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {recommendations.map((rec, i) => {
          const pCfg = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.medium;
          return (
            <div key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              {/* Number */}
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono flex-shrink-0 mt-0.5 border"
                style={{
                  color: "#00e5ff",
                  background: "rgba(0,229,255,0.1)",
                  borderColor: "rgba(0,229,255,0.2)",
                }}
              >
                {i + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium text-white">{rec.title}</span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded tracking-wide"
                    style={{ color: pCfg.cls.replace("text-[", "").replace("]", ""), background: pCfg.bg }}
                  >
                    {pCfg.label}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "#8b8d9e" }}>
                  {rec.description}
                  {rec.impact && (
                    <span className="font-medium" style={{ color: "#00e5ff" }}>
                      {" "}
                      Impact: {rec.impact}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
