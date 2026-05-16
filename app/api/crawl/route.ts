import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_PAGES = 20;
const CONCURRENCY = 5;
const TIMEOUT_MS = 8000;

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<{ html: string; status: number; ms: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AiScope/1.0)", Accept: "text/html,*/*" },
      redirect: "follow",
    });
    const html = res.ok ? await res.text() : "";
    return { html, status: res.status, ms: Date.now() - t0 };
  } catch {
    return { html: "", status: 0, ms: Date.now() - t0 };
  } finally {
    clearTimeout(t);
  }
}

function getMeta(html: string, prop: string): string {
  for (const re of [
    new RegExp(`<meta[^>]+(?:name|property)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${prop}["']`, "i"),
  ]) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text.split(" ").filter(w => w.length > 1).length : 0;
}

function calcTextRatio(html: string): number {
  if (!html) return 0;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Math.round((stripped.length / html.length) * 100);
}

function getH1s(html: string): string[] {
  return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [])
    .map(h => h.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function extractLinks(html: string, baseUrl: string, currentUrl: string): string[] {
  const pat = /href=["']([^"']+)["']/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pat.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const resolved = new URL(href, currentUrl).href.split("#")[0].split("?")[0];
      const rHost = new URL(resolved).hostname;
      const bHost = new URL(baseUrl).hostname;
      if (
        (rHost === bHost || rHost.endsWith("." + bHost)) &&
        !/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js|ico|xml|json|txt|mp4|mp3|woff2?)$/i.test(resolved)
      ) seen.add(resolved);
    } catch {}
  }
  return Array.from(seen);
}

function analyzePage(
  url: string, html: string, status: number, ms: number,
  linkDepth = 0, inboundLinkCount = 0
): import("@/types").CrawlPage {
  const ok = status >= 200 && status < 400;
  const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
  const metaDesc = getMeta(html, "description");
  const h1s = ok ? getH1s(html) : [];
  const h2Count = ok ? (html.match(/<h2[\s>]/gi) || []).length : 0;
  const isIndexable = ok && !/meta[^>]+content=["'][^"']*noindex/i.test(html);
  const hasCanonical = /link[^>]+rel=["']canonical["']/i.test(html);

  const issues: string[] = [];
  if (status === 0)           issues.push("timeout / unreachable");
  else if (status >= 500)     issues.push("server error");
  else if (status >= 400)     issues.push("broken link");
  if (ok && h1s.length === 0) issues.push("missing H1");
  if (ok && h1s.length > 1)   issues.push("multiple H1s");
  if (ok && !metaTitle)       issues.push("no title tag");
  if (ok && metaTitle.length > 60)   issues.push("title too long");
  if (ok && metaTitle.length > 0 && metaTitle.length < 30) issues.push("title too short");
  if (ok && !metaDesc)        issues.push("no meta description");
  if (ok && metaDesc.length > 160)   issues.push("description too long");
  if (ok && !isIndexable)     issues.push("noindex");
  if (ok && countWords(html) < 100)  issues.push("thin content");
  if (ok && inboundLinkCount === 0 && linkDepth > 0) issues.push("orphan page");

  return {
    url, status, responseTimeMs: ms,
    wordCount: ok ? countWords(html) : 0,
    h1Text: h1s[0] || "", h1Count: h1s.length, h2Count,
    textRatioPercent: ok ? calcTextRatio(html) : 0,
    metaTitle, metaTitleLength: metaTitle.length,
    metaDescription: metaDesc, metaDescriptionLength: metaDesc.length,
    isIndexable, hasCanonical,
    linkDepth, inboundLinkCount,
    issues,
  };
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl: string = body?.url;
    const maxPages: number = Math.min(body?.maxPages ?? MAX_PAGES, MAX_PAGES);

    if (!rawUrl) return NextResponse.json({ error: "URL required" }, { status: 400, headers: CORS });

    const baseUrl = new URL(rawUrl).origin;
    const startedAt = Date.now();

    // Check robots.txt and sitemap in parallel with crawl setup
    const [robotsRes, sitemapRes] = await Promise.all([
      fetchPage(baseUrl + "/robots.txt"),
      fetchPage(baseUrl + "/sitemap.xml"),
    ]);
    const robotsTxtFound = robotsRes.status === 200 && robotsRes.html.length > 50;
    const sitemapFound   = sitemapRes.status === 200 && sitemapRes.html.includes("<url");

    // BFS crawl with link depth and inbound link tracking
    const visited   = new Set<string>([baseUrl + "/"]);
    const depthMap  = new Map<string, number>([[baseUrl + "/", 0]]);
    const inboundMap = new Map<string, number>();
    const queue: string[] = [baseUrl + "/"];
    const pages: import("@/types").CrawlPage[] = [];

    while (queue.length > 0 && pages.length < maxPages) {
      const batch = queue.splice(0, CONCURRENCY).slice(0, maxPages - pages.length);

      const results = await Promise.all(
        batch.map(async (pageUrl) => {
          const { html, status, ms } = await fetchPage(pageUrl);
          const depth = depthMap.get(pageUrl) ?? 0;
          const inbound = inboundMap.get(pageUrl) ?? 0;
          const page = analyzePage(pageUrl, html, status, ms, depth, inbound);
          const newLinks =
            html && status < 400
              ? extractLinks(html, baseUrl, pageUrl).filter(l => !visited.has(l))
              : [];
          return { page, newLinks, depth };
        })
      );

      for (const { page, newLinks, depth } of results) {
        pages.push(page);
        for (const link of newLinks) {
          if (!visited.has(link)) {
            visited.add(link);
            depthMap.set(link, depth + 1);
            queue.push(link);
          }
          inboundMap.set(link, (inboundMap.get(link) ?? 0) + 1);
        }
        if (pages.length >= maxPages) break;
      }
    }

    const crawlDurationMs = Date.now() - startedAt;
    const broken = pages.filter(p => p.status === 0 || p.status >= 400).length;
    const avgResponseTimeMs =
      pages.length > 0
        ? Math.round(pages.reduce((s, p) => s + p.responseTimeMs, 0) / pages.length)
        : 0;
    const orphanPages = pages
      .filter(p => p.inboundLinkCount === 0 && p.linkDepth > 0 && p.status < 400)
      .map(p => p.url);
    const avgLinkDepth =
      pages.length > 0
        ? Math.round((pages.reduce((s, p) => s + p.linkDepth, 0) / pages.length) * 10) / 10
        : 0;

    const statusBreakdown: Record<string, number> = {};
    for (const p of pages) {
      const bucket =
        p.status === 0 ? "error"
        : p.status < 200 ? "1xx"
        : p.status < 300 ? "2xx"
        : p.status < 400 ? "3xx"
        : p.status < 500 ? "4xx"
        : "5xx";
      statusBreakdown[bucket] = (statusBreakdown[bucket] || 0) + 1;
    }

    const totalIssues = pages.reduce((s, p) => s + p.issues.length, 0);

    return NextResponse.json(
      {
        baseUrl,
        pagesCrawled: pages.length,
        pagesBroken: broken,
        crawlDurationMs,
        avgResponseTimeMs,
        totalIssues,
        statusBreakdown,
        robotsTxtFound,
        sitemapFound,
        orphanPages,
        avgLinkDepth,
        pages,
      } satisfies import("@/types").CrawlResult,
      { headers: CORS }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS });
  }
}
