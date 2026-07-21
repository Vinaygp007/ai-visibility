"use client";

import { useEffect, useState } from "react";

interface Invite {
  id: string;
  code: string;
  email: string | null;
  credits_granted: number;
  max_uses: number;
  uses: number;
  status: "active" | "exhausted" | "revoked" | "expired";
  expires_at: string | null;
  created_at: string;
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [creditsGranted, setCreditsGranted] = useState("0");
  const [maxUses, setMaxUses] = useState("1");
  const [creating, setCreating] = useState(false);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites");
      const data = await res.json();
      setInvites(data.invites ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim() || undefined,
          email: email.trim() || undefined,
          creditsGranted: Number(creditsGranted) || 0,
          maxUses: Number(maxUses) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error?.message ?? "Failed to create invite.");
        return;
      }
      showMessage(`Invite ${data.invite.code} created.`);
      setCode("");
      setEmail("");
      setCreditsGranted("0");
      setMaxUses("1");
      loadInvites();
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    const res = await fetch("/api/admin/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    if (res.ok) {
      showMessage("Invite revoked.");
      loadInvites();
    }
  };

  return (
    <div>
      {message && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ background: "rgba(0,229,255,0.08)", color: "var(--accent)" }}>
          {message}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 items-end"
        style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
      >
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Code (optional)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="auto-generated"
            className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
            style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Email lock (optional)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anyone"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Credits granted</label>
          <input
            type="number"
            value={creditsGranted}
            onChange={(e) => setCreditsGranted(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-1.5">Max uses</label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="col-span-2 md:col-span-4 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {creating ? "Creating..." : "Create invite"}
        </button>
      </form>

      {loading ? (
        <div className="text-[var(--text)]">Loading...</div>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl border"
              style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
            >
              <div>
                <div className="text-sm font-mono font-semibold text-[var(--text)]">{inv.code}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {inv.email ?? "any email"} · {inv.uses}/{inv.max_uses} used · +{inv.credits_granted} credits · {inv.status}
                </div>
              </div>
              {inv.status === "active" && (
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="px-3 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: "rgba(255,90,90,0.3)", color: "var(--danger)" }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
