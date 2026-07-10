import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Lightweight "who am I" endpoint for client components (Sidebar's
// role-aware nav, the referrals page) that can't call the server-only
// getCurrentUser() helper directly.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });
  }
  return NextResponse.json(user);
}
