import Link from "next/link";

const PROVIDERS = [
  { name: "Gemini", color: "#4285f4" },
  { name: "ChatGPT", color: "#10a37f" },
  { name: "Perplexity", color: "#20b2aa" },
];

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "/scan", label: "Run a Scan" },
];

const ACCOUNT_LINKS = [
  { href: "/waitlist", label: "Join Waitlist" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Have an invite? Sign up" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden border-t"
      style={{ borderColor: "rgba(var(--overlay-rgb),0.07)", background: "var(--surface)" }}
    >
      {/* Faint aurora echo, same treatment as the hero but much dimmer */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="aurora-blob aurora-blob-1"
          style={{ width: 360, height: 360, bottom: -180, left: "10%", background: "var(--accent)", opacity: 0.06 }}
        />
        <div
          className="aurora-blob aurora-blob-2"
          style={{ width: 320, height: 320, bottom: -160, right: "12%", background: "var(--accent2)", opacity: 0.05 }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 pr-6">
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
              >
                🔭
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>AiScope</span>
                <span className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>By Marcstrat</span>
              </div>
            </Link>
            <p className="text-[13.5px] leading-relaxed max-w-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Audit how ChatGPT, Claude, Perplexity, Gemini and 10+ other AI systems discover, crawl and reference your website.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {PROVIDERS.map((p) => (
                <span
                  key={p.name}
                  className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border"
                  style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Product column */}
          <div>
            <div className="text-[11px] font-mono tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
              PRODUCT
            </div>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13.5px] transition-colors hover:text-[var(--text)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account column */}
          <div>
            <div className="text-[11px] font-mono tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
              ACCOUNT
            </div>
            <ul className="space-y-3">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] transition-colors hover:text-[var(--text)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t text-[12.5px]"
          style={{ borderColor: "rgba(var(--overlay-rgb),0.07)", color: "var(--text-dim)" }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4 text-center sm:text-left">
            <span>© {year} Marcstrat. All rights reserved.</span>
            <span className="hidden sm:inline" style={{ color: "rgba(var(--overlay-rgb),0.2)" }}>·</span>
            <span>Powered by Gemini · ChatGPT · Perplexity</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-[var(--text)]">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-[var(--text)]">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
