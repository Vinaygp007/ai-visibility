// app/api/bulk/route.ts
// POST /api/bulk — accepts up to 500 URLs, streams progress via SSE
// Each URL goes through the same analysis pipeline as /api/analyze

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import type { AppSettings } from "@/types";

export const runtime = "nodejs";
// Increase max duration for bulk jobs (Vercel Pro: 300s, hobby: 60s)
export const maxDuration = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

// ── Settings loader (same as analyze route) ────────────────────────────────
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
async function analyzeSingleUrl(
  url: string,
  runCitations: boolean,
  baseUrl: string
): Promise<{ success: boolean; data?: object; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, runCitations, bustCache: false }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: String(err) };
  }
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

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── POST handler — streams SSE progress ───────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: string[] = (body?.urls ?? [])
      .map((u: string) => u.trim())
      .filter((u: string) => {
        try { new URL(u.startsWith("http") ? u : "https://" + u); return true; }
        catch { return false; }
      })
      .map((u: string) => (u.startsWith("http") ? u : "https://" + u))
      .slice(0, 500); // hard cap at 500

    const runCitations: boolean = body?.runCitations !== false;
    const concurrency: number = Math.min(Math.max(Number(body?.concurrency ?? 3), 1), 10);
    const jobId: string = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate settings
    const settings = await loadSettings();
    const hasProviders = settings?.providers?.some((p) => p.enabled && p.apiKey);
    if (!hasProviders) {
      return NextResponse.json(
        { error: "No AI provider configured. Go to /settings to add API keys." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Get base URL for internal fetch
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const host = request.headers.get("host") ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    // Save job metadata to Firestore
    await saveBulkJob(jobId, {
      jobId,
      urls,
      total: urls.length,
      runCitations,
      concurrency,
      status: "running",
    });

    // Stream SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: object) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // client disconnected
          }
        };

        // Send job start
        send("start", {
          jobId,
          total: urls.length,
          concurrency,
          runCitations,
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

        const tasks = urls.map((url) => async () => {
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

          const row = result.success
            ? {
                url,
                status: "success" as const,
                score: (result.data as Record<string, unknown>)?.overall_score as number,
                grade: (result.data as Record<string, unknown>)?.grade as string,
                site_name: (result.data as Record<string, unknown>)?.site_name as string,
                summary: (result.data as Record<string, unknown>)?.summary as string,
                duration,
              }
            : { url, status: "failed" as const, error: result.error, duration };

          if (result.success) passed++; else failed++;
          allResults.push(row);

          send("result", {
            jobId,
            ...row,
            completed,
            total: urls.length,
            passed,
            failed,
          });

          return row;
        });

        await runWithConcurrency(tasks, concurrency, () => {});

        // Save final results
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

        controller.close();
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