"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="flex items-center justify-between px-4 sm:px-8 py-4 border-b sticky top-0 z-50"
      style={{
        borderColor: "rgba(var(--overlay-rgb),0.07)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Link href="/" className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
        >
          🔭
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight text-[var(--text)]">AiScope</span>
          <span className="text-[15px] font-bold hidden sm:inline" style={{ color: "var(--text-muted)" }}>By Marcstrat</span>
        </div>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-[14px] font-medium transition-colors hover:text-[var(--text)]"
            style={{ color: "var(--text-muted)" }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/login"
          className="text-[14px] font-medium px-3 py-2 transition-colors hover:text-[var(--text)]"
          style={{ color: "var(--text-muted)" }}
        >
          Log in
        </Link>
        <Link
          href="/waitlist"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-all hover:opacity-85 active:scale-95"
          style={{ background: "var(--accent)" }}
        >
          Join Waitlist
        </Link>
      </div>

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden flex flex-col gap-[5px] p-2 rounded-lg"
        style={{ background: "rgba(var(--overlay-rgb),0.06)", border: "1px solid rgba(var(--overlay-rgb),0.1)" }}
        aria-label="Toggle menu"
      >
        <span className="block w-5 h-0.5 bg-[var(--text)]" />
        <span className="block w-5 h-0.5 bg-[var(--text)]" />
        <span className="block w-5 h-0.5 bg-[var(--text)]" />
      </button>

      {mobileOpen && (
        <div
          className="absolute top-full left-0 right-0 md:hidden border-b px-6 py-6 flex flex-col gap-4"
          style={{ background: "var(--bg)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium"
              style={{ color: "var(--text)" }}
            >
              {link.label}
            </a>
          ))}
          <div className="h-px" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />
          <div className="flex items-center justify-between">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
              Log in
            </Link>
            <ThemeToggle />
          </div>
          <Link
            href="/waitlist"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-[var(--on-accent)] text-center"
            style={{ background: "var(--accent)" }}
          >
            Join Waitlist
          </Link>
        </div>
      )}
    </nav>
  );
}
