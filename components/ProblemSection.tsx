import Reveal from "@/components/Reveal";
import { Bot, MessageSquare, SearchX } from "lucide-react";
import { ICON_GRADIENT, ICON_GRADIENT_FALLBACK } from "@/lib/iconGradient";

const REALITIES = [
  {
    Icon: Bot,
    title: "AI crawlers aren't Googlebot",
    body: "GPTBot, ClaudeBot, PerplexityBot and Google-Extended each decide independently whether to access your site. Being indexed by Google guarantees none of them can actually read your pages.",
  },
  {
    Icon: MessageSquare,
    title: "AI answers summarize, not link",
    body: "When ChatGPT or Perplexity answers a question about your industry, it's reading and paraphrasing sources. If it can't parse or trust yours, you don't show up in that answer at all.",
  },
  {
    Icon: SearchX,
    title: "There's no \"Ahrefs for AI\" yet",
    body: "Most SEO and marketing teams have checked their Google rankings a hundred times, and their AI-crawler access zero times, because until now there hasn't been an easy way to check it.",
  },
];

export default function ProblemSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-14">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--warning)", background: "rgba(255,184,48,0.08)", borderColor: "rgba(255,184,48,0.25)" }}
        >
          // WHY THIS MATTERS
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text)" }}>
          Search is splitting in two
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Alongside classic Google search, more discovery now happens through AI answers and AI chat: Google's AI
          Overviews, ChatGPT, Perplexity, Copilot. Traditional SEO tells you nothing about how you show up in that
          half of the picture.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {REALITIES.map((r, i) => (
          <Reveal key={r.title} delay={i * 100}>
            <div
              className="rounded-2xl border p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:border-[var(--warning)] hover:shadow-lg"
              style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
            >
              <div className="mb-3"><r.Icon size={26} color={ICON_GRADIENT} style={{ color: ICON_GRADIENT_FALLBACK }} /></div>
              <h3 className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>{r.title}</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{r.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
