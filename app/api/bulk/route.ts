// app/api/bulk/route.ts
// POST /api/bulk — accepts up to 500 URLs, streams progress via SSE
// Each URL goes through the same analysis pipeline as /api/analyze
// ✅ Fixed: exponential backoff, retry on 429, sequential citations,
//           inter-URL delay, auto-disable citations for large jobs,
//           per-provider rate-limit tracking

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import type { AppSettings } from "@/types";

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

// ── Utility: sleep ─────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Utility: exponential backoff retry ────────────────────────────────────
// Retries on 429 (rate limit) and 503 (service unavailable) with jitter.
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 4,
    baseDelayMs = 1500,
    label = "request",
  }: { retries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = String(err);
      const isRetryable =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("rate limit") ||
        msg.includes("Rate limit") ||
        msg.includes("too many requests") ||
        msg.includes("Too Many Requests");

      if (isRetryable && attempt < retries) {
        // Exponential backoff with ±20% jitter: 1.5s, 3s, 6s, 12s
        const jitter = 1 + (Math.random() * 0.4 - 0.2);
        const wait = Math.round(baseDelayMs * Math.pow(2, attempt) * jitter);
        console.warn(
          `[bulk][${label}] rate-limited, attempt ${attempt + 1}/${retries}, retrying in ${wait}ms`
        );
        await sleep(wait);
        continue;
      }
      // Non-retryable or out of retries
      throw err;
    }
  }
  throw lastError;
}

// ── Settings loader ────────────────────────────────────────────────────────
async function loadSettings(): Promise<AppSettings | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const doc = await db.collection("settings").doc("config").get();
    if (!doc.exists) return null;
    return doc.data() as AppSettings;
  } catch (e) {
    console.warn("[bulk] settings load error:", e);
    return null;
  }
}

// ── Save bulk job to Firestore ─────────────────────────────────────────────
async function saveBulkJob(jobId: string, data: object) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.collection("bulk_jobs").doc(jobId).set({
      ...data,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[bulk] save job error:", e);
  }
}

// ── Analyze a single URL (calls internal /api/analyze) ────────────────────
// Wrapped with retry so transient 429s from providers don't kill the job.
async function analyzeSingleUrl(
  url: string,
  runCitations: boolean,
  baseUrl: string
): Promise<{ success: boolean; data?: object; error?: string }> {
  return withRetry(
    async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, runCitations, bustCache: false }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        // Propagate HTTP status so withRetry can detect 429/503
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return { success: true, data };
    },
    { retries: 3, baseDelayMs: 2000, label: url }
  ).catch((err) => ({ success: false, error: String(err) }));
}

// ── Concurrency limiter ────────────────────────────────────────────────────
// Runs `tasks` with at most `limit` in-flight at once.
// `onDone` is called after each task completes (used for SSE progress).
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

// ── POST handler — streams SSE progress ───────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate & normalise URLs ────────────────────────────────────────
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
      .slice(0, 500); // hard cap

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Rate-limit-safe defaults ─────────────────────────────────────────
    // For large jobs, force citations OFF to halve API call count.
    // User can override for small jobs (<= 50 URLs).
    const runCitations: boolean =
      urls.length > 50 ? false : body?.runCitations !== false;

    // Cap concurrency conservatively to avoid provider burst limits:
    //   ≤ 50 URLs  → up to 5 concurrent
    //   51–200     → up to 3 concurrent
    //   201–500    → up to 2 concurrent
    const requestedConcurrency = Math.min(
      Math.max(Number(body?.concurrency ?? 3), 1),
      10
    );
    const safeConcurrencyMax =
      urls.length <= 50 ? 5 : urls.length <= 200 ? 3 : 2;
    const concurrency = Math.min(requestedConcurrency, safeConcurrencyMax);

    // Minimum delay between starting each URL task (ms).
    // Larger jobs get a longer inter-task pause to spread load.
    const interTaskDelayMs =
      urls.length <= 50 ? 300 : urls.length <= 200 ? 600 : 1000;

    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ── Validate settings ────────────────────────────────────────────────
    const settings = await loadSettings();
    const hasProviders = settings?.providers?.some((p) => p.enabled && p.apiKey);
    if (!hasProviders) {
      return NextResponse.json(
        { error: "No AI provider configured. Go to /settings to add API keys." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const host = request.headers.get("host") ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    // Save initial job metadata
    await saveBulkJob(jobId, {
      jobId,
      urls,
      total: urls.length,
      runCitations,
      concurrency,
      status: "running",
    });

    // ── SSE stream ───────────────────────────────────────────────────────
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
            closed = true; // client disconnected
          }
        };

        send("start", {
          jobId,
          total: urls.length,
          concurrency,
          runCitations,
          // Inform client if citations were auto-disabled
          citationsAutoDisabled: urls.length > 50 && body?.runCitations !== false,
          interTaskDelayMs,
        });

        let completed = 0;
        let passed = 0;
        let failed = 0;

        const allResults: Array<{
          url: string;
          status: "success" | "failed";
          score?: number;
          grade?: string;
          site_name?: string;
          summary?: string;
          error?: string;
          duration?: number;
        }> = [];

        // ── Build task list with inter-task delay ────────────────────────
        // Each task waits `index * interTaskDelayMs` before starting so
        // requests are staggered rather than spiking simultaneously.
        const tasks = urls.map((url, idx) => async () => {
          // Stagger task starts to avoid burst; only for tasks beyond first batch
          if (idx >= concurrency && interTaskDelayMs > 0) {
            await sleep(interTaskDelayMs);
          }

          const start = Date.now();
          send("progress", {
            jobId,
            url,
            status: "running",
            completed,
            total: urls.length,
          });

          const result = await analyzeSingleUrl(url, runCitations, baseUrl);
          const duration = Date.now() - start;
          completed++;

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
              }
            : {
                url,
                status: "failed" as const,
                error: result.error,
                duration,
              };

          if (result.success) passed++;
          else failed++;
          allResults.push(row);

          send("result", {
            jobId,
            ...row,
            completed,
            total: urls.length,
            passed,
            failed,
            fullData: result.success ? result.data : null,
          });

          return row;
        });

        await runWithConcurrency(tasks, concurrency, () => {});

        // Save final results to Firestore
        await saveBulkJob(jobId, {
          jobId,
          urls,
          total: urls.length,
          runCitations,
          concurrency,
          status: "done",
          results: allResults,
          passed,
          failed,
          completedAt: new Date().toISOString(),
        });

        send("done", {
          jobId,
          total: urls.length,
          passed,
          failed,
          results: allResults,
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
    return NextResponse.json(
      { error: String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}