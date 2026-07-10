import "server-only";
import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com" });
  }
  return client;
}

/**
 * Server-side event capture — the source of truth for money/referral
 * events per spec §10 (client events can be blocked/dropped). No-ops
 * silently if PostHog isn't configured yet.
 */
export function captureEvent(distinctId: string, event: string, properties?: Record<string, unknown>): void {
  const ph = getClient();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
}
