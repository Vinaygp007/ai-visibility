import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { getDb } from "@/lib/firebase";
import { GET as openaiGET, OPTIONS as openaiOPTIONS } from "../openapi/route";
import type { AppSettings, AIProvider } from "@/types";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isGeminiRateLimitError(err: unknown): boolean {
  const msg = String(err ?? "").toLowerCase();
  return (
    msg.includes("[429") ||
    msg.includes(" 429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit")
  );
}

function briefProviderError(err: unknown): string {
  const msg = String(err ?? "Unknown error");
  // Keep it reasonably sized for UI, but more informative than 150 chars.
  return msg.length > 500 ? msg.slice(0, 500) + "…" : msg;
}

function normalizeGeminiModelName(name: string) {
  return name.startsWith("models/") ? name.slice("models/".length) : name;
}

function getGeminiModelCandidates(): string[] {
  const models = (
    process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : [
          // Prefer stable aliases that exist in v1beta ListModels.
          "gemini-flash-latest",
          "gemini-2.5-flash",
          "gemini-flash-lite-latest",
          "gemini-2.0-flash-lite",
          "gemini-2.0-flash",
        ]
  )
    .filter(Boolean)
    .map((m) => normalizeGeminiModelName(String(m)));

  // De-dupe while preserving order
  return Array.from(new Set(models));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Firebase Cache (1 hour TTL) ───────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const COLLECTION = "scans";

function getCacheKey(key: string): string {
  return crypto.createHash("md5").update(key).digest("hex");
}

async function readCache(key: string): Promise<object | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const docId = getCacheKey(key);
    const doc = await db.collection(COLLECTION).doc(docId).get();
    if (!doc.exists) return null;

    const { timestamp, data } = doc.data() as { timestamp: number; data: object };
    const ageMs = Date.now() - timestamp;

    if (ageMs > CACHE_TTL_MS) {
      // Expired — delete silently in background
      doc.ref.delete().catch(() => {});
      console.log("[firebase] cache expired for", key);
      return null;
    }

    const remainingMins = Math.round((CACHE_TTL_MS - ageMs) / 60000);
    console.log("[firebase] cache HIT for", key, "—", remainingMins, "mins remaining");
    return data;
  } catch (e) {
    console.warn("[firebase] readCache error:", e);
    return null;
  }
}

async function writeCache(key: string, data: object): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const docId = getCacheKey(key);
    await db.collection(COLLECTION).doc(docId).set({
      url: key,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      data,
    });
    console.log("[firebase] cached result for", key);
  } catch (e) {
    console.warn("[firebase] writeCache error:", e);
  }
}

