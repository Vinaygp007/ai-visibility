// app/api/bulk-history/route.ts
// GET /api/bulk-history?limit=20&cursor=<jobId>
// Reads bulk_jobs (kind='bulk_audit') + their scans (kind='bulk_item',
// bulk_job_id=<job>) from Postgres. Each scan's `result` column already
// holds the full AnalysisResult JSON (written by /api/analyze), so unlike
// the old Firestore version there's no flat-field reconstruction needed —
// fullData is just the scan's result column.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const cursor = searchParams.get("cursor") ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated", jobs: [] }, { status: 200 });
  }

  try {
    let query = supabase
      .from("bulk_jobs")
      .select("*")
      .eq("kind", "bulk_audit")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const { data: cursorRow } = await supabase.from("bulk_jobs").select("created_at").eq("id", cursor).maybeSingle();
      if (cursorRow) query = query.lt("created_at", cursorRow.created_at);
    }

    const { data: jobRows, error } = await query;
    if (error) throw error;

    const hasMore = (jobRows?.length ?? 0) > limit;
    const pageItems = hasMore ? jobRows!.slice(0, limit) : jobRows ?? [];

    const jobs = await Promise.all(
      pageItems.map(async (job) => {
        const { data: scanRows } = await supabase
          .from("scans")
          .select("url, status, error, result")
          .eq("bulk_job_id", job.id)
          .order("created_at", { ascending: true });

        const results = (scanRows ?? []).map((s) => {
          const result = (s.result ?? {}) as Record<string, unknown>;
          return {
            url: s.url ?? "",
            status: s.status === "completed" ? ("success" as const) : ("failed" as const),
            score: result.overall_score as number | undefined,
            grade: result.grade as string | undefined,
            site_name: result.site_name as string | undefined,
            summary: result.summary as string | undefined,
            error: s.error ?? undefined,
            duration: undefined,
            fullData: s.status === "completed" ? result : null,
          };
        });

        const metadata = (job.metadata ?? {}) as Record<string, unknown>;
        const passed = Math.max(job.completed - job.failed - job.skipped, 0);

        return {
          id: job.id,
          jobId: job.id,
          total: job.total,
          passed,
          failed: job.failed,
          status: job.status === "completed" ? "done" : job.status,
          runCitations: (metadata.runCitations as boolean) ?? false,
          concurrency: (metadata.concurrency as number) ?? 1,
          urls: (metadata.urls as string[]) ?? [],
          results,
          createdAt: job.created_at,
        };
      })
    );

    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
    return NextResponse.json({ jobs, nextCursor, hasMore });
  } catch (err: unknown) {
    console.error("[bulk-history] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch bulk history", jobs: [] }, { status: 500 });
  }
}
