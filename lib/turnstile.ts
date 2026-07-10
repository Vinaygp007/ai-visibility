import "server-only";

/**
 * Verifies a Cloudflare Turnstile token. Returns true (no-op) if
 * TURNSTILE_SECRET_KEY isn't configured yet, so the waitlist form still
 * works before/during setup instead of hard-failing every submission.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.warn("[turnstile] verification request failed:", err);
    return false;
  }
}