// ── HTTP Fetcher ───────────────────────────────────────────────────────────
async function safeFetch(url: string, ms = 7000): Promise<{ text: string; status: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AiScope/1.0)", Accept: "text/html,text/plain,*/*" },
      redirect: "follow",
    });
    return { text: res.ok ? await res.text() : "", status: res.status };
  } catch { return { text: "", status: 0 }; }
  finally { clearTimeout(t); }
}

// ── Settings Loader ────────────────────────────────────────────────────────
async function loadSettings(): Promise<AppSettings | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const doc = await db.collection("settings").doc("config").get();
    if (!doc.exists) return null;
    return doc.data() as AppSettings;
  } catch (e) {
    console.warn("[settings] load error:", e);
    return null;
  }
}

// ── AI Bots ────────────────────────────────────────────────────────────────
const AI_BOTS = [
  { key: "GPTBot",             label: "ChatGPT",          company: "OpenAI"      },
  { key: "OAI-SearchBot",      label: "ChatGPT Search",   company: "OpenAI"      },
  { key: "ClaudeBot",          label: "Claude",           company: "Anthropic"   },
  { key: "anthropic-ai",       label: "Claude (alt)",     company: "Anthropic"   },
  { key: "PerplexityBot",      label: "Perplexity AI",    company: "Perplexity"  },
  { key: "Googlebot-Extended", label: "Gemini / Google",  company: "Google"      },
  { key: "meta-externalagent", label: "Meta AI",          company: "Meta"        },
  { key: "cohere-ai",          label: "Cohere",           company: "Cohere"      },
  { key: "Bytespider",         label: "ByteDance AI",     company: "ByteDance"   },
  { key: "CCBot",              label: "Common Crawl",     company: "CommonCrawl" },
  { key: "Amazonbot",          label: "Amazon Alexa AI",  company: "Amazon"      },
  { key: "YouBot",             label: "You.com AI",       company: "You.com"     },
  { key: "Applebot-Extended",  label: "Apple AI",         company: "Apple"       },
  { key: "DuckAssistBot",      label: "DuckDuckGo AI",    company: "DuckDuckGo"  },
] as const;

// ── Robots parser ──────────────────────────────────────────────────────────
function checkBot(robotsTxt: string, botKey: string): { allowed: boolean; reason: string } {
  if (!robotsTxt) return { allowed: true, reason: "No robots.txt — allowed by default" };
  const lines = robotsTxt.toLowerCase().split("\n").map(l => l.trim());
  const bot = botKey.toLowerCase();
  let agents: string[] = [];
  let botDisallow = false, botAllow = false, botFound = false, globalDisallow = false;
  for (const line of lines) {
    if (line.startsWith("user-agent:")) { agents = [line.replace("user-agent:", "").trim()]; }
    else if (line === "") { agents = []; }
    else if (line.startsWith("disallow:")) {
      const rule = line.replace("disallow:", "").trim();
      if (agents.includes(bot)) { botFound = true; if (rule === "/") botDisallow = true; }
      if (agents.includes("*") && rule === "/") globalDisallow = true;
    } else if (line.startsWith("allow:")) {
      const rule = line.replace("allow:", "").trim();
      if (agents.includes(bot)) { botFound = true; if (rule === "/" || rule === "") botAllow = true; }
    }
  }
  if (botFound && botAllow)    return { allowed: true,  reason: botKey + " explicitly allowed" };
  if (botFound && botDisallow) return { allowed: false, reason: botKey + " blocked in robots.txt" };
  if (!botFound && globalDisallow) return { allowed: false, reason: "All bots blocked via User-agent: *" };
  return { allowed: true, reason: botFound ? botKey + " found, no block" : "Not mentioned — allowed by default" };
}

// ── HTML parsers ───────────────────────────────────────────────────────────
function extractMeta(html: string, prop: string): string {
  for (const re of [
    new RegExp(`<meta[^>]+(?:name|property)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${prop}["']`, "i"),
  ]) { const m = html.match(re); if (m) return m[1].trim(); }
  return "";
}
function parseJsonLd(html: string) {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const types: string[] = [];
  for (const b of blocks) { const t = b.match(/"@type"\s*:\s*"([^"]+)"/i); if (t) types.push(t[1]); }
  return { found: blocks.length > 0, types };
}
function getSiteName(html: string, url: string) {
  return extractMeta(html, "og:site_name") ||
    extractMeta(html, "application-name") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(/[|\-–]/)[0]?.trim() ||
    new URL(url).hostname.replace("www.", "");
}

// ── Build technical data ───────────────────────────────────────────────────
function buildTechData(siteUrl: string, robotsTxt: string, html: string, llmsTxt: string, llmsFullTxt: string, sitemapFound: boolean) {
  const botResults = AI_BOTS.map(b => ({ ...b, access: checkBot(robotsTxt, b.key) }));
  const blocked = botResults.filter(b => !b.access.allowed);
  const allowedCount = botResults.filter(b => b.access.allowed).length;
  const jsonLd = parseJsonLd(html);
  return {
    botResults, blocked, allowedCount,
    robotsFound: robotsTxt.length > 50,
    jsonLd,
    metaDesc:    extractMeta(html, "description"),
    ogTitle:     extractMeta(html, "og:title"),
    ogDesc:      extractMeta(html, "og:description"),
    ogImage:     extractMeta(html, "og:image"),
    twitterCard: extractMeta(html, "twitter:card"),
    viewport:    /meta[^>]+name=["']viewport["']/i.test(html),
    canonical:   /link[^>]+rel=["']canonical["']/i.test(html),
    htmlLang:    html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] || "",
    h1Count:     (html.match(/<h1[\s>]/gi) || []).length,
    h2Count:     (html.match(/<h2[\s>]/gi) || []).length,
    isHttps:     siteUrl.startsWith("https://"),
    llmsFound:   llmsTxt.length > 50,
    llmsFullFound: llmsFullTxt.length > 50,
    pageTitle:   html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "",
    hasSchema:   /schema\.org/i.test(html) || jsonLd.found,
    sitemapFound,
    siteName:    getSiteName(html, siteUrl),
  };
}

type Tech = ReturnType<typeof buildTechData>;

// ── Deterministic scoring engine ──────────────────────────────────────────
// Scores computed from real fetched data — same site always gets same score.
// AI only writes descriptions and recommendations, never sets scores.

interface CheckItem { status: "pass" | "fail" | "warn"; label: string; detail: string }
interface ScoredCategory { name: string; icon: string; score: number; color: "green"|"yellow"|"red"; checks: CheckItem[] }

function colorFromScore(s: number): "green"|"yellow"|"red" { return s >= 70 ? "green" : s >= 40 ? "yellow" : "red"; }
function scoreFromChecks(checks: CheckItem[]): number {
  const pts = checks.reduce((a, c) => a + (c.status === "pass" ? 100 : c.status === "warn" ? 50 : 0), 0);
  return Math.round(pts / checks.length);
}
function gradeFromScore(s: number): string {
  return s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "F";
}

function computeScores(t: Tech): {
  categories: ScoredCategory[];
  overall_score: number;
  grade: string;
  stats: { checks_passed: number; checks_failed: number; checks_warned: number };
  ai_platform_coverage: Record<string, string>;
} {
  const cov = (key: string) => t.botResults.find(b => b.key === key)?.access.allowed ? "indexed" : "blocked";

  // Category 1: AI Crawler Access
  const crawlerChecks: CheckItem[] = [
    ...t.botResults.map(b => ({
      status: (b.access.allowed ? "pass" : "fail") as "pass"|"fail",
      label: b.label,
      detail: b.access.reason,
    })),
    {
      status: t.robotsFound ? "pass" : "warn",
      label: "robots.txt found",
      detail: t.robotsFound
        ? t.allowedCount + "/" + AI_BOTS.length + " AI bots allowed"
        : "No robots.txt — all bots allowed by default",
    },
  ];

  // Category 2: llms.txt & AI Context
  const llmsChecks: CheckItem[] = [
    { status: t.llmsFound ? "pass" : "fail", label: "llms.txt present",
      detail: t.llmsFound ? "llms.txt found — AI systems can read structured site context" : "Missing /llms.txt — add one to help AI systems understand your site" },
    { status: t.llmsFullFound ? "pass" : "warn", label: "llms-full.txt present",
      detail: t.llmsFullFound ? "llms-full.txt found" : "Missing /llms-full.txt — extended AI context not available" },
    { status: t.llmsFound ? "pass" : "fail", label: "AI context file quality",
      detail: t.llmsFound ? "AI context file present" : "No AI context files found" },
  ];

  // Category 3: Structured Data
  const structuredChecks: CheckItem[] = [
    { status: t.hasSchema ? "pass" : "fail", label: "Schema.org markup",
      detail: t.hasSchema ? "Schema.org detected" + (t.jsonLd.types.length ? " (" + t.jsonLd.types.slice(0,3).join(", ") + ")" : "") : "No Schema.org markup found" },
    { status: t.jsonLd.found ? "pass" : "fail", label: "JSON-LD structured data",
      detail: t.jsonLd.found ? "JSON-LD found" + (t.jsonLd.types.length ? " — types: " + t.jsonLd.types.join(", ") : "") : "No JSON-LD — add it for best AI comprehension" },
    { status: t.ogTitle ? "pass" : "warn", label: "Open Graph tags",
      detail: t.ogTitle ? "og:title and og:description present" : "Missing Open Graph tags" },
    { status: t.twitterCard ? "pass" : "warn", label: "Twitter/X Card",
      detail: t.twitterCard ? "Twitter card: " + t.twitterCard : "No Twitter card meta tags" },
    { status: t.metaDesc ? "pass" : "fail", label: "Meta description",
      detail: t.metaDesc ? "Meta description present" : "No meta description — critical for AI summaries" },
  ];

  // Category 4: Content Discoverability
  const h1h2Status: "pass"|"warn"|"fail" = t.h1Count >= 1 && t.h2Count >= 2 ? "pass" : t.h1Count >= 1 ? "warn" : "fail";
  const discoverChecks: CheckItem[] = [
    { status: t.sitemapFound ? "pass" : "warn", label: "XML Sitemap",
      detail: t.sitemapFound ? "sitemap.xml found — AI crawlers can discover all pages" : "No sitemap.xml found" },
    { status: h1h2Status, label: "Heading structure",
      detail: t.h1Count + " H1 and " + t.h2Count + " H2 tags on homepage" },
    { status: t.pageTitle ? "pass" : "fail", label: "Page title",
      detail: t.pageTitle ? "Page title present" : "No page title found" },
    { status: "warn", label: "AI citation potential",
      detail: "Depends on content quality and domain authority" },
  ];

  // Category 5: Technical AI-SEO
  const techChecks: CheckItem[] = [
    { status: t.isHttps ? "pass" : "fail", label: "HTTPS enabled",
      detail: t.isHttps ? "Site uses HTTPS — trusted by AI crawlers" : "HTTP only — upgrade to HTTPS" },
    { status: t.viewport ? "pass" : "warn", label: "Mobile viewport",
      detail: t.viewport ? "Viewport meta present — mobile-friendly" : "Missing viewport meta tag" },
    { status: t.canonical ? "pass" : "warn", label: "Canonical URLs",
      detail: t.canonical ? "Canonical tag present" : "No canonical tag — may cause duplicate content issues" },
    { status: t.htmlLang ? "pass" : "warn", label: "Language declaration",
      detail: t.htmlLang ? "lang=" + t.htmlLang : "No lang attribute on <html>" },
  ];

  const categories: ScoredCategory[] = [
    { name: "AI Crawler Access",       icon: "🤖",       checks: crawlerChecks,    score: scoreFromChecks(crawlerChecks),    color: colorFromScore(scoreFromChecks(crawlerChecks))    },
    { name: "llms.txt and AI Context", icon: "📄",       checks: llmsChecks,       score: scoreFromChecks(llmsChecks),       color: colorFromScore(scoreFromChecks(llmsChecks))       },
    { name: "Structured Data",         icon: "🏗️",      checks: structuredChecks, score: scoreFromChecks(structuredChecks), color: colorFromScore(scoreFromChecks(structuredChecks)) },
    { name: "Content Discoverability", icon: "🔍",       checks: discoverChecks,   score: scoreFromChecks(discoverChecks),   color: colorFromScore(scoreFromChecks(discoverChecks))   },
    { name: "Technical AI SEO",        icon: "⚙️",      checks: techChecks,       score: scoreFromChecks(techChecks),       color: colorFromScore(scoreFromChecks(techChecks))       },
  ];

  const allChecks = categories.flatMap(c => c.checks);
  const overall_score = Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length);

  return {
    categories,
    overall_score,
    grade: gradeFromScore(overall_score),
    stats: {
      checks_passed: allChecks.filter(c => c.status === "pass").length,
      checks_failed: allChecks.filter(c => c.status === "fail").length,
      checks_warned: allChecks.filter(c => c.status === "warn").length,
    },
    ai_platform_coverage: {
      chatgpt:    cov("GPTBot"),
      claude:     cov("ClaudeBot"),
      perplexity: cov("PerplexityBot"),
      gemini:     cov("Googlebot-Extended"),
      meta_ai:    cov("meta-externalagent"),
      you_com:    cov("YouBot"),
      duckduckgo: cov("DuckAssistBot"),
      apple:      cov("Applebot-Extended"),
    },
  };
}


// ── Build prompt (AI writes text only — scores computed in code) ──────────
// ── Build prompt (AI writes text only — scores computed in code) ──────────
function buildPrompt(url: string, t: Tech, customTemplate?: string): string {
  const facts =
    "SITE: " + url + "\n" +
    "ROBOTS.TXT: " + (t.robotsFound ? "found" : "not found") + "\n" +
    "BOTS ALLOWED: " + t.allowedCount + "/" + AI_BOTS.length + "\n" +
    "LLMS.TXT: " + (t.llmsFound ? "found" : "not found") + "\n" +
    "LLMS-FULL.TXT: " + (t.llmsFullFound ? "found" : "not found") + "\n" +
    "JSON-LD: " + (t.jsonLd.found ? "found, types: " + t.jsonLd.types.slice(0,3).join(", ") : "not found") + "\n" +
    "SCHEMA.ORG: " + (t.hasSchema ? "yes" : "no") + "\n" +
    "OPEN GRAPH: " + (t.ogTitle ? "present" : "missing") + "\n" +
    "META DESCRIPTION: " + (t.metaDesc ? "present" : "missing") + "\n" +
    "HTTPS: " + (t.isHttps ? "yes" : "no") + "\n" +
    "SITEMAP: " + (t.sitemapFound ? "found" : "not found") + "\n" +
    "CANONICAL: " + (t.canonical ? "present" : "missing") + "\n" +
    "H1 COUNT: " + t.h1Count + " | H2 COUNT: " + t.h2Count;

  // If custom template provided, use it with variable substitution
  if (customTemplate) {
    return customTemplate.replace(/\{url\}/g, url).replace(/\{facts\}/g, facts);
  }

  // Default prompt
  return (
    "You are an AI Visibility Auditor. Based on this real data from " + url + ":\n\n" +
    facts + "\n\n" +
    "Return ONLY this JSON (no markdown, no fences):\n" +
    "{\n" +
    '  "summary": "2 sentences about AI visibility strengths and weaknesses based on the data above",\n' +
    '  "recommendations": [\n' +
    '    {"priority": "high", "title": "short title", "description": "specific fix", "impact": "expected result"},\n' +
    '    {"priority": "high", "title": "short title", "description": "specific fix", "impact": "expected result"},\n' +
    '    {"priority": "medium", "title": "short title", "description": "specific fix", "impact": "expected result"},\n' +
    '    {"priority": "medium", "title": "short title", "description": "specific fix", "impact": "expected result"},\n' +
    '    {"priority": "low", "title": "short title", "description": "specific fix", "impact": "expected result"}\n' +
    '  ]\n' +
    "}\n\n" +
    "Rules: return ONLY the JSON. No markdown. No extra text. summary must be under 150 chars. description under 100 chars. title under 50 chars. impact under 80 chars."
  );
}


// ── JSON parser ────────────────────────────────────────────────────────────
function parseJSON(raw: string): object {
  let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("No JSON found in response");
  s = s.slice(a, b + 1);
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  try { return JSON.parse(s); } catch { /* continue */ }
  s = s.replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(s); } catch { /* continue */ }
  s = s.replace(/"(detail|description|summary|title|impact|label|reason)"\s*:\s*"([^"]*)"/g,
    (_m, key: string, val: string) => `"${key}": "${val.replace(/"/g, "'")}"`
  );
  try { return JSON.parse(s); } catch (e) {
    throw new Error("JSON parse failed: " + String(e).slice(0, 100));
  }
}

