"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ROLES, ROLE_LABEL, isAdminRole, isSuperAdmin, type UserRole } from "@/lib/roles";

type Plan = "free" | "starter" | "growth" | "agency" | "scale";
const PLANS: Plan[] = ["free", "starter", "growth", "agency", "scale"];

interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: "pending" | "active" | "suspended";
  referralCode: string;
  plan: Plan;
  createdAt: string;
  balance: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}

const ROLE_BADGE: Record<UserRole, { color: string; bg: string } | null> = {
  user: null,
  admin: { color: "var(--accent)", bg: "rgba(0,229,255,0.1)" },
  super_admin: { color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
};

const INPUT_STYLE = { background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" };

const SUB_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--success)" },
  trialing: { label: "Trialing", color: "var(--accent)" },
  past_due: { label: "Payment failed", color: "var(--danger)" },
  canceled: { label: "Canceled", color: "var(--text-dim)" },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [grantReason, setGrantReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [subscribersOnly, setSubscribersOnly] = useState(false);
  const { user: me } = useCurrentUser();
  const meIsSuper = isSuperAdmin(me?.role);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [creating, setCreating] = useState(false);

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

  const handleRoleChange = async (user: AdminUser, nextRole: UserRole) => {
    if (nextRole === user.role) return;
    if (!window.confirm(`Change ${user.email} from ${ROLE_LABEL[user.role]} to ${ROLE_LABEL[nextRole]}?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role: nextRole }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      showMessage(data?.error?.message ?? "Failed to change role.");
      return;
    }
    showMessage(`${user.email} is now ${ROLE_LABEL[nextRole]}.`);
    loadUsers(search);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const send = (updateExisting: boolean) =>
        fetch("/api/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole, updateExisting }),
        });

      let res = await send(false);
      let data = await res.json().catch(() => null);

      // Existing account (e.g. a Google signup with no password): confirm,
      // then set this password and role on it instead of creating a new one.
      if (res.status === 409 && data?.error?.code === "already_exists") {
        const ok = window.confirm(
          `${newEmail} already has an account.\n\nSet this password on it and make them ${ROLE_LABEL[newRole]}? ` +
            "Any password they already had will be replaced. Google sign-in keeps working."
        );
        if (!ok) return;
        res = await send(true);
        data = await res.json().catch(() => null);
      }

      if (!res.ok) {
        showMessage(data?.error?.message ?? "Failed to create account.");
        return;
      }
      showMessage(
        data?.updated
          ? `${newEmail} is now ${ROLE_LABEL[newRole]} with the new password. They can sign in at /admin/login.`
          : `${ROLE_LABEL[newRole]} account created for ${newEmail}. They can sign in at /admin/login.`
      );
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      loadUsers(search);
    } finally {
      setCreating(false);
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
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      showMessage(data?.error?.message ?? "Failed to update status.");
      return;
    }
    showMessage(`${user.email} is now ${nextStatus}.`);
    loadUsers(search);
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

      {meIsSuper && (
        <form
          onSubmit={handleCreateAccount}
          className="mb-8 rounded-2xl border p-4 sm:p-5"
          style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
        >
          <div className="text-sm font-semibold text-[var(--text)] mb-1">Create admin account</div>
          <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Creates an email + password login for the admin panel, or sets a password on an existing account (e.g. someone who signed up with Google). Share the password with them securely.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm"
              style={INPUT_STYLE}
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm"
              style={INPUT_STYLE}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "super_admin")}
              className="px-3 py-2 rounded-lg border text-sm"
              style={INPUT_STYLE}
              aria-label="Role for new account"
            >
              <option value="admin" style={{ background: "var(--surface)", color: "var(--text)" }}>Admin</option>
              <option value="super_admin" style={{ background: "var(--surface)", color: "var(--text)" }}>Super admin</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUsers(search)}
          placeholder="Search by email..."
          className="flex-1 min-w-0 w-full px-4 py-2.5 rounded-xl border text-sm"
          style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
        />
        <button
          onClick={() => loadUsers(search)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold w-full sm:w-auto flex-shrink-0"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Search
        </button>
      </div>

      <label className="mb-6 flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-muted)" }}>
        <input
          type="checkbox"
          checked={subscribersOnly}
          onChange={(e) => setSubscribersOnly(e.target.checked)}
        />
        Subscribers only ({users.filter((u) => u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing").length})
      </label>

      {loading ? (
        <div className="text-[var(--text)]">Loading...</div>
      ) : (
        <div className="space-y-3">
          {users
            .filter((u) => !subscribersOnly || u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing")
            .map((u) => {
            const subStatus = u.subscriptionStatus ? SUB_STATUS_STYLE[u.subscriptionStatus] : null;
            return (
            <div key={u.id} className="rounded-2xl border p-4 sm:p-5" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text)] break-all">{u.email}</span>
                    {ROLE_BADGE[u.role] && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: ROLE_BADGE[u.role]!.color, background: ROLE_BADGE[u.role]!.bg }}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
                    )}
                    {subStatus && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: subStatus.color, background: "rgba(var(--overlay-rgb),0.06)" }}
                      >
                        {subStatus.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {u.role} · {u.status} · balance: {u.balance} · joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.currentPeriodEnd && (
                      <>
                        {" · "}
                        {u.subscriptionStatus === "canceled" ? "access ends" : "renews"}{" "}
                        {new Date(u.currentPeriodEnd).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={u.plan}
                    onChange={(e) => handlePlanChange(u, e.target.value as Plan)}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                    style={{ borderColor: "rgba(var(--overlay-rgb),0.12)", color: "var(--text)", background: "rgba(var(--overlay-rgb),0.03)" }}
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p} style={{ background: "var(--surface)", color: "var(--text)" }}>{p}</option>
                    ))}
                  </select>
                  {meIsSuper && u.email !== me?.email && (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                      className="px-3 py-1.5 rounded-lg text-xs border"
                      style={{ borderColor: "rgba(var(--overlay-rgb),0.12)", color: "var(--text)", background: "rgba(var(--overlay-rgb),0.03)" }}
                      aria-label="Role"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} style={{ background: "var(--surface)", color: "var(--text)" }}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  )}
                  {u.email !== me?.email && (meIsSuper || !isAdminRole(u.role)) && (
                  <>
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
                  </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="number"
                  placeholder="±credits"
                  value={grantAmount[u.id] ?? ""}
                  onChange={(e) => setGrantAmount((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="w-full sm:w-28 px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <input
                  type="text"
                  placeholder="Reason (required)"
                  value={grantReason[u.id] ?? ""}
                  onChange={(e) => setGrantReason((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="flex-1 min-w-0 w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                />
                <button
                  onClick={() => handleGrant(u.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold w-full sm:w-auto flex-shrink-0"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  Apply
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
