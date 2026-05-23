import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — AI Scope by Marcstrat",
  description:
    "Everything you need to audit, track, and grow your brand's visibility across ChatGPT, Claude, Perplexity, Gemini and 10+ AI systems.",
};

const FEATURES = [
  {
    icon: "🎯",
    title: "AI Visibility Score",
    tag: "Core",
    accent: "#00e5ff",
    description:
      "A unified 0–100 score that tells you exactly how visible your brand is to AI systems. Built from 20+ technical and content signals across 14 AI bots — merged and averaged into one grade (A through F).",
    bullets: [
      "Instant scoring across Gemini, ChatGPT, and Perplexity simultaneously",
      "Score breakdown by category: crawlability, structured data, bot access, content clarity",
      "Letter grade (A–F) for at-a-glance performance",
      "Historical tracking to measure improvement over time",
    ],
  },
  {
    icon: "🤖",
    title: "14 AI Bots Checked",
    tag: "Coverage",
    accent: "#7c6fff",
    description:
      "AI Scope verifies access and discoverability across every major AI crawler and assistant — not just the big three. Know exactly which systems can see you and which are blocked.",
    bullets: [
      "GPTBot, ChatGPT-User (OpenAI)",
      "ClaudeBot, Claude-Web (Anthropic)",
      "PerplexityBot, OAI-SearchBot, Cohere-AI",
      "Google-Extended, Gemini, Bingbot, Applebot, Meta-ExternalAgent, DuckDuckBot, and more",
    ],
  },
  {
    icon: "⚡",
    title: "Bulk URL Scanner",
    tag: "Scale",
    accent: "#ffb830",
    description:
      "Audit entire domains, competitor sites, or client portfolios in one batch. Upload a CSV or paste up to 500 URLs — results stream in real-time with progress tracking.",
    bullets: [
      "Up to 500 URLs per batch scan",
      "Real-time streaming results as each URL is analysed",
      "Adjustable concurrency (1–8 simultaneous scans)",
      "Export full results to CSV or PDF",
    ],
  },
  {
    icon: "💬",
    title: "AI Citations Research",
    tag: "Intelligence",
    accent: "#00ff94",
    description:
      "Discover when and how AI systems mention, reference, or recommend your brand in their live responses. The most powerful feature for competitive intelligence and GEO strategy.",
    bullets: [
      "Live queries to ChatGPT, Gemini, and Perplexity with your brand context",
      "Citation URL extraction — see exactly which sources AI pulls from",
      "Competitive landscape analysis: who else appears in your category",
      "Brand sentiment scoring — how positively or negatively AI describes you",
    ],
  },
  {
    icon: "🔍",
    title: "Smart Recommendations",
    tag: "Actionable",
    accent: "#4285f4",
    description:
      "Every audit ends with a prioritised action list — not a dump of data, but specific, ranked fixes ordered by impact. High, medium, and low priority with exact descriptions of what to do.",
    bullets: [
      "Priority-ranked: high / medium / low impact items",
      "Specific fix descriptions (not vague suggestions)",
      "Expected impact for each recommendation",
      "Direct links to relevant settings and docs",
    ],
  },
  {
    icon: "📊",
    title: "Structured Data Audit",
    tag: "Technical",
    accent: "#ff5a5a",
    description:
      "Deep technical audit of the signals AI systems use to understand your content — from robots.txt and llms.txt to JSON-LD schema, Core Web Vitals, and sitemap health.",
    bullets: [
      "robots.txt: verifies each AI bot is explicitly allowed",
      "llms.txt: detects presence, parses structure, checks quality",
      "JSON-LD schema detection (Organisation, Product, FAQ, Breadcrumb)",
      "Core Web Vitals (LCP, CLS, INP, TTFB) via PageSpeed API",
      "XML sitemap accessibility check",
    ],
  },
  {
    icon: "✦",
    title: "Multi-Provider Analysis",
    tag: "Accuracy",
    accent: "#c96442",
    description:
      "Run analysis across Gemini 2.0, ChatGPT (GPT-4o), and Perplexity Sonar simultaneously. Results are merged and averaged — eliminating single-provider bias and giving you the most accurate picture.",
    bullets: [
      "3 providers run in parallel — never sequential",
      "Individual scores per provider for granular insight",
      "Averaged overall score to reduce variance",
      "Configurable providers: enable or disable any model from Admin Panel",
    ],
  },
  {
    icon: "📋",
    title: "Reports & Export",
    tag: "Workflow",
    accent: "#10a37f",
    description:
      "Every scan is stored in your Reports dashboard. Export individual reports or batch exports as PDF, CSV, or Word doc. Share with clients, stakeholders, or your wider team.",
    bullets: [
      "Full scan history across homepage scans, bulk jobs, and prompt runs",
      "PDF reports with full score breakdown and recommendations",
      "CSV export for data analysis and dashboarding",
      "Word (DOCX) export for client deliverables",
    ],
  },
];

