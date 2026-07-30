"use client";

import { usePathname } from "next/navigation";
import MarketingNav from "./MarketingNav";
import Footer from "./Footer";
import BugReportWidget from "./BugReportWidget";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide the app header on /docs and on public, unauthenticated-facing pages
  const PUBLIC_PATHS = ["/", "/login", "/signup", "/waitlist", "/admin/login", "/privacy", "/terms"];
  const showHeader = !pathname.startsWith("/docs") && !PUBLIC_PATHS.includes(pathname);
  // Pages that already render their own MarketingNav (with a toggle built in).
  // /docs stays dark-only (wraps a third-party Swagger widget). Everywhere
  // else with no app nav (login, signup, waitlist, admin login) gets a
  // floating toggle instead.
  const PAGES_WITH_OWN_NAV = ["/", "/privacy", "/terms"];
  const showFloatingToggle = !showHeader && !PAGES_WITH_OWN_NAV.includes(pathname) && !pathname.startsWith("/docs");

  return (
    <>
      {showHeader && <MarketingNav />}
      {showFloatingToggle && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      )}
      {children}
      {showHeader && <Footer />}
      {showHeader && <BugReportWidget />}
    </>
  );
}
