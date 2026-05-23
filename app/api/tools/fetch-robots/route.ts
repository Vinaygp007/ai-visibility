import { NextRequest, NextResponse } from "next/server";

const AI_BOTS = [
  { key: "GPTBot",             label: "ChatGPT",        company: "OpenAI",      product: "ChatGPT & Search" },
  { key: "OAI-SearchBot",      label: "ChatGPT Search", company: "OpenAI",      product: "ChatGPT Search" },
  { key: "ClaudeBot",          label: "Claude",         company: "Anthropic",   product: "Claude AI" },
  { key: "anthropic-ai",       label: "Claude (alt)",   company: "Anthropic",   product: "Claude AI" },
  { key: "PerplexityBot",      label: "Perplexity AI",  company: "Perplexity",  product: "Perplexity Search" },
  { key: "Googlebot-Extended", label: "Gemini",         company: "Google",      product: "Gemini & AI Overviews" },
  { key: "meta-externalagent", label: "Meta AI",        company: "Meta",        product: "Meta AI Assistant" },
  { key: "cohere-ai",          label: "Cohere",         company: "Cohere",      product: "Cohere Command" },
  { key: "Bytespider",         label: "ByteDance AI",   company: "ByteDance",   product: "Doubao AI" },
  { key: "CCBot",              label: "Common Crawl",   company: "CommonCrawl", product: "AI Training Data" },
  { key: "Amazonbot",          label: "Amazon AI",      company: "Amazon",      product: "Alexa & Rufus" },
  { key: "YouBot",             label: "You.com AI",     company: "You.com",     product: "You.com Search" },
  { key: "Applebot-Extended",  label: "Apple AI",       company: "Apple",       product: "Apple Intelligence" },
  { key: "DuckAssistBot",      label: "DuckDuckGo AI",  company: "DuckDuckGo",  product: "DuckAssist" },
] as const;

type BlockType = "explicit_allow" | "explicit_block" | "global_block" | "not_mentioned" | "no_robots";

function checkBot(robotsTxt: string, botKey: string): { allowed: boolean; reason: string; blockType: BlockType } {
  if (!robotsTxt) return { allowed: true, reason: "No robots.txt — allowed by default", blockType: "no_robots" };

  const lowerKey = botKey.toLowerCase();
  let inSpecific = false;
  let inGlobal = false;
  let specificDisallowAll = false;
  let specificAllow = false;
  let globalDisallowAll = false;

  for (const raw of robotsTxt.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const lower = line.toLowerCase();

    if (lower.startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();
      inSpecific = agent.toLowerCase().includes(lowerKey);
      inGlobal   = !inSpecific && agent === "*";
    } else if (inSpecific && lower.startsWith("allow:")) {
      specificAllow = true;
    } else if (inSpecific && lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path === "/") specificDisallowAll = true;
    } else if (inGlobal && lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path === "/") globalDisallowAll = true;
    }
  }

  if (specificAllow)       return { allowed: true,  reason: `Explicitly allowed via User-agent: ${botKey}`,                   blockType: "explicit_allow" };
  if (specificDisallowAll) return { allowed: false,  reason: `Blocked via User-agent: ${botKey} → Disallow: /`,               blockType: "explicit_block" };
  if (globalDisallowAll)   return { allowed: false,  reason: "Blocked by User-agent: * wildcard → Disallow: /",               blockType: "global_block"   };
  return                          { allowed: true,   reason: "Not mentioned in robots.txt — allowed by default",              blockType: "not_mentioned"  };
}

function isSafeUrl(url: URL): boolean {
  const h = url.hostname;
  if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(h)) return false;
  if (/^10\./.test(h))                       return false;
  if (/^192\.168\./.test(h))                 return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { url: rawUrl } = await req.json();
    if (!rawUrl) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl); }
    catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

    if (!isSafeUrl(parsed))                         return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    if (!["http:", "https:"].includes(parsed.protocol)) return NextResponse.json({ error: "URL must be http or https" }, { status: 400 });

    const robotsUrl = `${parsed.origin}/robots.txt`;
    let robotsTxt = "";
    let robotsFound = false;

    try {
      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AiScope/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        robotsTxt = await res.text();
        robotsFound = robotsTxt.trim().length > 10;
      }
    } catch { /* treat as no robots.txt */ }

    const results = AI_BOTS.map(bot => ({ ...bot, ...checkBot(robotsTxt, bot.key) }));
    const allowedCount = results.filter(r => r.allowed).length;

    return NextResponse.json({
      domain: parsed.hostname,
      robotsUrl,
      robotsFound,
      robotsTxtPreview: robotsTxt.slice(0, 1200),
      results,
      allowedCount,
      blockedCount: results.length - allowedCount,
      total: results.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
