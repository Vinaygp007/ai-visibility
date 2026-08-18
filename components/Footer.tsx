"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { GeminiIcon, ChatGPTIcon, PerplexityIcon } from "./ProviderIcons";
import BetaBadge from "./BetaBadge";

const PROVIDERS = [
  { name: "Gemini", Icon: GeminiIcon, color: "#4285f4" },
  { name: "ChatGPT", Icon: ChatGPTIcon, color: "#10a37f" },
  { name: "Perplexity", Icon: PerplexityIcon, color: "#20b2aa" },
];

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/scan", label: "Run a Scan" },
];

const ACCOUNT_LINKS = [
  { href: "/signup", label: "Sign up" },
  { href: "/login", label: "Log in" },
];

const AUTHED_ACCOUNT_LINKS = [
  { href: "/scan", label: "Go to Scan" },
  { href: "/reports", label: "Previous Reports" },
  { href: "/credits", label: "Credit History" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const { authed } = useCurrentUser();
  const accountLinks = authed ? AUTHED_ACCOUNT_LINKS : ACCOUNT_LINKS;

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
              <img src="/logo-mark.webp" alt="AiScope" className="w-9 h-9 flex-shrink-0" />
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>AiScope</span>
                <BetaBadge />
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
                  className="flex items-center gap-1.5 text-[13px] font-mono px-3 py-1.5 rounded-full border"
                  style={{ color: p.color, background: `${p.color}12`, borderColor: `${p.color}35` }}
                >
                  <p.Icon size={18} className="shrink-0" />
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
              {accountLinks.map((link) => (
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
