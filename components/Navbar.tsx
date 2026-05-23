"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";

const NAV_LINKS = [
  { href: "/features",    label: "Features",      onlyOn: null },
  { href: "/pricing",     label: "Pricing",       onlyOn: null },
  { href: "/blog",        label: "Blog",          onlyOn: null },
  { href: "/bulk",        label: "Bulk Scan",     onlyOn: null },
  { href: "/bulk-prompt", label: "Prompt Runner", onlyOn: null },
  { href: "/contact",     label: "Contact",       onlyOn: null },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((data) => { if (data.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  const isLanding = pathname === "/";

  const displayName = user?.displayName || user?.email?.split("@")[0] || "";
  const initials = displayName ? displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "";

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  return (
    <>
      <nav
        className="flex items-center justify-between px-6 sm:px-10 py-4 border-b sticky top-0 z-50"
        style={{
          borderColor: "var(--c-border)",
          background: "var(--c-nav-bg)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #7c6fff, #00e5ff)", color: "#fff" }}
          >
            AI
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold tracking-tight" style={{ color: "var(--c-text)" }}>
              AI Scope
            </span>
            <span className="hidden sm:inline text-[12px] font-medium" style={{ color: "var(--c-muted)" }}>
              by Marcstrat
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          {isLanding ? (
            /* Landing page: marketing links */
            <>
              {[
                { href: "/features",    label: "Features"      },
                { href: "/pricing",     label: "Pricing"       },
                { href: "/blog",        label: "Blog"          },
                { href: "/bulk",        label: "Bulk Scan"     },
                { href: "/bulk-prompt", label: "Prompt Runner" },
                { href: "/contact",     label: "Contact"       },
              ].map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                    style={{
                      color: active ? "var(--c-text)" : "var(--c-muted)",
                      background: active ? "var(--c-surface2)" : "transparent",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </>
          ) : (
            /* App pages: tool navigation */
            <>
              {NAV_LINKS.filter(l => l.onlyOn === null || l.onlyOn === pathname).map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      color: active ? "var(--c-accent)" : "var(--c-muted)",
                      background: active ? "rgba(0,229,255,0.08)" : "transparent",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:opacity-80"
            style={{
              background: "var(--c-surface)",
              borderColor: "var(--c-border-strong)",
              color: "var(--c-muted)",
            }}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Auth: user avatar OR sign-in */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all hover:opacity-80"
                style={{ background: "var(--c-surface)", borderColor: "var(--c-border-strong)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "linear-gradient(135deg, #7c6fff, #00e5ff)", color: "#fff" }}
                >
                  {initials || "?"}
                </div>
                <span className="hidden sm:inline text-xs font-medium" style={{ color: "var(--c-text)" }}>
                  {displayName.split(" ")[0] || "Account"}
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: "var(--c-muted)" }}>
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-xl z-50 overflow-hidden"
                  style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--c-border)" }}>
                    <div className="text-xs font-semibold truncate" style={{ color: "var(--c-text)" }}>{displayName}</div>
                    <div className="text-[11px] truncate" style={{ color: "var(--c-muted)" }}>{user.email}</div>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
                      style={{ color: "var(--c-text)" }}
                    >
                      🏠 Dashboard
                    </Link>
                    <Link
                      href="/reports"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
                      style={{ color: "var(--c-text)" }}
                    >
                      📋 My Reports
                    </Link>
                    <div className="h-px my-1" style={{ background: "var(--c-border)" }} />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80 text-left"
                      style={{ color: "var(--c-error)" }}
                    >
                      ↪ Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isAdmin ? (
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border-strong)" }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg, #7c6fff, #4285f4)", color: "#fff" }}
              >
                🛡️
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--c-accent2)" }}>
                Admin
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:flex items-center px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
                style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)", background: "var(--c-surface)" }}
              >
                Sign In
              </Link>
              {isLanding && (
                <a
                  href="#hero-tool"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
                  style={{ background: "var(--c-accent)", color: "#000" }}
                >
                  Try Free →
                </a>
              )}
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl border"
            style={{
              background: "var(--c-surface)",
              borderColor: "var(--c-border-strong)",
            }}
            aria-label="Open navigation"
          >
            <span className="block w-4 h-0.5 transition-all" style={{ background: "var(--c-text)" }} />
            <span className="block w-4 h-0.5 transition-all" style={{ background: "var(--c-text)" }} />
            <span className="block w-4 h-0.5 transition-all" style={{ background: "var(--c-text)" }} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-[65px] z-40 border-b shadow-xl"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <div className="px-4 py-3 space-y-1">
            {[
              { href: "/",            label: "Home",           icon: "🏠" },
              { href: "/features",    label: "Features",        icon: "✨" },
              { href: "/pricing",     label: "Pricing",         icon: "💰" },
              { href: "/blog",        label: "Blog",            icon: "📝" },
              { href: "/bulk",        label: "Bulk Scan",       icon: "⚡" },
              { href: "/bulk-prompt", label: "Prompt Runner",   icon: "✦" },
              { href: "/reports",     label: "Reports",         icon: "📋" },
              { href: "/contact",     label: "Contact",         icon: "✉" },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: pathname === href ? "var(--c-accent)" : "var(--c-text)",
                  background: pathname === href ? "rgba(0,229,255,0.08)" : "transparent",
                }}
              >
                <span>{icon}</span>
                {label}
              </Link>
            ))}
            <div className="h-px my-1" style={{ background: "var(--c-border)" }} />
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: "var(--c-text)", background: "transparent" }}
                >
                  <span>🏠</span> Dashboard
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                  style={{ color: "var(--c-error)", background: "transparent" }}
                >
                  <span>↪</span> Sign Out
                </button>
              </>
            ) : isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.06)" }}
              >
                <span>🛡️</span> Admin Panel
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)" }}
              >
                <span>→</span> Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
