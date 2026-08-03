import Reveal from "@/components/Reveal";
import { Building2, Laptop, Rocket, TrendingUp, Code2 } from "lucide-react";
import { ICON_GRADIENT, ICON_GRADIENT_FALLBACK } from "@/lib/iconGradient";

const AUDIENCES = [
  {
    Icon: Building2,
    title: "SEO & GEO Agencies",
    desc: "White-label reports and bulk scanning so you can hand clients a credible AI-visibility deliverable without building it yourself.",
  },
  {
    Icon: Laptop,
    title: "Freelance Consultants",
    desc: "A fast, professional-looking audit you can run mid-call and attach to a proposal the same day.",
  },
  {
    Icon: Rocket,
    title: "Bootstrapped Founders",
    desc: "Know whether ChatGPT and Perplexity can actually see your product before you spend another dollar on content.",
  },
  {
    Icon: TrendingUp,
    title: "In-house Marketers",
    desc: "A straight answer to \"are we visible in AI search\" you can bring to leadership in minutes, not weeks.",
  },
  {
    Icon: Code2,
    title: "Dev Shops",
    desc: "Check the technical boxes clients are starting to ask about: crawler access, llms.txt, structured data.",
  },
];

export default function AudienceSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-14">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent2)", background: "rgba(124,111,255,0.08)", borderColor: "rgba(124,111,255,0.25)" }}
        >
          // BUILT FOR
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--text)]">
          Who's using AiScope
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          We're in public beta. Here's who we built it for.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.title} delay={(i % 3) * 100}>
            <div
              className="rounded-2xl border p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent2)] hover:shadow-lg"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
            >
              <div className="mb-3"><a.Icon size={26} color={ICON_GRADIENT} style={{ color: ICON_GRADIENT_FALLBACK }} /></div>
              <h3 className="text-[15px] font-semibold mb-2 text-[var(--text)]">{a.title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {a.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
