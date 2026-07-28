"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/useCurrentUser";

function supabaseAuthErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Invalid email or password.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please try again later.";
  return message || "Login failed.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/scan";
  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Already signed in (and account is active — useCurrentUser reflects the
  // same /api/me check the rest of the app uses) — bounce straight past the
  // login form instead of making them look at it again.
  const { authed, checked } = useCurrentUser();
  useEffect(() => {
    if (checked && authed) router.replace(from);
  }, [checked, authed, from, router]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(supabaseAuthErrorMessage(error.message));
        return;
      }
      window.location.href = from;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`,
        },
      });
      if (error) {
        setError(supabaseAuthErrorMessage(error.message));
        return;
      }
      setMagicLinkSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`,
      },
    });
    if (error) setError(supabaseAuthErrorMessage(error.message));
  }

  // Still checking, or already authed and about to be redirected away —
  // don't flash the login form in either case.
  if (!checked || authed) {
    return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;
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
          <div className="text-lg font-semibold text-[var(--text)]">AiScope</div>
          <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Sign in to continue
          </div>
        </div>

        <div className="space-y-2 mb-5">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-[var(--text)] border"
            style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.12)" }}
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            className="w-full rounded-lg py-2.5 text-sm font-medium text-[var(--text)] border"
            style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.12)" }}
          >
            Continue with GitHub
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb),0.1)" }} />
          <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>or</span>
          <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb),0.1)" }} />
        </div>

        {magicLinkSent ? (
          <div className="text-[13px] rounded-lg px-3 py-3 border text-center" style={{ color: "var(--accent)", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }}>
            Check your email for a sign-in link.
          </div>
        ) : (
          <form onSubmit={mode === "password" ? handlePasswordSubmit : handleMagicLinkSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none border"
                style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
                autoFocus
              />
            </div>

            {mode === "password" && (
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-[var(--text)] outline-none border"
                  style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
                />
              </div>
            )}

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
              {loading ? "Signing in…" : mode === "password" ? "Sign in" : "Send magic link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "password" ? "magic-link" : "password");
                setError(null);
              }}
              className="w-full text-center text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
            </button>
          </form>
        )}

        <div className="text-center text-[12px] mt-5" style={{ color: "var(--text-dim)" }}>
          Invite-only beta. No invite?{" "}
          <a href="/waitlist" className="underline" style={{ color: "var(--text-muted)" }}>
            Join the waitlist
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
