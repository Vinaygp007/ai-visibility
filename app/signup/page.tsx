"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("invite") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const ref = searchParams.get("ref") ?? "";
  // A referral link alone doesn't get anyone past the invite gate — send
  // them to the waitlist instead of a signup form they can't submit,
  // carrying the ref code along so the referrer still gets credited once
  // this person is eventually invited (see /waitlist's own ref handling).
  // `manual=1` is set by the waitlist page's own "Already have an invite?"
  // link — that's someone deliberately asking for the form to type a code
  // into, so it must skip this redirect instead of bouncing them right back.
  const needsWaitlist = !!ref && !searchParams.get("invite") && !searchParams.get("manual");
  useEffect(() => {
    if (needsWaitlist) router.replace(`/waitlist?ref=${encodeURIComponent(ref)}`);
  }, [needsWaitlist, ref, router]);

  if (needsWaitlist) return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { invite_code: inviteCode.trim(), ref, full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        // Email confirmation is disabled on this project — go straight in.
        // middleware.ts will bounce to /waitlist if the invite didn't validate.
        window.location.href = "/scan";
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
      >
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold mb-3"
            style={{ background: "linear-gradient(135deg, #4285f4 0%, var(--accent) 100%)" }}
          >
            AI
          </div>
          <div className="text-lg font-semibold text-[var(--text)]">Create your account</div>
          <div className="text-[12px] text-center" style={{ color: "var(--text-muted)" }}>
            Requires a valid invite code
          </div>
        </div>

        {done ? (
          <div className="text-[13px] rounded-lg px-3 py-3 border text-center" style={{ color: "var(--accent)", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }}>
            Check your email to confirm your account.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none border"
                style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none border"
                style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none border"
                style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Invite code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none border font-mono"
                style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
              />
            </div>

            {error && (
              <div className="text-[12px] rounded-lg px-3 py-2 border" style={{ color: "var(--danger)", background: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <div className="text-center text-[12px] mt-5" style={{ color: "var(--text-dim)" }}>
          Already have an account?{" "}
          <a href="/login" className="underline" style={{ color: "var(--text-muted)" }}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