// ── Truncated-JSON recovery ────────────────────────────────────────────────
// When a model like Perplexity sonar truncates mid-response, the JSON is
// syntactically broken. This function tries to close open structures so the
// string becomes valid JSON — better than a hard failure.
function attemptJSONRecovery(raw: string): object | null {
  try {
    let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = s.indexOf("{");
    if (start === -1) return null;
    s = s.slice(start);

    // Remove trailing comma before we start closing
    s = s.replace(/,\s*$/, "");

    // Count open braces / brackets to figure out what needs closing
    let braces = 0, brackets = 0;
    let inString = false, escape = false;
    for (const ch of s) {
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") braces++;
      else if (ch === "}") braces--;
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
    }

    // Close any open structures
    let suffix = "";
    for (let i = 0; i < brackets; i++) suffix += "]";
    for (let i = 0; i < braces; i++) suffix += "}";
    const candidate = s + suffix;

    // Strip trailing comma inside the now-closed object/array
    const cleaned = candidate.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ── AI providers ───────────────────────────────────────────────────────────
async function callGemini(prompt: string, preferredModel?: string): Promise<object> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const models = preferredModel
    ? [normalizeGeminiModelName(String(preferredModel))]
    : getGeminiModelCandidates();

  const errors: string[] = [];
  for (const modelName of models) {
    // Retry on 429 with backoff (common even on paid keys).
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent(prompt);
        return parseJSON(res.response.text());
      } catch (err) {
        errors.push(`${modelName} (attempt ${attempt + 1}): ${briefProviderError(err)}`);
        if (isGeminiRateLimitError(err) && attempt < 2) {
          const waitMs = attempt === 0 ? 8_000 : 20_000;
          console.log(`[Gemini] 429/quota on ${modelName}. Retrying in ${waitMs}ms...`);
          await sleep(waitMs);
          continue;
        }
        break; // non-retriable or retries exhausted -> try next model
      }
    }
  }

  throw new Error(
    `Gemini failed (${models.join(", ")}). Errors: ` +
      errors.slice(0, 3).join(" | ") +
      (errors.length > 3 ? ` | (+${errors.length - 3} more)` : "")
  );
}

