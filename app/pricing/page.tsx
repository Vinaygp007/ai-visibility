import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";
import PricingCards from "@/components/PricingCards";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — AI Scope by Marcstrat",
  description:
    "Simple, transparent pricing for AI Scope. Start free, scale when you're ready. No hidden fees.",
};

const MATRIX = [
  { label: "Scans / month",            starter: "5",      growth: "100",     pro: "Unlimited" },
  { label: "AI providers",             starter: "3",      growth: "3",       pro: "3" },
  { label: "AI bots checked",          starter: "14+",    growth: "14+",     pro: "14+" },
  { label: "Bulk Scanner",             starter: "—",      growth: "100 URLs", pro: "500 URLs" },
  { label: "AI Citations Research",    starter: "—",      growth: "✓",       pro: "✓" },
  { label: "Prompt Runner",            starter: "—",      growth: "✓",       pro: "✓" },
  { label: "Reports & History",        starter: "—",      growth: "✓",       pro: "✓" },
  { label: "CSV / PDF export",         starter: "—",      growth: "✓",       pro: "✓" },
  { label: "DOCX export",             starter: "—",      growth: "—",       pro: "✓" },
  { label: "White-label reports",      starter: "—",      growth: "—",       pro: "✓" },
  { label: "API access",              starter: "—",      growth: "—",       pro: "✓" },
  { label: "Support",                 starter: "Community", growth: "Priority", pro: "Dedicated" },
];

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Starter plan is completely free, forever. No credit card required, no trial period — just sign up and start auditing.",
  },
  {
    q: "What counts as a 'scan'?",
    a: "A scan is a single full AI Visibility audit on one URL. This includes the multi-provider analysis (Gemini, ChatGPT, Perplexity), the structured data audit, bot access checks, and recommendations. Running AI Citations Research on top of a scan does not count as an additional scan.",
  },
  {
    q: "Can I upgrade or downgrade at any time?",
    a: "Yes. You can change your plan at any time. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle.",
  },
  {
    q: "Do unused scans roll over?",
    a: "No — scan allowances reset at the start of each monthly billing cycle. If you consistently need more, consider upgrading to the next tier.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: "Yes — annual billing gets you 2 months free (equivalent to a 17% discount). Contact us at team@marcstrat.com to set up annual billing.",
  },
  {
    q: "Can I use AI Scope for client work?",
    a: "Absolutely. The Growth and Pro plans both support client use cases. Pro includes white-label PDF reports so you can deliver branded deliverables directly.",
  },
  {
    q: "What AI providers power the analysis?",
    a: "By default, AI Scope runs analysis across Google Gemini 2.0, OpenAI GPT-4o, and Perplexity Sonar simultaneously. All three run in parallel and their scores are merged and averaged. You can configure which providers and models to use from the Admin Panel.",
  },
  {
    q: "Is my website data stored or shared?",
    a: "Scan results are stored in your account dashboard so you can access them later. We do not share your data with third parties. You can delete any scan result at any time.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,111,255,0.4), transparent 70%)" }}
        />
        <div
          className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
          style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.06)", borderColor: "rgba(124,111,255,0.2)" }}
        >
          Pricing
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 max-w-3xl mx-auto" style={{ color: "var(--c-text)" }}>
          Simple, transparent{" "}
          <span style={{ background: "linear-gradient(135deg, var(--c-accent2), var(--c-accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            pricing
          </span>
        </h1>
        <p className="text-lg max-w-xl mx-auto mb-4" style={{ color: "var(--c-muted)" }}>
          Start free. Scale when you&apos;re ready. No hidden fees, no per-seat pricing, no surprise charges.
        </p>
        <p className="text-sm font-mono" style={{ color: "var(--c-accent3)" }}>
          ✓ Free plan available · ✓ Cancel anytime · ✓ No credit card for free tier
        </p>
      </section>

      {/* Tier cards with billing toggle */}
      <PricingCards />

      {/* Full comparison matrix */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
              Full feature comparison
            </h2>
            <p className="text-lg" style={{ color: "var(--c-muted)" }}>
              Every detail, side by side.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--c-border)" }}>
            <div className="min-w-[520px]">
            <div className="grid grid-cols-4 border-b" style={{ background: "var(--c-surface2)", borderColor: "var(--c-border)" }}>
              <div className="px-5 py-4 text-sm font-semibold" style={{ color: "var(--c-muted)" }}>Feature</div>
              {["Starter", "Growth", "Pro"].map((t, i) => (
                <div
                  key={t}
                  className="px-5 py-4 text-sm font-bold text-center"
                  style={{ color: i === 1 ? "var(--c-accent)" : i === 2 ? "var(--c-accent2)" : "var(--c-accent3)" }}
                >
                  {t}
                </div>
              ))}
            </div>
            {MATRIX.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-4 border-b"
                style={{ borderColor: "var(--c-border)", background: i % 2 === 0 ? "var(--c-bg)" : "var(--c-surface)" }}
              >
                <div className="px-5 py-3 text-sm" style={{ color: "var(--c-text)" }}>{row.label}</div>
                {[row.starter, row.growth, row.pro].map((val, idx) => (
                  <div key={idx} className="px-5 py-3 text-center text-sm font-mono" style={{ color: val === "—" ? "var(--c-muted)" : val === "✓" ? "var(--c-accent3)" : "var(--c-text)" }}>
                    {val}
                  </div>
                ))}
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div
              className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
              style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.06)", borderColor: "rgba(124,111,255,0.2)" }}
            >
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
              Frequently asked questions
            </h2>
            <p className="text-lg" style={{ color: "var(--c-muted)" }}>
              Everything you need to know about AI Scope and pricing.
            </p>
          </div>
          <FaqAccordion faqs={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--c-text)" }}>
            Still have questions?
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--c-muted)" }}>
            Reach out to the Marcstrat team — we&apos;re happy to walk you through the right plan for your use case.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={{ background: "var(--c-accent)", color: "#000" }}
            >
              Try Free Now →
            </Link>
            <a
              href="mailto:team@marcstrat.com"
              className="px-6 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
