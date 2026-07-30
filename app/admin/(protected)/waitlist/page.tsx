"use client";

import { useEffect, useState } from "react";

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  source: string | null;
  ref_code: string | null;
  status: "pending" | "invited" | "rejected";
  created_at: string;
  inviteCode: string | null;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/waitlist");
      const data = await res.json();
      setEntries(data.waitlist ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  // Carries the original ref code forward, if this person came in through a
  // referral link and was later invited off the waitlist — otherwise the
  // referrer would never get credited once they actually sign up.
  const inviteLink = (code: string, refCode?: string | null) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({ invite: code });
    if (refCode) params.set("ref", refCode);
    return `${base}/signup?${params.toString()}`;
  };

  const copyLink = async (code: string, refCode?: string | null) => {
    try {
      await navigator.clipboard.writeText(inviteLink(code, refCode));
      showMessage("Invite link copied.");
    } catch {
      showMessage(inviteLink(code, refCode));
    }
  };

  const handleAction = async (waitlistId: string, action: "invite" | "reject") => {
    setBusyId(waitlistId);
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error?.message ?? "Action failed.");
        return;
      }
      if (action === "invite") {
        const entry = entries.find((e) => e.id === waitlistId);
        await copyLink(data.invite.code, entry?.ref_code);
      } else {
        showMessage("Marked as rejected.");
      }
      loadEntries();
    } finally {
      setBusyId(null);
    }
  };

  const pending = entries.filter((e) => e.status === "pending");
  const handled = entries.filter((e) => e.status !== "pending");

  return (
    <div>
      {message && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ background: "rgba(0,229,255,0.08)", color: "var(--accent)" }}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-[var(--text)]">Loading...</div>
      ) : (
        <>
          <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Pending ({pending.length})
          </div>
          <div className="space-y-2 mb-8">
            {pending.length === 0 && (
              <div className="text-sm" style={{ color: "var(--text-dim)" }}>Nobody's waiting right now.</div>
            )}
            {pending.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{entry.email}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {entry.full_name || "no name"} · {entry.company || "no company"} · {entry.source || "organic"} ·{" "}
                    {new Date(entry.created_at).toLocaleDateString()}
                    {entry.ref_code && <> · referred by <span className="font-mono">{entry.ref_code}</span></>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(entry.id, "invite")}
                    disabled={busyId === entry.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    {busyId === entry.id ? "Working..." : "Invite"}
                  </button>
                  <button
                    onClick={() => handleAction(entry.id, "reject")}
                    disabled={busyId === entry.id}
                    className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-60"
                    style={{ borderColor: "rgba(255,90,90,0.3)", color: "var(--danger)" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {handled.length > 0 && (
            <>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Handled ({handled.length})
              </div>
              <div className="space-y-2">
                {handled.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border"
                    style={{
                      background: "rgba(var(--overlay-rgb),0.02)",
                      borderColor: "rgba(var(--overlay-rgb),0.07)",
                      opacity: entry.status === "invited" ? 1 : 0.6,
                    }}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{entry.email}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {entry.full_name || "no name"} · {entry.company || "no company"}
                      </div>
                      {entry.status === "invited" && entry.inviteCode && (
                        <div className="text-xs font-mono mt-1" style={{ color: "var(--accent)" }}>
                          {inviteLink(entry.inviteCode, entry.ref_code)}
                        </div>
                      )}
                    </div>
                    {entry.status === "invited" && entry.inviteCode ? (
                      <button
                        onClick={() => copyLink(entry.inviteCode!, entry.ref_code)}
                        className="px-3 py-1.5 rounded-lg text-xs border shrink-0 ml-3"
                        style={{ borderColor: "rgba(0,229,255,0.3)", color: "var(--accent)" }}
                      >
                        Copy link
                      </button>
                    ) : (
                      <div className="text-xs font-mono shrink-0 ml-3" style={{ color: "var(--danger)" }}>
                        {entry.status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