async function callOpenAI(prompt: string, model = "gpt-4o-mini"): Promise<object> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You are an AI Visibility Auditor. Return ONLY a valid JSON object. No markdown. No explanation. Start with { and end with }.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });
  return parseJSON(res.choices[0]?.message?.content || "{}");
}

async function callPerplexity(prompt: string, model = "sonar"): Promise<object> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an AI Visibility Auditor. Return ONLY a valid JSON object. " +
            "No markdown, no code fences, no explanation. " +
            "Start your response with { and end with }. " +
            "Keep all string values under 150 characters to avoid truncation.",
        },
        { role: "user", content: prompt },
      ],
      // 800 tokens is plenty for the summary + 4 recommendations; 2000 caused truncation
      max_tokens: 800,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Perplexity " + res.status + ": " + errText.slice(0, 200));
  }
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content || "{}";
  try {
    return parseJSON(raw);
  } catch (firstErr) {
    // Last-resort recovery: attempt to close truncated JSON by appending missing brackets/braces
    const recovered = attemptJSONRecovery(raw);
    if (recovered) return recovered;
    throw firstErr;
  }
}

async function callClaude(prompt: string, model = "claude-3-5-sonnet-20241022"): Promise<object> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.1,
    system: "You are an AI Visibility Auditor. Return ONLY a valid JSON object. No markdown. No explanation. Start with { and end with }.",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Claude returned non-text content");
  }

  return parseJSON(content.text);
}

async function callCopilot(prompt: string, model: string = "gpt-4o"): Promise<object> {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || model;
  
  if (!apiKey || !endpoint) throw new Error("Azure OpenAI not configured");

  // Microsoft Copilot uses Azure OpenAI
  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are an AI Visibility Auditor. Return ONLY a valid JSON object. No markdown. No explanation. Start with { and end with }.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Microsoft Copilot " + res.status + ": " + errText.slice(0, 200));
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content || "{}";
  return parseJSON(raw);
}

// ── Run all providers in parallel ─────────────────────────────────────────
interface ProviderResult {
  name: string;
  data: Record<string, unknown> | null;
  error: string | null;
  durationMs: number;
  prompt: string;
  rawResponse: string;
}

