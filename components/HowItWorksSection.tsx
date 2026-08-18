import Reveal from "@/components/Reveal";
import BackgroundVideo from "@/components/BackgroundVideo";
import { Link2, ScanSearch, Sparkles, ClipboardCheck } from "lucide-react";

const STEPS = [
  {
    Icon: Link2,
    title: "Paste your URL",
    body: "Drop in your homepage: no setup, no tracking script to install, no account needed to see how it works.",
  },
  {
    Icon: ScanSearch,
    title: "We fetch & scan",
    body: "robots.txt and llms.txt are fetched, then your HTML, meta tags and structured data are scanned, and 14 AI bot permissions are checked.",
  },
  {
    Icon: Sparkles,
    title: "Gemini, ChatGPT & Perplexity run in parallel",
    body: "All three independently audit AI-crawler access and research how (or whether) AI answers already reference your brand.",
  },
  {
    Icon: ClipboardCheck,
    title: "Get one merged score + fixes",
    body: "Results are averaged into a single AI Visibility Score with a prioritized list of what to fix first, from quick wins to structural changes.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden">
      <BackgroundVideo
        className="absolute inset-0 w-full h-full"
        src="/videos/ahrefs-big-data-IUEYCYWZ.mp4"
      />
      <div className="absolute inset-0" style={{ background: "rgba(10, 11, 16, 0.25)" }} aria-hidden="true" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div
            className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
            style={{ color: "#00e5ff", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
          >
            // HOW IT WORKS
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "#f0f0f5" }}>
            From URL to AI-visibility score in under a minute
          </h2>
          <p className="text-[16px] leading-relaxed" style={{ color: "#8b8d9e" }}>
            No crawler to configure, no dashboard to learn first: one input, one report.
          </p>
        </Reveal>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-5">
          {/* Connecting line, desktop only */}
          <div
            className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-px"
            style={{ background: "rgba(255,255,255,0.1)" }}
            aria-hidden="true"
          />

          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 120} className="relative text-center md:text-left">
              <div
                className="group relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-4 mx-auto md:mx-0 transition-transform duration-300 hover:scale-110"
                style={{
                  background: "#111219",
                  border: "2px solid #00e5ff",
                  color: "#00e5ff",
                  boxShadow: "0 0 0 4px rgba(0,229,255,0.08)",
                }}
              >
                {i + 1}
              </div>
              <div className="mb-2 flex justify-center md:justify-start">
                <step.Icon size={22} color="#00e5ff" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#f0f0f5" }}>{step.title}</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "#8b8d9e" }}>{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
