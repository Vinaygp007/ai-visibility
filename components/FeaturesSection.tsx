import Reveal from "@/components/Reveal";
import { Bot, FileText, Tag, Sparkles, MessageSquareQuote, ListChecks } from "lucide-react";
import { ICON_GRADIENT, ICON_GRADIENT_FALLBACK } from "@/lib/iconGradient";

const FEATURES = [
  {
    Icon: Bot,
    title: "14 AI Bots Checked",
    desc: "See exactly which AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and 10 more) can and can't reach your site.",
  },
  {
    Icon: FileText,
    title: "llms.txt Detection",
    desc: "Find out if you've published an llms.txt file, and what to put in one if you haven't, so AI systems can understand your site faster.",
  },
  {
    Icon: Tag,
    title: "Structured Data Audit",
    desc: "Check your schema.org markup so AI systems can correctly parse who you are, what you sell, and what to cite.",
  },
  {
    Icon: Sparkles,
    title: "3 AI Providers, One Score",
    desc: "Gemini, ChatGPT and Perplexity all run the same audit independently. Results are merged and averaged into a single visibility score.",
  },
  {
    Icon: MessageSquareQuote,
    title: "AI Citation Research",
    desc: "See where AI answers already mention (or ignore) your brand versus competitors for the queries that matter to you.",
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
          // WHAT YOU GET
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--text)]">
          One scan, the full picture
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Traditional SEO tools don't check whether AI systems can even see your site. This does.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 100}>
            <div
              className="rounded-2xl border p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,229,255,0.08)" }}
              >
                <f.Icon size={22} color={ICON_GRADIENT} style={{ color: ICON_GRADIENT_FALLBACK }} />
              </div>
              <h3 className="text-[16px] font-semibold mb-2 text-[var(--text)]">{f.title}</h3>
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
