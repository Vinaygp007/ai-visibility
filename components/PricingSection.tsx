import Link from "next/link";
import Reveal from "@/components/Reveal";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    desc: "Try it out, no card required.",
    features: ["3 scans/day", "1 AI model (Gemini)", "Watermarked PDF export"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    sub: "or $190/yr",
    desc: "For freelancers and solo operators.",
    features: ["Unlimited scans", "All 3 AI models", "50-URL bulk scanning", "30-day report history"],
    highlight: true,
  },
  {
    name: "Agency",
    price: "$79",
    period: "/mo",
    sub: "or $790/yr",
    desc: "For agencies running client reports.",
    features: ["Everything in Pro", "White-label PDF export", "500-URL bulk scanning", "5 team seats", "API access", "Unlimited history"],
    highlight: false,
  },
  {
    name: "Lifetime",
    price: "$89",
    period: "one-time",
    desc: "Launch offer, limited time.",
    features: ["All Pro features", "No recurring billing", "Early-adopter pricing, locked in"],
    highlight: false,
    badge: "Launch only",
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-14">
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
          Currently invite-only during beta — join the waitlist to lock in early pricing.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((plan, i) => (
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
            {plan.badge && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono px-3 py-1 rounded-full border tracking-wide"
                style={{ color: "var(--warning)", background: "var(--bg)", borderColor: "rgba(255,184,48,0.4)" }}
              >
                {plan.badge}
              </span>
            )}

            <h3 className="text-[15px] font-semibold mb-1 text-[var(--text)]">{plan.name}</h3>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-muted)" }}>{plan.desc}</p>

            <div className="mb-1">
              <span className="text-3xl font-bold text-[var(--text)]">{plan.price}</span>
              {plan.period && (
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
              )}
            </div>
            {plan.sub && (
              <p className="text-[11px] font-mono mb-5" style={{ color: "var(--text-dim)" }}>{plan.sub}</p>
            )}
            {!plan.sub && <div className="mb-5" />}

            <ul className="space-y-2.5 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text)" }}>
                  <span style={{ color: "var(--success)" }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/waitlist"
              className="text-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={
                plan.highlight
                  ? { background: "var(--accent)", color: "var(--on-accent)" }
                  : { background: "transparent", color: "var(--text)", border: "1px solid rgba(var(--overlay-rgb),0.13)" }
              }
            >
              Join Waitlist
            </Link>
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
