// app/api/prompt-run/route.ts
// POST /api/prompt-run
// Accepts { url?, prompt } — url is OPTIONAL.
// If url is provided, replaces {url} in prompt. If not, sends the prompt as-is.
// Calls all enabled AI providers from settings.
// Returns { responses, response, provider, durationMs, url?, citations? }
// ✅ Fixed: exponential backoff on 429, sequential provider calls with delay,
//           sequential citations (not Promise.all), retry wrapper on every call

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import type { AppSettings } from "@/types";

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

// ── Utility: sleep ─────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Utility: exponential backoff retry ────────────────────────────────────
// Detects 429 / 503 / "rate limit" in the error message and retries with
// exponential backoff + ±20% jitter.
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 1000,
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
        msg.includes("rate limit") ||
        msg.includes("too many requests");

      if (isRetryable && attempt < retries) {
        const jitter = 1 + (Math.random() * 0.4 - 0.2); // ±20%
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

// ── Load settings ──────────────────────────────────────────────────────────
async function loadSettings(): Promise<AppSettings | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const doc = await db.collection("settings").doc("config").get();
    if (!doc.exists) return null;
    return doc.data() as AppSettings;
  } catch (e) {
    console.warn("[prompt-run] settings load error:", e);
    return null;
  }
}

// ── AI provider callers ────────────────────────────────────────────────────
// Each caller throws on non-OK HTTP so withRetry can catch and inspect.

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) {
    // Include status in error so withRetry can detect 429
    throw new Error(`Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl = "https://api.openai.com/v1"
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI-compat HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
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
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

// ── Build caller function for a provider ──────────────────────────────────
// Centralises provider-dispatch so it's not duplicated for main + citation calls.
function buildCaller(
  prov: AppSettings["providers"][number],
  prompt: string
): () => Promise<string> {
  return () => {
    switch (prov.id) {
      case "gemini":
        return callGemini(prov.apiKey, prov.model, prompt);
      case "openai":
      case "copilot":
        return callOpenAI(prov.apiKey, prov.model, prompt);
      case "perplexity":
        return callOpenAI(
          prov.apiKey,
          prov.model,
          prompt,
          "https://api.perplexity.ai"
        );
      case "claude":
        return callClaude(prov.apiKey, prov.model, prompt);
      default:
        throw new Error(`Unknown provider id: ${prov.id}`);
    }
  };
}

// ── Citation query runner ──────────────────────────────────────────────────
// Runs a citation-style prompt through a single provider.
// Returns structured result even on failure (status: "failed").
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
  const query = `List the top sources, websites, or brands that are most cited or recommended when someone searches for: "${topic}". For each, give a brief reason and their URL if known.`;
  try {
    // Wrap in retry so a single 429 doesn't kill the citation result
    const raw = await withRetry(callFn, {
      retries: 2,
      baseDelayMs: 1500,
      label: `citation:${providerName}`,
    });
    const urlMatches = raw.match(/https?:\/\/[^\s\)\"]+/g) ?? [];
    return {
      provider: providerName,
      status: "success",
      count: urlMatches.length,
      rawAnswer: raw,
      query,
      allCitationUrls: [...new Set(urlMatches)],
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

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl: string = (body?.url ?? "").trim();
    const customPrompt: string = (body?.prompt ?? "").trim();
    const runCitations: boolean = body?.runCitations !== false;

    if (!customPrompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // URL is optional — normalise if provided
    const hasUrl = rawUrl.length > 0;
    const url = hasUrl
      ? rawUrl.startsWith("http")
        ? rawUrl
        : `https://${rawUrl}`
      : null;

    // Build the final prompt — inject {url} if present, strip leftover otherwise
    const finalPrompt = url
      ? customPrompt.replace(/\{url\}/g, url)
      : customPrompt.replace(/\{url\}/g, "");

    // Topic label for citation queries (first 120 chars of resolved prompt)
    const topic = customPrompt
      .replace(/\{url\}/g, url ?? "")
      .slice(0, 120)
      .trim();

    // Load settings & collect enabled providers
    const settings = await loadSettings();
    const providers =
      settings?.providers?.filter((p) => p.enabled && p.apiKey) ?? [];

    if (!providers.length) {
      return NextResponse.json(
        {
          error:
            "No AI provider configured. Go to /settings to add API keys.",
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // ── Run main prompt on all providers — SEQUENTIALLY with delay ────────
    // Previously this was a parallel loop; parallel calls to 3+ providers on
    // 500 URLs = burst spikes that trip every provider's rate limiter.
    // Sequential calls with a small inter-provider delay are much safer.
    const INTER_PROVIDER_DELAY_MS = 400; // pause between providers

    const responses: {
      provider: string;
      response: string;
      durationMs?: number;
      error?: string;
    }[] = [];

    for (let i = 0; i < providers.length; i++) {
      const prov = providers[i];

      // Small delay between consecutive provider calls (skip before first)
      if (i > 0) await sleep(INTER_PROVIDER_DELAY_MS);

      const start = Date.now();
      try {
        // Wrap in retry: catches 429/503 and backs off automatically
        const text = await withRetry(buildCaller(prov, finalPrompt), {
          retries: 3,
          baseDelayMs: 1000,
          label: `main:${prov.name}`,
        });
        responses.push({
          provider: prov.name,
          response: text,
          durationMs: Date.now() - start,
        });
      } catch (e) {
        responses.push({
          provider: prov.name,
          response: "",
          durationMs: Date.now() - start,
          error: String(e),
        });
      }
    }

    // ── Run citation queries — SEQUENTIALLY with delay ─────────────────────
    // Previously used Promise.all which fires all providers simultaneously.
    // Now runs one-by-one with a delay to avoid burst spikes.
    const INTER_CITATION_DELAY_MS = 600; // slightly longer — citation prompts are heavier

    let citations: Awaited<ReturnType<typeof runCitationQuery>>[] = [];
    if (runCitations) {
      for (let i = 0; i < providers.length; i++) {
        const prov = providers[i];

        if (i > 0) await sleep(INTER_CITATION_DELAY_MS);

        const citationPrompt = `List the top sources, websites, or brands that are most cited or recommended when someone searches for: "${topic}". For each, give a brief reason and their URL if known.`;

        const callFn = buildCaller(prov, citationPrompt);
        const result = await runCitationQuery(prov.name, callFn, topic);
        citations.push(result);
      }
    }

    const firstSuccess =
      responses.find((r) => r.response && !r.error) ?? responses[0];

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
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}