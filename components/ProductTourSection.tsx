"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import {
  Bot, Tags, MessageSquareQuote, Zap, MessagesSquare, FileBarChart2, Users2,
  ArrowRight, type LucideIcon,
} from "lucide-react";
import { ICON_GRADIENT, ICON_GRADIENT_FALLBACK } from "@/lib/iconGradient";
import { useEffect, useState } from "react";
import { getCurrentTheme, THEME_CHANGE_EVENT, type Theme } from "@/lib/theme";

interface TourCategory {
  key: string;
  label: string;
  Icon: LucideIcon;
  desc: string;
  links: { label: string; href: string }[];
  path: string;
  image: { light: string; dark: string };
}

const CATEGORIES: TourCategory[] = [
  {
    key: "crawlers",
    label: "AI Crawler Access",
    Icon: Bot,
    desc: "See exactly which of the 14 AI bots we check — GPTBot, ClaudeBot, PerplexityBot, Google-Extended and more — can actually reach your pages.",
    links: [
      { label: "Run a crawler check", href: "/scan" },
    ],
    path: "aiscope.app/scan · crawler access",
    image: { light: "/real-data/crawler-light.webp", dark: "/real-data/crawler-dark.webp" },
  },
  {
    key: "structured-data",
    label: "Structured Data & llms.txt",
    Icon: Tags,
    desc: "Audit your schema.org markup and llms.txt file so AI systems can correctly parse who you are, what you sell, and what to cite.",
    links: [
      { label: "Audit your markup", href: "/scan" },
      { label: "Read the docs", href: "/docs" },
    ],
    path: "aiscope.app/scan · structured data",
    image: { light: "/real-data/structured-light.webp", dark: "/real-data/structured-dark.webp" },
  },
  {
    key: "citations",
    label: "AI Citation Tracking",
    Icon: MessageSquareQuote,
    desc: "Ask the exact buyer-intent questions your customers ask, and see which sources ChatGPT, Gemini and Perplexity actually cite back — you or your competitors.",
    links: [
      { label: "Track your citations", href: "/bulk-prompt" },
      { label: "How scoring works", href: "/#features" },
    ],
    path: "aiscope.app/bulk-prompt · citations",
    image: { light: "/real-data/citation-light.webp", dark: "/real-data/citation-dark.webp" },
  },
  {
    key: "bulk-scanner",
    label: "Bulk Scanner",
    Icon: Zap,
    desc: "Paste a list of URLs or upload a .txt / .csv file. Every site is scanned in parallel and results stream in as each one finishes. Built for auditing an entire client list in one pass instead of one scan at a time.",
    links: [
      { label: "Bulk scan URLs", href: "/bulk" },
      { label: "See plans", href: "/#pricing" },
    ],
    path: "aiscope.app/bulk · up to 500 sites",
    image: { light: "/real-data/bulk-light.webp", dark: "/real-data/bulk-dark.webp" },
  },
  {
    key: "bulk-prompt",
    label: "Bulk Prompt Runner",
    Icon: MessagesSquare,
    desc: "Run the exact buyer-intent questions your customers ask AI, like \"best CRM for startups\" or \"top project management tools for remote teams,\" across Gemini, ChatGPT and Perplexity at once, and see whether you're the answer they get back.",
    links: [
      { label: "Bulk prompt runner", href: "/bulk-prompt" },
      { label: "See plans", href: "/#pricing" },
    ],
    path: "aiscope.app/bulk-prompt · up to 100 prompts",
    image: { light: "/real-data/prompt-light.webp", dark: "/real-data/prompt-dark.webp" },
  },
  {
    key: "reports",
    label: "Reports & Exports",
    Icon: FileBarChart2,
    desc: "Every scan is saved to your dashboard. Export polished PDF or CSV reports, white-labeled on Agency and Scale plans, ready to hand to a client.",
    links: [
      { label: "View your reports", href: "/reports" },
      { label: "See plans", href: "/#pricing" },
    ],
    path: "aiscope.app/reports",
    image: { light: "/real-data/report-light.webp", dark: "/real-data/report-dark.webp" },
  },
  {
    key: "agency",
    label: "Agency & Team Tools",
    Icon: Users2,
    desc: "Share credits across a team, earn bonus scans through referrals, and hand off fully white-labeled reports with no AiScope branding on Agency and Scale plans.",
    links: [
      { label: "Referrals & credits", href: "/referrals" },
      { label: "Compare plans", href: "/#pricing" },
    ],
    path: "aiscope.app/referrals",
    image: { light: "/real-data/referal-light.webp", dark: "/real-data/referal-dark.webp" },
  },
];

export default function ProductTourSection() {
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key);
  const active = CATEGORIES.find((c) => c.key === activeKey) ?? CATEGORIES[0];
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(getCurrentTheme());
    const onThemeChange = () => setTheme(getCurrentTheme());
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  const renderVisual = (cat: TourCategory) => (
    <div
      className="rounded-2xl border relative mx-auto"
      style={{
        background: "var(--surface)",
        borderColor: "rgba(var(--overlay-rgb),0.08)",
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.35)",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      <div className="flex items-center gap-1.5 px-5 pt-4 pb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        <div
          className="flex-1 ml-2 rounded-lg px-3 py-1 text-[11px] font-mono truncate"
          style={{ background: "rgba(var(--overlay-rgb),0.05)", color: "var(--text-dim)" }}
        >
          {cat.path}
        </div>
      </div>

      <div className="p-3">
        {theme && (
          <img
            src={cat.image[theme]}
            alt={`${cat.label} — real scan data`}
            className="block rounded-lg"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        )}
      </div>
    </div>
  );

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-14">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          // THE PLATFORM
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text)" }}>
          One dashboard, built for search and AI
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Every tool you need to see how AI systems find, read and cite your site, in one place.
        </p>
      </Reveal>

      <Reveal>
        <div className="grid lg:grid-cols-[300px_1fr] gap-3 lg:gap-8 items-start">
          {/* Category nav */}
          <div className="flex flex-col gap-1 min-w-0">
            {CATEGORIES.map((cat) => {
              const isActive = cat.key === activeKey;
              return (
                <div key={cat.key} className="min-w-0">
                  <button
                    onClick={() => setActiveKey(cat.key)}
                    className="text-left rounded-xl transition-all duration-200 w-full"
                    style={{
                      padding: isActive ? "14px 16px" : "11px 16px",
                      background: isActive ? "rgba(var(--overlay-rgb),0.04)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <cat.Icon
                        size={16}
                        color={isActive ? ICON_GRADIENT : undefined}
                        style={{ color: isActive ? ICON_GRADIENT_FALLBACK : "var(--text-dim)", flexShrink: 0 }}
                      />
                      <span
                        className="text-[14px] font-medium"
                        style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}
                      >
                        {cat.label}
                      </span>
                    </div>

                    {isActive && (
                      <div className="mt-3 pl-[26px]">
                        <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                          {cat.desc}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {cat.links.map((l) => (
                            <Link
                              key={l.label}
                              href={l.href}
                              className="group inline-flex items-center gap-1 text-[13px] font-medium w-fit"
                              style={{ color: "var(--accent)" }}
                            >
                              {l.label}
                              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>

                  {isActive && (
                    <div className="mt-4 lg:hidden animate-fade-up">
                      {renderVisual(cat)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visual — desktop only, pinned in the second grid column */}
          <div key={active.key} className="hidden lg:block animate-fade-up relative" style={{ minHeight: 420 }}>
            {renderVisual(active)}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
