import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export type AdminGateResult = { ok: true; user: CurrentUser } | { ok: false; error: NextResponse };

// Discriminated on `ok` (rather than presence-checking `.error`/`.user`) so
// `if (!gate.ok) return gate.error;` reliably narrows the union in callers —
// TS doesn't always narrow cleanly on shape alone across property access.
export async function requireAdmin(): Promise<AdminGateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "unauthenticated", message: "Sign in required." } },
        { status: 401, headers: CORS_HEADERS }
      ),
    };
  }
  if (user.role !== "admin") {
    return {
      ok: false,
      error: NextResponse.json(
        { error: { code: "forbidden", message: "Admin access required." } },
        { status: 403, headers: CORS_HEADERS }
      ),
    };
  }
  return { ok: true, user };
}
