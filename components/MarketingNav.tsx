"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/useCurrentUser";
import ThemeToggle from "./ThemeToggle";

const MARKETING_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

// Account-related links, tucked under the user menu.
const ACCOUNT_LINKS = [
  { href: "/reports", label: "Previous Reports" },
  { href: "/credits", label: "Credit History" },
  { href: "/referrals", label: "Referrals" },
];

const ADMIN_LINK = { href: "/admin/providers", label: "Settings" };

function UserMenu({
  name,
  links,
  onLogout,
}: {
  name: string;
  links: { href: string; label: string }[];
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors"
        style={{ color: "var(--text)", background: open ? "rgba(var(--overlay-rgb),0.06)" : "transparent" }}
      >
        {name}
        <span style={{ color: "var(--text-muted)", fontSize: 10, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl border overflow-hidden z-50 min-w-[200px]"
          style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--overlay-rgb),0.04)]"
              style={{ color: "var(--text)" }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--overlay-rgb),0.04)] border-t"
            style={{ color: "var(--text-muted)", borderColor: "rgba(var(--overlay-rgb),0.06)" }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function MarketingNav() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Nav content depends on auth state, which isn't known until /api/me
  // resolves — keep it invisible (but laid out) until then instead of
  // flashing the logged-out marketing links on an authenticated page.
  const { user, authed, checked: authChecked } = useCurrentUser();
  const balance = user?.creditBalance ?? null;
  const fullName = user?.fullName ?? null;
  const email = user?.email ?? null;
  const role = user?.role ?? null;

  useEffect(() => {
    const sections = MARKETING_LINKS.map((link) => document.getElementById(link.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    // Slim band centered a bit above mid-viewport: whichever section's
    // heading crosses that band is treated as "current" while scrolling.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName = fullName || email?.split("@")[0] || "Account";
  const accountLinks = role === "admin" ? [...ACCOUNT_LINKS, ADMIN_LINK] : ACCOUNT_LINKS;

  return (
    <nav
      className="sticky top-0 z-50 border-b px-4 sm:px-8 py-4"
      style={{
        borderColor: "rgba(var(--overlay-rgb),0.07)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-10 lg:gap-14 min-w-0">
      <Link href="/" className="flex items-center gap-3 flex-shrink-0">
        <img src="/logo-mark.png" alt="AiScope" className="w-8 h-8 flex-shrink-0" />
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight text-[var(--text)]">AiScope</span>
          <span className="text-[15px] font-bold hidden sm:inline" style={{ color: "var(--text-muted)" }}>By Marcstrat</span>
        </div>
      </Link>

      <div
        className="hidden md:flex items-center gap-8 transition-opacity duration-200"
        style={{ opacity: authChecked ? 1 : 0 }}
      >
        {MARKETING_LINKS.map((link) => {
          const isActive = activeId === link.href.slice(1);
          return (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium transition-colors hover:text-[var(--text)]"
              style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
            >
              {link.label}
            </a>
          );
        })}
      </div>
      </div>

      <div
        className="hidden md:flex items-center gap-3 transition-opacity duration-200"
        style={{ opacity: authChecked ? 1 : 0 }}
      >
        {authed ? (
          <>
            {balance !== null && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono font-bold"
                style={{ color: "var(--accent)", background: "rgba(0,229,255,0.08)" }}
              >
                <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>Credits</span>
                {balance}
              </span>
            )}
            <UserMenu name={displayName} links={accountLinks} onLogout={handleLogout} />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-[14px] font-medium px-3 py-2 transition-colors hover:text-[var(--text)]"
              style={{ color: "var(--text-muted)" }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-all hover:opacity-85 active:scale-95"
              style={{ background: "var(--accent)" }}
            >
              Sign Up
            </Link>
          </>
        )}
        <ThemeToggle />
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
      </div>

      {mobileOpen && (
        <div
          className="absolute top-full left-0 right-0 md:hidden border-b px-6 py-6 flex flex-col gap-4"
          style={{ background: "var(--bg)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
        >
          {authed ? (
            <>
              {MARKETING_LINKS.map((link) => {
                const isActive = activeId === link.href.slice(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-medium"
                    style={{ color: isActive ? "var(--accent)" : "var(--text)" }}
                  >
                    {link.label}
                  </a>
                );
              })}
              <div className="h-px" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />
              <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                {displayName}
              </span>
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[15px] font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {link.label}
                </Link>
              ))}
              {balance !== null && (
                <div
                  className="px-3 py-2 rounded-lg text-[12px] font-mono flex items-center justify-between"
                  style={{ background: "rgba(0,229,255,0.06)", color: "var(--accent)" }}
                >
                  <span style={{ color: "var(--text-dim)" }}>Credits</span>
                  <span className="font-bold">{balance}</span>
                </div>
              )}
              <button onClick={handleLogout} className="text-[15px] font-medium text-left" style={{ color: "var(--text)" }}>
                Log out
              </button>
              <div className="flex justify-end">
                <ThemeToggle />
              </div>
            </>
          ) : (
            <>
              {MARKETING_LINKS.map((link) => {
                const isActive = activeId === link.href.slice(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-medium"
                    style={{ color: isActive ? "var(--accent)" : "var(--text)" }}
                  >
                    {link.label}
                  </a>
                );
              })}
              <div className="h-px" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-[var(--on-accent)] text-center"
                style={{ background: "var(--accent)" }}
              >
                Sign Up
              </Link>
              <div className="flex justify-end">
                <ThemeToggle />
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
