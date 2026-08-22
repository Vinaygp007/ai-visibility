import Reveal from "@/components/Reveal";
import { Sparkles, ListChecks } from "lucide-react";
import { ICON_GRADIENT, ICON_GRADIENT_FALLBACK } from "@/lib/iconGradient";

const FEATURES = [
  {
    Icon: Sparkles,
    title: "3 AI Providers, One Score",
    desc: "Gemini, ChatGPT and Perplexity all run the same audit independently. Results are merged and averaged into a single visibility score.",
  },
  {
    Icon: ListChecks,
    title: "Prioritized Recommendations",
    desc: "Not just a score: a ranked fix list, from quick wins to structural changes, so you know what to do next.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-14">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          // THE OUTCOME
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--text)]">
          Not just a score: a plan
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Every audit merges three AI providers into a single number, then turns it into a ranked list of exactly what to fix first.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 100}>
            <div
              className="rounded-2xl border p-8 h-full transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "rgba(0,229,255,0.08)" }}
              >
                <f.Icon size={24} color={ICON_GRADIENT} style={{ color: ICON_GRADIENT_FALLBACK }} />
              </div>
              <h3 className="text-[17px] font-semibold mb-2.5 text-[var(--text)]">{f.title}</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
