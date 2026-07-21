import { createClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = await createClient();

  const [{ count: userCount }, { count: activeCount }, { count: pendingWaitlist }, { count: scanCount }, { data: ledgerRows }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("waitlist").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("scans").select("*", { count: "exact", head: true }),
      supabase.from("credit_ledger").select("amount"),
    ]);

  const granted = (ledgerRows ?? []).filter((r) => r.amount > 0).reduce((sum, r) => sum + r.amount, 0);
  const spent = (ledgerRows ?? []).filter((r) => r.amount < 0).reduce((sum, r) => sum - r.amount, 0);

  return {
    userCount: userCount ?? 0,
    activeCount: activeCount ?? 0,
    pendingWaitlist: pendingWaitlist ?? 0,
    scanCount: scanCount ?? 0,
    granted,
    spent,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const tiles = [
    { label: "Total accounts", value: stats.userCount },
    { label: "Active accounts", value: stats.activeCount },
    { label: "Pending waitlist", value: stats.pendingWaitlist },
    { label: "Total scans", value: stats.scanCount },
    { label: "Credits granted", value: stats.granted },
    { label: "Credits spent", value: stats.spent },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-2xl border p-6"
          style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
        >
          <div className="text-2xl font-bold text-[var(--text)]">{tile.value.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
