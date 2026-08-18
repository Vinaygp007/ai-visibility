"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";

// Only ever rendered on authenticated app routes (see `showShell` below), never
// on the public marketing pages. Loaded on demand instead of statically so
// their code — including the Supabase client each of them pulls in — doesn't
// ship as part of every route's bundle just because AppShell wraps the app.
const Sidebar = dynamic(() => import("./Sidebar"));
const AppHeader = dynamic(() => import("./AppHeader"));
const BugReportWidget = dynamic(() => import("./BugReportWidget"));

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Top-level segments that map to a real route — anything outside this list
  // hits not-found.tsx, which renders its own full-page layout and should be
  // shown standalone (no sidebar/header/footer), same as a public page.
  // Keep in sync with KNOWN_ROUTE_PREFIXES in middleware.ts.
  const KNOWN_ROUTE_PREFIXES = [
    "/",
    "/admin",
    "/auth",
    "/billing",
    "/bulk",
    "/bulk-prompt",
    "/credits",
    "/docs",
    "/login",
    "/login2",
    "/privacy",
    "/referrals",
    "/reports",
    "/scan",
    "/settings",
    "/signup",
    "/signup2",
    "/terms",
  ];
  const isKnownRoute = KNOWN_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Hide the app shell on /docs, on public unauthenticated-facing pages
  // (those render their own MarketingNav directly, or no header at all),
  // and on unknown routes (404s render full-page via not-found.tsx).
  const PUBLIC_PATHS = ["/", "/login", "/signup", "/admin/login", "/privacy", "/terms"];
  const showShell = isKnownRoute && !pathname.startsWith("/docs") && !PUBLIC_PATHS.includes(pathname);
  const PAGES_WITH_OWN_NAV = ["/", "/privacy", "/terms", "/login", "/signup"];
  const showFloatingToggle = !showShell && !PAGES_WITH_OWN_NAV.includes(pathname) && !pathname.startsWith("/docs");
  const PAGES_WITHOUT_FOOTER = [
    "/scan",
    "/bulk",
    "/bulk-prompt",
    "/reports",
    "/credits",
    "/referrals",
    "/billing",
    "/billing/success",
    "/billing/canceled",
  ];

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
        {!PAGES_WITHOUT_FOOTER.includes(pathname) && <Footer />}
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
