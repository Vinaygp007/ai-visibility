import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GET as openaiGET, OPTIONS as openaiOPTIONS } from "../openapi/route";
import type { AppSettings, AIProvider } from "@/types";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveSettings, countBillableProviders, PROVIDER_RPM_LIMITS, DEFAULT_PROVIDER_RPM, providerRateLimitBucket } from "@/lib/providerConfig";
import { spendCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { createScan, completeScan, failScan, findCachedScan, setScanLedgerDebit, insertScanResults } from "@/lib/scans";
import { qualifyReferral } from "@/lib/referrals";
import { checkRateLimit, waitForProviderSlot } from "@/lib/rateLimit";
import { captureEvent } from "@/lib/analytics/posthog";
import { guardedFetch } from "@/lib/ssrf";

// The full pipeline (main analysis + citations) can legitimately run past a
// minute once the provider-slot waits below and Gemini's own retry/backoff
// are counted — the previous unset value fell back to the platform default,
// which is short enough to kill a scan mid-flight under load.
export const maxDuration = 300;

function providerCapacityError(name: string): Error {
  return new Error(`${name} is at capacity right now (too many concurrent scans) — try again shortly.`);
}

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

// Billing errors won't resolve with retries — fail fast to avoid 56s of wasted backoff.
function isGeminiPermanentError(err: unknown): boolean {
  const msg = String(err ?? "").toLowerCase();
  return (
    msg.includes("prepayment") ||
    msg.includes("credits are depleted") ||
    msg.includes("billing") ||
    msg.includes("payment required") ||
    msg.includes("[402")
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
          // Each model version has its own separate quota pool on Google's free tier,
          // so falling back to older generations can recover from per-model quota exhaustion.
          // gemini-2.0-flash and the 1.5 generation were retired (404) as of Aug 2026 —
          // verified against the live ListModels endpoint before picking these.
          "gemini-3.6-flash",
          "gemini-3.5-flash",
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
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

const analyzeBodySchema = z.object({
  url: z.string().trim().min(1, "URL is required"),
  bustCache: z.boolean().optional(),
  disableFirestoreWrite: z.boolean().optional(),
  runCitations: z.boolean().optional(),
  bulkJobId: z.string().trim().min(1).optional(),
});

/** Normalizes a bare domain to https:// and rejects anything that isn't a well-formed http(s) URL. */
function parsePublicUrl(raw: string): string | null {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

// ── HTTP Fetcher ───────────────────────────────────────────────────────────
async function safeFetch(url: string, ms = 7000): Promise<{ text: string; status: number; headers: Record<string, string> }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await guardedFetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AiScope/1.0)", Accept: "text/html,text/plain,*/*" },
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => { headers[key.toLowerCase()] = val; });
    return { text: res.ok ? await res.text() : "", status: res.status, headers };
  } catch { return { text: "", status: 0, headers: {} }; }
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
type BlockType = "explicit_allow" | "explicit_block" | "global_block" | "not_mentioned" | "no_robots";

function checkBot(robotsTxt: string, botKey: string): {
  allowed: boolean; reason: string; directive: string | null; blockType: BlockType;
} {
  if (!robotsTxt) return {
    allowed: true, reason: "No robots.txt, allowed by default", directive: null, blockType: "no_robots",
  };

  // Preserve original casing so we can display the actual directive line
  const lines = robotsTxt.split("\n").map(l => l.trim());
  const bot = botKey.toLowerCase();
  let currentAgents: string[] = [];
  let botDisallow: string | null = null;
  let botAllow: string | null = null;
  let botFound = false;
  let globalDisallow: string | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      currentAgents = [lower.replace("user-agent:", "").trim()];
    } else if (line === "") {
      currentAgents = [];
    } else if (lower.startsWith("disallow:")) {
      const rule = lower.replace("disallow:", "").trim();
      if (currentAgents.includes(bot)) {
        botFound = true;
        if (rule === "/") botDisallow = line;
      }
      if (currentAgents.includes("*") && rule === "/") globalDisallow = line;
    } else if (lower.startsWith("allow:")) {
      const rule = lower.replace("allow:", "").trim();
      if (currentAgents.includes(bot)) {
        botFound = true;
        if (rule === "/" || rule === "") botAllow = line;
      }
    }
  }

  if (botFound && botAllow)        return { allowed: true,  reason: `${botKey} explicitly allowed`,    directive: botAllow,       blockType: "explicit_allow" };
  if (botFound && botDisallow)     return { allowed: false, reason: `${botKey} blocked in robots.txt`, directive: botDisallow,    blockType: "explicit_block" };
  if (!botFound && globalDisallow) return { allowed: false, reason: "Blocked by User-agent: * rule",   directive: globalDisallow, blockType: "global_block"   };
  return { allowed: true, reason: botFound ? `${botKey} found: no block rule` : "Not mentioned, allowed by default", directive: null, blockType: "not_mentioned" };
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

// ── Keyword extractor ──────────────────────────────────────────────────────
const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","have","has","had","do","does","did","will","would","can","could","this","that","these","those","it","its","we","you","he","she","they","their","our","your","my","his","her","not","no","nor","as","if","so","than","then","also","about","which","who","what","when","where","how","all","more","some","any","each","every","both","few","most","other","into","through","before","after","out","up","down","just","very","much","many","only","same","get","use","like","new","one","two","see","its","via","per","yet","now","here","there","very","much","such","own","too","its","been","into","over","after","while","page","site","web","www","html","http","https"]);

function extractKeywords(html: string): { word: string; count: number; inTitle: boolean; inH1: boolean; inMeta: boolean }[] {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").toLowerCase();
  const h1    = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, "").toLowerCase();
  const meta  = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "").toLowerCase();
  const text  = html
    .replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(w => w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([word, count]) => ({ word, count, inTitle: title.includes(word), inH1: h1.includes(word), inMeta: meta.includes(word) }));
}

// ── Build technical data ───────────────────────────────────────────────────
function buildTechData(
  siteUrl: string, robotsTxt: string, html: string,
  llmsTxt: string, llmsFullTxt: string, sitemapFound: boolean,
  responseHeaders: Record<string, string> = {}
) {
  const botResults = AI_BOTS.map(b => ({ ...b, access: checkBot(robotsTxt, b.key) }));
  const blocked = botResults.filter(b => !b.access.allowed);
  const allowedCount = botResults.filter(b => b.access.allowed).length;
  const jsonLd = parseJsonLd(html);

  // Security headers
  const hasHSTS       = !!responseHeaders["strict-transport-security"];
  const hasCSP        = !!responseHeaders["content-security-policy"];
  const hasXFrame     = !!(responseHeaders["x-frame-options"] || (responseHeaders["content-security-policy"] || "").includes("frame-ancestors"));
  const hasXContent   = !!responseHeaders["x-content-type-options"];
  const hasReferrer   = !!responseHeaders["referrer-policy"];

  // Advanced technical SEO
  const hasHreflang       = /link[^>]+hreflang=/i.test(html);
  const mixedContent      = siteUrl.startsWith("https") && /(?:src|href)=["']http:\/\//i.test(html);
  const canonicalTagCount = (html.match(/link[^>]+rel=["']canonical["']/gi) || []).length;
  const canonicalConflict = canonicalTagCount > 1;

  // Mobile usability
  const touchIcon      = /link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i.test(html);
  const metaThemeColor = /meta[^>]+name=["']theme-color["']/i.test(html);
  const viewportContent = html.match(/meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
  const viewportProper  = viewportContent.toLowerCase().includes("width=device-width");

  // Content quality & EEAT
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const homepageWordCount = bodyText.split(" ").filter(w => w.length > 1).length;
  const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().split(" ").length > 3);
  const avgSentenceWords = sentences.length > 0 ? Math.round(bodyText.split(" ").length / sentences.length) : 0;
  const hasAuthorSchema  = /"@type"\s*:\s*["'](?:Person|Author)["']/i.test(html);
  const hasReviewSchema  = /"@type"\s*:\s*["'](?:Review|AggregateRating)["']/i.test(html);
  const hasFAQSchema     = /"@type"\s*:\s*["']FAQPage["']/i.test(html);
  const hasAboutLink     = /href=["'][^"']*\/about[^"']*["']/i.test(html);
  const hasContactLink   = /href=["'][^"']*(?:\/contact|mailto:)[^"']*["']/i.test(html);
  const hasPrivacyLink   = /href=["'][^"']*(?:\/privacy|\/terms)[^"']*["']/i.test(html);

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
    canonical:   canonicalTagCount >= 1,
    htmlLang:    html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] || "",
    h1Count:     (html.match(/<h1[\s>]/gi) || []).length,
    h2Count:     (html.match(/<h2[\s>]/gi) || []).length,
    isHttps:     siteUrl.startsWith("https://"),
    llmsFound:        llmsTxt.length > 50,
    llmsFullFound:    llmsFullTxt.length > 50,
    llmsTxtLength:    llmsTxt.length,
    pageTitle:   html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "",
    hasSchema:   /schema\.org/i.test(html) || jsonLd.found,
    sitemapFound,
    siteName:    getSiteName(html, siteUrl),
    // Security
    hasHSTS, hasCSP, hasXFrame, hasXContent, hasReferrer,
    // Advanced technical
    hasHreflang, mixedContent, canonicalConflict,
    // Mobile
    touchIcon, metaThemeColor, viewportProper,
    // Content & EEAT
    homepageWordCount, avgSentenceWords,
    hasAuthorSchema, hasReviewSchema, hasFAQSchema,
    hasAboutLink, hasContactLink, hasPrivacyLink,
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
        : "No robots.txt: all bots allowed by default",
    },
  ];

  // Category 2: llms.txt & AI Context
  // Check 3 evaluates content depth — llms.txt must be >200 chars to count as quality
  const llmsQualityStatus: "pass"|"warn"|"fail" =
    t.llmsFound && t.llmsTxtLength > 200 ? "pass" : t.llmsFound ? "warn" : "fail";
  const llmsChecks: CheckItem[] = [
    { status: t.llmsFound ? "pass" : "fail", label: "llms.txt present",
      detail: t.llmsFound ? "llms.txt found: AI systems can read structured site context" : "Missing /llms.txt: add one to help AI systems understand your site" },
    { status: t.llmsFullFound ? "pass" : "warn", label: "llms-full.txt present",
      detail: t.llmsFullFound ? "llms-full.txt found" : "Missing /llms-full.txt: extended AI context not available" },
    { status: llmsQualityStatus, label: "AI context file quality",
      detail: t.llmsFound
        ? t.llmsTxtLength > 200
          ? "llms.txt has sufficient content (" + t.llmsTxtLength + " chars)"
          : "llms.txt is too short (" + t.llmsTxtLength + " chars): expand with site description, topics, and contact"
        : "No AI context files found: add llms.txt to guide AI systems" },
  ];

  // Category 3: Structured Data
  const structuredChecks: CheckItem[] = [
    { status: t.hasSchema ? "pass" : "fail", label: "Schema.org markup",
      detail: t.hasSchema ? "Schema.org detected" + (t.jsonLd.types.length ? " (" + t.jsonLd.types.slice(0,3).join(", ") + ")" : "") : "No Schema.org markup found" },
    { status: t.jsonLd.found ? "pass" : "fail", label: "JSON-LD structured data",
      detail: t.jsonLd.found ? "JSON-LD found" + (t.jsonLd.types.length ? ", types: " + t.jsonLd.types.join(", ") : "") : "No JSON-LD: add it for best AI comprehension" },
    { status: t.ogTitle ? "pass" : "warn", label: "Open Graph tags",
      detail: t.ogTitle ? "og:title and og:description present" : "Missing Open Graph tags" },
    { status: t.twitterCard ? "pass" : "warn", label: "Twitter/X Card",
      detail: t.twitterCard ? "Twitter card: " + t.twitterCard : "No Twitter card meta tags" },
    { status: t.metaDesc ? "pass" : "fail", label: "Meta description",
      detail: t.metaDesc ? "Meta description present" : "No meta description: critical for AI summaries" },
  ];

  // Category 4: Content Discoverability
  const h1h2Status: "pass"|"warn"|"fail" = t.h1Count >= 1 && t.h2Count >= 2 ? "pass" : t.h1Count >= 1 ? "warn" : "fail";

  // AI citation potential — data-driven from real fetched signals
  const citationSignals: string[] = [];
  if (t.jsonLd.found)   citationSignals.push("JSON-LD");
  if (t.metaDesc)       citationSignals.push("meta description");
  if (t.hasSchema)      citationSignals.push("Schema.org");
  if (t.llmsFound)      citationSignals.push("llms.txt");
  if (t.sitemapFound)   citationSignals.push("sitemap");
  const citationScore = citationSignals.length;
  const citationStatus: "pass"|"warn"|"fail" =
    citationScore >= 4 ? "pass" : citationScore >= 2 ? "warn" : "fail";
  const citationDetail =
    citationScore >= 4
      ? `Strong signals (${citationScore}/5): ${citationSignals.join(", ")}`
      : citationScore >= 2
      ? `Moderate signals (${citationScore}/5): ${citationSignals.join(", ")}, add ${t.jsonLd.found ? "" : "JSON-LD, "}${t.metaDesc ? "" : "meta description"}`.replace(/,\s*$/, "").replace(/^.*,\s*add\s*$/, `${citationScore}/5 signals: add JSON-LD and meta description`)
      : `Weak signals (${citationScore}/5): missing meta description, JSON-LD, and structured data`;

  const discoverChecks: CheckItem[] = [
    { status: t.sitemapFound ? "pass" : "warn", label: "XML Sitemap",
      detail: t.sitemapFound ? "sitemap.xml found: AI crawlers can discover all pages" : "No sitemap.xml found" },
    { status: h1h2Status, label: "Heading structure",
      detail: t.h1Count + " H1 and " + t.h2Count + " H2 tags on homepage" },
    { status: t.pageTitle ? "pass" : "fail", label: "Page title",
      detail: t.pageTitle ? "Page title present" : "No page title found" },
    { status: citationStatus, label: "AI citation potential", detail: citationDetail },
  ];

  // Category 5: Technical AI-SEO
  // AI indexing readiness — aggregates the key trust/discoverability signals
  const blockedBotCount = t.botResults.filter(b => !b.access.allowed).length;
  const majorityBotsAllowed = blockedBotCount < AI_BOTS.length / 2;
  const indexingSignals = [t.isHttps, t.sitemapFound, t.canonical, !!t.htmlLang, majorityBotsAllowed];
  const indexingPassed = indexingSignals.filter(Boolean).length;
  const indexingStatus: "pass"|"warn"|"fail" =
    indexingPassed >= 5 ? "pass" : indexingPassed >= 3 ? "warn" : "fail";
  const indexingDetail =
    indexingPassed >= 5
      ? "Fully ready: HTTPS, sitemap, canonical, language, and AI bots accessible"
      : indexingPassed >= 3
      ? `Partially ready (${indexingPassed}/5): missing ${[!t.isHttps && "HTTPS", !t.sitemapFound && "sitemap", !t.canonical && "canonical", !t.htmlLang && "lang attr", !majorityBotsAllowed && "bot access"].filter(Boolean).join(", ")}`
      : `Not ready (${indexingPassed}/5): site may not be properly indexed by AI systems`;

  const techChecks: CheckItem[] = [
    { status: t.isHttps ? "pass" : "fail", label: "HTTPS enabled",
      detail: t.isHttps ? "Site uses HTTPS: trusted by AI crawlers" : "HTTP only: upgrade to HTTPS" },
    { status: t.viewport ? "pass" : "warn", label: "Mobile viewport",
      detail: t.viewport ? "Viewport meta present" : "Missing viewport meta tag" },
    { status: t.viewportProper ? "pass" : "warn", label: "Viewport configured correctly",
      detail: t.viewportProper ? "width=device-width set: proper mobile rendering" : "Viewport missing width=device-width" },
    { status: t.touchIcon ? "pass" : "warn", label: "Apple touch icon",
      detail: t.touchIcon ? "Touch icon present: correct PWA/mobile experience" : "No apple-touch-icon: add for mobile home screen" },
    { status: t.canonicalConflict ? "warn" : t.canonical ? "pass" : "warn", label: "Canonical URL",
      detail: t.canonicalConflict ? "Multiple canonical tags: conflicts override each other" : t.canonical ? "Canonical tag present" : "No canonical tag: may cause duplicate content issues" },
    { status: t.canonicalConflict ? "fail" : "pass", label: "No canonical conflict",
      detail: t.canonicalConflict ? "Multiple canonical tags detected: keep only one" : "Single canonical tag: no conflict" },
    { status: t.hasHreflang ? "pass" : "pass", label: "Hreflang / international",
      detail: t.hasHreflang ? "hreflang tags found: international SEO configured" : "No hreflang (optional, only needed for multi-language sites)" },
    { status: t.mixedContent ? "fail" : "pass", label: "No mixed content",
      detail: t.mixedContent ? "HTTP resources found on HTTPS page: fix mixed content" : "No mixed content issues detected" },
    { status: t.htmlLang ? "pass" : "warn", label: "Language declaration",
      detail: t.htmlLang ? "lang=" + t.htmlLang : "No lang attribute on <html>" },
    { status: indexingStatus, label: "AI indexing readiness", detail: indexingDetail },
  ];

  // Category 6: Security & Headers
  const securityChecks: CheckItem[] = [
    { status: t.hasHSTS ? "pass" : "warn", label: "HSTS (Strict-Transport-Security)",
      detail: t.hasHSTS ? "HSTS header present: forces HTTPS connections" : "Missing HSTS header: add Strict-Transport-Security" },
    { status: t.hasCSP ? "pass" : "warn", label: "Content-Security-Policy",
      detail: t.hasCSP ? "CSP header configured" : "No CSP header: add to prevent XSS attacks" },
    { status: t.hasXFrame ? "pass" : "warn", label: "Clickjacking protection",
      detail: t.hasXFrame ? "X-Frame-Options or CSP frame-ancestors present" : "Missing X-Frame-Options: site may be embeddable in iframes" },
    { status: t.hasXContent ? "pass" : "warn", label: "X-Content-Type-Options",
      detail: t.hasXContent ? "X-Content-Type-Options: nosniff present" : "Missing: add X-Content-Type-Options: nosniff" },
    { status: t.hasReferrer ? "pass" : "warn", label: "Referrer-Policy",
      detail: t.hasReferrer ? "Referrer-Policy header set" : "No Referrer-Policy: controls how referrer data is shared" },
    { status: t.hasPrivacyLink ? "pass" : "warn", label: "Privacy & terms pages",
      detail: t.hasPrivacyLink ? "Privacy or terms page linked: trust signal" : "No privacy/terms link found on homepage" },
  ];

  // Category 7: Content Quality & EEAT
  const wordCountStatus: "pass"|"warn"|"fail" = t.homepageWordCount >= 300 ? "pass" : t.homepageWordCount >= 100 ? "warn" : "fail";
  const readabilityStatus: "pass"|"warn"|"fail" =
    t.avgSentenceWords === 0 ? "warn"
    : t.avgSentenceWords <= 20 ? "pass"
    : t.avgSentenceWords <= 30 ? "warn"
    : "fail";
  const contentChecks: CheckItem[] = [
    { status: wordCountStatus, label: "Homepage word count",
      detail: t.homepageWordCount + " words" + (t.homepageWordCount < 300 ? ", aim for 300+ for content depth" : ", good content volume") },
    { status: readabilityStatus, label: "Readability (sentence length)",
      detail: t.avgSentenceWords > 0 ? "Avg " + t.avgSentenceWords + " words/sentence" + (t.avgSentenceWords > 20 ? ", simplify for better readability" : ", readable") : "Could not measure" },
    { status: t.hasAuthorSchema ? "pass" : "warn", label: "Author / Person schema (EEAT)",
      detail: t.hasAuthorSchema ? "Author schema found: strong EEAT signal" : "No author schema: add Person/Author markup for EEAT" },
    { status: t.hasReviewSchema || t.hasFAQSchema ? "pass" : "warn", label: "Review or FAQ schema",
      detail: t.hasReviewSchema ? "Review/AggregateRating schema found" : t.hasFAQSchema ? "FAQPage schema found" : "No Review or FAQ schema: add for rich results" },
    { status: t.hasAboutLink ? "pass" : "warn", label: "About page linked (EEAT)",
      detail: t.hasAboutLink ? "About page linked from homepage: trust signal" : "No about page link found: add for EEAT" },
    { status: t.hasContactLink ? "pass" : "warn", label: "Contact info accessible (EEAT)",
      detail: t.hasContactLink ? "Contact link or email found: accessible to users" : "No contact link found: critical for EEAT" },
  ];

  const categories: ScoredCategory[] = [
    { name: "AI Crawler Access",       icon: "🤖", checks: crawlerChecks,    score: scoreFromChecks(crawlerChecks),    color: colorFromScore(scoreFromChecks(crawlerChecks))    },
    { name: "llms.txt and AI Context", icon: "📄", checks: llmsChecks,       score: scoreFromChecks(llmsChecks),       color: colorFromScore(scoreFromChecks(llmsChecks))       },
    { name: "Structured Data",         icon: "🏗️", checks: structuredChecks, score: scoreFromChecks(structuredChecks), color: colorFromScore(scoreFromChecks(structuredChecks)) },
    { name: "Content Discoverability", icon: "🔍", checks: discoverChecks,   score: scoreFromChecks(discoverChecks),   color: colorFromScore(scoreFromChecks(discoverChecks))   },
    { name: "Technical AI SEO",        icon: "⚙️", checks: techChecks,       score: scoreFromChecks(techChecks),       color: colorFromScore(scoreFromChecks(techChecks))       },
    { name: "Security & Headers",      icon: "🔒", checks: securityChecks,   score: scoreFromChecks(securityChecks),   color: colorFromScore(scoreFromChecks(securityChecks))   },
    { name: "Content Quality & EEAT",  icon: "✍️", checks: contentChecks,    score: scoreFromChecks(contentChecks),    color: colorFromScore(scoreFromChecks(contentChecks))    },
  ];

  const allChecks = categories.flatMap(c => c.checks);

  // Weighted score — AI-focused categories count more than security/EEAT
  // Weights: AI Crawler 25% · llms.txt 20% · Structured Data 20% ·
  //          Discoverability 15% · Technical AI SEO 12% ·
  //          Security 4% · EEAT 4%
  const WEIGHTS = [0.25, 0.20, 0.20, 0.15, 0.12, 0.04, 0.04];
  const overall_score = Math.min(100, Math.round(
    categories.reduce((sum, cat, i) => sum + cat.score * (WEIGHTS[i] ?? 0), 0)
  ));

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
    "BLOCKED AI PLATFORMS: " + (t.blocked.length > 0
      ? t.blocked.map(b => b.label + " (" + (b.access.blockType === "global_block" ? "via User-agent:* wildcard" : "direct Disallow:/") + ")").join(", ")
      : "None: all AI platforms accessible") + "\n" +
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
// Perplexity (and some other models) truncate mid-response.
// Two strategies — whichever succeeds first is returned.
function attemptJSONRecovery(raw: string): object | null {
  try {
    let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = s.indexOf("{");
    if (start === -1) return null;
    s = s.slice(start);

    // ── Strategy 1: truncated after a complete value (not mid-string) ────────
    // Walk the string tracking quote/brace state. If we finish outside a string,
    // just close the open brackets and braces — the original approach.
    {
      const trimmed = s.replace(/,\s*$/, "");
      let braces = 0, brackets = 0, inStr = false, esc = false;
      for (const ch of trimmed) {
        if (esc)  { esc = false; continue; }
        if (ch === "\\" && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "{") braces++;
        else if (ch === "}") braces--;
        else if (ch === "[") brackets++;
        else if (ch === "]") brackets--;
      }
      if (!inStr) {
        let suffix = "";
        for (let i = 0; i < brackets; i++) suffix += "]";
        for (let i = 0; i < braces; i++) suffix += "}";
        const candidate = (trimmed + suffix).replace(/,(\s*[}\]])/g, "$1");
        try { return JSON.parse(candidate); } catch { /* fall through */ }
      }
    }

    // ── Strategy 2: truncated mid-string (e.g. "pr" from "priority") ─────────
    // Walk forward tracking state. Every time a } closes an inner object while
    // still inside the outer object (braces >= 1 after decrement), record that
    // position as a safe truncation point. Then cut there and close remaining
    // open brackets/braces.
    let lastSafeClose = -1;
    {
      let braces = 0, brackets = 0, inStr = false, esc = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (esc) { esc = false; continue; }
        if (ch === "\\" && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "{") braces++;
        else if (ch === "}") {
          braces--;
          if (braces >= 1) lastSafeClose = i; // inside outer object = safe cutpoint
        }
        else if (ch === "[") brackets++;
        else if (ch === "]") brackets--;
      }
    }

    if (lastSafeClose === -1) return null;

    const truncated = s.slice(0, lastSafeClose + 1).replace(/,\s*$/, "");
    let braces = 0, brackets = 0, inStr = false, esc = false;
    for (const ch of truncated) {
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") braces++;
      else if (ch === "}") braces--;
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
    }
    let suffix = "";
    for (let i = 0; i < brackets; i++) suffix += "]";
    for (let i = 0; i < braces; i++) suffix += "}";
    const candidate = (truncated + suffix).replace(/,(\s*[}\]])/g, "$1");
    try { return JSON.parse(candidate); } catch { return null; }
  } catch {
    return null;
  }
}

