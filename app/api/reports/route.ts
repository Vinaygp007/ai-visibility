// app/api/reports/route.ts
// GET /api/reports?limit=20&cursor=<docId>
// Returns paginated full scan results from the "scans" Firestore collection.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

export const runtime = "nodejs";

const COLLECTION = "scans";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit  = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const cursor = searchParams.get("cursor") ?? null;

  try {
    const db = await getDb();

    if (!db) {
      return NextResponse.json(
        { error: "Database not configured", reports: [] },
        { status: 200 }
      );
    }

    let query = db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection(COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snap      = await query.get();
    const docs      = snap.docs;
    const hasMore   = docs.length > limit;
    const pageItems = hasMore ? docs.slice(0, limit) : docs;

    const reports = pageItems.map(doc => {
      const raw = doc.data();

      // Full AnalysisResult lives inside the nested "data" field
      const d: Record<string, unknown> =
        raw.data && typeof raw.data === "object"
          ? (raw.data as Record<string, unknown>)
          : raw;

      // createdAt is stored as ISO string at top level
      let createdAtMs: number | null = null;
      if (raw.createdAt) {
        if (typeof raw.createdAt === "string") {
          createdAtMs = new Date(raw.createdAt).getTime();
        } else if (typeof (raw.createdAt as { toMillis?: () => number }).toMillis === "function") {
          createdAtMs = (raw.createdAt as { toMillis: () => number }).toMillis();
        }
      }

      return {
        id:                   doc.id,
        url:                  (d.url            as string)  ?? "",
        site_name:            (d.site_name      as string)  ?? (d.url as string) ?? "",
        overall_score:        (d.overall_score  as number)  ?? 0,
        grade:                (d.grade          as string)  ?? "—",
        summary:              (d.summary        as string)  ?? "",
        createdAt:            createdAtMs,
        _cached:              (d._cached        as boolean) ?? false,
        stats:                d.stats                ?? null,
        categories:           d.categories           ?? [],
        recommendations:      d.recommendations      ?? [],
        ai_platform_coverage: d.ai_platform_coverage ?? null,
        citations:            d.citations            ?? [],
        _providers:           d._providers           ?? [],
      };
    });

    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
    return NextResponse.json({ reports, nextCursor, hasMore });

  } catch (err: unknown) {
    console.error("[reports] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch reports", reports: [] },
      { status: 500 }
    );
  }
}