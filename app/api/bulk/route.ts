// app/api/bulk/route.ts
// POST /api/bulk — accepts up to 500 URLs, streams progress via SSE
// Each URL goes through the same analysis pipeline as /api/analyze
// ✅ Fixed v2:
//   - ALL tasks staggered from t=0 (not just idx >= concurrency)
//   - Lower safe concurrency: ≤50→3, 51-200→2, 201-500→1 (sequential)
//   - Higher inter-task delay: ≤50→500ms, 51-200→800ms, 201-500→1200ms
//   - Single retry layer (bulk only), analyze route retries removed from chain
//   - citationsAutoDisabled for >50 URLs (unchanged)

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
        // Exponential backoff with ±20% jitter: 2s, 4s, 8s
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

// ── Analyze a single URL ──────────────────────────────────────────────────
// NOTE: We do NOT nest retries here — the internal /api/analyze already has
// its own retry logic. Only one retry layer should exist per call to avoid
// exponential retry storms under rate limiting.
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
        // bustCache: false — reuse cached results to avoid redundant provider calls
        body: JSON.stringify({ url, runCitations, bustCache: false }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return { success: true, data };
    },
    { retries: 2, baseDelayMs: 3000, label: url }
  ).catch((err) => ({ success: false, error: String(err) }));
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

    // Auto-disable citations for large jobs to halve provider API call count
    const runCitations: boolean =
      urls.length > 50 ? false : body?.runCitations !== false;

    // ── Tighter concurrency caps to avoid provider burst limits ───────────
    // Each "slot" fires N_providers sequential calls per URL.
    // With 3 providers and inter-provider delay of 800ms, one slot takes
    // ~2.4s minimum per URL — so 2 concurrent = ~4.8s worth of load/minute.
    // Perplexity free tier = 20 RPM; Gemini = 15 RPM; GPT-4o-mini = 500 RPM.
    // Bottleneck is always the strictest provider.
    //
    //   ≤ 50 URLs  → 3 concurrent  (~9 provider calls/cycle, staggered)
    //   51–200     → 2 concurrent  (~6 provider calls/cycle)
    //   201–500    → 1 concurrent  (sequential, safest for Perplexity/Gemini)
    const safeConcurrencyMax =
      urls.length <= 50 ? 3 : urls.length <= 200 ? 2 : 1;

    const requestedConcurrency = Math.min(
      Math.max(Number(body?.concurrency ?? 2), 1),
      10
    );
    const concurrency = Math.min(requestedConcurrency, safeConcurrencyMax);

    // ── Inter-task delay: stagger ALL task starts ─────────────────────────
    // Every task waits `idx * interTaskDelayMs` before starting.
    // This prevents the first `concurrency` tasks from all firing together.
    // Larger jobs need longer delays since providers have per-minute caps.
    const interTaskDelayMs =
      urls.length <= 50 ? 500 : urls.length <= 200 ? 800 : 1200;

    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

    await saveBulkJob(jobId, {
      jobId,
      urls,
      total: urls.length,
      runCitations,
      concurrency,
      status: "running",
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
          citationsAutoDisabled: urls.length > 50 && body?.runCitations !== false,
          interTaskDelayMs,
          // Estimated time in seconds (rough: interTaskDelayMs × total / concurrency / 1000)
          estimatedSeconds: Math.ceil((interTaskDelayMs * urls.length) / concurrency / 1000),
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

        // ── Stagger ALL tasks from the very beginning ─────────────────────
        // Previously only tasks with idx >= concurrency were delayed, meaning
        // the first `concurrency` tasks all fired simultaneously — causing
        // a burst spike. Now every task has its own stagger offset.
        const tasks = urls.map((url, idx) => async () => {
          // Stagger: task 0 starts at t=0, task 1 at t=delay, task 2 at t=2*delay, etc.
          // Workers pick up tasks as they become available, so the actual start
          // time is max(worker_free_at, idx * interTaskDelayMs).
          await sleep(idx * interTaskDelayMs);

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