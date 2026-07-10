// app/api/bulk/route.ts
// POST /api/bulk — accepts up to 500 URLs, streams progress via SSE
// Each URL goes through the same credit-gated analysis pipeline as
// /api/analyze (M2). Job-level progress lives in Postgres `bulk_jobs`;
// per-URL results live in `scans` (kind='bulk_item', bulk_job_id=<job>) —
// written by /api/analyze itself, so this route only relays progress and
// tracks counters, it doesn't persist scan data directly.

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveSettings } from "@/lib/providerConfig";
import { createBulkJob, updateBulkJobCounters, completeBulkJob } from "@/lib/bulkJobs";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class AnalyzeHttpError extends Error {
  errorCode?: string;
  constructor(message: string, errorCode?: string) {
    super(message);
    this.errorCode = errorCode;
  }
}

// ── Exponential backoff retry ─────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 2000,
    label = "request",
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
          `[bulk][${label}] rate-limited, attempt ${attempt + 1}/${retries}, retrying in ${wait}ms`
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ── Analyze a single URL ──────────────────────────────────────────────────
async function analyzeSingleUrl(
  url: string,
  runCitations: boolean,
  baseUrl: string,
  cookieHeader: string,
  bulkJobId: string
): Promise<{ success: boolean; data?: object; error?: string; errorCode?: string }> {
  return withRetry(
    async () => {
      // /api/analyze is credit-gated per user (M2) — this internal
      // server-to-server call carries no session by default, so the
      // caller's cookies must be forwarded explicitly or every item 401s.
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: cookieHeader },
        body: JSON.stringify({ url, runCitations, bustCache: false, bulkJobId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new AnalyzeHttpError(data.error ?? `HTTP ${res.status}`, data.errorCode);
      }
      return { success: true, data };
    },
    { retries: 2, baseDelayMs: 3000, label: url }
  ).catch((err) => ({
    success: false,
    error: String(err instanceof Error ? err.message : err),
    errorCode: err instanceof AnalyzeHttpError ? err.errorCode : undefined,
  }));
}

// ── Concurrency limiter ────────────────────────────────────────────────────
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onDone: (result: T, index: number) => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      const result = await tasks[i]();
      results[i] = result;
      onDone(result, i);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required." } }, { status: 401, headers: CORS_HEADERS });
    }

    // Job creation itself is the rate-limited action — individual items
    // are throttled by bulk's own concurrency/delay settings, not this.
    const allowed = await checkRateLimit(`bulk:user:${user.id}`, 3, 10 * 60_000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many bulk jobs, slow down." }, { status: 429, headers: CORS_HEADERS });
    }

    const body = await request.json();

    const urls: string[] = (body?.urls ?? [])
      .map((u: string) => u.trim())
      .filter((u: string) => {
        try {
          new URL(u.startsWith("http") ? u : "https://" + u);
          return true;
        } catch {
          return false;
        }
      })
      .map((u: string) => (u.startsWith("http") ? u : "https://" + u))
      .slice(0, 500);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Citations always run unless caller explicitly passes runCitations: false.
    // No auto-disable based on URL count — bulk scans need full data too.
    const runCitations: boolean = body?.runCitations !== false;

    const safeConcurrencyMax =
      urls.length <= 50 ? 3 : urls.length <= 200 ? 2 : 1;

    const requestedConcurrency = Math.min(
      Math.max(Number(body?.concurrency ?? 2), 1),
      10
    );
    const concurrency = Math.min(requestedConcurrency, safeConcurrencyMax);

    const interTaskDelayMs =
      urls.length <= 50 ? 500 : urls.length <= 200 ? 800 : 1200;

    const settings = await getEffectiveSettings();
    const hasProviders = settings?.providers?.some((p) => p.enabled && p.apiKey);
    if (!hasProviders) {
      return NextResponse.json(
        { error: "No AI provider configured. Contact an admin to enable one." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const host = request.headers.get("host") ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;
    const cookieHeader = request.headers.get("cookie") ?? "";

    const jobId = await createBulkJob({
      userId: user.id,
      kind: "bulk_audit",
      total: urls.length,
      metadata: { runCitations, concurrency, urls },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;

        const send = (event: string, data: object) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
              )
            );
          } catch {
            closed = true;
          }
        };

        send("start", {
          jobId,
          total: urls.length,
          concurrency,
          runCitations,
          interTaskDelayMs,
          estimatedSeconds: Math.ceil((interTaskDelayMs * urls.length) / concurrency / 1000),
        });

        let completed = 0;
        let passed = 0;
        let failed = 0;
        let skipped = 0;
        // Once true, remaining un-started tasks are marked skipped instead of
        // attempted — set the moment /api/analyze reports insufficient
        // credits, so a mid-batch balance exhaustion stops the batch instead
        // of failing every remaining item one at a time.
        let creditsExhausted = false;

        const tasks = urls.map((url, idx) => async () => {
          if (creditsExhausted) {
            completed++;
            skipped++;
            const row = { url, status: "skipped" as const, error: "insufficient_credits", duration: 0, fullData: null };
            send("result", { jobId, ...row, completed, total: urls.length, passed, failed, skipped, fullData: null });
            return row;
          }

          await sleep(idx * interTaskDelayMs);

          const start = Date.now();
          send("progress", {
            jobId,
            url,
            status: "running",
            completed,
            total: urls.length,
          });

          const result = await analyzeSingleUrl(url, runCitations, baseUrl, cookieHeader, jobId);
          const duration = Date.now() - start;
          completed++;

          if (result.errorCode === "INSUFFICIENT_CREDITS") {
            creditsExhausted = true;
          }

          const d = result.data as Record<string, unknown> | undefined;

          const row = result.success
            ? {
                url,
                status: "success" as const,
                score: d?.overall_score as number,
                grade: d?.grade as string,
                site_name: d?.site_name as string,
                summary: d?.summary as string,
                duration,
                fullData: result.data ?? null,
              }
            : {
                url,
                status: "failed" as const,
                error: result.error,
                duration,
                fullData: null,
              };

          if (result.success) passed++;
          else failed++;

          await updateBulkJobCounters(jobId, { completed, failed, skipped });

          send("result", {
            jobId,
            ...row,
            completed,
            total: urls.length,
            passed,
            failed,
            skipped,
            fullData: result.success ? result.data : null,
          });

          return row;
        });

        await runWithConcurrency(tasks, concurrency, () => {});

        await completeBulkJob(jobId, "completed");

        send("done", {
          jobId,
          total: urls.length,
          passed,
          failed,
          skipped,
        });

        if (!closed) controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[bulk] error:", err);
    Sentry.captureException(err, { tags: { route: "bulk" } });
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
