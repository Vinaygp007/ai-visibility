import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Visibility Audits for SEO Agencies — AI Scope",
  description:
    "Run AI visibility audits for all your clients in minutes. Bulk scan 500 URLs, deliver white-label PDF reports, and prove your GEO value — from $79/month.",
};

const FEATURES = [
  {
    icon: "⚡",
    title: "Bulk Scanner — 500 URLs per batch",
    accent: "#ffb830",
    desc: "Upload a CSV or paste up to 500 client URLs and get full AI visibility audits running in parallel. Results stream in real-time. Export everything to CSV or PDF in one click.",
    bullets: [
      "Adjustable concurrency — scan 1 to 8 URLs simultaneously",
      "Per-URL AI Visibility Score, bot status, and recommendations",
      "Real-time streaming progress with ETA",
      "Export the full dataset to CSV or branded PDF",
    ],
  },
  {
    icon: "📄",
    title: "White-Label PDF Reports",
    accent: "#7c6fff",
    desc: "Deliver polished, client-ready PDF reports with your agency branding. No 'Powered by AI Scope' watermarks. Just professional deliverables your clients can act on.",
    bullets: [
      "Upload your agency logo — it appears on every report",
      "Full audit breakdown: score, bot access, recommendations",
      "Share via link or download — works on every device",
      "Available on the Pro plan ($79/month)",
    ],
  },
  {
    icon: "💬",
    title: "AI Citations Research",
    accent: "#00e5ff",
    desc: "Run live prompts across ChatGPT, Gemini, and Perplexity to see exactly which brands get cited — and which get ignored. The competitive intelligence your clients are asking for.",
    bullets: [
      "Test any prompt across 3 AI platforms simultaneously",
      "Track brand mentions, competitor share-of-voice",
      "Export citation results with source attribution",
      "Run custom prompt sets for each client vertical",
    ],
  },
  {
    icon: "📋",
    title: "Reports Dashboard & History",
    accent: "#00ff94",
    desc: "All client scans saved in one place. Track AI visibility improvements over time and pull up any historical report without re-scanning. Monthly change tracking built in.",
    bullets: [
      "Unlimited report history on Growth and Pro plans",
      "Side-by-side comparison: before and after audits",
      "Filter, search, and sort by client domain or score",
      "CSV export for client-facing progress reports",
    ],
  },
];

const OLD_WAY = [
  { pain: "Manual robots.txt checks for each client domain", fix: "14 AI bots checked in one scan, every time" },
  { pain: "No tool to audit AI visibility at agency scale", fix: "Bulk scan 500 client URLs in one batch" },
  { pain: "Can't deliver branded GEO reports to clients", fix: "White-label PDF with your logo, one click" },
  { pain: "Guessing which AI platforms cite your clients", fix: "Live citation research across ChatGPT, Gemini, Perplexity" },
];

const FAQS = [
  {
    q: "Can I put my agency logo on the PDF reports?",
    a: "Yes. The Pro plan includes white-label PDF reports where you upload your agency logo and it appears on every report. No AI Scope branding is shown to your clients.",
  },
  {
    q: "How many client domains can I scan?",
    a: "The Pro plan gives you unlimited scans per month. The bulk scanner handles up to 500 URLs per batch — upload a CSV or paste URLs directly. For Growth plan, the bulk limit is 100 URLs per batch.",
  },
  {
    q: "Do my clients need accounts?",
    a: "No. You run all audits from your single agency account and export or share reports directly with clients. No client login required.",
  },
  {
    q: "Is there an API for integrating audits into our own tools?",
    a: "Yes — full API access is included in the Pro plan. You can trigger scans, retrieve results, and pull reports programmatically into your existing workflows.",
  },
  {
    q: "How accurate is the AI Visibility Score?",
    a: "The score is built from 20+ technical and content signals: robots.txt access for 14 AI bots, llms.txt presence, structured data completeness, schema markup, page speed, meta clarity, and live AI citation tests across Gemini, ChatGPT, and Perplexity. Each category is scored and averaged into the final 0–100.",
  },
];

