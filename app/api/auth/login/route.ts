import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/session";
import { getAuthAdmin } from "@/lib/firebaseAuthAdmin";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({ idToken: "" }));

  if (!idToken) {
    return NextResponse.json({ error: "Missing sign-in token." }, { status: 400 });
  }

  const authAdmin = await getAuthAdmin();
  if (!authAdmin) {
    return NextResponse.json({ error: "Login is not configured." }, { status: 500 });
  }

  let decoded;
  try {
    decoded = await authAdmin.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired sign-in." }, { status: 401 });
  }

  const allowedEmails = [
    process.env.ADMIN_ID,
    ...(process.env.SUPER_ADMIN_EMAILS?.split(",") ?? []),
  ]
    .map((e) => e?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e));

  if (allowedEmails.length > 0 && !allowedEmails.includes(decoded.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "This account is not authorized." }, { status: 403 });
  }

  const token = await createSessionToken(decoded.email ?? decoded.uid);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
  return res;
}
