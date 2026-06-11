import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Bot List — All 14 AI Crawlers Checked by AI Scope",
  description:
    "Complete reference list of all AI crawlers and user agents checked by AI Scope: GPTBot, ClaudeBot, PerplexityBot, Googlebot-Extended, and 10 more. Learn how to allow or block each one.",
};

const BOTS = [
  {
    key: "GPTBot",
    label: "ChatGPT",
    company: "OpenAI",
    product: "ChatGPT & ChatGPT Search",
    importance: "Critical",
    importanceColor: "#ff5a5a",
    description: "OpenAI's primary web crawler, used to train GPT models and power ChatGPT's browsing and search features. Blocking this bot prevents your content from appearing in ChatGPT answers.",
  },
  {
    key: "OAI-SearchBot",
    label: "ChatGPT Search",
    company: "OpenAI",
    product: "ChatGPT Search",
    importance: "Critical",
    importanceColor: "#ff5a5a",
    description: "Used specifically for ChatGPT Search (web search integration). Separate from GPTBot — some sites block one but not the other accidentally.",
  },
  {
    key: "ClaudeBot",
    label: "Claude",
    company: "Anthropic",
    product: "Claude AI",
    importance: "Critical",
    importanceColor: "#ff5a5a",
    description: "Anthropic's web crawler for Claude AI training and retrieval. Claude is one of the most widely used AI assistants for research and business queries.",
  },
  {
    key: "anthropic-ai",
    label: "Claude (alt)",
    company: "Anthropic",
    product: "Claude AI",
    importance: "High",
    importanceColor: "#ffb830",
    description: "Alternate Anthropic user agent string. Some servers use this identifier instead of ClaudeBot. Blocking anthropic-ai can silently prevent Claude from accessing your content.",
  },
  {
    key: "PerplexityBot",
    label: "Perplexity AI",
    company: "Perplexity",
    product: "Perplexity Search",
    importance: "Critical",
    importanceColor: "#ff5a5a",
    description: "Perplexity's web crawler powers their AI-native search engine. Perplexity is known for heavily citing sources in answers — being crawlable means getting cited.",
  },
  {
    key: "Googlebot-Extended",
    label: "Gemini / AI Overviews",
    company: "Google",
    product: "Gemini & Google AI Overviews",
    importance: "Critical",
    importanceColor: "#ff5a5a",
    description: "Google's extended crawler used for AI Overviews and Gemini training. Separate from the standard Googlebot. Sites can allow normal Google search while blocking Gemini-specific indexing.",
  },
  {
    key: "meta-externalagent",
    label: "Meta AI",
    company: "Meta",
    product: "Meta AI Assistant",
    importance: "High",
    importanceColor: "#ffb830",
    description: "Meta's web crawler for their AI products including Meta AI on WhatsApp, Instagram, and Facebook. Growing in reach as Meta expands AI integration across its platforms.",
  },
  {
    key: "cohere-ai",
    label: "Cohere",
    company: "Cohere",
    product: "Cohere Command & Retrieval",
    importance: "Medium",
    importanceColor: "#00e5ff",
    description: "Cohere's crawler powers enterprise AI search and RAG (Retrieval-Augmented Generation) pipelines. Used heavily by B2B tools and enterprise software.",
  },
  {
    key: "Bytespider",
    label: "ByteDance AI",
    company: "ByteDance",
    product: "Doubao & TikTok AI",
    importance: "Medium",
    importanceColor: "#00e5ff",
    description: "ByteDance's web crawler, used for AI products including Doubao (China's leading AI assistant) and AI features in TikTok. Significant reach in Asian markets.",
  },
  {
    key: "CCBot",
    label: "Common Crawl",
    company: "CommonCrawl",
    product: "AI Training Datasets",
    importance: "Medium",
    importanceColor: "#00e5ff",
    description: "Common Crawl builds the open web dataset used to train most major AI models including GPT, Llama, and Mistral. Allowing CCBot contributes your content to the foundational AI training corpus.",
  },
  {
    key: "Amazonbot",
    label: "Amazon AI",
    company: "Amazon",
    product: "Alexa & Amazon Rufus",
    importance: "Medium",
    importanceColor: "#00e5ff",
    description: "Amazon's web crawler for AI products including Alexa voice assistant and Amazon Rufus (shopping AI). Important for e-commerce and consumer-facing brands.",
  },
  {
    key: "YouBot",
    label: "You.com AI",
    company: "You.com",
    product: "You.com AI Search",
    importance: "Low",
    importanceColor: "#8b8d9e",
    description: "You.com's AI-native search engine crawler. You.com directly competes with Perplexity in the AI search space, with a developer-friendly user base.",
  },
  {
    key: "Applebot-Extended",
    label: "Apple AI",
    company: "Apple",
    product: "Apple Intelligence & Siri",
    importance: "High",
    importanceColor: "#ffb830",
    description: "Apple's extended crawler for Apple Intelligence features. With Apple Intelligence rolling out across iOS and macOS devices, this bot's reach is growing rapidly among premium consumer devices.",
  },
  {
    key: "DuckAssistBot",
    label: "DuckDuckGo AI",
    company: "DuckDuckGo",
    product: "DuckAssist AI Answers",
    importance: "Low",
    importanceColor: "#8b8d9e",
    description: "DuckDuckGo's AI crawler for DuckAssist, their AI answer layer in DuckDuckGo Search. Popular with privacy-conscious users who distrust Google.",
  },
];

