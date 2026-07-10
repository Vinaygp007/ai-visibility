"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function supabaseAuthErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Invalid email or password.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please try again later.";
  return message || "Login failed.";
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(supabaseAuthErrorMessage(signInError.message));
        return;
      }

      const res = await fetch("/api/me");
      const me = await res.json().catch(() => null);
      if (!res.ok || me?.role !== "admin") {
        await supabase.auth.signOut();
        setError("This account does not have admin access.");
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0a0b10" }}>
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold mb-3"
            style={{ background: "linear-gradient(135deg, #4285f4 0%, #00e5ff 100%)" }}
          >
            AI
          </div>
          <div className="text-lg font-semibold text-white">Admin sign in</div>
          <div className="text-[12px]" style={{ color: "#8b8d9e" }}>
            Restricted to admin accounts
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#8b8d9e" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#8b8d9e" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          {error && (
            <div className="text-[12px] rounded-lg px-3 py-2 border" style={{ color: "#ff6b6b", background: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #7c6fff, #00e5ff)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
