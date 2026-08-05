"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/useCurrentUser";
import AuthLayout from "@/components/AuthLayout";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

function supabaseAuthErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Invalid email or password.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please try again later.";
  return message || "Login failed.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleOAuth() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
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
    <AuthLayout
      image={{
        src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80",
      }}
    >
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] mb-1.5">Welcome back</h1>
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
          Sign in to continue to your dashboard
        </p>
      </div>

      <button
        type="button"
        onClick={() => handleOAuth()}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-[var(--text)] border transition-colors hover:bg-[rgba(var(--overlay-rgb),0.05)]"
        style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.12)" }}
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb),0.1)" }} />
        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>or sign in with email</span>
        <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb),0.1)" }} />
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Email
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-dim)" }}
              aria-hidden="true"
            />
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text)] border"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.12)" }}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Password
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-dim)" }}
              aria-hidden="true"
            />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input w-full rounded-xl pl-9 pr-10 py-2.5 text-sm text-[var(--text)] border"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.12)" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center"
              style={{ color: "var(--text-dim)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-[12px] rounded-lg px-3 py-2 border" style={{ color: "var(--danger)", background: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60 transition-transform active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="text-center text-[13px] mt-7" style={{ color: "var(--text-dim)" }}>
        Don&apos;t have an account?{" "}
        <a href="/signup" className="font-medium underline" style={{ color: "var(--accent)" }}>
          Sign up
        </a>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