async function runAllProviders(
  prompt: string,
  settings?: AppSettings | null
): Promise<ProviderResult[]> {
  // Always use settings-based configuration
  if (!settings?.providers) {
    throw new Error("Settings not configured. Please configure providers in /settings");
  }

  const enabledProviders = settings.providers.filter(p => p.enabled && p.apiKey);
  
  if (enabledProviders.length === 0) {
    throw new Error("No AI provider enabled. Please enable and configure at least one provider in /settings");
  }

    const providerFunctions: Record<string, (prompt: string, apiKey: string, model?: string) => Promise<object>> = {
      gemini: async (prompt: string, apiKey: string, model?: string) => {
        process.env.GEMINI_API_KEY = apiKey;
        return callGemini(prompt, model);
      },
      openai: async (prompt: string, apiKey: string, model?: string) => {
        process.env.OPENAI_API_KEY = apiKey;
        return callOpenAI(prompt, model);
      },
      perplexity: async (prompt: string, apiKey: string, model?: string) => {
        process.env.PERPLEXITY_API_KEY = apiKey;
        return callPerplexity(prompt, model);
      },
      claude: async (prompt: string, apiKey: string, model?: string) => {
        process.env.ANTHROPIC_API_KEY = apiKey;
        return callClaude(prompt, model);
      },
      copilot: async (prompt: string, apiKey: string, model?: string) => {
        process.env.AZURE_OPENAI_KEY = apiKey;
        return callCopilot(prompt, model);
      },
    };

    return Promise.all(
      enabledProviders.map(async (provider): Promise<ProviderResult> => {
        const t0 = Date.now();
        const fn = providerFunctions[provider.id];
        
        if (!fn) {
          return {
            name: provider.name,
            data: null,
            error: `Provider ${provider.id} not implemented`,
            durationMs: 0,
            prompt,
            rawResponse: "",
          };
        }

        try {
          console.log("[AI] calling " + provider.name + "...");
          const data = await fn(prompt, provider.apiKey, provider.model) as Record<string, unknown>;
          const rawResponse = JSON.stringify(data, null, 2);
          console.log("[AI] " + provider.name + " done in " + (Date.now() - t0) + "ms");
          return { 
            name: provider.name, 
            data, 
            error: null, 
            durationMs: Date.now() - t0,
            prompt,
            rawResponse
          };
        } catch (err) {
          const msg = briefProviderError(err);
          console.warn("[AI] " + provider.name + " failed:", msg.slice(0, 200));
          return { 
            name: provider.name, 
            data: null, 
            error: msg, 
            durationMs: Date.now() - t0,
            prompt,
            rawResponse: ""
          };
        }
      })
    );
}

// ── Merge results ──────────────────────────────────────────────────────────
// mergeResults now only takes text from AI — scores come from computeScores()
function mergeResults(
  results: ProviderResult[],
  deterministicScores: ReturnType<typeof computeScores>,
  siteName: string,
  siteUrl: string,
): Record<string, unknown> {
  const successful = results.filter(r => r.data !== null);

  // Pick best summary (longest from any provider)
  const bestSummary = successful
    .map(r => String((r.data as Record<string, unknown>)?.summary || ""))
    .filter(s => s.length > 20)
    .sort((a, b) => b.length - a.length)[0] || "Analysis complete.";

  // Merge recommendations — strictly deduplicated by topic keywords
  const TOPIC_KEYWORDS: Record<string, string[]> = {
    robots:    ["robots.txt", "robots", "crawler", "crawl"],
    sitemap:   ["sitemap", "xml sitemap"],
    llms:      ["llms.txt", "llms-full", "llms"],
    jsonld:    ["json-ld", "jsonld", "structured data", "schema"],
    opengraph: ["open graph", "og:", "opengraph"],
    https:     ["https", "ssl", "tls"],
    canonical: ["canonical"],
    meta:      ["meta description", "meta tag"],
    twitter:   ["twitter card", "twitter"],
    lang:      ["lang", "language declaration"],
    heading:   ["heading", "h1", "h2"],
  };

  function getTopicKey(title: string, desc: string): string {
    const text = (title + " " + desc).toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw))) return topic;
    }
    // Fallback: first 25 chars of title
    return title.toLowerCase().slice(0, 25);
  }

  const seenTopics = new Set<string>();
  const mergedRecs = successful
    .flatMap(r => (r.data as Record<string, unknown>)?.recommendations as Record<string, unknown>[] || [])
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[String(a.priority)] ?? 1) - ({ high: 0, medium: 1, low: 2 }[String(b.priority)] ?? 1))
    .filter(rec => {
      const topic = getTopicKey(String(rec.title || ""), String(rec.description || ""));
      if (seenTopics.has(topic)) return false;
      seenTopics.add(topic);
      return true;
    })
    .slice(0, 8);

  // If no AI succeeded, generate basic recommendations from tech data
  const finalRecs = mergedRecs.length > 0 ? mergedRecs : [];

  return {
    site_name: siteName,
    url: siteUrl,
    // ── Deterministic scores — always same for same site ──────────────────
    overall_score: deterministicScores.overall_score,
    grade: deterministicScores.grade,
    stats: deterministicScores.stats,
    categories: deterministicScores.categories,
    ai_platform_coverage: deterministicScores.ai_platform_coverage,
    // ── AI-written text — may vary slightly between runs ─────────────────
    summary: bestSummary,
    recommendations: finalRecs,
    // ── Provider metadata ─────────────────────────────────────────────────
    _providers: results.map(r => ({
      name: r.name,
      status: r.error ? "failed" : "success",
      // Show deterministic score for each provider card (same for all)
      score: r.error ? null : deterministicScores.overall_score,
      durationMs: r.durationMs,
      error: r.error,
      prompt: r.prompt,
      rawResponse: r.rawResponse,
    })),
  };
}

// ── Citation queries ───────────────────────────────────────────────────────
export interface CitationResult {
  provider: string;
  query: string;
  systemPrompt: string;
  rawAnswer: string;
  count: number;
  urls: string[];
  allCitationUrls: string[];
  snippets: string[];
  dataSource: "live_search" | "fetched_content" | "training_data";
  status: "success" | "failed" | "unavailable";
  error?: string;
}

