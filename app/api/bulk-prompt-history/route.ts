// app/api/bulk-prompt-history/route.ts
// GET /api/bulk-prompt-history?limit=20&cursor=<scanId>
// Each prompt-run call is one Postgres `scans` row (kind='prompt_run') —
// there's no real multi-execution "batch" grouping in this app (each call
// creates exactly one run), so each scan is presented as its own
// single-run batch to keep the old Firestore response shape intact.

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
    return NextResponse.json({ batches: [], nextCursor: null, hasMore: false }, { status: 200 });
  }

  try {
    let query = supabase
      .from("scans")
      .select("id, url, status, error, result, created_at")
      .eq("kind", "prompt_run")
      .eq("user_id", user.id)
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

    const batches = pageItems.map((row) => {
      const r = (row.result ?? {}) as Record<string, unknown>;
      const createdAt = row.created_at as string;

      const run = {
        executionId: row.id,
        promptId: (r.promptId as string) ?? "default",
        status: row.status === "completed" ? "success" : "failed",
        url: (r.url as string | null) ?? null,
        hasUrl: (r.hasUrl as boolean) ?? false,
        prompt: r.prompt as string | undefined,
        finalPrompt: r.finalPrompt as string | undefined,
        topic: r.topic as string | undefined,
        runCitations: r.runCitations as boolean | undefined,
        response: r.response as string | undefined,
        provider: (r.provider as string | null) ?? null,
        durationMs: (r.durationMs as number | null) ?? null,
        responses: r.responses as object[] | undefined,
        citations: r.citations as object[] | undefined,
        error: row.error ?? undefined,
        createdAt,
      };

      return {
        id: row.id,
        batchId: row.id,
        status: row.status === "completed" ? "done" : row.status,
        promptId: run.promptId,
        url: run.url,
        topic: run.topic,
        runCitations: run.runCitations ?? false,
        providerCount: (r.providerCount as number) ?? undefined,
        totalRuns: 1,
        passedRuns: row.status === "completed" ? 1 : 0,
        failedRuns: row.status === "completed" ? 0 : 1,
        createdAt,
        updatedAt: createdAt,
        runs: [run],
      };
    });

    const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
    return NextResponse.json({ batches, nextCursor, hasMore });
  } catch (err: unknown) {
    console.error("[bulk-prompt-history] fetch error:", err);
    // Never return 500 — the UI shows a hard error banner on non-2xx.
    return NextResponse.json(
      { batches: [], nextCursor: null, hasMore: false, _fetchError: String(err) },
      { status: 200 }
    );
  }
}
