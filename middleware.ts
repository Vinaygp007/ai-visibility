import { NextRequest, NextResponse } from "next/server";

const COOKIE = "aiscope-admin-session";

async function buildToken(id: string, pw: string): Promise<string> {
  const raw = new TextEncoder().encode(`${id}:${pw}`);
  const buf = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the login page and its POST through
  if (pathname === "/admin/login") return NextResponse.next();

  // Protect all other /admin/* paths
  if (pathname.startsWith("/admin")) {
    const session = req.cookies.get(COOKIE)?.value;
    const adminId = process.env.ADMIN_ID;
    const adminPw = process.env.ADMIN_PASSWORD;

    // If credentials not configured, allow through so admin can see the panel
    // (remove this in production once env vars are set)
    if (!adminId || !adminPw) return NextResponse.next();

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const expected = await buildToken(adminId, adminPw);
    if (session !== expected) {
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete(COOKIE);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