function citationQuery(companyName: string, companyUrl: string, customTemplate?: string): string {
  // If custom template provided, use it with variable substitution
  if (customTemplate) {
    return customTemplate
      .replace(/\{company_name\}/g, companyName)
      .replace(/\{company_url\}/g, companyUrl);
  }

  // Client-provided prompt — keep structure and wording intact.
  // Fill {company_name} and {domain} with discovered site name + URL.
  return (
    "Act as an elite Go-To-Market (GTM) Strategist and Generative Engine Optimization (GEO) expert.\n" +
    "I want you to run a deep-dive competitive landscape and GEO analysis for the following company:\n" +
    "* Company Name & URL: " + companyName + " — " + companyUrl + "\n\n" +
    "Phase 1: Live Research & Context Gathering\n\n" +
    "Before generating any analysis, you MUST search the web to research and establish ALL of the following about this company. Do not skip any item — each one feeds directly into the analysis:\n\n" +
    "1. Core Product/Service: What exactly do they sell or offer? Who is the primary target buyer persona?\n" +
    "2. Industry & Category Term: What industry do they operate in? What is the most accurate category term for their space (e.g., \"Agentic AI Support\", \"Recruitment CRM\", \"Revenue Intelligence Platform\")? Use the term their competitors and analysts use, not generic labels.\n" +
    "3. Legal Entity & Compliance: What is their registered legal entity name? Where is their HQ? Do they hold any compliance certifications (SOC 2, ISO 27001, GDPR-ready, HIPAA, FCA-regulated, etc.)? If you cannot find certifications, state that explicitly.\n" +
    "4. Key Personnel: Who are the founders and key executives? Any notable prior employers (ex-Google, ex-McKinsey, etc.) or domain expertise that builds credibility?\n" +
    "5. Recent Momentum: Any recent funding rounds, accelerator participation, partnerships, or press coverage?\n" +
    "6. Primary Competitor: Based on your research, identify their single most dominant competitor — the brand a buyer would most likely evaluate them against.\n" +
    "7. Target Keyword/Prompt: What is the most commercially valuable search query or AI prompt that a potential buyer would use when looking for a solution in this company's category? (e.g., \"best AI compliance tool\", \"CoStar alternative\", \"automated accounts payable software\")\n" +
    "8. Current Web Presence: Assess the quality and focus of their existing blog posts, case studies, whitepapers, and landing pages. Are they publishing content that targets their category term? Is it generic or specific?\n\n" +
    "Phase 2: The Analysis Generation\n\n" +
    "Using ONLY what you discovered in Phase 1 (do not fabricate details), generate the following structured analysis:\n\n" +
    "1. The Market Context\n" +
    "Write a brief, punchy introduction explaining the specific, nuanced market this company operates in. Define the main legacy problem they are trying to solve and how their approach changes the game. Reference the Category Term you identified.\n\n" +
    "2. The Competitive Landscape\n" +
    "Provide a ranked list of the leading companies in this Category Term space.\n\n" +
    "* Include legacy incumbents, direct competitors, and rising startups — as many as are genuinely relevant.\n" +
    "* You MUST include the Primary Competitor you identified.\n" +
    "* Include " + companyName + " only if they legitimately belong in this landscape based on your research. If they are too early-stage, too niche, or too unknown to rank alongside established players, say so explicitly — do not force them into the list. Honesty here is more useful than flattery.\n" +
    "* For each company, provide a 1-sentence explanation of what they are \"Best for.\"\n" +
    "* If " + companyName + " does appear, be realistic with their placement. Do not inflate their ranking.\n\n" +
    "3. Deep Dive: Where " + companyName + " Stands & Why\n" +
    "Provide a candid breakdown of their current market position:\n\n" +
    "* What works in their favour: List 2–3 highly specific product differentiators based on your research.\n" +
    "* What holds them back: Be objective about their weaknesses compared to the dominant players.\n" +
    "* Enterprise Trust & Legal Standing: How does their legal entity, HQ location, and compliance posture help or hinder their enterprise sales motion? If they lack visible certifications, flag this as a gap.\n" +
    "* Current Web Presence Critique: Based on your Phase 1 assessment — are their blogs and case studies targeting the right keywords? Are they too generic? Do they have content that would surface in an AI-generated answer about their category?\n\n" +
    "4. AI Visibility & Sentiment Analysis\n" +
    "Simulate what a real buyer would see if they asked an AI assistant the Target Keyword/Prompt you identified in Phase 1. Answer that query as you naturally would — do not factor in that " + companyName + " is the subject of this report. Your uninfluenced response is the data.\n\n" +
    "After giving that response, provide the following analysis:\n\n" +
    "* Ranking: Which companies appeared in your answer and in what order? This is their current AI visibility ranking for this keyword.\n" +
    "* Visibility verdict for " + companyName + ": Did they appear? If yes, at what position and with what framing? If no, state that clearly — do not soften it.\n" +
    "* Sentiment breakdown: For each company that appeared in your answer, classify how you framed them:\n" +
    "  — Framing type: top_pick / strong_option / niche_fit / honorable_mention / not_recommended / absent\n" +
    "  — Sentiment score: a value from -1.0 (negative) to 1.0 (positive) based on your language\n" +
    "  — Key phrases: the exact words or phrases you used that signal that sentiment (e.g., \"industry standard\", \"best for growing teams\", \"lacks enterprise features\")\n" +
    "* Why " + companyName + " ranked where they did (or didn't appear): Be specific. What signals — content, citations, brand recognition, structured data, third-party mentions — caused this outcome?"
  );
}

function citationSystemPrompt(): string {
  return (
    "You are an elite Go-To-Market (GTM) Strategist and Generative Engine Optimization (GEO) expert. " +
    "Use live web research when tools are available. " +
    "Do not fabricate; if you cannot find a required detail, state that explicitly."
  );
}

