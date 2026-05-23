import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Visibility for Founders & Startups — AI Scope",
  description:
    "Is your startup invisible to ChatGPT, Claude, and Perplexity? Find out in 60 seconds — free. AI Scope gives founders an instant AI visibility audit with no credit card required.",
};

const PROBLEMS = [
  {
    icon: "🚫",
    title: "Your llms.txt is missing",
    desc: "Without llms.txt, AI systems have no structured way to understand your site's purpose, content hierarchy, or key pages. You're invisible by default.",
    accent: "#ff5a5a",
  },
  {
    icon: "🤖",
    title: "AI bots may be blocked",
    desc: "A single line in your robots.txt can block ChatGPT, Claude, and Perplexity from crawling your site. It's often an accident — and most founders never check.",
    accent: "#ffb830",
  },
  {
    icon: "📉",
    title: "Your competitor ranks in AI answers",
    desc: "When someone asks ChatGPT for a tool like yours, a competitor shows up. Not you. That gap is widening every month AI search grows.",
    accent: "#7c6fff",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "AI Visibility Score (0–100)",
    accent: "#00e5ff",
    desc: "Get one clear number showing how discoverable your startup is across AI systems. Score broken down by crawlability, structured data, content clarity, and bot access.",
  },
  {
    icon: "🤖",
    title: "14 AI Bots Checked",
    accent: "#7c6fff",
    desc: "We verify access status for every major AI crawler: GPTBot, ClaudeBot, PerplexityBot, Googlebot-Extended, and 10 more — in a single scan.",
  },
  {
    icon: "✅",
    title: "Prioritised Fix List",
    accent: "#00ff94",
    desc: "After the audit, you get a ranked action list: highest-impact fixes first. No vague advice — specific, technical, actionable steps you can complete today.",
  },
  {
    icon: "💬",
    title: "Live AI Citation Research",
    accent: "#ffb830",
    desc: "Run prompts across ChatGPT, Gemini, and Perplexity simultaneously to see who gets cited for your category keywords. Know exactly where you stand.",
  },
];

const FAQS = [
  {
    q: "Is this actually free? What's the catch?",
    a: "The Starter plan is free forever — no credit card, no trial period. You get 5 full AI visibility audits per month. The catch is that some advanced features (bulk scanning, white-label PDF, API access) require a paid plan. But for a founder auditing their own site, 5 scans/month is plenty to get started and track improvement.",
  },
  {
    q: "What does the AI Visibility Score actually measure?",
    a: "The score (0–100) is built from 20+ signals: robots.txt access status for 14 AI bots, llms.txt presence and format, structured data completeness (schema.org markup), page speed, canonical tags, HTML lang attribute, meta clarity, and live citation tests across Gemini, ChatGPT, and Perplexity. Each category contributes to a final weighted score.",
  },
  {
    q: "My site is new — will the audit help me?",
    a: "Yes, especially if your site is new. The audit catches the foundational blockers that are easiest to fix early: missing llms.txt, blocked bots in robots.txt, absent schema markup. Fixing these now compounds over the months it takes AI systems to re-index your content.",
  },
  {
    q: "I'm non-technical. Can I still act on the recommendations?",
    a: "The recommendations are written in plain language with specific steps. For common fixes (add llms.txt, update robots.txt, add schema markup), we link to guides. For CMS-specific steps (WordPress, Webflow, Framer), there are one-click plugin options. You don't need to be a developer.",
  },
  {
    q: "How is this different from a regular SEO audit?",
    a: "Traditional SEO audits optimize for Google's crawler. AI Scope audits for a new generation of systems: the LLM-based crawlers (GPTBot, ClaudeBot, PerplexityBot) that power ChatGPT, Claude, and Perplexity answers. Different bot rules, different content signals, different ranking factors. GEO (Generative Engine Optimization) is a separate discipline — and it's where search is heading.",
  },
];

export default function FoundersPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,229,255,0.35), transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
          >
            For Founders &amp; Indie Hackers
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight" style={{ color: "var(--c-text)" }}>
            Is ChatGPT sending your{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, var(--c-accent), var(--c-accent2))" }}
            >
              competitors
            </span>{" "}
            traffic instead of you?
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-8" style={{ color: "var(--c-muted)" }}>
            Find out exactly how AI systems see your startup — and what to fix to change it. Full AI visibility audit in under 60 seconds. Free forever.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={{ background: "var(--c-accent)", color: "#000" }}
            >
              Get My Free AI Score →
            </Link>
            <Link
              href="/pricing"
              className="px-7 py-3.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
            >
              See Pricing
            </Link>
          </div>
          <p className="text-xs mt-4 font-mono" style={{ color: "var(--c-muted)" }}>
            ✓ No credit card · ✓ 5 free scans/month · ✓ Results in under 60 seconds
          </p>
        </div>
      </section>

      {/* Problem section */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
              Three things working against you — right now
            </h2>
            <p className="text-lg" style={{ color: "var(--c-muted)" }}>
              Most founders have no idea these blockers exist. Most are fixable in under an hour.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PROBLEMS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border p-6"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: `${p.accent}14`, border: `1px solid ${p.accent}30` }}
                >
                  {p.icon}
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>{p.title}</h3>
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--c-text)" }}>
              Everything you get in one scan
            </h2>
            <p className="text-lg" style={{ color: "var(--c-muted)" }}>
              One URL in. Full AI visibility picture out.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border p-6"
                style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: `${f.accent}14`, border: `1px solid ${f.accent}30` }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>{f.title}</h3>
                </div>
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free plan emphasis */}
      <section className="py-20 px-6 border-t" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "var(--c-accent3)", background: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.2)" }}
          >
            Free Forever
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--c-text)" }}>
            Start for $0. Upgrade when you scale.
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--c-muted)" }}>
            The Starter plan gives you everything a founder needs to understand and fix their AI visibility baseline. No trial period. No credit card. Just sign up and scan.
          </p>
          <div className="rounded-2xl border p-6 text-left mb-8" style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}>
            <ul className="space-y-3">
              {[
                "5 full AI visibility audits per month",
                "Full 0–100 AI Visibility Score with letter grade",
                "14 AI bots checked per scan (GPTBot, ClaudeBot, PerplexityBot...)",
                "Structured data audit — robots.txt, llms.txt, schema markup",
                "Prioritised recommendations — highest-impact fixes listed first",
                "3 AI providers analysed in parallel (Gemini, ChatGPT, Perplexity)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--c-text)" }}>
                  <span style={{ color: "var(--c-accent3)", marginTop: 2 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--c-accent)", color: "#000" }}
          >
            Get My Free AI Score →
          </Link>
          <p className="text-xs mt-3" style={{ color: "var(--c-muted)" }}>No credit card. Takes 60 seconds.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-10 text-center" style={{ color: "var(--c-text)" }}>
            Founder questions, answered
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border p-6"
                style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}
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
