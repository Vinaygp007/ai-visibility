"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import Footer from "./Footer";
import BugReportWidget from "./BugReportWidget";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide the app shell on /docs and on public, unauthenticated-facing pages
  // (those render their own MarketingNav directly, or no header at all).
  const PUBLIC_PATHS = ["/", "/login", "/signup", "/admin/login", "/privacy", "/terms"];
  const showShell = !pathname.startsWith("/docs") && !PUBLIC_PATHS.includes(pathname);
  const PAGES_WITH_OWN_NAV = ["/", "/privacy", "/terms"];
  const showFloatingToggle = !showShell && !PAGES_WITH_OWN_NAV.includes(pathname) && !pathname.startsWith("/docs");

  if (showShell) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 md:ml-56">
            <AppHeader />
            <main className="flex-1">{children}</main>
          </div>
        </div>
        {/* Full-width, outside the sidebar row — same footer as the homepage. */}
        <Footer />
        <BugReportWidget />
      </div>
    );
  }

  return (
    <>
      {showFloatingToggle && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      )}
      {children}
    </>
  );
}
