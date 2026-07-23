// app/api/prompt-run/route.ts
// POST /api/prompt-run — cold-visibility prompt runner, credit-gated (M3).
// Each call is one scan (kind='prompt_run') in Postgres `scans`; citation
// results are also written to `scan_results`. Response shape to the caller
// is unchanged from the Firestore-era version.

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { AppSettings } from "@/types";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveSettings, countBillableProviders } from "@/lib/providerConfig";
import { spendCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { PROMPT_CHAR_LIMIT } from "@/lib/limits";
import { createScan, completeScan, failScan, insertScanResults, setScanLedgerDebit } from "@/lib/scans";
import { qualifyReferral } from "@/lib/referrals";
import { checkRateLimit } from "@/lib/rateLimit";
import { captureEvent } from "@/lib/analytics/posthog";

export const runtime = "nodejs";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 1500,
    label = "call",
  }: { retries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = String(err).toLowerCase();
      const isRetryable =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("502") ||
        msg.includes("504") ||
        msg.includes("529") ||           // Anthropic's distinct "Overloaded" status
        msg.includes("overloaded") ||
        msg.includes("rate limit") ||
        msg.includes("too many requests");

      if (isRetryable && attempt < retries) {
        const jitter = 1 + (Math.random() * 0.4 - 0.2);
        const wait = Math.round(baseDelayMs * Math.pow(2, attempt) * jitter);
        console.warn(
          `[prompt-run][${label}] rate-limited on attempt ${attempt + 1}/${retries}, waiting ${wait}ms`
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Cold visibility prompts have no company/context attached to them, so without this
// every provider free-forms its own structure. Forcing a ranked top-5 + sentiment
// breakdown keeps responses comparable across providers and across runs.
const COLD_VISIBILITY_SYSTEM_PROMPT =
  "When answering, you must always structure your response as:\n" +
  "1. Top 5 solutions for the query, ranked best to worst.\n" +
  "2. A sentiment analysis for each one — classify your framing (e.g., top_pick, strong_option, niche_fit, honorable_mention, not_recommended) and briefly explain the language/signals behind that framing.\n" +
  "Always include both the ranked top 5 and the sentiment analysis, even if the prompt does not explicitly ask for them.";

// Asking for "sources, websites, or brands" invites models (especially non-browsing
// ones like plain chat-completions ChatGPT) to answer with research/media outlets
// they saw cited in "best X" roundup articles during training (Gartner, Forrester,
// G2, Capterra, McKinsey...) instead of actual competing products — those aren't
// competitors of the thing being searched for, they're places you'd go to research it.
// This prompt instead pins the answer to real competing companies/products, and
// explicitly excludes analyst firms, review directories, and generic media unless
// the query is itself about that category of source.
function buildCitationPrompt(topic: string): string {
  return `List the top 5 companies, products, or tools (no more than 5, ranked best to worst) that are the actual competing solutions most commonly recommended when someone searches for: "${topic}".

Rules:
- Only name real vendors/products/companies that directly solve this need — never review sites, software directories (e.g. G2, Capterra, Software Advice, GetApp), industry analysts (e.g. Gartner, Forrester, McKinsey, Deloitte), or generic media/blogs (e.g. TechCrunch, HubSpot Blog) — UNLESS the query is explicitly asking about analyst firms, review platforms, or media outlets themselves.
- Each entry must be a distinct company or product, not a source of information about the category.

For each one, in this format:
- Reason: a brief reason why it's recommended.
- Sentiment: classify your framing as one of top_pick / strong_option / niche_fit / honorable_mention / not_recommended, with a one-line justification.
- URL: its full URL starting with https:// (e.g. https://example.com). Always include the full https:// URL — do not omit it.
Do not return more than 5 sources.`;
}

// Providers return the actual reason (invalid model, bad request shape, etc.) in the
// response body — surfacing it turns "HTTP 400" into something actually debuggable.
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json?.error?.message || json?.error?.type || text.slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return "";
  }
}

async function callGeminiModel(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`Gemini HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGemini(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<string> {
  // Each Gemini model version has its own separate quota pool, so exhausting one
  // doesn't necessarily mean the others are exhausted too.
  const fallbackChain = [
    model,
    model === "gemini-2.0-flash-lite" ? "gemini-2.0-flash" : "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ].filter((m, i, arr) => arr.indexOf(m) === i); // de-dupe

  for (let i = 0; i < fallbackChain.length; i++) {
    const candidate = fallbackChain[i];
    try {
      const result = await callGeminiModel(apiKey, candidate, prompt, systemPrompt);
      // gemini-2.0-flash was deprecated June 2026 — this is the only place
      // that records which fallback candidate actually served a request.
      if (i > 0) {
        console.log(`[Gemini] serving via fallback model "${candidate}" (preferred "${fallbackChain[0]}" unavailable)`);
      }
      return result;
    } catch (err) {
      const msg = String(err);
      const is429 = msg.includes("429");
      if (!is429) throw err; // non-quota error — fail immediately
      if (i < fallbackChain.length - 1) {
        const waitMs = i === 0 ? 5000 : 10000;
        console.warn(`[prompt-run] Gemini ${candidate} rate-limited, waiting ${waitMs}ms then trying ${fallbackChain[i + 1]}...`);
        await sleep(waitMs);
      }
    }
  }
  throw new Error(`All Gemini model fallbacks exhausted (tried: ${fallbackChain.join(", ")}). Quota exceeded — try again later or switch to another provider.`);
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl = "https://api.openai.com/v1",
  systemPrompt?: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`OpenAI-compat HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callClaude(apiKey: string, model: string, prompt: string, systemPrompt?: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`Claude HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

function buildCaller(
  prov: AppSettings["providers"][number],
  prompt: string,
  systemPrompt?: string
): () => Promise<string> {
  return () => {
    switch (prov.id) {
      case "gemini":
      case "ai-overview":
      case "ai_overview":
        return callGemini(prov.apiKey, prov.model, prompt, systemPrompt);
      case "openai":
      case "copilot":
        return callOpenAI(prov.apiKey, prov.model, prompt, "https://api.openai.com/v1", systemPrompt);
      case "perplexity":
        return callOpenAI(prov.apiKey, prov.model, prompt, "https://api.perplexity.ai", systemPrompt);
      case "claude":
        return callClaude(prov.apiKey, prov.model, prompt, systemPrompt);
      default:
        throw new Error(`Unknown provider id: ${prov.id}`);
    }
  };
}

async function runCitationQuery(
  providerName: string,
  callFn: () => Promise<string>,
  topic: string
): Promise<{
  provider: string;
  status: "success" | "failed";
  count: number;
  rawAnswer: string;
  query: string;
  allCitationUrls: string[];
  error?: string;
}> {
  const query = buildCitationPrompt(topic);
  try {
    const raw = await withRetry(callFn, {
      retries: 2,
      baseDelayMs: 2000,
      label: `citation:${providerName}`,
    });
    // Extract full https:// URLs
    const fullUrls = raw.match(/https?:\/\/[^\s\)\"\]]+/g) ?? [];
    // Also extract bare domains (e.g. "hubspot.com", "www.salesforce.com") and prefix them
    const bareDomains = raw.match(/(?<![/@\w])(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s\)\"\]]*)?(?=[\s\)\"\],]|$)/g) ?? [];
    const fromBare = bareDomains
      .filter(d => !d.startsWith("http") && d.includes(".") && d.length > 4)
      .map(d => "https://" + (d.startsWith("www.") ? d : d));
    const allUrls = [...new Set([...fullUrls, ...fromBare])].map(u => u.replace(/[.,;]+$/, ""));
    return {
      provider: providerName,
      status: "success",
      count: allUrls.length,
      rawAnswer: raw,
      query,
      allCitationUrls: allUrls,
    };
  } catch (e) {
    return {
      provider: providerName,
      status: "failed",
      count: 0,
      rawAnswer: "",
      query,
      allCitationUrls: [],
      error: String(e),
    };
  }
}

export async function POST(request: NextRequest) {
  let scanId: string | null = null;
  let userId: string | null = null;
  let estimatedCost = 0;
  let spendSucceeded = false;

  try {
    const body = await request.json();
    const rawUrl: string = (body?.url ?? "").trim();
    const customPrompt: string = (body?.prompt ?? "").trim();
    const runCitations: boolean = body?.runCitations !== false;
    const promptId = typeof body?.promptId === "string" && body.promptId.trim()
      ? body.promptId.trim()
      : "default";

    if (!customPrompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (customPrompt.length > PROMPT_CHAR_LIMIT) {
      return NextResponse.json(
        { error: `Prompt too long — max ${PROMPT_CHAR_LIMIT} characters (got ${customPrompt.length}).` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in required.", errorCode: "UNAUTHENTICATED" },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    userId = user.id;

    // The bulk-prompt page runs up to 100 prompts at RUN_ALL_CONCURRENCY=5, each
    // call taking ~13-20s — sustained throughput is ~19 req/min, so this limit
    // must clear that with headroom or a legitimate "Run All" always 429s itself.
    const allowed = await checkRateLimit(`prompt-run:user:${user.id}`, 40, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many prompt runs, slow down.", errorCode: "RATE_LIMITED" },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const hasUrl = rawUrl.length > 0;
    const url = hasUrl
      ? rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`
      : null;

    const finalPrompt = url
      ? customPrompt.replace(/\{url\}/g, url)
      : customPrompt.replace(/\{url\}/g, "");

    const topic = customPrompt
      .replace(/\{url\}/g, url ?? "")
      .slice(0, 120)
      .trim();

    const settings = await getEffectiveSettings();
    const providers = settings.providers.filter((p) => p.enabled && p.apiKey);

    if (!providers.length) {
      return NextResponse.json(
        { error: "No AI provider configured. Contact an admin to enable one." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Cost: billable providers × (2 "queries" if citations run, else 1) —
    // same model as /api/analyze (spec §6.3).
    estimatedCost = countBillableProviders(settings.providers) * (runCitations ? 2 : 1);
    scanId = await createScan({ userId: user.id, kind: "prompt_run", url, creditsCost: estimatedCost });

    try {
      const spendResult = await spendCredits(user.id, estimatedCost, scanId, `scan_debit:${scanId}`);
      spendSucceeded = true;
      await setScanLedgerDebit(scanId, spendResult.ledgerId);
      captureEvent(user.id, "scan_started", { scan_id: scanId, kind: "prompt_run" });
      captureEvent(user.id, "credits_spent", { scan_id: scanId, amount: estimatedCost, type: "scan_debit" });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        await failScan(scanId, "insufficient_credits");
        return NextResponse.json({
          error: `You need ${estimatedCost} credits to run this.`,
          errorCode: "INSUFFICIENT_CREDITS",
        }, { status: 402, headers: CORS_HEADERS });
      }
      throw err;
    }

    // ── Provider calls run in PARALLEL ──────────────────────────────────────
    // Sequential calls (with retries + inter-provider delays) could take
    // minutes across 5 providers and blow past Vercel's maxDuration, returning
    // a plain-text 504 (FUNCTION_INVOCATION_TIMEOUT) instead of JSON. Running
    // all providers concurrently bounds total time by the slowest provider.
    type MainResult = { text: string; durationMs: number; error?: string };

    // Cache Gemini main-analysis result so ai-overview reuses it (halves quota usage)
    let geminiMainPromise: Promise<MainResult> | null = null;
    const getGeminiMainResult = (prov: AppSettings["providers"][number]): Promise<MainResult> => {
      if (!geminiMainPromise) {
        geminiMainPromise = (async () => {
          const start = Date.now();
          try {
            const text = await withRetry(buildCaller(prov, finalPrompt, COLD_VISIBILITY_SYSTEM_PROMPT), {
              retries: 3,
              baseDelayMs: 2000,
              label: `main:${prov.name}`,
            });
            return { text, durationMs: Date.now() - start };
          } catch (e) {
            return { text: "", durationMs: Date.now() - start, error: String(e) };
          }
        })();
      }
      return geminiMainPromise;
    };

    const responses = await Promise.all(
      providers.map(async (prov): Promise<{ provider: string; response: string; durationMs?: number; error?: string }> => {
        const isGeminiVariant = prov.id === "ai-overview" || prov.id === "ai_overview";

        if (isGeminiVariant || prov.id === "gemini") {
          const geminiProv = isGeminiVariant
            ? providers.find((p) => p.id === "gemini") ?? prov
            : prov;
          const result = await getGeminiMainResult(geminiProv);
          return { provider: prov.name, response: result.text, durationMs: result.durationMs, error: result.error };
        }

        const start = Date.now();
        try {
          const text = await withRetry(buildCaller(prov, finalPrompt, COLD_VISIBILITY_SYSTEM_PROMPT), {
            retries: 3,
            baseDelayMs: 2000,
            label: `main:${prov.name}`,
          });
          return { provider: prov.name, response: text, durationMs: Date.now() - start };
        } catch (e) {
          return { provider: prov.name, response: "", durationMs: Date.now() - start, error: String(e) };
        }
      })
    );

    // ── Citation queries also run in PARALLEL ───────────────────────────────
    let citations: Awaited<ReturnType<typeof runCitationQuery>>[] = [];

    if (runCitations) {
      const citationPrompt = buildCitationPrompt(topic);

      // Cache Gemini citation result so ai-overview reuses it
      let geminiCitationPromise: Promise<Awaited<ReturnType<typeof runCitationQuery>>> | null = null;
      const getGeminiCitationResult = (prov: AppSettings["providers"][number]) => {
        if (!geminiCitationPromise) {
          geminiCitationPromise = runCitationQuery(prov.name, buildCaller(prov, citationPrompt), topic);
        }
        return geminiCitationPromise;
      };

      citations = await Promise.all(
        providers.map(async (prov) => {
          const isGeminiVariant = prov.id === "ai-overview" || prov.id === "ai_overview";

          if (isGeminiVariant || prov.id === "gemini") {
            const geminiProv = isGeminiVariant
              ? providers.find((p) => p.id === "gemini") ?? prov
              : prov;
            const result = await getGeminiCitationResult(geminiProv);
            return { ...result, provider: prov.name };
          }

          return runCitationQuery(prov.name, buildCaller(prov, citationPrompt), topic);
        })
      );
    }

    const firstSuccess =
      responses.find((r) => r.response && !r.error) ?? responses[0];

    const runSucceeded = !!firstSuccess?.response && !firstSuccess?.error;

    const runRecord = {
      promptId,
      status: runSucceeded ? "success" : "failed",
      url,
      hasUrl,
      prompt: customPrompt,
      finalPrompt,
      topic,
      runCitations,
      providerCount: providers.length,
      responses,
      citations,
      response: firstSuccess?.response ?? "",
      provider: firstSuccess?.provider ?? null,
      durationMs: firstSuccess?.durationMs ?? null,
      createdAt: new Date().toISOString(),
    };

    if (runSucceeded) {
      await completeScan(scanId, { result: runRecord });
      captureEvent(user.id, "scan_completed", { scan_id: scanId, kind: "prompt_run" });
      if (citations.length > 0) {
        // Additive persistence, not a new computation — same CitationResult-
        // shaped objects already built above.
        insertScanResults(
          scanId,
          citations.map((c) => ({
            engine: c.provider,
            query: c.query,
            mentioned: c.count > 0,
            rawResponse: c.rawAnswer,
            citations: c.allCitationUrls,
          }))
        ).catch((err) => console.warn("[scans] insertScanResults failed:", err));
      }
      qualifyReferral(userId!).catch(() => {});
    } else {
      await refundCredits(user.id, estimatedCost, scanId, `scan_refund:${scanId}`);
      await failScan(scanId, "run_failed");
      captureEvent(user.id, "scan_failed", { scan_id: scanId, error_code: "run_failed", refunded: true });
    }

    return NextResponse.json(
      {
        responses,
        citations,
        response: firstSuccess?.response ?? "",
        provider: firstSuccess?.provider ?? null,
        durationMs: firstSuccess?.durationMs ?? null,
        url,
        hasUrl,
        topic,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[prompt-run] error:", err);
    Sentry.captureException(err, { tags: { route: "prompt-run" }, user: userId ? { id: userId } : undefined });

    if (spendSucceeded && userId && scanId) {
      try {
        await refundCredits(userId, estimatedCost, scanId, `scan_refund:${scanId}`);
        await failScan(scanId, String(err));
      } catch (refundErr) {
        console.error("[prompt-run] refund-on-error failed:", refundErr);
      }
    }

    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}