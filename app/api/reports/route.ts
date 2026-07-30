// app/api/reports/route.ts
// GET /api/reports?limit=20&cursor=<scanId>
// Returns paginated completed "audit" scans (the current user's homepage
// scan history) from Postgres `scans`, replacing the old Firestore
// "scans" collection.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const cursor = searchParams.get("cursor") ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated", reports: [] }, { status: 200 });
  }

  try {
    let query = supabase
      .from("scans")
      .select("id, url, result, status, created_at")
      .eq("kind", "audit")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const { data: cursorRow } = await supabase.from("scans").select("created_at").eq("id", cursor).maybeSingle();
      if (cursorRow) query = query.lt("created_at", cursorRow.created_at);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const hasMore = (rows?.length ?? 0) > limit;
    const pageItems = hasMore ? rows!.slice(0, limit) : rows ?? [];

    const reports = pageItems.map((row) => {
      const d = (row.result ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        url: (d.url as string) ?? row.url ?? "",
        site_name: (d.site_name as string) ?? row.url ?? "",
        overall_score: (d.overall_score as number) ?? 0,
        grade: (d.grade as string) ?? "-",
        summary: (d.summary as string) ?? "",
        createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
        _cached: (d._cached as boolean) ?? false,
        stats: d.stats ?? null,
        categories: d.categories ?? [],
        recommendations: d.recommendations ?? [],
        ai_platform_coverage: d.ai_platform_coverage ?? null,
        citations: d.citations ?? [],
        _providers: d._providers ?? [],
      };
    });

    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
    return NextResponse.json({ reports, nextCursor, hasMore });
  } catch (err: unknown) {
    console.error("[reports] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch reports", reports: [] }, { status: 500 });
  }
}
