import { createClient } from "@/lib/supabase/server";

type VotePage = "bulk" | "prompt";

const LABELS: Record<VotePage, string> = { bulk: "Bulk Scanner", prompt: "Prompt Runner" };

async function getVoteData() {
  const supabase = await createClient();

  const [{ data: counts }, { data: rows }] = await Promise.all([
    supabase.rpc("get_feature_vote_counts"),
    supabase.from("feature_votes").select("user_id, page, created_at").order("created_at", { ascending: false }),
  ]);

  const votes = rows ?? [];
  const userIds = votes.map((v) => v.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const tally = (counts ?? []) as { page: VotePage; votes: number }[];
  const bulk = Number(tally.find((c) => c.page === "bulk")?.votes ?? 0);
  const prompt = Number(tally.find((c) => c.page === "prompt")?.votes ?? 0);

  return {
    bulk,
    prompt,
    total: bulk + prompt,
    voters: votes.map((v) => ({
      userId: v.user_id,
      page: v.page as VotePage,
      createdAt: v.created_at as string,
      email: profileById.get(v.user_id)?.email ?? "—",
      fullName: profileById.get(v.user_id)?.full_name ?? null,
    })),
  };
}

export default async function AdminVotesPage() {
  const { bulk, prompt, total, voters } = await getVoteData();
  const bulkPct = total > 0 ? Math.round((bulk / total) * 100) : 0;
  const promptPct = total > 0 ? 100 - bulkPct : 0;

  const tiles = [
    { label: "Total votes cast", value: total },
    { label: `Bulk Scanner (${bulkPct}%)`, value: bulk },
    { label: `Prompt Runner (${promptPct}%)`, value: prompt },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1">v2 feature vote</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Every active account gets one permanent vote for Bulk Scanner or Prompt Runner — whichever leads here ships in v2.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border p-6"
            style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <div className="text-2xl font-bold text-[var(--text)]">{tile.value.toLocaleString()}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tile.label}</div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div
          className="rounded-2xl border p-5 mb-6"
          style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
        >
          <div className="flex h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(var(--overlay-rgb),0.08)" }}>
            <div style={{ width: `${bulkPct}%`, background: "var(--accent)" }} />
            <div style={{ width: `${promptPct}%`, background: "var(--accent2)" }} />
          </div>
          <div className="flex items-center gap-5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "var(--accent)" }} />
              Bulk Scanner — {bulk} vote{bulk === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "var(--accent2)" }} />
              Prompt Runner — {prompt} vote{prompt === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}

      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Voters ({voters.length})</h3>

      {voters.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center text-sm"
          style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)", color: "var(--text-muted)" }}
        >
          No votes yet.
        </div>
      ) : (
        <div className="space-y-2">
          {voters.map((v) => (
            <div
              key={v.userId}
              className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text)] truncate">{v.fullName || v.email}</div>
                {v.fullName && <div className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{v.email}</div>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    color: v.page === "bulk" ? "var(--accent)" : "var(--accent2)",
                    background: v.page === "bulk" ? "rgba(0,229,255,0.1)" : "rgba(124,111,255,0.1)",
                  }}
                >
                  {LABELS[v.page]}
                </span>
                <span className="text-xs w-28 text-right" style={{ color: "var(--text-dim)" }}>
                  {new Date(v.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
