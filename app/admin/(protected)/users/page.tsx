"use client";

import { useEffect, useState } from "react";

type Plan = "free" | "starter" | "growth" | "agency" | "scale";
const PLANS: Plan[] = ["free", "starter", "growth", "agency", "scale"];

interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: "user" | "admin";
  status: "pending" | "active" | "suspended";
  referralCode: string;
  plan: Plan;
  createdAt: string;
  balance: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [grantReason, setGrantReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleGrant = async (userId: string) => {
    const amount = Number(grantAmount[userId]);
    const reason = grantReason[userId]?.trim();
    if (!amount || !reason) {
      showMessage("Enter an amount and a reason first.");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error?.message ?? "Failed to adjust credits.");
      return;
    }
    showMessage("Credits updated.");
    setGrantAmount((prev) => ({ ...prev, [userId]: "" }));
    setGrantReason((prev) => ({ ...prev, [userId]: "" }));
    loadUsers(search);
  };

  const handleRoleToggle = async (user: AdminUser) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role: nextRole }),
    });
    if (res.ok) {
      showMessage(`${user.email} is now ${nextRole}.`);
      loadUsers(search);
    }
  };

  const handlePlanChange = async (user: AdminUser, nextPlan: Plan) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, plan: nextPlan }),
    });
    if (res.ok) {
      showMessage(`${user.email} is now on ${nextPlan}.`);
      loadUsers(search);
    }
  };

  const handleStatusToggle = async (user: AdminUser) => {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, status: nextStatus }),
    });
    if (res.ok) {
      showMessage(`${user.email} is now ${nextStatus}.`);
      loadUsers(search);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete ${user.email}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error?.message ?? "Failed to delete user.");
      return;
    }
    showMessage(`${user.email} deleted.`);
    loadUsers(search);
  };

  return (
    <div>
      {message && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ background: "rgba(0,229,255,0.08)", color: "var(--accent)" }}>
          {message}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUsers(search)}
          placeholder="Search by email..."
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm"
          style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
        />
        <button
          onClick={() => loadUsers(search)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-[var(--text)]">Loading...</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border p-5" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{u.email}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {u.role} · {u.status} · balance: {u.balance} · joined {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={u.plan}
                    onChange={(e) => handlePlanChange(u, e.target.value as Plan)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "rgba(var(--overlay-rgb),0.12)", color: "var(--text)", background: "rgba(var(--overlay-rgb),0.03)" }}
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRoleToggle(u)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "rgba(var(--overlay-rgb),0.12)", color: "var(--text)" }}
                  >
                    {u.role === "admin" ? "Revoke admin" : "Make admin"}
                  </button>
                  <button
                    onClick={() => handleStatusToggle(u)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "rgba(255,90,90,0.3)", color: "var(--danger)" }}
                  >
                    {u.status === "suspended" ? "Reactivate" : "Suspend"}
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "rgba(255,90,90,0.5)", color: "var(--danger)", background: "rgba(255,90,90,0.08)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="±credits"
                  value={grantAmount[u.id] ?? ""}
                  onChange={(e) => setGrantAmount((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="w-28 px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <input
                  type="text"
                  placeholder="Reason (required)"
                  value={grantReason[u.id] ?? ""}
                  onChange={(e) => setGrantReason((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <button
                  onClick={() => handleGrant(u.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