const COMPARISON = [
  { feature: "AI Visibility Score (0-100)", aiscope: true, manual: false, others: "partial" },
  { feature: "14+ AI bots verified", aiscope: true, manual: false, others: false },
  { feature: "Live AI citation research", aiscope: true, manual: "slow", others: false },
  { feature: "Bulk scan (500 URLs)", aiscope: true, manual: false, others: false },
  { feature: "llms.txt detection & audit", aiscope: true, manual: true, others: false },
  { feature: "Brand sentiment scoring", aiscope: true, manual: false, others: false },
  { feature: "Smart recommendations", aiscope: true, manual: false, others: "partial" },
  { feature: "PDF / CSV / DOCX export", aiscope: true, manual: false, others: "partial" },
  { feature: "Results in < 60 seconds", aiscope: true, manual: false, others: false },
];

function Check({ val }: { val: boolean | "partial" | "slow" | string }) {
  if (val === true) return <span style={{ color: "#00e87a", fontSize: 18 }}>✓</span>;
  if (val === false) return <span style={{ color: "#ff5a5a", fontSize: 18 }}>✕</span>;
  return <span style={{ color: "#ffb830", fontSize: 12, fontFamily: "monospace" }}>{val}</span>;
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,229,255,0.3), transparent 70%)" }}
        />
        <div
          className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
          style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          Features
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 max-w-3xl mx-auto" style={{ color: "var(--c-text)" }}>
          Everything You Need to{" "}
          <span style={{ background: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Own AI Search
          </span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: "var(--c-muted)" }}>
          AI Scope is the only platform that audits your brand across 14+ AI systems simultaneously — giving you the full picture of your AI visibility in under 60 seconds.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--c-accent)", color: "#000" }}
          >
            Try Free — No Account Needed
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
          >
            See Pricing →
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-b py-6 px-6" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "14+", label: "AI Bots Checked" },
            { value: "3",   label: "Simultaneous Providers" },
            { value: "500", label: "Bulk URL Capacity" },
            { value: "<60s", label: "Time Per Full Audit" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-bold font-mono mb-1" style={{ color: "var(--c-accent)" }}>{value}</div>
              <div className="text-sm" style={{ color: "var(--c-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
              Built for every use case
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--c-muted)" }}>
              From a solo founder checking their first score to an agency running 500-URL bulk audits for clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border p-7 transition-all hover:-translate-y-0.5"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${feat.accent}12`, border: `1px solid ${feat.accent}25` }}
                  >
                    {feat.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold" style={{ color: "var(--c-text)" }}>{feat.title}</h3>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ color: feat.accent, background: `${feat.accent}12` }}
                      >
                        {feat.tag}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--c-muted)" }}>{feat.description}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 pl-4 sm:pl-16">
                  {feat.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "var(--c-muted)" }}>
                      <span style={{ color: feat.accent, fontSize: 11, marginTop: 3, flexShrink: 0 }}>▸</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
              AI Scope vs the alternatives
            </h2>
            <p className="text-lg" style={{ color: "var(--c-muted)" }}>
              How we compare to manual research and other tools.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--c-border)" }}>
            <div className="min-w-[500px]">
            {/* Header */}
            <div
              className="grid grid-cols-4 gap-0 border-b"
              style={{ background: "var(--c-surface2)", borderColor: "var(--c-border)" }}
            >
              <div className="px-4 sm:px-6 py-4 text-sm font-semibold" style={{ color: "var(--c-muted)" }}>Feature</div>
              <div className="px-4 sm:px-6 py-4 text-sm font-bold text-center" style={{ color: "var(--c-accent)" }}>AI Scope</div>
              <div className="px-4 sm:px-6 py-4 text-sm font-semibold text-center" style={{ color: "var(--c-muted)" }}>Manual</div>
              <div className="px-4 sm:px-6 py-4 text-sm font-semibold text-center" style={{ color: "var(--c-muted)" }}>Other Tools</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className="grid grid-cols-4 border-b"
                style={{
                  borderColor: "var(--c-border)",
                  background: i % 2 === 0 ? "var(--c-bg)" : "var(--c-surface)",
                }}
              >
                <div className="px-4 sm:px-6 py-3.5 text-sm" style={{ color: "var(--c-text)" }}>{row.feature}</div>
                <div className="px-4 sm:px-6 py-3.5 text-center"><Check val={row.aiscope} /></div>
                <div className="px-4 sm:px-6 py-3.5 text-center"><Check val={row.manual} /></div>
                <div className="px-4 sm:px-6 py-3.5 text-center"><Check val={row.others} /></div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div
          className="max-w-3xl mx-auto rounded-3xl border p-8 sm:p-12 text-center relative overflow-hidden"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border-strong)" }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(0,229,255,0.3), transparent 70%)" }} />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
            Ready to see your score?
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--c-muted)" }}>
            Paste your URL and get a full AI Visibility breakdown in under 60 seconds. Free, no account required.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--c-accent)", color: "#000" }}
          >
            Analyze Your Website →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
