import MarketingNav from "@/components/MarketingNav";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import BotMarquee from "@/components/BotMarquee";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
import BulkToolsSection from "@/components/BulkToolsSection";
import ComparisonSection from "@/components/ComparisonSection";
import AudienceSection from "@/components/AudienceSection";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import HeroScanPreview from "@/components/HeroScanPreview";
import HeroCTA from "@/components/HeroCTA";
import BottomCTA from "@/components/BottomCTA";
import Footer from "@/components/Footer";
import { GeminiIcon, ChatGPTIcon, PerplexityIcon } from "@/components/ProviderIcons";

const FEATURE_CHIPS = [
  "14 AI Bots Checked",
  "llms.txt Detection",
  "Structured Data",
  "3 AI Providers",
  "Merged Analysis",
];

const PROVIDERS = [
  { name: "Gemini 2.0", Icon: GeminiIcon, color: "#4285f4" },
  { name: "ChatGPT", Icon: ChatGPTIcon, color: "#10a37f" },
  { name: "Perplexity", Icon: PerplexityIcon, color: "#20b2aa" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <ScrollProgressBar />
      <MarketingNav />

      <section className="relative overflow-hidden px-6 pt-20 pb-20 md:pt-24 md:pb-28">
        {/* Aurora background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="aurora-blob aurora-blob-1"
            style={{ width: 420, height: 420, top: -140, left: "2%", background: "var(--accent)", opacity: 0.16 }}
          />
          <div
            className="aurora-blob aurora-blob-2"
            style={{ width: 380, height: 380, top: 20, right: "4%", background: "var(--accent2)", opacity: 0.14 }}
          />
          <div
            className="aurora-blob aurora-blob-3"
            style={{ width: 340, height: 340, bottom: -140, left: "38%", background: "var(--success)", opacity: 0.12 }}
          />
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-10 items-center">
          {/* Copy column */}
          <div className="text-center lg:text-left">
            <div
              className="animate-fade-up fade-up-1 inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-6 tracking-widest"
              style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
            >
              // AI VISIBILITY SCANNER
            </div>

            <h1
              className="heading-shimmer text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-5"
              style={{
                background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Is Your Website<br />Visible to AI?
            </h1>

            <p
              className="animate-fade-up fade-up-3 text-[17px] leading-relaxed max-w-lg mx-auto lg:mx-0 mb-7"
              style={{ color: "var(--text-muted)" }}
            >
              Audit how ChatGPT, Claude, Perplexity, Gemini and 10+ other AI systems discover and reference your website.
            </p>

            <div className="animate-fade-up fade-up-3 flex items-center justify-center lg:justify-start gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>POWERED BY</span>
              {PROVIDERS.map((p) => (
                <span
                  key={p.name}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-transform hover:-translate-y-0.5"
                  style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}
                >
                  <p.Icon size={18} className="shrink-0" />
                  {p.name}
                </span>
              ))}
            </div>
            <p className="animate-fade-up fade-up-3 text-[11px] font-mono mb-9" style={{ color: "var(--text-muted)" }}>
              all 3 run simultaneously · scores averaged
            </p>

            <HeroCTA />

            <div className="animate-fade-up fade-up-5 flex flex-wrap gap-4 justify-center lg:justify-start mt-8">
              {FEATURE_CHIPS.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--success)" }} />
                  {feat}
                </div>
              ))}
            </div>
          </div>

          {/* Live preview column */}
          <div className="animate-fade-up fade-up-4 max-w-md w-full mx-auto lg:mx-0">
            <HeroScanPreview />
          </div>
        </div>
      </section>

      <BotMarquee />

      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <ProblemSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <HowItWorksSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <FeaturesSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <BulkToolsSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <ComparisonSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <AudienceSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <PricingSection />
      <div className="border-t" style={{ borderColor: "rgba(var(--overlay-rgb),0.07)" }} />
      <FAQSection />

      <BottomCTA />

      <Footer />
    </div>
  );
}
