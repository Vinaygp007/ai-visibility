// Credits are flat per prompt regardless of length, but bulk-prompt sends the
// raw prompt text straight into every provider's input tokens (unlike a URL
// scan, which only ever sends a small code-generated summary) — an unbounded
// prompt lets real cost drift away from what the flat credit price assumes.
// 2,000 characters is generous for a real prompt/brief while keeping that
// drift negligible. Enforced both client-side (app/bulk-prompt/page.tsx) and
// server-side (app/api/prompt-run/route.ts) — the UI cap alone doesn't stop
// a direct API call.
export const PROMPT_CHAR_LIMIT = 2000;
