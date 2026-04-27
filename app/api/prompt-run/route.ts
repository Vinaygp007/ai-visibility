// app/api/prompt-run/route.ts
// POST /api/prompt-run
// Accepts { url?, prompt } — url is now OPTIONAL.
// If url is provided, replaces {url} in prompt. If not, sends the prompt as-is.
// Calls all enabled AI providers from settings.
// Returns { responses, response, provider, durationMs, url?, citations? }

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

// ── Citation query: ask each provider "does {topic} appear?" ───────────────
// For URL-less mode we build a citation-style query from the prompt topic.
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
    const raw = await callFn();
    // Count URL-like patterns as citation signals
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

    // Build the final prompt — inject {url} if present, otherwise send as-is
    const finalPrompt = url
      ? customPrompt.replace(/\{url\}/g, url)
      : customPrompt.replace(/\{url\}/g, ""); // strip leftover placeholder

    // Extract a short topic label for citation queries (first ~80 chars of prompt)
    const topic = customPrompt.replace(/\{url\}/g, url ?? "").slice(0, 120).trim();

    // Load settings & collect enabled providers
    const settings = await loadSettings();
    const providers = settings?.providers?.filter((p) => p.enabled && p.apiKey) ?? [];

    if (!providers.length) {
      return NextResponse.json(
        { error: "No AI provider configured. Go to /settings to add API keys." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Build per-provider caller functions
    const callers: Record<string, () => Promise<string>> = {};
    for (const prov of providers) {
      callers[prov.name] = async () => {
        switch (prov.id) {
          case "gemini":
            return callGemini(prov.apiKey, prov.model, finalPrompt);
          case "openai":
          case "copilot":
            return callOpenAI(prov.apiKey, prov.model, finalPrompt);
          case "perplexity":
            return callOpenAI(prov.apiKey, prov.model, finalPrompt, "https://api.perplexity.ai");
          case "claude":
            return callClaude(prov.apiKey, prov.model, finalPrompt);
          default:
            throw new Error(`Unknown provider id: ${prov.id}`);
        }
      };
    }

    // ── Run main prompt on all providers ──────────────────────────────────
    const responses: {
      provider: string;
      response: string;
      durationMs?: number;
      error?: string;
    }[] = [];

    for (const prov of providers) {
      const start = Date.now();
      try {
        const text = await callers[prov.name]();
        responses.push({ provider: prov.name, response: text, durationMs: Date.now() - start });
      } catch (e) {
        responses.push({
          provider: prov.name,
          response: "",
          durationMs: Date.now() - start,
          error: String(e),
        });
      }
    }

    // ── Run citation queries if requested ──────────────────────────────────
    let citations: Awaited<ReturnType<typeof runCitationQuery>>[] = [];
    if (runCitations) {
      const citCallers = providers.map((prov) => {
        const callFn: () => Promise<string> = async () => {
          const citationPrompt = `List the top sources, websites, or brands that are most cited or recommended when someone searches for: "${topic}". For each, give a brief reason and their URL if known.`;
          switch (prov.id) {
            case "gemini":
              return callGemini(prov.apiKey, prov.model, citationPrompt);
            case "openai":
            case "copilot":
              return callOpenAI(prov.apiKey, prov.model, citationPrompt);
            case "perplexity":
              return callOpenAI(prov.apiKey, prov.model, citationPrompt, "https://api.perplexity.ai");
            case "claude":
              return callClaude(prov.apiKey, prov.model, citationPrompt);
            default:
              throw new Error(`Unknown provider: ${prov.id}`);
          }
        };
        return runCitationQuery(prov.name, callFn, topic);
      });
      citations = await Promise.all(citCallers);
    }

    const firstSuccess = responses.find((r) => r.response && !r.error) ?? responses[0];

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
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS_HEADERS });
  }
}