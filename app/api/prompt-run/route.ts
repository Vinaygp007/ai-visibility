// app/api/prompt-run/route.ts
// POST /api/prompt-run
// ✅ Fixed v3:
//   - Firestore structure now mirrors bulk/route.ts pattern:
//       ONE job doc:  bulk_prompt/{batchId}         (metadata + counters only)
//       PER-RUN subdoc: bulk_prompt/{batchId}/runs/{executionId}  (full run record)
//   - Job doc uses .set() on create, .update() on progress (preserves createdAt)
//   - No more `runs` map or `latestByPrompt` map embedded in the batch doc
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

const COLLECTION = "bulk_prompt";

// ── Batch-level doc (metadata + counters only, no runs map) ──────────────
// Structure: bulk_prompt/{batchId}
async function createBatchDoc(batchId: string, data: object) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .collection(COLLECTION)
      .doc(batchId)
      .set({ ...data, createdAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[prompt-run] createBatchDoc error:", e);
  }
}

async function updateBatchDoc(batchId: string, data: object) {
  const db = await getDb();
  if (!db) return;
  try {
    // .update() preserves createdAt and other fields not mentioned here
    await db
      .collection(COLLECTION)
      .doc(batchId)
      .update({ ...data, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[prompt-run] updateBatchDoc error:", e);
  }
}

// ── Per-execution subdoc ──────────────────────────────────────────────────
// Structure: bulk_prompt/{batchId}/runs/{executionId}
async function saveRunSubDoc(
  batchId: string,
  executionId: string,
  data: object
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .collection(COLLECTION)
      .doc(batchId)
      .collection("runs")
      .doc(executionId)
      .set({ ...data, savedAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[prompt-run] saveRunSubDoc error:", e);
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
  let batchId = "";
  let executionId = "";
  let promptId = "default";
  try {
    const body = await request.json();
    const rawUrl: string = (body?.url ?? "").trim();
    const customPrompt: string = (body?.prompt ?? "").trim();
    const runCitations: boolean = body?.runCitations !== false;
    promptId = typeof body?.promptId === "string" && body.promptId.trim()
      ? body.promptId.trim()
      : "default";
    batchId = typeof body?.batchId === "string" && body.batchId.trim()
      ? body.batchId.trim()
      : `bulk_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    executionId = typeof body?.executionId === "string" && body.executionId.trim()
      ? body.executionId.trim()
      : `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

    // ── Create the single batch document (no runs map) ─────────────────────
    await createBatchDoc(batchId, {
      type: "bulk_prompt_batch",
      batchId,
      status: "running",
      promptId,
      url,
      hasUrl,
      prompt: customPrompt,
      topic,
      runCitations,
      providerCount: providers.length,
      totalRuns: 0,
      passedRuns: 0,
      failedRuns: 0,
    });

    // ── Sequential provider calls with increased delay ─────────────────────
    // Raised from 400ms → 800ms between providers.
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
    // Raised from 600ms → 1000ms. Citation prompts are longer and heavier.
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

    const runSucceeded = !!firstSuccess?.response && !firstSuccess?.error;

    const runRecord = {
      executionId,
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

    // ── Save this execution as its own subdoc ──────────────────────────────
    // bulk_prompt/{batchId}/runs/{executionId}
    await saveRunSubDoc(batchId, executionId, runRecord);

    // ── Update batch doc counters only (no runs map) ───────────────────────
    await updateBatchDoc(batchId, {
      status: "done",
      totalRuns: 1,
      passedRuns: runSucceeded ? 1 : 0,
      failedRuns: runSucceeded ? 0 : 1,
      completedAt: new Date().toISOString(),
    });

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

    // ── Save failed run subdoc ─────────────────────────────────────────────
    if (batchId && executionId) {
      await saveRunSubDoc(batchId, executionId, {
        executionId,
        promptId,
        status: "failed",
        error: String(err),
        createdAt: new Date().toISOString(),
      });
      await updateBatchDoc(batchId, {
        status: "done",
        totalRuns: 1,
        passedRuns: 0,
        failedRuns: 1,
        completedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}