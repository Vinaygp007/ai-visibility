"use client";

import { useEffect, useState } from "react";

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  source: string | null;
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

  const inviteLink = (code: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/signup?invite=${code}` : `/signup?invite=${code}`;

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      showMessage("Invite link copied.");
    } catch {
      showMessage(inviteLink(code));
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
        await copyLink(data.invite.code);
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
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-white">Loading...</div>
      ) : (
        <>
          <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#8b8d9e" }}>
            Pending ({pending.length})
          </div>
          <div className="space-y-2 mb-8">
            {pending.length === 0 && (
              <div className="text-sm" style={{ color: "#6f7280" }}>Nobody's waiting right now.</div>
            )}
            {pending.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div>
                  <div className="text-sm font-semibold text-white">{entry.email}</div>
                  <div className="text-xs" style={{ color: "#8b8d9e" }}>
                    {entry.full_name || "no name"} · {entry.company || "no company"} · {entry.source || "organic"} ·{" "}
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(entry.id, "invite")}
                    disabled={busyId === entry.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                    style={{ background: "#00e5ff", color: "#000" }}
                  >
                    {busyId === entry.id ? "Working..." : "Invite"}
                  </button>
                  <button
                    onClick={() => handleAction(entry.id, "reject")}
                    disabled={busyId === entry.id}
                    className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-60"
                    style={{ borderColor: "rgba(255,90,90,0.3)", color: "#ff5a5a" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {handled.length > 0 && (
            <>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#8b8d9e" }}>
                Handled ({handled.length})
              </div>
              <div className="space-y-2">
                {handled.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(255,255,255,0.07)",
                      opacity: entry.status === "invited" ? 1 : 0.6,
                    }}
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{entry.email}</div>
                      <div className="text-xs" style={{ color: "#8b8d9e" }}>
                        {entry.full_name || "no name"} · {entry.company || "no company"}
                      </div>
                      {entry.status === "invited" && entry.inviteCode && (
                        <div className="text-xs font-mono mt-1" style={{ color: "#00e5ff" }}>
                          {inviteLink(entry.inviteCode)}
                        </div>
                      )}
                    </div>
                    {entry.status === "invited" && entry.inviteCode ? (
                      <button
                        onClick={() => copyLink(entry.inviteCode!)}
                        className="px-3 py-1.5 rounded-lg text-xs border shrink-0 ml-3"
                        style={{ borderColor: "rgba(0,229,255,0.3)", color: "#00e5ff" }}
                      >
                        Copy link
                      </button>
                    ) : (
                      <div className="text-xs font-mono shrink-0 ml-3" style={{ color: "#ff5a5a" }}>
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
