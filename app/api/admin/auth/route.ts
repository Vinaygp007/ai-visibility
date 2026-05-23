import { NextRequest, NextResponse } from "next/server";

const COOKIE = "aiscope-admin-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** SHA-256 of "adminId:adminPassword" — stateless, no DB needed */
async function buildToken(id: string, pw: string): Promise<string> {
  const raw = new TextEncoder().encode(`${id}:${pw}`);
  const buf = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** POST /api/admin/auth — validate credentials, set session cookie */
export async function POST(req: NextRequest) {
  const { id, password } = await req.json();

  const ADMIN_ID = process.env.ADMIN_ID;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_ID || !ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Admin credentials are not configured. Add ADMIN_ID and ADMIN_PASSWORD to .env.local." },
      { status: 503 }
    );
  }

  if (id !== ADMIN_ID || password !== ADMIN_PASSWORD) {
    // Constant-time-ish: always hash even on mismatch to avoid timing attacks
    await buildToken(id ?? "", password ?? "");
    return NextResponse.json({ error: "Invalid admin ID or password." }, { status: 401 });
  }

  const token = await buildToken(id, password);
  const res = NextResponse.json({ success: true });

  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });

  return res;
}

/** DELETE /api/admin/auth — clear session cookie (logout) */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(COOKIE);
  return res;
}
