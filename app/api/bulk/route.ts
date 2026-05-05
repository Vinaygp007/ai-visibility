// app/api/bulk/route.ts
// POST /api/bulk — accepts up to 500 URLs, streams progress via SSE
// Each URL goes through the same analysis pipeline as /api/analyze
// ✅ Fixed v4:
//   - Citations ALWAYS run regardless of URL count (removed >50 auto-disable)
//   - ONE job doc: bulk_scan/{jobId}  (metadata + summary counters only)
//   - PER-URL subdocs: bulk_scan/{jobId}/results/{urlHash}  (no more results[] array)
//   - Job doc uses .set() on create, .update() on progress (preserves createdAt)
//   - ALL tasks staggered from t=0 (not just idx >= concurrency)
//   - Concurrency caps prevent provider rate-limit 429s (≤50→3, 51-200→2, 201-500→1)
//   - Higher inter-task delay: ≤50→500ms, 51-200→800ms, 201-500→1200ms
//   - Single retry layer (bulk only), analyze route retries removed from chain

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/firebase";
import type { AppSettings } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 3600;

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

const COLLECTION = "bulk_scan";

/** Stable subdoc ID derived from the URL — deterministic & safe for Firestore */
function urlDocId(url: string) {
  return crypto.createHash("md5").update(url).digest("hex").slice(0, 24);
}

// ── Job-level doc (no results array) ─────────────────────────────────────
// Structure: bulk_scan/{jobId}
async function createJobDoc(jobId: string, data: object) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .collection(COLLECTION)
      .doc(jobId)
      .set({ ...data, createdAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[bulk] createJobDoc error:", e);
  }
}

async function updateJobDoc(jobId: string, data: object) {
  const db = await getDb();
  if (!db) return;
  try {
    // .update() preserves createdAt and other fields not mentioned here
    await db
      .collection(COLLECTION)
      .doc(jobId)
      .update({ ...data, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[bulk] updateJobDoc error:", e);
  }
}

// ── Per-URL subdoc ────────────────────────────────────────────────────────
// Structure: bulk_scan/{jobId}/results/{urlHash}
async function saveResultSubDoc(
  jobId: string,
  url: string,
  data: object
) {
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .collection(COLLECTION)
      .doc(jobId)
      .collection("results")
      .doc(urlDocId(url))
      .set({ ...data, savedAt: new Date().toISOString() });
  } catch (e) {
    console.warn("[bulk] saveResultSubDoc error:", e);
  }
}

// ── Analyze a single URL ──────────────────────────────────────────────────
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
        body: JSON.stringify({ url, runCitations, bustCache: false, disableFirestoreWrite: true }),
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

    // ── Create the single job document (no results array) ─────────────────
    await createJobDoc(jobId, {
      type: "job",
      jobId,
      urls,           // keep url list on job doc for reference
      total: urls.length,
      runCitations,
      concurrency,
      status: "running",
      passed: 0,
      failed: 0,
      completed: 0,
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

        const tasks = urls.map((url, idx) => async () => {
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

          // ── Save this URL as its own subdoc ───────────────────────────
          // bulk_scan/{jobId}/results/{urlHash}
          await saveResultSubDoc(jobId, url, row);

          // ── Update job doc counters only (no results array) ───────────
          await updateJobDoc(jobId, { passed, failed, completed });

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

        // ── Mark job as done ──────────────────────────────────────────────
        await updateJobDoc(jobId, {
          status: "done",
          passed,
          failed,
          completed,
          completedAt: new Date().toISOString(),
        });

        send("done", {
          jobId,
          total: urls.length,
          passed,
          failed,
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