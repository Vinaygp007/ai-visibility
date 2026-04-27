// app/api/prompt-run/route.ts
// POST /api/prompt-run
// Accepts { url, prompt } — replaces {url} in prompt, calls the first enabled
// AI provider from settings, returns { response, provider, durationMs }

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

// ── Load settings (same helper used across routes) ─────────────────────────
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

// ── Call Gemini ────────────────────────────────────────────────────────────
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
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Call OpenAI-compatible (OpenAI / Perplexity / Copilot) ─────────────────
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
      max_tokens: 1024,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI-compat HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ── Call Anthropic Claude ──────────────────────────────────────────────────
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
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUrl: string = body?.url ?? "";
    const customPrompt: string = body?.prompt ?? "";

    if (!rawUrl || !customPrompt) {
      return NextResponse.json(
        { error: "Missing url or prompt" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Normalise URL
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

    // Replace placeholder
    const finalPrompt = customPrompt.replace(/\{url\}/g, url);

    // Load settings & find first enabled provider
    const settings = await loadSettings();
    const provider = settings?.providers?.find((p) => p.enabled && p.apiKey);

    if (!provider) {
      return NextResponse.json(
        { error: "No AI provider configured. Go to /settings to add API keys." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const start = Date.now();
    let response = "";

    switch (provider.id) {
      case "gemini":
        response = await callGemini(provider.apiKey, provider.model, finalPrompt);
        break;

      case "openai":
      case "copilot":
        response = await callOpenAI(
          provider.apiKey,
          provider.model,
          finalPrompt,
          "https://api.openai.com/v1"
        );
        break;

      case "perplexity":
        response = await callOpenAI(
          provider.apiKey,
          provider.model,
          finalPrompt,
          "https://api.perplexity.ai"
        );
        break;

      case "claude":
        response = await callClaude(provider.apiKey, provider.model, finalPrompt);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown provider id: ${provider.id}` },
          { status: 500, headers: CORS_HEADERS }
        );
    }

    return NextResponse.json(
      {
        response,
        provider: provider.name,
        durationMs: Date.now() - start,
        url,
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