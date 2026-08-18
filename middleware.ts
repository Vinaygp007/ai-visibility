import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback", "/admin/login", "/privacy", "/terms"];
// Stripe calls this with no session cookie at all — signature verification
// inside the route itself is what authenticates the caller, not a session.
const PUBLIC_API_PREFIXES: string[] = ["/api/webhooks/stripe"];
// Top-level segments that map to a real page route. Anything outside this
// list (and outside /api) can't resolve to anything but not-found.tsx, so an
// unauthenticated visitor should see that 404 instead of being bounced to
// /login for a page that was never going to exist anyway. Keep in sync with
// KNOWN_ROUTE_PREFIXES in components/AppShell.tsx.
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { response, user } = await updateSession(req);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublicPath || isPublicApi) {
    return response;
  }

  const isKnownRoute = KNOWN_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "unauthenticated", message: "No active session." } }, { status: 401 });
    }
    if (!isKnownRoute) {
      return response;
    }
    const loginUrl = new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signups are 'active' immediately now — this only blocks admin-suspended
  // accounts.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "active") {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "account_inactive", message: "Account is not active." } }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login?error=account_inactive", req.url));
  }

  return response;
}

export const config = {
  // Public metadata/asset routes (robots.txt, sitemap.xml, icons, OG image)
  // need no auth check — routing them through here means every crawler
  // request pays a live supabase.auth.getUser() round-trip for a static file,
  // which is slow enough to make Lighthouse/bots report the fetch as failed.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.png|apple-icon.png|opengraph-image).*)"],
};
