import { NextRequest, NextResponse } from "next/server";

const COOKIE = "aiscope-admin-session";

async function buildToken(id: string, pw: string): Promise<string> {
  const raw = new TextEncoder().encode(`${id}:${pw}`);
  const buf = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get(COOKIE)?.value;
  if (!session) return NextResponse.json({ isAdmin: false });

  const adminId = process.env.ADMIN_ID;
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminId || !adminPw) return NextResponse.json({ isAdmin: false });

  const expected = await buildToken(adminId, adminPw);
  return NextResponse.json({ isAdmin: session === expected });
}
