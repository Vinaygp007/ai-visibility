"use client";

import { useState } from "react";
import Link from "next/link";

const TIERS = [
  {
    name: "Starter",
    price: "Free",
    annualPrice: "Free",
    per: "forever",
    annualPer: "forever",
    desc: "For founders and marketers validating their AI presence.",
    accent: "#00ff94",
    highlight: false,
    cta: "Get Started Free",
    href: "/signup",
    features: [
      { text: "5 scans / month", included: true },
      { text: "Full AI Visibility Score (0–100)", included: true },
      { text: "14 AI bots checked", included: true },
      { text: "3 AI providers (Gemini, ChatGPT, Perplexity)", included: true },
      { text: "Prioritised recommendations", included: true },
      { text: "Structured data audit (robots.txt, llms.txt, schema)", included: true },
      { text: "AI Citations Research", included: false },
      { text: "Bulk URL Scanner", included: false },
      { text: "CSV & PDF export", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Growth",
    price: "$29",
    annualPrice: "$24",
    per: "/ month",
    annualPer: "/ mo · billed $290/yr",
    desc: "For marketers and growth teams tracking multiple properties.",
    accent: "#00e5ff",
    highlight: true,
    badge: "Most Popular",
    cta: "Start Growth Plan",
    href: "/pricing",
    features: [
      { text: "100 scans / month", included: true },
      { text: "Everything in Starter", included: true },
      { text: "AI Citations Research", included: true },
      { text: "Bulk Scanner (up to 100 URLs)", included: true },
      { text: "CSV & PDF export", included: true },
      { text: "Reports dashboard & history", included: true },
      { text: "Prompt Runner (multi-prompt analysis)", included: true },
      { text: "Priority support", included: true },
      { text: "API access", included: false },
      { text: "White-label reports", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$79",
    annualPrice: "$66",
    per: "/ month",
    annualPer: "/ mo · billed $790/yr",
    desc: "For agencies and teams needing unlimited scale.",
    accent: "#7c6fff",
    highlight: false,
    cta: "Start Pro Plan",
    href: "/pricing",
    features: [
      { text: "Unlimited scans", included: true },
      { text: "Everything in Growth", included: true },
      { text: "Bulk Scanner (up to 500 URLs)", included: true },
      { text: "Full API access", included: true },
      { text: "White-label PDF reports", included: true },
      { text: "Word (DOCX) export", included: true },
      { text: "Custom prompt configuration", included: true },
      { text: "Dedicated support", included: true },
      { text: "Early access to new features", included: true },
      { text: "Usage analytics dashboard", included: true },
    ],
  },
];

export default function PricingCards() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const isAnnual = billing === "annual";

  return (
    <section className="px-6 pb-24">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-10">
        <button
          onClick={() => setBilling("monthly")}
          className="text-sm font-medium transition-colors"
          style={{ color: billing === "monthly" ? "var(--c-text)" : "var(--c-muted)" }}
        >
          Monthly
        </button>
        <div
          className="relative w-14 h-7 rounded-full cursor-pointer transition-colors"
          style={{ background: isAnnual ? "var(--c-accent)" : "var(--c-border-strong)" }}
          onClick={() => setBilling(isAnnual ? "monthly" : "annual")}
        >
          <div
            className="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ transform: isAnnual ? "translateX(32px)" : "translateX(4px)" }}
          />
        </div>
        <button
          onClick={() => setBilling("annual")}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: billing === "annual" ? "var(--c-text)" : "var(--c-muted)" }}
        >
          Annual
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(0,255,148,0.12)",
              color: "var(--c-accent3)",
              border: "1px solid rgba(0,255,148,0.25)",
            }}
          >
            SAVE 17%
          </span>
        </button>
      </div>

      {/* Tier cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {TIERS.map((tier) => {
          const displayPrice = isAnnual ? tier.annualPrice : tier.price;
          const displayPer = isAnnual ? tier.annualPer : tier.per;
          return (
            <div
              key={tier.name}
              className="rounded-2xl border p-5 sm:p-7 relative"
              style={{
                background: tier.highlight ? "var(--c-surface2)" : "var(--c-surface)",
                borderColor: tier.highlight ? `${tier.accent}50` : "var(--c-border)",
                boxShadow: tier.highlight ? `0 0 50px ${tier.accent}08` : "none",
              }}
            >
              {tier.badge && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-mono font-bold px-4 py-1 rounded-full"
                  style={{ background: tier.accent, color: "#000" }}
                >
                  {tier.badge}
                </div>
              )}

              <div className="mb-6">
                <div
                  className="text-[11px] font-mono font-bold uppercase tracking-widest mb-3"
                  style={{ color: tier.accent }}
                >
                  {tier.name}
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-bold" style={{ color: "var(--c-text)" }}>
                    {displayPrice}
                  </span>
                  <span className="text-sm" style={{ color: "var(--c-muted)" }}>
                    {displayPer}
                  </span>
                </div>
                {isAnnual && tier.name !== "Starter" && (
                  <div
                    className="text-[11px] font-mono mb-2"
                    style={{ color: "var(--c-accent3)" }}
                  >
                    ✓ 2 months free vs monthly
                  </div>
                )}
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                  {tier.desc}
                </p>
              </div>

              <Link
                href={tier.href}
                className="block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-85 active:scale-95 mb-6"
                style={
                  tier.highlight
                    ? { background: tier.accent, color: "#000" }
                    : { background: "transparent", color: "var(--c-text)", border: "1px solid var(--c-border-strong)" }
                }
              >
                {tier.cta}
              </Link>

              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li
                    key={f.text}
                    className="flex items-start gap-2.5 text-sm"
                    style={{ color: f.included ? "var(--c-text)" : "var(--c-muted)", opacity: f.included ? 1 : 0.5 }}
                  >
                    <span
                      style={{
                        color: f.included ? "var(--c-accent3)" : "var(--c-muted)",
                        fontSize: 13,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {f.included ? "✓" : "—"}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
