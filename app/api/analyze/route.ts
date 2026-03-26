import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import crypto from "crypto";
import { getDb } from "@/lib/firebase";

// ── CORS helper for cross-origin integration demos ───────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(obj: unknown, status = 200) {
  return NextResponse.json(obj, { status, headers: CORS_HEADERS });
}

// ── Firebase Cache (1 hour TTL) ───────────────────────────────────────────
// Collection: "scans" | Doc ID: md5(url|mode) | TTL: 1 hour
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
function buildPrompt(url: string, t: Tech): string {
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
    "Rules: return ONLY the JSON. No markdown. No extra text. summary must be under 200 chars. description under 120 chars."
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

// ── AI providers ───────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<object> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const res = await model.generateContent(prompt);
  return parseJSON(res.response.text());
}

async function callOpenAI(prompt: string): Promise<object> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
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

async function callPerplexity(prompt: string): Promise<object> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
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
    throw new Error("Perplexity " + res.status + ": " + errText.slice(0, 200));
  }
  const data = await res.json();
  return parseJSON(data.choices?.[0]?.message?.content || "{}");
}

// ── Run all providers in parallel ─────────────────────────────────────────
interface ProviderResult {
  name: string;
  data: Record<string, unknown> | null;
  error: string | null;
  durationMs: number;
}

