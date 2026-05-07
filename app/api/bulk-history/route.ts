// app/api/bulk-history/route.ts
// GET /api/bulk-history?limit=20
// ✅ Fixed v4:
//   - Rich analysis fields (categories, recommendations, citations,
//     ai_platform_coverage, stats, _providers) are stored FLAT in the subdoc
//     (written by bulk/route.ts v5). This avoids Firestore's 1MB limit.
//   - This route reassembles a fullData object from those flat fields so the
//     report page can open the full ReportModal for any bulk scan result.
//   - Also handles legacy subdocs that have a nested fullData blob (v4 writes).

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

export const runtime = "nodejs";

const COLLECTION = "bulk_scan";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const cursor = searchParams.get("cursor") ?? null;

  try {
    const db = await getDb();

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured", jobs: [] },
        { status: 200 }
      );
    }

    let query = db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      try {
        const cursorDoc = await db.collection(COLLECTION).doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      } catch (e) {
        console.warn("[bulk-history] cursor lookup failed, ignoring:", e);
      }
    }

    const snap = await query.get();
    const docs = snap.docs;

    const jobDocs = docs.filter((doc) => {
      const d = doc.data();
      return d.jobId != null || d.total != null || d.urls != null;
    });

    const hasMore = jobDocs.length > limit;
    const pageItems = hasMore ? jobDocs.slice(0, limit) : jobDocs;

    const jobs = await Promise.all(
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

        let results: object[] = [];
        try {
          const resultsSnap = await db
            .collection(COLLECTION)
            .doc(doc.id)
            .collection("results")
            .orderBy("savedAt", "asc")
            .get();

          results = resultsSnap.docs.map((rdoc) => {
            const r = rdoc.data();

            // Reconstruct fullData from flat fields (v5 schema).
            // Falls back to nested fullData blob for legacy v4 subdocs.
            let fullData: object | null = null;

            const hasRichFields =
              r.categories != null ||
              r.recommendations != null ||
              r.ai_platform_coverage != null ||
              r.citations != null ||
              r.stats != null;

            if (hasRichFields) {
              fullData = {
                url:                  (r.url as string)    ?? "",
                site_name:            (r.site_name as string) ?? "",
                overall_score:        (r.score as number)  ?? 0,
                grade:                (r.grade as string)  ?? "—",
                summary:              (r.summary as string) ?? "",
                stats:                r.stats                ?? null,
                categories:           r.categories           ?? [],
                recommendations:      r.recommendations      ?? [],
                ai_platform_coverage: r.ai_platform_coverage ?? null,
                citations:            r.citations            ?? [],
                _providers:           r._providers           ?? [],
              };
            } else if (r.fullData && typeof r.fullData === "object") {
              fullData = r.fullData as object;
            }

            return {
              url:       (r.url       as string)            ?? "",
              status:    (r.status    as string)            ?? "failed",
              score:     (r.score     as number | undefined) ?? undefined,
              grade:     (r.grade     as string | undefined) ?? undefined,
              site_name: (r.site_name as string | undefined) ?? undefined,
              summary:   (r.summary   as string | undefined) ?? undefined,
              error:     (r.error     as string | undefined) ?? undefined,
              duration:  (r.duration  as number | undefined) ?? undefined,
              fullData,
            };
          });
        } catch (e) {
          console.warn(`[bulk-history] failed to fetch results for job ${doc.id}:`, e);
        }

        return {
          id:           doc.id,
          jobId:        (raw.jobId       as string)   ?? doc.id,
          total:        (raw.total       as number)   ?? 0,
          passed:       (raw.passed      as number)   ?? 0,
          failed:       (raw.failed      as number)   ?? 0,
          status:       (raw.status      as string)   ?? "unknown",
          runCitations: (raw.runCitations as boolean)  ?? false,
          concurrency:  (raw.concurrency  as number)  ?? 1,
          urls:         (raw.urls         as string[]) ?? [],
          results,
          createdAt,
        };
      })
    );

    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
    return NextResponse.json({ jobs, nextCursor, hasMore });
  } catch (err: unknown) {
    console.error("[bulk-history] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bulk history", jobs: [] },
      { status: 500 }
    );
  }
}