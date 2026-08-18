import Reveal from "@/components/Reveal";
import BackgroundVideo from "@/components/BackgroundVideo";
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
    <section className="relative overflow-hidden">
      <BackgroundVideo
        className="absolute inset-0 w-full h-full"
        src="/videos/3252130-uhd_3840_2160_25fps.mp4"
      />
      <div className="absolute inset-0" style={{ background: "rgba(10, 11, 16, 0.8" }} aria-hidden="true" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div
            className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest backdrop-blur-sm"
            style={{ color: "#c2b8ff", background: "rgba(15,12,30,0.65)", borderColor: "rgba(124,111,255,0.5)" }}
          >
            // BUILT FOR
          </div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            style={{ color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}
          >
            Who's using AiScope
          </h2>
          <p className="text-[16px] leading-relaxed" style={{ color: "#e4e4ea", textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}>
            We're in public beta. Here's who we built it for.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} delay={(i % 3) * 100}>
              <div
                className="rounded-2xl border p-6 h-full backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#7c6fff] hover:shadow-xl"
                style={{ background: "rgba(12,13,20,0.82)", borderColor: "rgba(255,255,255,0.12)", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(124,111,255,0.15)" }}
                >
                  <a.Icon size={22} color={ICON_GRADIENT} style={{ color: ICON_GRADIENT_FALLBACK }} />
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#f8f8fa" }}>{a.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "#a3a5b5" }}>
                  {a.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
