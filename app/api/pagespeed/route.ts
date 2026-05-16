import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// ── Types ──────────────────────────────────────────────────────────────────

interface MetricValue { displayValue: string; score: number | null; numericValue?: number }

export interface SpeedResult {
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  metrics: {
    lcp: MetricValue;
    cls: MetricValue;
    inp: MetricValue;
    fcp: MetricValue;
    ttfb: MetricValue;
    tbt: MetricValue;
  };
  opportunities: { title: string; description: string; savingsMs?: number }[];
  diagnostics: string[];
  fetchTime: string;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function metricScore(audit: Record<string, unknown> | undefined): number | null {
  if (!audit) return null;
  const s = audit.score;
  if (typeof s === "number") return Math.round(s * 100);
  return null;
}

function metricDisplay(audit: Record<string, unknown> | undefined): string {
  if (!audit) return "—";
  return String(audit.displayValue ?? "—");
}

function numericVal(audit: Record<string, unknown> | undefined): number | undefined {
  if (!audit) return undefined;
  const n = audit.numericValue;
  return typeof n === "number" ? n : undefined;
}

function extractMetric(audit: Record<string, unknown> | undefined): MetricValue {
  return {
    displayValue: metricDisplay(audit),
    score: metricScore(audit),
    numericValue: numericVal(audit),
  };
}

async function runPSI(url: string, strategy: "mobile" | "desktop", apiKey: string): Promise<SpeedResult> {
  const params = new URLSearchParams({ url, strategy });
  if (apiKey) params.set("key", apiKey);

  let data: Record<string, unknown>;
  try {
    const res = await fetch(`${PSI}?${params}`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const errText = await res.text();
      return emptyResult(strategy, `PSI API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    data = await res.json() as Record<string, unknown>;
  } catch (err) {
    return emptyResult(strategy, String(err));
  }

  const cats = (data.lighthouseResult as Record<string, unknown> | undefined)?.categories as Record<string, Record<string, unknown>> | undefined;
  const audits = (data.lighthouseResult as Record<string, unknown> | undefined)?.audits as Record<string, Record<string, unknown>> | undefined;

  const performanceScore =
    typeof cats?.performance?.score === "number" ? Math.round(cats.performance.score * 100) : null;

  const fetchTime = String(
    (data.lighthouseResult as Record<string, unknown> | undefined)?.fetchTime ?? new Date().toISOString()
  );

  // Core Web Vitals + speed metrics
  const metrics = {
    lcp:  extractMetric(audits?.["largest-contentful-paint"]),
    cls:  extractMetric(audits?.["cumulative-layout-shift"]),
    inp:  extractMetric(audits?.["interaction-to-next-paint"] ?? audits?.["max-potential-fid"]),
    fcp:  extractMetric(audits?.["first-contentful-paint"]),
    ttfb: extractMetric(audits?.["server-response-time"]),
    tbt:  extractMetric(audits?.["total-blocking-time"]),
  };

  // Opportunities (potential savings)
  type AuditItem = Record<string, unknown>;
  const opps = Object.values(audits ?? {})
    .filter((a): a is AuditItem => {
      return typeof a === "object" && a !== null &&
        (a as AuditItem).details !== undefined &&
        typeof (a as AuditItem).score === "number" &&
        ((a as AuditItem).score as number) < 0.9 &&
        String((a as AuditItem).type ?? "") !== "manual";
    })
    .filter(a => {
      const details = a.details as Record<string, unknown> | undefined;
      return details?.type === "opportunity";
    })
    .map(a => {
      const details = a.details as Record<string, unknown> | undefined;
      const savingsMs = typeof details?.overallSavingsMs === "number" ? Math.round(details.overallSavingsMs) : undefined;
      return {
        title: String(a.title ?? ""),
        description: String(a.description ?? "").split(".")[0],
        savingsMs,
      };
    })
    .filter(o => o.title)
    .slice(0, 5);

  // Diagnostics (failed non-opportunity audits)
  const diagnostics = Object.values(audits ?? {})
    .filter((a): a is AuditItem => {
      return typeof a === "object" && a !== null &&
        typeof (a as AuditItem).score === "number" &&
        ((a as AuditItem).score as number) < 0.5 &&
        (a as AuditItem).details !== undefined &&
        (a as AuditItem).title !== undefined;
    })
    .filter(a => {
      const details = a.details as Record<string, unknown> | undefined;
      return details?.type !== "opportunity";
    })
    .map(a => String(a.title ?? ""))
    .filter(Boolean)
    .slice(0, 6);

  return { strategy, performanceScore, metrics, opportunities: opps, diagnostics, fetchTime };
}

function emptyResult(strategy: "mobile" | "desktop", error: string): SpeedResult {
  const empty: MetricValue = { displayValue: "—", score: null };
  return {
    strategy, performanceScore: null,
    metrics: { lcp: empty, cls: empty, inp: empty, fcp: empty, ttfb: empty, tbt: empty },
    opportunities: [], diagnostics: [], fetchTime: new Date().toISOString(), error,
  };
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400, headers: CORS });

    const apiKey = process.env.PAGESPEED_API_KEY ?? "";
    const [mobile, desktop] = await Promise.all([
      runPSI(url, "mobile", apiKey),
      runPSI(url, "desktop", apiKey),
    ]);

    return NextResponse.json({ mobile, desktop }, { headers: CORS });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS });
  }
}
