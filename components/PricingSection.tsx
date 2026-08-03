"use client";

import { useState } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useCurrentUser } from "@/lib/useCurrentUser";

const PLANS = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    desc: "Try it out, no card required.",
    features: ["20 credits, one-time", "Gemini, ChatGPT & Perplexity", "Watermarked PDF export"],
    highlight: false,
  },
  {
    name: "Starter",
    monthly: 19,
    annual: 190,
    desc: "For freelancers and solo operators.",
    features: ["400 credits/mo", "All 3 active AI models", "10-URL bulk scanning"],
    highlight: false,
  },
  {
    name: "Growth",
    monthly: 49,
    annual: 490,
    desc: "For growing teams and regular audits.",
    features: ["1,500 credits/mo", "All 3 active AI models", "50-URL bulk scanning", "30-day report history"],
    highlight: true,
  },
  {
    name: "Agency",
    monthly: 99,
    annual: 990,
    desc: "For agencies running client reports.",
    features: ["4,000 credits/mo", "White-label PDF export", "500-URL bulk + 100 prompts", "Unlimited history"],
    highlight: false,
  },
  {
    name: "Scale",
    monthly: 249,
    annual: 2490,
    desc: "For heavy bulk usage and full provider access.",
    features: ["8,500 credits/mo", "All 7 AI models", "500-URL bulk + 100 prompts", "Unlimited history"],
    highlight: false,
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);
  // No billing/upgrade flow exists yet, so an already-signed-in visitor
  // gets sent back into the app instead of signup for every plan.
  const { authed } = useCurrentUser();

  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-10">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          // PRICING
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--text)]">
          Simple, usage-based pricing
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Sign up free and lock in early beta pricing.
        </p>
      </Reveal>

      <div className="flex justify-center items-center gap-3 mb-10">
        <span
          className="text-[13px] font-medium"
          style={{ color: yearly ? "var(--text-muted)" : "var(--text)" }}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly((v) => !v)}
          className="relative w-11 h-6 rounded-full transition-colors duration-200"
          style={{ background: yearly ? "var(--accent)" : "rgba(var(--overlay-rgb),0.15)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
            style={{ transform: yearly ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
        <span
          className="text-[13px] font-medium"
          style={{ color: yearly ? "var(--text)" : "var(--text-muted)" }}
        >
          Yearly
        </span>
        <span
          className="text-[10px] font-mono px-2 py-1 rounded-full border tracking-wide"
          style={{ color: "var(--success)", background: "rgba(0,229,255,0.05)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          save ~17%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {PLANS.map((plan, i) => {
          const isFree = plan.monthly === 0;
          const displayPrice = isFree ? 0 : yearly ? Math.round(plan.annual / 12) : plan.monthly;
          const sub = isFree
            ? null
            : yearly
            ? `$${plan.annual.toLocaleString()} billed yearly`
            : `or $${plan.annual.toLocaleString()}/yr`;

          return (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className="relative rounded-2xl border p-6 flex flex-col h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                style={{
                  background: plan.highlight ? "rgba(0,229,255,0.05)" : "rgba(var(--overlay-rgb),0.03)",
                  borderColor: plan.highlight ? "rgba(0,229,255,0.35)" : "rgba(var(--overlay-rgb),0.08)",
                }}
              >
                {plan.highlight && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono px-3 py-1 rounded-full border tracking-wide"
                    style={{ color: "var(--accent)", background: "var(--bg)", borderColor: "rgba(0,229,255,0.4)" }}
                  >
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-[15px] font-semibold mb-1 text-[var(--text)]">{plan.name}</h3>
                <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>{plan.desc}</p>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-[var(--text)]">${displayPrice}</span>
                  {!isFree && (
                    <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>/mo</span>
                  )}
                </div>
                {sub ? (
                  <p className="text-[11px] font-mono mb-5" style={{ color: "var(--text-dim)" }}>{sub}</p>
                ) : (
                  <div className="mb-5" />
                )}

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text)" }}>
                      <span style={{ color: "var(--success)" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={authed ? "/scan" : "/signup"}
                  className="text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={
                    plan.highlight
                      ? { background: "var(--accent)", color: "var(--on-accent)" }
                      : { background: "transparent", color: "var(--text)", border: "1px solid rgba(var(--overlay-rgb),0.13)" }
                  }
                >
                  {authed ? "Go to Scan" : "Sign Up"}
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>

      <p className="text-center text-[12px] mt-8" style={{ color: "var(--text-dim)" }}>
        Need more? Add extra credits any time for $10 / 500 credits, no expiry.
      </p>
    </section>
  );
}