async function runAllProviders(prompt: string): Promise<ProviderResult[]> {
  const providers = [
    { name: "Gemini 2.0 Flash", fn: () => callGemini(prompt),     enabled: !!process.env.GEMINI_API_KEY     },
    { name: "ChatGPT (GPT-4o)", fn: () => callOpenAI(prompt),     enabled: !!process.env.OPENAI_API_KEY     },
    { name: "Perplexity Sonar", fn: () => callPerplexity(prompt),  enabled: !!process.env.PERPLEXITY_API_KEY },
  ];
  const active = providers.filter(p => p.enabled);
  if (active.length === 0) throw new Error("No AI provider configured. Add at least one API key.");

  return Promise.all(
    active.map(async (p): Promise<ProviderResult> => {
      const t0 = Date.now();
      try {
        console.log("[AI] calling " + p.name + "...");
        const data = await p.fn() as Record<string, unknown>;
        console.log("[AI] " + p.name + " done in " + (Date.now() - t0) + "ms");
        return { name: p.name, data, error: null, durationMs: Date.now() - t0 };
      } catch (err) {
        console.warn("[AI] " + p.name + " failed:", String(err).slice(0, 100));
        return { name: p.name, data: null, error: String(err).slice(0, 150), durationMs: Date.now() - t0 };
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

function citationQuery(domain: string): string {
  return (
    "I want to learn about the website " + domain + ". Please answer these questions:\n" +
    "1. What is " + domain + " and what does it do?\n" +
    "2. Who uses " + domain + " and why is it popular?\n" +
    "3. What are the main features or services offered by " + domain + "?\n" +
    "4. How does " + domain + " compare to similar websites or services?\n" +
    "Please be specific and detailed, mentioning " + domain + " by name throughout your answer."
  );
}

function citationSystemPrompt(): string {
  return (
    "You are a knowledgeable assistant with broad knowledge of websites and online services. " +
    "When asked about a website, provide detailed, accurate information and reference the website by name frequently. " +
    "If you know about the site, share that knowledge in detail. If you do not know it, say so honestly."
  );
}

// ── Gemini citations (live Google Search) ─────────────────────────────────
async function getGeminiCitations(siteUrl: string): Promise<CitationResult> {
  const domain = new URL(siteUrl).hostname.replace("www.", "");
  const query = citationQuery(domain);
  const sysPrompt = citationSystemPrompt();

  const attempt = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }],
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
    const matchingUrls = allSourceUrls.filter(u => u.toLowerCase().includes(domain.toLowerCase()));
    const mentionCount = text.toLowerCase().split(domain.toLowerCase()).length - 1;
    return { text, allSourceUrls, matchingUrls, mentionCount };
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
async function getOpenAICitations(siteUrl: string): Promise<CitationResult> {
  const domain = new URL(siteUrl).hostname.replace("www.", "");
  const query = citationQuery(domain);
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
async function getPerplexityCitations(siteUrl: string): Promise<CitationResult> {
  const domain = new URL(siteUrl).hostname.replace("www.", "");
  const query = citationQuery(domain);
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
async function runCitationChecks(siteUrl: string, skipGemini = false): Promise<CitationResult[]> {
  const tasks: Promise<CitationResult>[] = [];
  if (process.env.GEMINI_API_KEY && !skipGemini) tasks.push(getGeminiCitations(siteUrl));
  if (process.env.OPENAI_API_KEY)                tasks.push(getOpenAICitations(siteUrl));
  if (process.env.PERPLEXITY_API_KEY)            tasks.push(getPerplexityCitations(siteUrl));
  if (tasks.length === 0) return [];
  const results = await Promise.all(tasks);
  results.forEach(r => console.log("[citations] " + r.provider + ": " + r.count + " (" + r.status + ")"));
  return results;
}

// ── Route handler ──────────────────────────────────────────────────────────
// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET: brief endpoint info / integration example for other projects
export async function GET() {
  return json({
    name: "AiScope /api/analyze",
    description: "POST endpoint that analyzes a site for AI visibility. Use POST with JSON { url, runCitations }.",
    auth_required: false,
    example: {
      method: "POST",
      url: "/api/analyze",
      body: { url: "https://example.com", runCitations: false },
      exampleFetch: "fetch('/api/analyze', {method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url:'https://example.com'})}).then(r=>r.json())"
    },
    notes: "This demo allows cross-origin requests (CORS: *). The endpoint does not require an API key by default. In production, consider restricting allowed origins and adding auth.",
  });
}

export async function POST(request: NextRequest) {
  try {
    const { url, bustCache, runCitations = false } = await request.json();
    if (!url) return json({ error: "URL is required", errorCode: "MISSING_URL" }, 400);

    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.PERPLEXITY_API_KEY) {
      return json({
        error: "No AI provider configured. Add GEMINI_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY to .env.local",
        errorCode: "MISSING_KEY",
      }, 500);
    }

    if (!bustCache) {
      // Always use a single cache key per URL — include citations flag
      const cacheKey = url + (runCitations ? "|citations" : "|basic");
      const cached = await readCache(cacheKey) as Record<string, unknown> | null;
      if (cached) {
        console.log("[cache] serving cached result for", cacheKey);
        return json({ ...cached, _cached: true });
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
    const prompt = buildPrompt(url, tech);

    // Run main analysis first, then citations (sequential = avoids Gemini double-quota)
    console.log("[analysis] running main analysis...");
    const providerResults = await runAllProviders(prompt);

    // Check if Gemini succeeded in main analysis
    const geminiSucceededInMain = providerResults.some(r => r.name === "Gemini 2.0 Flash" && r.error === null);

    // If Gemini was used, wait for quota recovery before citations
    if (process.env.GEMINI_API_KEY && geminiSucceededInMain) {
      console.log("[citations] waiting 10s for Gemini quota recovery...");
      await new Promise(r => setTimeout(r, 10000));
    } else if (process.env.GEMINI_API_KEY && !geminiSucceededInMain) {
      console.log("[citations] Gemini failed in main analysis — skipping Gemini citations to avoid further quota waste");
    }

    let citationResults: CitationResult[] = [];
    if (runCitations) {
      console.log("[citations] running citation checks...");
      citationResults = await runCitationChecks(url, !geminiSucceededInMain);
    } else {
      console.log("[citations] skipped (runCitations=false)");
    }

    // Compute deterministic scores from real fetched data
    const deterministicScores = computeScores(tech);
    const merged = mergeResults(providerResults, deterministicScores, tech.siteName, url);
    const final = { ...merged, citations: citationResults };
    const cacheKey = url + (runCitations ? "|citations" : "|basic");
    writeCache(cacheKey, final); // async, non-blocking
    return json(final);
  } catch (error) {
    console.error("Analysis error:", error);
    const msg = String(error instanceof Error ? error.message : error);
    const low = msg.toLowerCase();
    const errorCode = low.includes("no ai provider") ? "MISSING_KEY"
      : (msg.includes("429") || low.includes("quota") || low.includes("rate limit")) ? "QUOTA_EXCEEDED"
      : (msg.includes("401") || msg.includes("403") || low.includes("api_key")) ? "INVALID_KEY"
      : "UNKNOWN";
    return json({ error: msg, errorCode }, 500);
  }
}