import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/waitlist", "/auth/callback", "/admin/login", "/privacy", "/terms"];
const PUBLIC_API_PREFIXES = ["/api/invites/redeem", "/api/waitlist"];

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

  // Invite gate: only an 'active' profile (redeemed a valid invite) gets past
  // here. Pending/suspended accounts never see the app, per spec §7.2.
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
      return NextResponse.json({ error: { code: "not_invited", message: "Account is pending an invite." } }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/waitlist", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
