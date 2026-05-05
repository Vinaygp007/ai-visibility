// app/api/bulk-history/route.ts
// GET /api/bulk-history?limit=20
// Returns paginated bulk scan jobs from the "bulk_scan" Firestore collection.

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

    // Only fetch top-level job documents (type === "job")
    let query = db
      .collection(COLLECTION)
      .where("type", "==", "job")
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

    const jobs = pageItems.map((doc) => {
      const raw = doc.data();

      // Parse createdAt
      let createdAt: string | null = null;
      if (raw.createdAt) {
        if (typeof raw.createdAt === "string") {
          createdAt = raw.createdAt;
        } else if (typeof (raw.createdAt as { toDate?: () => Date }).toDate === "function") {
          createdAt = (raw.createdAt as { toDate: () => Date }).toDate().toISOString();
        }
      }

      return {
        id: doc.id,
        jobId: (raw.jobId as string) ?? doc.id,
        total: (raw.total as number) ?? 0,
        passed: (raw.passed as number) ?? 0,
        failed: (raw.failed as number) ?? 0,
        status: (raw.status as string) ?? "unknown",
        runCitations: (raw.runCitations as boolean) ?? false,
        concurrency: (raw.concurrency as number) ?? 1,
        urls: (raw.urls as string[]) ?? [],
        results: (raw.results as object[]) ?? [],
        createdAt,
      };
    });

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