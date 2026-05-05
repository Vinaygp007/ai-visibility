// app/api/bulk-prompt-history/route.ts
// GET /api/bulk-prompt-history?limit=20
// Returns paginated bulk prompt batches from the "bulk_prompt" Firestore collection.

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

    let query = db
      .collection(COLLECTION)
      .orderBy("updatedAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.collection(COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snap = await query.get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const pageItems = hasMore ? docs.slice(0, limit) : docs;

    const batches = pageItems.map((doc) => {
      const raw = doc.data();

      // Parse updatedAt
      let updatedAt: string | null = null;
      if (raw.updatedAt) {
        if (typeof raw.updatedAt === "string") {
          updatedAt = raw.updatedAt;
        } else if (typeof (raw.updatedAt as { toDate?: () => Date }).toDate === "function") {
          updatedAt = (raw.updatedAt as { toDate: () => Date }).toDate().toISOString();
        }
      }

      return {
        id: doc.id,
        batchId: (raw.batchId as string) ?? doc.id,
        status: (raw.status as string) ?? "unknown",
        updatedAt,
        runs: (raw.runs as Record<string, object>) ?? {},
      };
    });

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