// ── Gemini citations (live Google Search) ─────────────────────────────────
async function getGeminiCitations(siteUrl: string, companyName: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();

  const attempt = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const modelCandidates = getGeminiModelCandidates();
    let lastErr: unknown = null;

    for (const modelName of modelCandidates) {
      for (let i = 0; i < 2; i++) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          // NOTE: keep options minimal for SDK compatibility.
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: sysPrompt,
          });
          const result = await model.generateContent(query);
          const response = result.response;
          const text = response.text();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const candidates = (response as any).candidates ?? [];
          const groundingChunks = candidates[0]?.groundingMetadata?.groundingChunks ?? [];
          const allSourceUrls: string[] = groundingChunks
            .map((c: Record<string, unknown>) => (c.web as Record<string, string>)?.uri ?? "")
            .filter(Boolean);
          const matchingUrls = allSourceUrls.filter((u) => u.toLowerCase().includes(domain.toLowerCase()));
          const mentionCount = text.toLowerCase().split(domain.toLowerCase()).length - 1;
          return { text, allSourceUrls, matchingUrls, mentionCount };
        } catch (err) {
          lastErr = err;
          if (isGeminiRateLimitError(err) && i === 0) {
            await sleep(12_000);
            continue;
          }
          break;
        }
      }
    }

    throw lastErr ?? new Error("Gemini citations failed");
  };

  try {
    const r = await attempt();
    return {
      provider: "Gemini 2.0 Flash", query, systemPrompt: sysPrompt, rawAnswer: r.text,
      count: r.matchingUrls.length + r.mentionCount,
      urls: r.matchingUrls.slice(0, 8), allCitationUrls: r.allSourceUrls.slice(0, 10),
      dataSource: "live_search",
      snippets: r.text.split(/[.!?]+/).filter(s => s.toLowerCase().includes(domain.toLowerCase())).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    const msg = String(err);
    const isLimit = msg.includes("429") || msg.toLowerCase().includes("resource_exhausted") || msg.toLowerCase().includes("quota");
    if (isLimit) {
      console.log("[citations] Gemini rate limit — waiting 20s...");
      await new Promise(r => setTimeout(r, 20000));
      try {
        const r = await attempt();
        return {
          provider: "Gemini 2.0 Flash", query, systemPrompt: sysPrompt, rawAnswer: r.text,
          count: r.matchingUrls.length + r.mentionCount,
          urls: r.matchingUrls.slice(0, 8), allCitationUrls: r.allSourceUrls.slice(0, 10),
          dataSource: "live_search",
          snippets: r.text.split(/[.!?]+/).filter(s => s.toLowerCase().includes(domain.toLowerCase())).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
          status: "success",
        };
      } catch { /* fall through */ }
    }
    return {
      provider: "Gemini 2.0 Flash", query, systemPrompt: sysPrompt, rawAnswer: "",
      count: 0, urls: [], allCitationUrls: [], dataSource: "live_search",
      snippets: [], status: "failed",
      error: isLimit ? "Rate limit exceeded. Try again in a minute." : msg.slice(0, 150),
    };
  }
}

// ── OpenAI citations (web_search_preview — live search) ───────────────────
async function getOpenAICitations(siteUrl: string, companyName: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use the Responses API with web_search_preview for live results
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: sysPrompt + "\n\n" + query,
    });

    // Extract text from output
    const text = response.output
      .filter((item) => item.type === "message")
      .flatMap((msg) =>
        msg.type === "message"
          ? msg.content.filter(c => c.type === "output_text").map(c => (c as { type: "output_text"; text: string }).text)
          : []
      )
      .join("");

    // Extract citation URLs from annotations
    // The Responses API puts url_citation annotations inside output_text content blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allCitationUrls: string[] = (response.output as any[])
      .filter((item: any) => item.type === "message")
      .flatMap((msg: any) => msg.content ?? [])
      .filter((c: any) => c.type === "output_text")
      .flatMap((c: any) => c.annotations ?? [])
      .filter((a: any) => a.type === "url_citation" && (a.url || a.start_index !== undefined))
      .map((a: any) => a.url ?? "")
      .filter((u: string) => u.length > 0);

    const matchingUrls = allCitationUrls.filter(u => u.toLowerCase().includes(domain.toLowerCase()));
    const mentionCount = text.toLowerCase().split(domain.toLowerCase()).length - 1;

    return {
      provider: "ChatGPT (GPT-4o)", query, systemPrompt: sysPrompt, rawAnswer: text,
      count: matchingUrls.length + mentionCount,
      urls: matchingUrls.slice(0, 8), allCitationUrls: allCitationUrls.slice(0, 10),
      dataSource: "live_search",
      snippets: text.split(/[.!?]+/).filter(s => s.toLowerCase().includes(domain.toLowerCase())).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    return {
      provider: "ChatGPT (GPT-4o)", query, systemPrompt: sysPrompt, rawAnswer: "",
      count: 0, urls: [], allCitationUrls: [], dataSource: "live_search",
      snippets: [], status: "failed", error: String(err).slice(0, 150),
    };
  }
}

// ── Perplexity citations (live web search) ────────────────────────────────
async function getPerplexityCitations(siteUrl: string, companyName: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: query }],
        max_tokens: 800,
        return_citations: true,
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const allCitationUrls: string[] = data.citations ?? [];
    const matchingCitations = allCitationUrls.filter(c => c.toLowerCase().includes(domain.toLowerCase()));
    const answer = data.choices?.[0]?.message?.content ?? "";
    const mentionCount = answer.toLowerCase().split(domain.toLowerCase()).length - 1;
    return {
      provider: "Perplexity Sonar", query, systemPrompt: sysPrompt, rawAnswer: answer,
      count: matchingCitations.length + mentionCount,
      urls: matchingCitations.slice(0, 8), allCitationUrls: allCitationUrls.slice(0, 10),
      dataSource: "live_search",
      snippets: answer.split(/[.!?]+/).filter((s: string) => s.toLowerCase().includes(domain.toLowerCase())).slice(0, 5).map((s: string) => s.trim()).filter((s: string) => s.length > 10),
      status: "success",
    };
  } catch (err) {
    return {
      provider: "Perplexity Sonar", query, systemPrompt: sysPrompt, rawAnswer: "",
      count: 0, urls: [], allCitationUrls: [], dataSource: "live_search",
      snippets: [], status: "failed", error: String(err).slice(0, 150),
    };
  }
}