// ── AI providers ───────────────────────────────────────────────────────────
async function callGemini(prompt: string, apiKey: string, preferredModel?: string): Promise<object> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const preferred = preferredModel ? normalizeGeminiModelName(String(preferredModel)) : null;
  const candidates = getGeminiModelCandidates();
  const models = preferred
    ? [preferred, ...candidates.filter(m => m !== preferred)]
    : candidates;

  const errors: string[] = [];
  for (const modelName of models) {
    // Retry on 429 with backoff (common even on paid keys).
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const res = await model.generateContent(prompt);
        // This is the only place that records which fallback candidate actually
        // served a request, since a successful call otherwise returns with no
        // trace of which model in the chain won. Check logs before pricing
        // around Gemini's cost assuming the preferred model is what's really running.
        if (modelName !== models[0]) {
          console.log(`[Gemini] serving via fallback model "${modelName}" (preferred "${models[0]}" unavailable)`);
        }
        return parseJSON(res.response.text());
      } catch (err) {
        errors.push(`${modelName} (attempt ${attempt + 1}): ${briefProviderError(err)}`);
        if (isGeminiPermanentError(err)) {
          console.log(`[Gemini] Billing error on ${modelName} — skipping all retries.`);
          break; // permanent billing failure, no point retrying any model
        }
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

async function callOpenAI(prompt: string, apiKey: string, model = "gpt-4o-mini"): Promise<object> {
  const client = new OpenAI({ apiKey });
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

async function callPerplexity(prompt: string, apiKey: string, model = "sonar"): Promise<object> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
      // 1200 tokens: enough for summary + 5 recommendations; 2000 caused truncation, 800 now too small
      max_tokens: 1200,
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

async function callClaude(prompt: string, apiKey: string, model = "claude-sonnet-4-6"): Promise<object> {
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

async function callYouCom(prompt: string, apiKey: string, model = "smart"): Promise<object> {
  if (!apiKey) throw new Error("YOUCOM_API_KEY not configured");

  const res = await fetch(`https://api.you.com/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ query: prompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("You.com " + res.status + ": " + errText.slice(0, 200));
  }

  const data = await res.json();
  const text: string = data.answer ?? data.response ?? JSON.stringify(data);
  return parseJSON(text);
}

async function callDuckDuckGoAI(_prompt: string): Promise<object> {
  throw new Error(
    "DuckDuckGo AI does not have a public API. Enable another provider for analysis generation."
  );
}

async function callMetaAI(prompt: string, apiKey: string, model = "meta-llama/Llama-3.3-70B-Instruct-Turbo"): Promise<object> {
  if (!apiKey) throw new Error("META_AI_API_KEY not configured: use a Together AI key for Meta Llama models");

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Meta AI (Together AI) " + res.status + ": " + errText.slice(0, 200));
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content || "{}";
  return parseJSON(raw);
}

async function callCopilot(prompt: string, apiKey: string, model: string = "gpt-4o"): Promise<object> {
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

    // Direct references — each call* fn takes apiKey as an explicit arg, so
    // it's safe to reuse the same call* function across concurrent requests
    // with different keys without any shared/global state in between.
    const providerFunctions: Record<string, (prompt: string, apiKey: string, model?: string) => Promise<object>> = {
      gemini: callGemini,
      "ai-overview": callGemini,
      ai_overview: callGemini,
      openai: callOpenAI,
      perplexity: callPerplexity,
      claude: callClaude,
      copilot: callCopilot,
      youcom: callYouCom,
      duckduckgo: callDuckDuckGoAI,
      meta: callMetaAI,
    };

  // If both gemini and ai-overview are enabled they share the same API key and model.
  // Run Gemini once and clone the result for ai-overview to halve quota usage.
  const geminiConfig = enabledProviders.find(p => p.id === "gemini");
  const aiOverviewConfig = enabledProviders.find(p => p.id === "ai-overview" || p.id === "ai_overview");
  let sharedGeminiPromise: Promise<ProviderResult> | null = null;

  if (geminiConfig && aiOverviewConfig) {
    const t0 = Date.now();
    console.log("[AI] calling " + geminiConfig.name + " (shared with ai-overview to save quota)...");
    sharedGeminiPromise = (async (): Promise<ProviderResult> => {
      try {
        const gotSlot = await waitForProviderSlot("gemini", PROVIDER_RPM_LIMITS.gemini);
        if (!gotSlot) throw providerCapacityError(geminiConfig.name);
        const data = await callGemini(prompt, geminiConfig.apiKey, geminiConfig.model) as Record<string, unknown>;
        const rawResponse = JSON.stringify(data, null, 2);
        console.log("[AI] " + geminiConfig.name + " done in " + (Date.now() - t0) + "ms");
        return { name: geminiConfig.name, data, error: null, durationMs: Date.now() - t0, prompt, rawResponse };
      } catch (err) {
        const msg = briefProviderError(err);
        console.warn("[AI] " + geminiConfig.name + " failed:", msg.slice(0, 200));
        return { name: geminiConfig.name, data: null, error: msg, durationMs: Date.now() - t0, prompt, rawResponse: "" };
      }
    })();
  }

  return Promise.all(
    enabledProviders.map(async (provider): Promise<ProviderResult> => {
      // Reuse the shared Gemini result for both gemini and ai-overview
      if (provider.id === "gemini" && sharedGeminiPromise) {
        return sharedGeminiPromise;
      }
      if ((provider.id === "ai-overview" || provider.id === "ai_overview") && sharedGeminiPromise) {
        const r = await sharedGeminiPromise;
        return { ...r, name: provider.name };
      }

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
        const bucket = providerRateLimitBucket(provider.id);
        const gotSlot = await waitForProviderSlot(bucket, PROVIDER_RPM_LIMITS[bucket] ?? DEFAULT_PROVIDER_RPM);
        if (!gotSlot) throw providerCapacityError(provider.name);
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
    "* Company Name & URL: " + companyName + " (" + companyUrl + ")" + "\n\n" +
    "Phase 1: Live Research & Context Gathering\n\n" +
    "Before generating any analysis, you MUST search the web to research and establish ALL of the following about this company. Do not skip any item. Each one feeds directly into the analysis:\n\n" +
    "1. Core Product/Service: What exactly do they sell or offer? Who is the primary target buyer persona?\n" +
    "2. Industry & Category Term: What industry do they operate in? What is the most accurate category term for their space (e.g., \"Agentic AI Support\", \"Recruitment CRM\", \"Revenue Intelligence Platform\")? Use the term their competitors and analysts use, not generic labels.\n" +
    "3. Legal Entity & Compliance: What is their registered legal entity name? Where is their HQ? Do they hold any compliance certifications (SOC 2, ISO 27001, GDPR-ready, HIPAA, FCA-regulated, etc.)? If you cannot find certifications, state that explicitly.\n" +
    "4. Key Personnel: Who are the founders and key executives? Any notable prior employers (ex-Google, ex-McKinsey, etc.) or domain expertise that builds credibility?\n" +
    "5. Recent Momentum: Any recent funding rounds, accelerator participation, partnerships, or press coverage?\n" +
    "6. Primary Competitor: Based on your research, identify their single most dominant competitor: the brand a buyer would most likely evaluate them against.\n" +
    "7. Target Keyword/Prompt: What is the most commercially valuable search query or AI prompt that a potential buyer would use when looking for a solution in this company's category? (e.g., \"best AI compliance tool\", \"CoStar alternative\", \"automated accounts payable software\")\n" +
    "8. Current Web Presence: Assess the quality and focus of their existing blog posts, case studies, whitepapers, and landing pages. Are they publishing content that targets their category term? Is it generic or specific?\n\n" +
    "Phase 2: The Analysis Generation\n\n" +
    "Using ONLY what you discovered in Phase 1 (do not fabricate details), generate the following structured analysis:\n\n" +
    "1. The Market Context\n" +
    "Write a brief, punchy introduction explaining the specific, nuanced market this company operates in. Define the main legacy problem they are trying to solve and how their approach changes the game. Reference the Category Term you identified.\n\n" +
    "2. The Competitive Landscape\n" +
    "Provide a ranked list of the leading companies in this Category Term space.\n\n" +
    "* Include legacy incumbents, direct competitors, and rising startups, as many as are genuinely relevant.\n" +
    "* You MUST include the Primary Competitor you identified.\n" +
    "* Include " + companyName + " only if they legitimately belong in this landscape based on your research. If they are too early-stage, too niche, or too unknown to rank alongside established players, say so explicitly. Do not force them into the list. Honesty here is more useful than flattery.\n" +
    "* For each company, provide a 1-sentence explanation of what they are \"Best for.\"\n" +
    "* If " + companyName + " does appear, be realistic with their placement. Do not inflate their ranking.\n\n" +
    "3. Deep Dive: Where " + companyName + " Stands & Why\n" +
    "Provide a candid breakdown of their current market position:\n\n" +
    "* What works in their favour: List 2–3 highly specific product differentiators based on your research.\n" +
    "* What holds them back: Be objective about their weaknesses compared to the dominant players.\n" +
    "* Enterprise Trust & Legal Standing: How does their legal entity, HQ location, and compliance posture help or hinder their enterprise sales motion? If they lack visible certifications, flag this as a gap.\n" +
    "* Current Web Presence Critique: Based on your Phase 1 assessment, are their blogs and case studies targeting the right keywords? Are they too generic? Do they have content that would surface in an AI-generated answer about their category?\n\n" +
    "4. AI Visibility & Sentiment Analysis\n" +
    "Simulate what a real buyer would see if they asked an AI assistant the Target Keyword/Prompt you identified in Phase 1. Answer that query as you naturally would. Do not factor in that " + companyName + " is the subject of this report. Your uninfluenced response is the data.\n\n" +
    "After giving that response, provide the following analysis:\n\n" +
    "* Ranking: Which companies appeared in your answer and in what order? This is their current AI visibility ranking for this keyword.\n" +
    "* Visibility verdict for " + companyName + ": Did they appear? If yes, at what position and with what framing? If no, state that clearly. Do not soften it.\n" +
    "* Sentiment breakdown: For each company that appeared in your answer, classify how you framed them:\n" +
    "  - Framing type: top_pick / strong_option / niche_fit / honorable_mention / not_recommended / absent\n" +
    "  - Sentiment score: a value from -1.0 (negative) to 1.0 (positive) based on your language\n" +
    "  - Key phrases: the exact words or phrases you used that signal that sentiment (e.g., \"industry standard\", \"best for growing teams\", \"lacks enterprise features\")\n" +
    "* Why " + companyName + " ranked where they did (or didn't appear): Be specific. What signals (content, citations, brand recognition, structured data, third-party mentions) caused this outcome?"
  );
}

function citationSystemPrompt(): string {
  return (
    "You are an elite Go-To-Market (GTM) Strategist and Generative Engine Optimization (GEO) expert. " +
    "Use live web research when tools are available. " +
    "Do not fabricate; if you cannot find a required detail, state that explicitly."
  );
}

// Prose almost never contains the literal domain string ("awwwards.com") —
// models write the brand name ("Awwwards"). Counting only domain-string
// occurrences under-counts real mentions; prefer the brand name and fall
// back to the domain only when no usable company name was discovered.
function countMentions(text: string, companyName: string, domain: string): number {
  const needle = (companyName || domain).trim().toLowerCase();
  if (!needle) return 0;
  return text.toLowerCase().split(needle).length - 1;
}

function containsMention(sentence: string, companyName: string, domain: string): boolean {
  const needle = (companyName || domain).trim().toLowerCase();
  return needle.length > 0 && sentence.toLowerCase().includes(needle);
}

// ── Gemini citations (live Google Search) ─────────────────────────────────
async function getGeminiCitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();

  const attempt = async () => {
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const modelCandidates = getGeminiModelCandidates();
    let lastErr: unknown = null;

    for (const modelName of modelCandidates) {
      for (let i = 0; i < 2; i++) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: sysPrompt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: [{ googleSearch: {} } as any],
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
          const mentionCount = countMentions(text, companyName, domain);
          return { text, allSourceUrls, matchingUrls, mentionCount };
        } catch (err) {
          lastErr = err;
          if (isGeminiPermanentError(err)) {
            console.log(`[Gemini] Billing error on ${modelName} — skipping citation retries.`);
            break;
          }
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
      snippets: r.text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    const msg = String(err);
    const isLimit = msg.includes("429") || msg.toLowerCase().includes("resource_exhausted") || msg.toLowerCase().includes("quota");
    if (isLimit && !isGeminiPermanentError(err)) {
      console.log("[citations] Gemini rate limit — waiting 20s...");
      await new Promise(r => setTimeout(r, 20000));
      try {
        const r = await attempt();
        return {
          provider: "Gemini 2.0 Flash", query, systemPrompt: sysPrompt, rawAnswer: r.text,
          count: r.matchingUrls.length + r.mentionCount,
          urls: r.matchingUrls.slice(0, 8), allCitationUrls: r.allSourceUrls.slice(0, 10),
          dataSource: "live_search",
          snippets: r.text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
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
async function getOpenAICitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();

  try {
    const client = new OpenAI({ apiKey });

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
    const mentionCount = countMentions(text, companyName, domain);

    return {
      provider: "ChatGPT (GPT-4o)", query, systemPrompt: sysPrompt, rawAnswer: text,
      // matchingUrls is a subset of allCitationUrls — a citation to a source
      // that isn't the company's own domain still counts here, since the
      // search happened while researching this specific company and reflects
      // real grounding for this query, not just an exact domain match.
      count: allCitationUrls.length + mentionCount,
      urls: matchingUrls.slice(0, 8), allCitationUrls: allCitationUrls.slice(0, 10),
      dataSource: "live_search",
      snippets: text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
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
async function getPerplexityCitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
    const mentionCount = countMentions(answer, companyName, domain);
    return {
      provider: "Perplexity Sonar", query, systemPrompt: sysPrompt, rawAnswer: answer,
      count: matchingCitations.length + mentionCount,
      urls: matchingCitations.slice(0, 8), allCitationUrls: allCitationUrls.slice(0, 10),
      dataSource: "live_search",
      snippets: answer.split(/[.!?]+/).filter((s: string) => containsMention(s, companyName, domain)).slice(0, 5).map((s: string) => s.trim()).filter((s: string) => s.length > 10),
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

// ── Claude citations ──────────────────────────────────────────────────────
async function getClaudeCitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();
  try {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: sysPrompt,
      messages: [{ role: "user", content: query }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    });
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
    const text = textBlocks.map(b => b.text).join("");

    const allCitationUrls = Array.from(new Set(
      textBlocks
        .flatMap(b => b.citations ?? [])
        .filter((c): c is Anthropic.CitationsWebSearchResultLocation => c.type === "web_search_result_location")
        .map(c => c.url)
    ));
    const matchingUrls = allCitationUrls.filter(u => u.toLowerCase().includes(domain.toLowerCase()));
    const mentionCount = countMentions(text, companyName, domain);
    return {
      provider: "Claude (Anthropic)", query, systemPrompt: sysPrompt, rawAnswer: text,
      // Same reasoning as ChatGPT's citation count: any source the web_search
      // tool returned while researching this specific company reflects real
      // grounding for the query, not just an exact domain match.
      count: allCitationUrls.length + mentionCount,
      urls: matchingUrls.slice(0, 8), allCitationUrls: allCitationUrls.slice(0, 10),
      dataSource: "live_search",
      snippets: text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    return { provider: "Claude (Anthropic)", query, systemPrompt: sysPrompt, rawAnswer: "", count: 0, urls: [], allCitationUrls: [], dataSource: "live_search", snippets: [], status: "failed", error: String(err).slice(0, 150) };
  }
}

// ── Meta AI citations ─────────────────────────────────────────────────────
async function getMetaCitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();
  try {
    if (!apiKey) throw new Error("META_AI_API_KEY not configured");
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: query }],
        max_tokens: 800,
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const mentionCount = countMentions(text, companyName, domain);
    return {
      provider: "Meta AI (Llama)", query, systemPrompt: sysPrompt, rawAnswer: text,
      count: mentionCount,
      urls: [], allCitationUrls: [], dataSource: "live_search",
      snippets: text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    return { provider: "Meta AI (Llama)", query, systemPrompt: sysPrompt, rawAnswer: "", count: 0, urls: [], allCitationUrls: [], dataSource: "live_search", snippets: [], status: "failed", error: String(err).slice(0, 150) };
  }
}

// ── You.com citations ─────────────────────────────────────────────────────
async function getYouComCitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();
  try {
    if (!apiKey) throw new Error("YOUCOM_API_KEY not configured");
    const res = await fetch("https://api.you.com/smart", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ query: sysPrompt + "\n\n" + query }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const text: string = data.answer ?? data.response ?? "";
    const hits: string[] = (data.hits ?? []).map((h: Record<string, string>) => h.url ?? "").filter(Boolean);
    const matchingUrls = hits.filter(u => u.toLowerCase().includes(domain.toLowerCase()));
    const mentionCount = countMentions(text, companyName, domain);
    return {
      provider: "You.com", query, systemPrompt: sysPrompt, rawAnswer: text,
      count: matchingUrls.length + mentionCount,
      urls: matchingUrls.slice(0, 8), allCitationUrls: hits.slice(0, 10), dataSource: "live_search",
      snippets: text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    return { provider: "You.com", query, systemPrompt: sysPrompt, rawAnswer: "", count: 0, urls: [], allCitationUrls: [], dataSource: "live_search", snippets: [], status: "failed", error: String(err).slice(0, 150) };
  }
}

// ── Copilot citations ─────────────────────────────────────────────────────
async function getCopilotCitations(siteUrl: string, companyName: string, apiKey: string): Promise<CitationResult> {
  const urlObj = new URL(siteUrl);
  const domain = urlObj.hostname.replace("www.", "");
  const query = citationQuery(companyName || domain, urlObj.origin);
  const sysPrompt = citationSystemPrompt();
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    if (!apiKey || !endpoint) throw new Error("Azure OpenAI not configured");
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: query }],
        max_tokens: 800,
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const mentionCount = countMentions(text, companyName, domain);
    return {
      provider: "Microsoft Copilot", query, systemPrompt: sysPrompt, rawAnswer: text,
      count: mentionCount,
      urls: [], allCitationUrls: [], dataSource: "live_search",
      snippets: text.split(/[.!?]+/).filter(s => containsMention(s, companyName, domain)).slice(0, 5).map(s => s.trim()).filter(s => s.length > 10),
      status: "success",
    };
  } catch (err) {
    return { provider: "Microsoft Copilot", query, systemPrompt: sysPrompt, rawAnswer: "", count: 0, urls: [], allCitationUrls: [], dataSource: "live_search", snippets: [], status: "failed", error: String(err).slice(0, 150) };
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

  const citationFns: Record<string, (siteUrl: string, companyName: string, apiKey: string) => Promise<CitationResult>> = {
    gemini: getGeminiCitations,
    openai: getOpenAICitations,
    perplexity: getPerplexityCitations,
    claude: getClaudeCitations,
    meta: getMetaCitations,
    youcom: getYouComCitations,
    copilot: getCopilotCitations,
  };

  const enabledProviders = settings?.providers?.filter(p => p.enabled && p.apiKey) ?? [];

  // Step 1: handle gemini first so ai-overview can reuse its result
  let geminiCitationPromise: Promise<CitationResult> | null = null;
  const geminiProvider = enabledProviders.find(p => p.id === "gemini");
  if (geminiProvider) {
    if (skipGemini) {
      geminiCitationPromise = Promise.resolve(unavailable("Gemini 2.0 Flash", "Skipped because Gemini failed during main analysis"));
    } else {
      geminiCitationPromise = wrap("Gemini 2.0 Flash", async () => {
        const gotSlot = await waitForProviderSlot("gemini", PROVIDER_RPM_LIMITS.gemini);
        if (!gotSlot) throw providerCapacityError("Gemini");
        return getGeminiCitations(siteUrl, companyName, geminiProvider.apiKey);
      });
    }
    tasks.push(geminiCitationPromise);
  }

  // Step 2: remaining providers
  for (const provider of enabledProviders) {
    if (provider.id === "gemini") continue; // already handled above

    if (provider.id === "duckduckgo") {
      tasks.push(Promise.resolve(unavailable("DuckDuckGo AI", "DuckDuckGo does not have a citation API")));
      continue;
    }

    if (provider.id === "ai-overview") {
      // Reuse the Gemini citation result (same API key) — just relabel as Google AI Overview
      if (geminiCitationPromise) {
        tasks.push(geminiCitationPromise.then(r => ({ ...r, provider: "Google AI Overview" })));
      } else {
        // Gemini provider not separately configured — run independently
        tasks.push(wrap("Google AI Overview", async () => {
          const gotSlot = await waitForProviderSlot("gemini", PROVIDER_RPM_LIMITS.gemini);
          if (!gotSlot) throw providerCapacityError("Google AI Overview");
          return getGeminiCitations(siteUrl, companyName, provider.apiKey).then(r => ({ ...r, provider: "Google AI Overview" }));
        }));
      }
      continue;
    }

    const fn = citationFns[provider.id];
    if (!fn) {
      tasks.push(Promise.resolve(unavailable(provider.name, `${provider.name} citations not implemented`)));
      continue;
    }

    tasks.push(wrap(provider.name, async () => {
      const bucket = providerRateLimitBucket(provider.id);
      const gotSlot = await waitForProviderSlot(bucket, PROVIDER_RPM_LIMITS[bucket] ?? DEFAULT_PROVIDER_RPM);
      if (!gotSlot) throw providerCapacityError(provider.name);
      return fn(siteUrl, companyName, provider.apiKey);
    }));
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
  let scanId: string | null = null;
  let userId: string | null = null;
  let estimatedCost = 0;
  let spendSucceeded = false;

  try {
    const parsedBody = analyzeBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) {
      return NextResponse.json({ error: "URL is required", errorCode: "MISSING_URL" }, { status: 400, headers: CORS_HEADERS });
    }
    const body = parsedBody.data;
    const url = parsePublicUrl(body.url);
    const bustCache = body.bustCache;
    // Legacy name from the Firestore era — bulk still sends this to mean
    // "don't use the shared scan cache for this call". Kept as-is rather
    // than touching bulk's request contract in this pass.
    const disableCache = body.disableFirestoreWrite === true;
    // Default citations ON for all integrations. Only explicit false disables.
    const runCitations = body.runCitations === false ? false : true;
    // Set when this call originates from /api/bulk — ties the resulting scan
    // back to its bulk_jobs row and tags it as a bulk item instead of a
    // standalone audit (see lib/scans.ts's ScanKind).
    const bulkJobId = body.bulkJobId ?? null;
    if (!url) return NextResponse.json({ error: "That doesn't look like a valid URL.", errorCode: "INVALID_URL" }, { status: 400, headers: CORS_HEADERS });

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required.", errorCode: "UNAUTHENTICATED" }, { status: 401, headers: CORS_HEADERS });
    }
    userId = user.id;

    // Rate-limit direct entry only — calls arriving with a bulkJobId came
    // from our own /api/bulk fan-out, which already throttles itself via
    // concurrency caps + inter-task delay, not raw client abuse.
    if (!bulkJobId) {
      const allowed = await checkRateLimit(`analyze:user:${user.id}`, 10, 60_000);
      if (!allowed) {
        return NextResponse.json({ error: "Too many scans, slow down.", errorCode: "RATE_LIMITED" }, { status: 429, headers: CORS_HEADERS });
      }
    }

    const settings = await getEffectiveSettings();
    const hasConfiguredProviders = settings?.providers?.some(p => p.enabled && p.apiKey);

    if (!settings || !hasConfiguredProviders) {
      return NextResponse.json({
        error: "No AI provider configured. Contact an admin to enable one.",
        errorCode: "MISSING_PROVIDER_CONFIG",
      }, { status: 500, headers: CORS_HEADERS });
    }

    const enableCache = !disableCache && (settings?.features?.enableCache ?? true);
    const enableCitationsFromSettings = settings?.features?.enableCitations ?? true;
    const shouldRunCitations = runCitations && enableCitationsFromSettings;
    // Always use a single cache key per URL — include citations flag
    const cacheKey = url + (shouldRunCitations ? "|citations" : "|basic");

    if (!bustCache && enableCache) {
      // A cache hit costs nothing — no fresh provider spend occurs — so this
      // check must happen before any credit is spent, not after.
      const cached = await findCachedScan(user.id, cacheKey);
      if (cached) {
        console.log("[cache] serving cached result for", cacheKey);
        if (bulkJobId) {
          // Bulk history (app/api/bulk-history) rebuilds each job's result
          // list from `scans` rows filtered by bulk_job_id — a cache hit
          // must still get its own row here, or the item silently vanishes
          // from the saved report even though it counted toward "passed".
          try {
            const cachedScanId = await createScan({
              userId: user.id,
              kind: "bulk_item",
              bulkJobId,
              url,
              creditsCost: 0,
              cacheKey,
            });
            await completeScan(cachedScanId, {
              result: cached.result,
              visibilityScore: (cached.result as { overall_score?: number })?.overall_score ?? null,
            });
          } catch (err) {
            console.warn("[scans] failed to persist cache-hit bulk item:", err);
          }
        }
        return NextResponse.json({ ...cached.result, _cached: true }, { headers: CORS_HEADERS });
      }
    }

    // Cost: billable providers × (2 "queries" if citations run, else 1) —
    // matches spec §6.3 (credits = queries × engines). ai-overview sharing
    // Gemini's call is already excluded by countBillableProviders.
    estimatedCost = countBillableProviders(settings.providers) * (shouldRunCitations ? 2 : 1);

    scanId = await createScan({
      userId: user.id,
      kind: bulkJobId ? "bulk_item" : "audit",
      bulkJobId,
      url,
      creditsCost: estimatedCost,
      cacheKey,
    });

    try {
      const spendResult = await spendCredits(user.id, estimatedCost, scanId, `scan_debit:${scanId}`);
      spendSucceeded = true;
      await setScanLedgerDebit(scanId, spendResult.ledgerId);
      captureEvent(user.id, "scan_started", { scan_id: scanId, kind: bulkJobId ? "bulk_item" : "audit", url });
      captureEvent(user.id, "credits_spent", { scan_id: scanId, amount: estimatedCost, type: "scan_debit" });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        await failScan(scanId, "insufficient_credits");
        return NextResponse.json({
          error: `You need ${estimatedCost} credits to run this scan.`,
          errorCode: "INSUFFICIENT_CREDITS",
        }, { status: 402, headers: CORS_HEADERS });
      }
      throw err;
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

    const tech = buildTechData(url, robots.text, homepage.text, llms.text, llmsFull.text, sitemap.status === 200 && sitemap.text.includes("<url"), homepage.headers);
    
    // Use custom analysis prompt if provided in settings
    const prompt = buildPrompt(url, tech, settings?.prompts?.analysis);

    // Run main analysis first, then citations (sequential = avoids Gemini double-quota)
    console.log("[analysis] running main analysis...");
    const providerResults = await runAllProviders(prompt, settings);

    // Check if Gemini (or ai-overview, which shares the same key) succeeded in main analysis
    const geminiSucceededInMain = providerResults.some(r =>
      (r.name.toLowerCase().includes("gemini") || r.name.toLowerCase().includes("overview")) && r.error === null
    );

    // If Gemini was used, wait for quota recovery before citations
    if (geminiSucceededInMain) {
      console.log("[citations] waiting 30s for Gemini quota recovery...");
      await new Promise(r => setTimeout(r, 30000));
    } else if (providerResults.some(r => r.name.toLowerCase().includes("gemini") || r.name.toLowerCase().includes("overview"))) {
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
    const botResultsExport = tech.botResults.map(b => ({
      key: b.key,
      label: b.label,
      company: b.company,
      allowed: b.access.allowed,
      reason: b.access.reason,
      directive: b.access.directive,
      blockType: b.access.blockType,
    }));
    const keywords = extractKeywords(homepage.text);
    const final = { ...merged, citations: citationResults, _botResults: botResultsExport, keywords };

    // "Some providers failed, others didn't" still returns 200 below (unchanged
    // behavior) — only the all-failed case is treated as a billing failure.
    // M2 ships all-or-nothing refund; proportional refund per failed provider
    // is a deliberate fast-follow, not an oversight.
    const allProvidersFailed = providerResults.every(r => r.error !== null);
    if (allProvidersFailed) {
      await refundCredits(userId!, estimatedCost, scanId, `scan_refund:${scanId}`);
      await failScan(scanId, "all_providers_failed");
      captureEvent(userId!, "scan_failed", { scan_id: scanId, error_code: "all_providers_failed", refunded: true });
    } else {
      await completeScan(scanId, { result: final, visibilityScore: deterministicScores.overall_score });
      captureEvent(userId!, "scan_completed", { scan_id: scanId, visibility_score: deterministicScores.overall_score });
      if (citationResults.length > 0) {
        // Additive persistence, not a new computation — same CitationResult
        // objects already built above. Best-effort: never blocks the response.
        insertScanResults(
          scanId,
          citationResults.map(c => ({
            engine: c.provider,
            query: c.query,
            mentioned: c.count > 0,
            rawResponse: c.rawAnswer,
            citations: c.allCitationUrls,
          }))
        ).catch(err => console.warn("[scans] insertScanResults failed:", err));
      }
      // Best-effort, no-ops if this user has no pending referral.
      qualifyReferral(userId!).catch(() => {});
    }

    return NextResponse.json(final, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Analysis error:", error);
    Sentry.captureException(error, { tags: { route: "analyze" }, user: userId ? { id: userId } : undefined });
    const msg = String(error instanceof Error ? error.message : error);
    const low = msg.toLowerCase();
    const errorCode = low.includes("no ai provider") ? "MISSING_KEY"
      : (msg.includes("429") || low.includes("quota") || low.includes("rate limit")) ? "QUOTA_EXCEEDED"
      : (msg.includes("401") || msg.includes("403") || low.includes("api_key")) ? "INVALID_KEY"
      : "UNKNOWN";

    // Only refund if we actually charged (spendSucceeded) — a thrown error
    // before that point (bad URL, JSON parse crash) never touched credits.
    if (spendSucceeded && userId && scanId) {
      try {
        await refundCredits(userId, estimatedCost, scanId, `scan_refund:${scanId}`);
        await failScan(scanId, msg);
        captureEvent(userId, "scan_failed", { scan_id: scanId, error_code: errorCode, refunded: true });
      } catch (refundErr) {
        console.error("[analyze] refund-on-error failed:", refundErr);
      }
    }

    return NextResponse.json({ error: msg, errorCode }, { status: 500, headers: CORS_HEADERS });
  }
}