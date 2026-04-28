// app/api/prompt-run/route.ts
// POST /api/prompt-run
// ✅ Fixed v2:
//   - INTER_PROVIDER_DELAY_MS raised to 800ms (was 400ms) — safer for Gemini/Perplexity RPM
//   - INTER_CITATION_DELAY_MS raised to 1000ms (was 600ms)
//   - withRetry baseDelayMs raised to 1500ms (was 1000ms) for citation calls
//   - No change to API surface — all existing callers work unchanged

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

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
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
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
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
  if (!res.ok) throw new Error(`OpenAI-compat HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callClaude(apiKey: string, model: string, prompt: string): Promise<string> {
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
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

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
        return callOpenAI(prov.apiKey, prov.model, prompt, "https://api.perplexity.ai");
      case "claude":
        return callClaude(prov.apiKey, prov.model, prompt);
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
  const query = `List the top sources, websites, or brands that are most cited or recommended when someone searches for: "${topic}". For each, give a brief reason and their URL if known.`;
  try {
    const raw = await withRetry(callFn, {
      retries: 2,
      baseDelayMs: 2000,
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

    const settings = await loadSettings();
    const providers =
      settings?.providers?.filter((p) => p.enabled && p.apiKey) ?? [];

    if (!providers.length) {
      return NextResponse.json(
        { error: "No AI provider configured. Go to /settings to add API keys." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // ── Sequential provider calls with increased delay ─────────────────────
    // Raised from 400ms → 800ms between providers.
    // Rationale: Perplexity free = 20 RPM (~3s between calls minimum to be safe).
    // Gemini free = 15 RPM (~4s). With bulk at concurrency=2, two slots each
    // fire this route, so effective inter-call gap = 800ms × 2 slots = 1600ms.
    // Combined with bulk's inter-task stagger this stays under rate limits.
    const INTER_PROVIDER_DELAY_MS = 800;

    const responses: {
      provider: string;
      response: string;
      durationMs?: number;
      error?: string;
    }[] = [];

    for (let i = 0; i < providers.length; i++) {
      const prov = providers[i];
      if (i > 0) await sleep(INTER_PROVIDER_DELAY_MS);

      const start = Date.now();
      try {
        const text = await withRetry(buildCaller(prov, finalPrompt), {
          retries: 3,
          baseDelayMs: 1500,
          label: `main:${prov.name}`,
        });
        responses.push({ provider: prov.name, response: text, durationMs: Date.now() - start });
      } catch (e) {
        responses.push({ provider: prov.name, response: "", durationMs: Date.now() - start, error: String(e) });
      }
    }

    // ── Sequential citation queries with increased delay ───────────────────
    // Raised from 600ms → 1000ms. Citation prompts are longer and heavier,
    // so providers need more recovery time between calls.
    const INTER_CITATION_DELAY_MS = 1000;

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