"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { PRIMARY_LINKS, ACCOUNT_LINKS, ADMIN_LINK } from "./Sidebar";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import { Info } from "lucide-react";

const TODAY_LABEL = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, checked: authChecked } = useCurrentUser();
  const balance = user?.creditBalance ?? null;
  const fullName = user?.fullName ?? null;
  const email = user?.email ?? null;
  const role = user?.role ?? null;
  const displayName = fullName || email?.split("@")[0] || "Account";
  const accountLinks = role === "admin" ? [...ACCOUNT_LINKS, ADMIN_LINK] : ACCOUNT_LINKS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3 border-b"
        style={{ borderColor: "rgba(var(--overlay-rgb),0.07)", background: "var(--nav-bg)", backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden flex flex-col gap-[5px] p-2 rounded-lg flex-shrink-0"
          style={{ background: "rgba(var(--overlay-rgb),0.06)", border: "1px solid rgba(var(--overlay-rgb),0.1)" }}
          aria-label="Open menu"
        >
          <span className="block w-5 h-0.5 bg-[var(--text)]" />
          <span className="block w-5 h-0.5 bg-[var(--text)]" />
          <span className="block w-5 h-0.5 bg-[var(--text)]" />
        </button>

        <Link href="/" className="flex items-center gap-2 md:hidden">
          <img src="/logo-mark.png" alt="AiScope" className="w-7 h-7 flex-shrink-0" />
        </Link>

        <div className="hidden md:block min-w-0">
          <div className="text-[15px] font-semibold truncate" style={{ color: "var(--text)" }}>
            {authChecked && displayName !== "Account" ? `Welcome back, ${displayName}!` : "Welcome back!"}
          </div>
          <div className="text-[12px]" style={{ color: "var(--text-dim)" }}>{TODAY_LABEL}</div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 transition-opacity duration-200" style={{ opacity: authChecked ? 1 : 0 }}>
          {balance !== null && (
            <span
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono font-bold"
              style={{ color: "var(--accent)", background: "rgba(0,229,255,0.08)" }}
            >
              <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>Credits</span>
              {balance}
            </span>
          )}
          <Link
            href="/docs"
            title="Docs"
            aria-label="Docs"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg border transition-colors"
            style={{ borderColor: "rgba(var(--overlay-rgb), 0.13)", color: "var(--text-muted)" }}
          >
            <Info size={16} />
          </Link>
          <ThemeToggle />
          <UserMenu name={displayName} email={email} />
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div
            className="absolute top-0 left-0 bottom-0 w-64 border-r px-4 py-6 flex flex-col gap-1 overflow-y-auto"
            style={{ background: "var(--bg)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 mb-6 px-2">
              <img src="/logo-mark.png" alt="AiScope" className="w-8 h-8 flex-shrink-0" />
              <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>AiScope</span>
            </Link>

            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[15px] font-medium"
                style={{ color: pathname === link.href || pathname.startsWith(link.href + "/") ? "var(--accent)" : "var(--text)" }}
              >
                <link.icon size={17} />
                {link.label}
              </Link>
            ))}

            <div className="h-px my-3" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />

            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[15px] font-medium"
                style={{ color: pathname === link.href ? "var(--accent)" : "var(--text-muted)" }}
              >
                <link.icon size={17} />
                {link.label}
              </Link>
            ))}

            <div className="h-px my-3" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />

            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="px-3 py-2.5 rounded-lg text-[15px] font-medium text-left"
              style={{ color: "var(--text-muted)" }}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
