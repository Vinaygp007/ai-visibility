import { NextRequest, NextResponse } from "next/server";

function isSafeUrl(url: URL): boolean {
  const h = url.hostname;
  if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(h)) return false;
  if (/^10\./.test(h))                       return false;
  if (/^192\.168\./.test(h))                 return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

function validateLlmsTxt(content: string): { issues: string[]; score: number; passed: string[] } {
  const lines = content.split("\n").map(l => l.trim());
  const issues: string[] = [];
  const passed: string[] = [];
  let score = 0;

  if (lines.some(l => /^#\s+\S/.test(l))) { score += 25; passed.push("Title line present (# heading)"); }
  else issues.push("No title line — add a # heading with your site name");

  if (lines.some(l => /^>\s+\S/.test(l))) { score += 25; passed.push("Description present (> blockquote)"); }
  else issues.push("No description — add a > line summarising your site for AI");

  if (lines.some(l => /^##\s+\S/.test(l))) { score += 25; passed.push("Sections present (## headings)"); }
  else issues.push("No sections — add ## headings like ## Pages, ## Topics, ## Contact");

  if (lines.some(l => /^-\s+\S/.test(l))) { score += 25; passed.push("Content items present (- list items)"); }
  else issues.push("No list items — add - bullet points linking to key pages or topics");

  return { issues, score, passed };
}

export async function POST(req: NextRequest) {
  try {
    const { url: rawUrl } = await req.json();
    if (!rawUrl) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl); }
    catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

    if (!isSafeUrl(parsed))                             return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    if (!["http:", "https:"].includes(parsed.protocol)) return NextResponse.json({ error: "URL must be http or https" }, { status: 400 });

    const llmsUrl = `${parsed.origin}/llms.txt`;
    let content = "";
    let found = false;
    let statusCode = 0;

    try {
      const res = await fetch(llmsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AiScope/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      statusCode = res.status;
      if (res.ok) {
        content = await res.text();
        found = content.trim().length > 0;
      }
    } catch { /* treat as not found */ }

    return NextResponse.json({
      domain: parsed.hostname,
      llmsUrl,
      found,
      statusCode,
      content: found ? content.slice(0, 2500) : null,
      contentLength: content.length,
      validation: found ? validateLlmsTxt(content) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