// ── Run citation checks (after main analysis) ──────────────────────────────
async function runCitationChecks(
  siteUrl: string,
  companyName: string,
  skipGemini = false,
  settings?: AppSettings | null
): Promise<CitationResult[]> {
  const tasks: Promise<CitationResult>[] = [];
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const companyUrl = urlObj.origin;
  const query = citationQuery(companyName || domain, companyUrl, settings?.prompts?.citation);
  const sysPrompt = citationSystemPrompt();

  const unavailable = (provider: CitationResult["provider"], reason: string): CitationResult => ({
    provider,
    query,
    systemPrompt: sysPrompt,
    rawAnswer: "",
    count: 0,
    urls: [],
    allCitationUrls: [],
    snippets: [],
    dataSource: "live_search",
    status: "unavailable",
    error: reason,
  });

  const wrap = (provider: string, fn: () => Promise<CitationResult>): Promise<CitationResult> =>
    fn().catch((err) => ({
      provider,
      query,
      systemPrompt: sysPrompt,
      rawAnswer: "",
      count: 0,
      urls: [],
      allCitationUrls: [],
      snippets: [],
      dataSource: "live_search",
      status: "failed",
      error: String(err).slice(0, 150),
    }));

  // Always return a stable set of providers so integrators can rely on a consistent shape.
  // Each provider is either executed (success/failed) or marked unavailable with a reason.
  
  // Check settings for configured providers
  const geminiProvider = settings?.providers?.find(p => p.id === "gemini" && p.enabled && p.apiKey);
  const openaiProvider = settings?.providers?.find(p => p.id === "openai" && p.enabled && p.apiKey);
  const perplexityProvider = settings?.providers?.find(p => p.id === "perplexity" && p.enabled && p.apiKey);
  
  if (geminiProvider && !skipGemini) {
    // Temporarily set env var for citation function
    process.env.GEMINI_API_KEY = geminiProvider.apiKey;
    tasks.push(wrap("Gemini 2.0 Flash", () => getGeminiCitations(siteUrl, companyName)));
  } else {
    tasks.push(Promise.resolve(
      unavailable(
        "Gemini 2.0 Flash",
        !geminiProvider
          ? "Gemini not configured or disabled in settings"
          : "Skipped because Gemini failed during main analysis"
      )
    ));
  }

  if (openaiProvider) {
    process.env.OPENAI_API_KEY = openaiProvider.apiKey;
    tasks.push(wrap("ChatGPT (GPT-4o)", () => getOpenAICitations(siteUrl, companyName)));
  } else {
    tasks.push(Promise.resolve(unavailable("ChatGPT (GPT-4o)", "ChatGPT not configured or disabled in settings")));
  }

  if (perplexityProvider) {
    process.env.PERPLEXITY_API_KEY = perplexityProvider.apiKey;
    tasks.push(wrap("Perplexity Sonar", () => getPerplexityCitations(siteUrl, companyName)));
  } else {
    tasks.push(Promise.resolve(unavailable("Perplexity Sonar", "Perplexity not configured or disabled in settings")));
  }

  const results = await Promise.all(tasks);
  results.forEach(r => console.log("[citations] " + r.provider + ": " + r.count + " (" + r.status + ")"));
  return results;
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function OPTIONS() {
  return openaiOPTIONS();
}

export async function GET() {
  return openaiGET();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url as string | undefined;
    const bustCache = body?.bustCache as boolean | undefined;
    // Default citations ON for all integrations. Only explicit false disables.
    const runCitations = body?.runCitations === false ? false : true;
    if (!url) return NextResponse.json({ error: "URL is required", errorCode: "MISSING_URL" }, { status: 400, headers: CORS_HEADERS });

    // Load settings from Firebase
    const settings = await loadSettings();
    
    // Check if any provider is configured in settings
    const hasConfiguredProviders = settings?.providers?.some(p => p.enabled && p.apiKey);
    
    if (!settings || !hasConfiguredProviders) {
      return NextResponse.json({
        error: "No AI provider configured. Please configure at least one provider in /settings",
        errorCode: "MISSING_PROVIDER_CONFIG",
      }, { status: 500, headers: CORS_HEADERS });
    }

    const enableCache = settings?.features?.enableCache ?? true;
    const enableCitationsFromSettings = settings?.features?.enableCitations ?? true;
    const shouldRunCitations = runCitations && enableCitationsFromSettings;

    if (!bustCache && enableCache) {
      // Always use a single cache key per URL — include citations flag
      const cacheKey = url + (shouldRunCitations ? "|citations" : "|basic");
      const cached = await readCache(cacheKey) as Record<string, unknown> | null;
      if (cached) {
        console.log("[cache] serving cached result for", cacheKey);
        return NextResponse.json({ ...cached, _cached: true }, { headers: CORS_HEADERS });
      }
    }

    console.log("[fetch] gathering site data for " + url);
    const base = new URL(url).origin;
    const [robots, llms, llmsFull, homepage, sitemap] = await Promise.all([
      safeFetch(base + "/robots.txt"),
      safeFetch(base + "/llms.txt"),
      safeFetch(base + "/llms-full.txt"),
      safeFetch(base),
      safeFetch(base + "/sitemap.xml"),
    ]);

    const tech = buildTechData(url, robots.text, homepage.text, llms.text, llmsFull.text, sitemap.status === 200 && sitemap.text.includes("<url"));
    
    // Use custom analysis prompt if provided in settings
    const prompt = buildPrompt(url, tech, settings?.prompts?.analysis);

    // Run main analysis first, then citations (sequential = avoids Gemini double-quota)
    console.log("[analysis] running main analysis...");
    const providerResults = await runAllProviders(prompt, settings);

    // Check if Gemini succeeded in main analysis
    const geminiSucceededInMain = providerResults.some(r => r.name.toLowerCase().includes("gemini") && r.error === null);

    // If Gemini was used, wait for quota recovery before citations
    if (geminiSucceededInMain) {
      console.log("[citations] waiting 10s for Gemini quota recovery...");
      await new Promise(r => setTimeout(r, 10000));
    } else if (providerResults.some(r => r.name.toLowerCase().includes("gemini"))) {
      console.log("[citations] Gemini failed in main analysis — skipping Gemini citations to avoid further quota waste");
    }

    let citationResults: CitationResult[] = [];
    if (shouldRunCitations) {
      console.log("[citations] running citation checks...");
      citationResults = await runCitationChecks(url, tech.siteName, !geminiSucceededInMain, settings);
    } else {
      console.log("[citations] skipped (disabled in settings or request)");
    }

    // Compute deterministic scores from real fetched data
    const deterministicScores = computeScores(tech);
    const merged = mergeResults(providerResults, deterministicScores, tech.siteName, url);
    const final = { ...merged, citations: citationResults };
    const cacheKey = url + (shouldRunCitations ? "|citations" : "|basic");
    
    if (enableCache) {
      writeCache(cacheKey, final); // async, non-blocking
    }
    
    return NextResponse.json(final, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Analysis error:", error);
    const msg = String(error instanceof Error ? error.message : error);
    const low = msg.toLowerCase();
    const errorCode = low.includes("no ai provider") ? "MISSING_KEY"
      : (msg.includes("429") || low.includes("quota") || low.includes("rate limit")) ? "QUOTA_EXCEEDED"
      : (msg.includes("401") || msg.includes("403") || low.includes("api_key")) ? "INVALID_KEY"
      : "UNKNOWN";
    return NextResponse.json({ error: msg, errorCode }, { status: 500, headers: CORS_HEADERS });
  }
}