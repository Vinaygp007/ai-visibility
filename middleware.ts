import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback", "/admin/login", "/privacy", "/terms"];
// Stripe calls this with no session cookie at all — signature verification
// inside the route itself is what authenticates the caller, not a session.
const PUBLIC_API_PREFIXES: string[] = ["/api/webhooks/stripe"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { response, user } = await updateSession(req);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublicPath || isPublicApi) {
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "unauthenticated", message: "No active session." } }, { status: 401 });
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
