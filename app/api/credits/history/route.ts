import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated" } }, { status: 401 });
  }

  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? "0") || 0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS's "read own ledger" policy already scopes this to rows where
  // user_id = auth.uid() — no admin client needed here.
  const { data: entries, count } = await supabase
    .from("credit_ledger")
    .select("id, amount, balance_after, type, reference_id, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = entries ?? [];

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      balanceAfter: r.balance_after,
      type: r.type,
      referenceId: r.reference_id,
      createdAt: r.created_at,
    })),
    page,
    pageSize: PAGE_SIZE,
    total: count ?? rows.length,
  });
}
