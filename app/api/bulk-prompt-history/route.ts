// app/api/bulk-prompt-history/route.ts
// GET /api/bulk-prompt-history?limit=20&cursor=<scanId>
// Each prompt-run call is one Postgres `scans` row (kind='prompt_run').
// Runs started together from the Bulk Prompt page share result.batchId and
// are returned as one batch; runs without one (the single Prompt Runner,
// and runs saved before batch ids were stored) are a batch of their own.
// `limit` counts batches; `cursor` is the oldest run id of the last batch.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

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

  // The citation query is our internal instruction prompt; only admins see it.
  const isAdmin = isAdminRole((await getCurrentUser())?.role);
  const stripQuery = (list: object[] | undefined) =>
    isAdmin || !list ? list : list.map((c) => ({ ...c, query: "" }));

  try {
    // Pull a window of runs, then group. A batch cut off by the window's
    // edge is held back for the next page so it's never shown split.
    const WINDOW = 1000;
    let query = supabase
      .from("scans")
      .select("id, url, status, error, result, created_at")
      .eq("kind", "prompt_run")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(WINDOW);

    if (cursor) {
      const { data: cursorRow } = await supabase.from("scans").select("created_at").eq("id", cursor).maybeSingle();
      if (cursorRow) query = query.lt("created_at", cursorRow.created_at);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    type Row = NonNullable<typeof rows>[number];
    const groups = new Map<string, Row[]>();
    // Runs saved before batch ids were stored have none. A "Run All" fires
    // its prompts seconds apart, so consecutive old runs started within
    // LEGACY_GAP_MS of each other are treated as one batch.
    const LEGACY_GAP_MS = 2 * 60_000;
    let legacyKey: string | null = null;
    let legacyPrevAt = 0;
    for (const row of rows ?? []) {
      const r = (row.result ?? {}) as Record<string, unknown>;
      let key: string;
      if (typeof r.batchId === "string" && r.batchId) {
        key = `b:${r.batchId}`;
      } else {
        const at = new Date(row.created_at as string).getTime();
        if (!legacyKey || legacyPrevAt - at > LEGACY_GAP_MS) legacyKey = `s:${row.id}`;
        legacyPrevAt = at;
        key = legacyKey;
      }
      const list = groups.get(key);
      if (list) list.push(row);
      else groups.set(key, [row]);
    }

    let ordered = Array.from(groups.values()); // newest batch first
    const windowFull = (rows?.length ?? 0) === WINDOW;
    if (windowFull && ordered.length > 1) ordered = ordered.slice(0, -1);

    const pageGroups = ordered.slice(0, limit);
    const hasMore = ordered.length > limit || windowFull;

    const toRun = (row: Row) => {
      const r = (row.result ?? {}) as Record<string, unknown>;
      const createdAt = row.created_at as string;
      return {
        executionId: row.id,
        promptId: (r.promptId as string) ?? "default",
        status: row.status === "completed" ? "success" : row.status === "running" ? "running" : "failed",
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
        citations: stripQuery(r.citations as object[] | undefined),
        error: row.error ?? undefined,
        createdAt,
        _providerCount: r.providerCount as number | undefined,
      };
    };

    const batches = pageGroups.map((group) => {
      // Rows arrive newest first; show runs in the order they were started.
      const runs = group.map(toRun).reverse();
      const first = runs[0];
      const passed = runs.filter((x) => x.status === "success").length;
      const running = runs.filter((x) => x.status === "running").length;
      const failed = runs.length - passed - running;
      const batchId =
        ((group[0].result as Record<string, unknown> | null)?.batchId as string | undefined) ?? group[0].id;
      return {
        id: group[group.length - 1].id,
        batchId,
        status: running > 0 ? "running" : "done",
        promptId: first.promptId,
        url: first.url,
        topic: first.topic,
        runCitations: runs.some((x) => x.runCitations),
        providerCount: first._providerCount,
        totalRuns: runs.length,
        passedRuns: passed,
        failedRuns: failed,
        createdAt: first.createdAt,
        updatedAt: runs[runs.length - 1].createdAt,
        runs: runs.map((run) => {
          const { _providerCount, ...rest } = run;
          void _providerCount;
          return rest;
        }),
      };
    });

    const lastGroup = pageGroups[pageGroups.length - 1];
    const nextCursor = hasMore && lastGroup ? lastGroup[lastGroup.length - 1].id : null;
    return NextResponse.json({ batches, nextCursor, hasMore: !!nextCursor });
  } catch (err: unknown) {
    console.error("[bulk-prompt-history] fetch error:", err);
    // Never return 500 — the UI shows a hard error banner on non-2xx.
    return NextResponse.json(
      { batches: [], nextCursor: null, hasMore: false, _fetchError: String(err) },
      { status: 200 }
    );
  }
}