const IMPORTANCE_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const SORTED_BOTS = [...BOTS].sort((a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]);

export default function AiBotListPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-14 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ background: "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(0,229,255,0.4), transparent 70%)" }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
          >
            Free Reference
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
            The complete AI bot list
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-6" style={{ color: "var(--c-muted)" }}>
            Every AI crawler and user agent checked by AI Scope — with user agent strings, parent companies, and what each bot powers.
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--c-accent3)" }}>
            14 AI bots · Updated May 2025 · Used in every AI Scope audit
          </p>
        </div>
      </section>

      {/* Quick check CTA */}
      <section className="py-8 px-6 border-t border-b" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>Want to check which bots can access your site?</p>
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>Use the free robots.txt checker or run a full AI visibility audit.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href="/tools/robots-txt-ai-checker"
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
            >
              Check robots.txt →
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-85"
              style={{ background: "var(--c-accent)", color: "#000" }}
            >
              Full Audit →
            </Link>
          </div>
        </div>
      </section>

      {/* Bot table */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { stat: "4", label: "Critical bots", color: "#ff5a5a" },
              { stat: "3", label: "High priority bots", color: "#ffb830" },
              { stat: "4", label: "Medium priority bots", color: "#00e5ff" },
              { stat: "3", label: "Lower priority bots", color: "#8b8d9e" },
            ].map(({ stat, label, color }) => (
              <div
                key={label}
                className="rounded-2xl border p-4 text-center"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <div className="text-2xl font-bold mb-0.5" style={{ color }}>{stat}</div>
                <div className="text-xs" style={{ color: "var(--c-muted)" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Bot cards */}
          <div className="space-y-3">
            {SORTED_BOTS.map((bot) => (
              <div
                key={bot.key}
                className="rounded-2xl border p-5 sm:p-6"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
              >
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-base font-bold" style={{ color: "var(--c-text)" }}>{bot.label}</span>
                      <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>· {bot.company}</span>
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${bot.importanceColor}14`,
                          color: bot.importanceColor,
                          border: `1px solid ${bot.importanceColor}30`,
                        }}
                      >
                        {bot.importance}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div className="text-xs font-mono" style={{ color: "var(--c-accent)" }}>
                        User-Agent: {bot.key}
                      </div>
                      <div className="text-xs" style={{ color: "var(--c-muted)" }}>
                        Powers: {bot.product}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>{bot.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* robots.txt guide */}
      <section className="py-16 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--c-text)" }}>How to allow or block AI bots in robots.txt</h2>
          <div className="space-y-4">
            <div className="rounded-2xl border p-5" style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}>
              <p className="text-xs font-mono font-bold mb-2" style={{ color: "var(--c-accent3)" }}>✓ Allow all AI bots (recommended)</p>
              <pre className="text-xs font-mono overflow-x-auto" style={{ color: "var(--c-text)" }}>{`# Allow all crawlers by default
User-agent: *
Allow: /`}</pre>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}>
              <p className="text-xs font-mono font-bold mb-2" style={{ color: "#ffb830" }}>⚠ Block a specific AI bot</p>
              <pre className="text-xs font-mono overflow-x-auto" style={{ color: "var(--c-text)" }}>{`# Block only GPTBot (OpenAI)
User-agent: GPTBot
Disallow: /

# All other crawlers still allowed
User-agent: *
Allow: /`}</pre>
            </div>
            <div className="rounded-2xl border p-5" style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}>
              <p className="text-xs font-mono font-bold mb-2" style={{ color: "#ff5a5a" }}>✗ Accidental global block (blocks everyone)</p>
              <pre className="text-xs font-mono overflow-x-auto" style={{ color: "var(--c-text)" }}>{`# This blocks ALL crawlers including all AI bots
User-agent: *
Disallow: /`}</pre>
            </div>
          </div>
          <p className="text-sm mt-5" style={{ color: "var(--c-muted)" }}>
            Use the{" "}
            <Link href="/tools/robots-txt-ai-checker" style={{ color: "var(--c-accent)" }}>
              free robots.txt checker
            </Link>{" "}
            to instantly see which AI bots your current robots.txt allows or blocks.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t text-center" style={{ borderColor: "var(--c-border)" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--c-text)" }}>Check all 14 bots against your site</h2>
          <p className="text-base mb-6" style={{ color: "var(--c-muted)" }}>
            Run a full AI visibility audit and see exactly which bots can access your site — with explanations and fix recommendations.
          </p>
          <Link
            href="/"
            className="inline-block px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--c-accent)", color: "#000" }}
          >
            Run Free Audit →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
