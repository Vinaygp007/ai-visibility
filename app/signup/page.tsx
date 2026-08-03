"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const ref = searchParams.get("ref") ?? "";

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

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
          data: { ref, full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        // Email confirmation is disabled on this project — go straight in.
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base mb-3"
            style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
          >
            🔭
          </div>
          <div className="text-lg font-semibold text-[var(--text)]">Create your account</div>
        </div>

        {done ? (
          <div className="text-[13px] rounded-lg px-3 py-3 border text-center" style={{ color: "var(--accent)", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }}>
            Check your email to confirm your account.
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-5">
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-[var(--text)] border"
                style={{ background: "rgba(var(--overlay-rgb),0.04)", borderColor: "rgba(var(--overlay-rgb),0.12)" }}
              >
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb),0.1)" }} />
              <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>or</span>
              <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb),0.1)" }} />
            </div>

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
          </>
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
