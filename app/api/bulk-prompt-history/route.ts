// app/api/bulk-prompt-history/route.ts
// GET /api/bulk-prompt-history?limit=20
// ✅ Fixed: runs now live in subcollection bulk_prompt/{batchId}/runs/{executionId}
//   - Fetches each batch's run subdocs and attaches them as batch.runs[]
//   - Parallel fetch with Promise.all
//   - Orders by createdAt on batch doc, runs by savedAt
//   - Exposes full run fields: prompt, response, citations, responses[], url, etc.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

export const runtime = "nodejs";

const COLLECTION = "bulk_prompt";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const cursor = searchParams.get("cursor") ?? null;

  try {
    const db = await getDb();

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured", batches: [] },
        { status: 200 }
      );
    }

    // ── 1. Fetch top-level batch documents ────────────────────────────────
    // Order by createdAt (set on creation via createBatchDoc) for stable sort.
    // Fall back to updatedAt ordering if createdAt index isn't available yet.
    let query = db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection(COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snap = await query.get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const pageItems = hasMore ? docs.slice(0, limit) : docs;

    // ── 2. For each batch, fetch its runs subcollection in parallel ────────
    const batches = await Promise.all(
      pageItems.map(async (doc) => {
        const raw = doc.data();

        // Parse createdAt / updatedAt
        const parseTs = (v: unknown): string | null => {
          if (!v) return null;
          if (typeof v === "string") return v;
          if (typeof (v as { toDate?: () => Date }).toDate === "function") {
            return (v as { toDate: () => Date }).toDate().toISOString();
          }
          return null;
        };

        const createdAt = parseTs(raw.createdAt);
        const updatedAt = parseTs(raw.updatedAt);

        // Fetch per-execution subdocs from bulk_prompt/{batchId}/runs/{executionId}
        let runs: object[] = [];
        try {
          const runsSnap = await db
            .collection(COLLECTION)
            .doc(doc.id)
            .collection("runs")
            .orderBy("savedAt", "asc")
            .get();

          runs = runsSnap.docs.map((rdoc) => {
            const r = rdoc.data();
            return {
              executionId: (r.executionId as string) ?? rdoc.id,
              promptId: (r.promptId as string) ?? "default",
              status: (r.status as string) ?? "unknown",
              url: (r.url as string | null) ?? null,
              hasUrl: (r.hasUrl as boolean) ?? false,
              prompt: (r.prompt as string) ?? "",
              finalPrompt: (r.finalPrompt as string) ?? "",
              topic: (r.topic as string) ?? "",
              runCitations: (r.runCitations as boolean) ?? false,
              // primary response (first successful provider)
              response: (r.response as string) ?? "",
              provider: (r.provider as string | null) ?? null,
              durationMs: (r.durationMs as number | null) ?? null,
              // all provider responses array
              responses: (r.responses as object[]) ?? [],
              // citation results array
              citations: (r.citations as object[]) ?? [],
              error: (r.error as string | undefined) ?? undefined,
              createdAt: (r.createdAt as string) ?? null,
            };
          });
        } catch (e) {
          console.warn(`[bulk-prompt-history] failed to fetch runs for batch ${doc.id}:`, e);
        }

        return {
          id: doc.id,
          batchId: (raw.batchId as string) ?? doc.id,
          status: (raw.status as string) ?? "unknown",
          promptId: (raw.promptId as string) ?? "default",
          url: (raw.url as string | null) ?? null,
          topic: (raw.topic as string) ?? "",
          runCitations: (raw.runCitations as boolean) ?? false,
          providerCount: (raw.providerCount as number) ?? 0,
          totalRuns: (raw.totalRuns as number) ?? runs.length,
          passedRuns: (raw.passedRuns as number) ?? 0,
          failedRuns: (raw.failedRuns as number) ?? 0,
          createdAt,
          updatedAt,
          runs,
        };
      })
    );

    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
    return NextResponse.json({ batches, nextCursor, hasMore });
  } catch (err: unknown) {
    console.error("[bulk-prompt-history] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bulk prompt history", batches: [] },
      { status: 500 }
    );
  }
}