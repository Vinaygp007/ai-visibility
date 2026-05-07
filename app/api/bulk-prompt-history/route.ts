// app/api/bulk-prompt-history/route.ts
// GET /api/bulk-prompt-history?limit=20
// Reads batch metadata from bulk_prompt/{batchId} and hydrates each batch's
// runs subcollection from bulk_prompt/{batchId}/runs/{executionId}.
// Returns { batches:[], hasMore:false } so the report page can render prompt
// history directly from Firestore.

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

    // ── Fetch without compound index ──────────────────────────────────────
    // Fetch extra docs so we still get `limit` batch docs after JS-side filtering.
    const fetchLimit = limit * 3 + 10;

    let query = db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(fetchLimit);

    if (cursor) {
      try {
        const cursorDoc = await db.collection(COLLECTION).doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      } catch (e) {
        console.warn("[bulk-history] cursor lookup failed, ignoring:", e);
      }
    }

    const snap = await query.get();

    // Keep only top-level batch documents; skip any other doc types.
    const batchDocs = snap.docs.filter((d) => {
      const data = d.data();
      const t = data.type as string | undefined;
      // Accept explicit type="bulk_prompt_batch", OR legacy docs that have batchId but no type.
      return t === "bulk_prompt_batch" || (t == null && data.batchId != null);
    });

    const hasMore = batchDocs.length > limit;
    const pageItems = hasMore ? batchDocs.slice(0, limit) : batchDocs;

    // ── Fetch subcollection runs in parallel ───────────────────────────────
    const batches = await Promise.all(
      pageItems.map(async (doc) => {
        const raw = doc.data();

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

        // ── Subcollection: bulk_prompt/{batchId}/runs/{executionId} ─────────
        let runs: object[] = [];
        try {
          const resultsSnap = await db
            .collection(COLLECTION)
            .doc(doc.id)
            .collection("runs")
            .orderBy("savedAt", "asc")
            .get();

          if (!resultsSnap.empty) {
            runs = resultsSnap.docs.map((rdoc) => {
              const r = rdoc.data();
              return {
                executionId: (r.executionId as string) ?? rdoc.id,
                promptId: (r.promptId as string) ?? "default",
                status: (r.status as string) ?? "failed",
                url: (r.url as string | null | undefined) ?? null,
                hasUrl: (r.hasUrl as boolean | undefined) ?? false,
                prompt: (r.prompt as string | undefined) ?? undefined,
                finalPrompt: (r.finalPrompt as string | undefined) ?? undefined,
                topic: (r.topic as string | undefined) ?? undefined,
                runCitations: (r.runCitations as boolean | undefined) ?? undefined,
                response: (r.response as string | undefined) ?? undefined,
                provider: (r.provider as string | null | undefined) ?? null,
                durationMs: (r.durationMs as number | null | undefined) ?? null,
                responses: (r.responses as object[] | undefined) ?? undefined,
                citations: (r.citations as object[] | undefined) ?? undefined,
                error: (r.error as string | undefined) ?? undefined,
                createdAt: (r.createdAt as string) ?? createdAt ?? new Date().toISOString(),
              };
            });
          } else {
            // Fallback: embedded runs array on the batch doc (old schema)
            runs = (raw.runs as object[]) ?? [];
          }
        } catch (subErr) {
          console.warn(`[bulk-prompt-history] runs subcollection error for ${doc.id}:`, subErr);
          runs = (raw.runs as object[]) ?? [];
        }

        return {
          id: doc.id,
          batchId: (raw.batchId as string) ?? doc.id,
          status: (raw.status as string) ?? "unknown",
          promptId: (raw.promptId as string | undefined) ?? undefined,
          url: (raw.url as string | null | undefined) ?? null,
          topic: (raw.topic as string | undefined) ?? undefined,
          runCitations: (raw.runCitations as boolean | undefined) ?? false,
          providerCount: (raw.providerCount as number | undefined) ?? undefined,
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
    // Never return 500 — the UI shows a hard error banner on non-2xx.
    // Return empty payload so the page shows the empty state instead.
    return NextResponse.json(
      { batches: [], nextCursor: null, hasMore: false, _fetchError: String(err) },
      { status: 200 }
    );
  }
}