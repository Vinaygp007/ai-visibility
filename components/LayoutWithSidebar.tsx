"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BugReportWidget from "./BugReportWidget";
import ThemeToggle from "./ThemeToggle";

export default function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide sidebar on /docs and on public, unauthenticated-facing pages
  const PUBLIC_PATHS = ["/", "/login", "/signup", "/waitlist", "/admin/login", "/privacy", "/terms"];
  const showSidebar = !pathname.startsWith("/docs") && !PUBLIC_PATHS.includes(pathname);
  // Pages that already render their own MarketingNav (with a toggle built in).
  // /docs stays dark-only (wraps a third-party Swagger widget). Everywhere
  // else with no sidebar nav (login, signup, waitlist, admin login) gets a
  // floating toggle instead.
  const PAGES_WITH_OWN_NAV = ["/", "/privacy", "/terms"];
  const showFloatingToggle = !showSidebar && !PAGES_WITH_OWN_NAV.includes(pathname) && !pathname.startsWith("/docs");

  return (
    <>
      {showSidebar && (
        <>
          <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

          {/* Backdrop — tap to close on mobile */}
          {mobileOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Hamburger button — only visible on mobile when sidebar is closed */}
          {!mobileOpen && (
            <button
              onClick={() => setMobileOpen(true)}
              className="fixed top-3 left-3 z-50 md:hidden flex flex-col gap-[5px] p-2 rounded-lg"
              style={{
                background: "var(--nav-bg)",
                border: "1px solid rgba(var(--overlay-rgb),0.12)",
                backdropFilter: "blur(8px)",
              }}
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-[var(--text)]" />
              <span className="block w-5 h-0.5 bg-[var(--text)]" />
              <span className="block w-5 h-0.5 bg-[var(--text)]" />
            </button>
          )}
        </>
      )}
      {showFloatingToggle && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      )}
      {children}
      {showSidebar && <BugReportWidget />}
    </>
  );
}