export default function AgenciesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,184,48,0.35), transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "#ffb830", background: "rgba(255,184,48,0.06)", borderColor: "rgba(255,184,48,0.2)" }}
          >
            For SEO &amp; GEO Agencies
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight" style={{ color: "var(--c-text)" }}>
            Your clients are asking about{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #ffb830, #00e5ff)" }}
            >
              AI visibility.
            </span>
            <br />Now you have an answer.
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-8" style={{ color: "var(--c-muted)" }}>
            Bulk scan 500 client URLs, deliver white-label PDF reports, and track AI citation share-of-voice — all from one agency dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={{ background: "#ffb830", color: "#000" }}
            >
              Start Free →
            </Link>
            <Link
              href="/pricing"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
            >
              View Agency Plans
            </Link>
          </div>
          <p className="text-xs mt-4 font-mono" style={{ color: "var(--c-muted)" }}>
            ✓ Free plan available · ✓ No credit card required · ✓ Full audit in under 60 seconds
          </p>
        </div>
      </section>

      {/* Old way vs New way */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
              Stop guessing. Start auditing.
            </h2>
            <p className="text-lg" style={{ color: "var(--c-muted)" }}>
              The GEO audit workflow agencies have been missing.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-6" style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}>
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: "var(--c-muted)" }}>
                Without AI Scope
              </div>
              <ul className="space-y-3">
                {OLD_WAY.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--c-muted)" }}>
                    <span className="text-base mt-0.5">✗</span>
                    {item.pain}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-2xl border p-6"
              style={{ background: "var(--c-surface2)", borderColor: "rgba(255,184,48,0.2)" }}
            >
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: "#ffb830" }}>
                With AI Scope
              </div>
              <ul className="space-y-3">
                {OLD_WAY.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--c-text)" }}>
                    <span className="text-base mt-0.5" style={{ color: "var(--c-accent3)" }}>✓</span>
                    {item.fix}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="py-12 px-6 border-t border-b" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { stat: "14+", label: "AI bots checked per scan" },
            { stat: "500", label: "URLs per bulk batch" },
            { stat: "<60s", label: "Per full audit" },
            { stat: "3×", label: "AI providers in parallel" },
          ].map(({ stat, label }) => (
            <div key={stat}>
              <div className="text-3xl font-bold mb-1" style={{ color: "var(--c-text)" }}>{stat}</div>
              <div className="text-xs" style={{ color: "var(--c-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
              Built for agency-scale GEO work
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--c-muted)" }}>
              Every feature is designed around multi-client workflows, fast delivery, and credible deliverables.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border p-6 sm:p-7"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${f.accent}14`, border: `1px solid ${f.accent}30` }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold" style={{ color: "var(--c-text)" }}>{f.title}</h3>
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--c-muted)" }}>{f.desc}</p>
                <ul className="space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm" style={{ color: "var(--c-text)" }}>
                      <span className="mt-0.5 text-xs" style={{ color: f.accent }}>✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border p-8 sm:p-10 text-center" style={{ background: "var(--c-surface2)", borderColor: "rgba(255,184,48,0.2)" }}>
            <div
              className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
              style={{ color: "#ffb830", background: "rgba(255,184,48,0.08)", borderColor: "rgba(255,184,48,0.25)" }}
            >
              Agency Plan
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--c-text)" }}>
              Everything agencies need — at $79/month
            </h2>
            <p className="text-base mb-6" style={{ color: "var(--c-muted)" }}>
              Unlimited scans · 500 URL bulk · White-label PDF · API access · Dedicated support
            </p>
            <p className="text-xs font-mono mb-8" style={{ color: "var(--c-accent3)" }}>
              10× cheaper than Profound · 3× cheaper than Knowatoa · Instant setup, no onboarding call
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                style={{ background: "#ffb830", color: "#000" }}
              >
                Start Free →
              </Link>
              <Link
                href="/pricing"
                className="px-7 py-3.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
              >
                Compare All Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-10 text-center" style={{ color: "var(--c-text)" }}>
            Agency questions, answered
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border p-6"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-text)" }}>{faq.q}</h3>
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
