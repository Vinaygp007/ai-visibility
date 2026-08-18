import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type VotePage = "bulk" | "prompt";

async function currentTally(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.rpc("get_feature_vote_counts");
  const counts: Record<VotePage, number> = { bulk: 0, prompt: 0 };
  for (const row of data ?? []) counts[row.page as VotePage] = Number(row.votes);
  return counts;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required." } }, { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: myVote }, counts] = await Promise.all([
    admin.from("feature_votes").select("page").eq("user_id", user.id).maybeSingle(),
    currentTally(admin),
  ]);

  return NextResponse.json({ myVote: (myVote?.page as VotePage) ?? null, counts });
}

const bodySchema = z.object({ page: z.enum(["bulk", "prompt"]) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required." } }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_input", message: "page must be 'bulk' or 'prompt'." } }, { status: 422 });
  }

  const admin = createAdminClient();

  // One vote per user, permanently — a plain insert (not upsert) so the
  // unique constraint on user_id rejects a second attempt instead of
  // silently moving an existing vote to the new page.
  const { error } = await admin
    .from("feature_votes")
    .insert({ user_id: user.id, page: parsed.data.page });

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin.from("feature_votes").select("page").eq("user_id", user.id).maybeSingle();
      const counts = await currentTally(admin);
      return NextResponse.json(
        { error: { code: "already_voted", message: "You've already voted." }, myVote: (existing?.page as VotePage) ?? null, counts },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: { code: "internal", message: "Failed to record vote." } }, { status: 500 });
  }

  const counts = await currentTally(admin);
  return NextResponse.json({ myVote: parsed.data.page, counts });
}
