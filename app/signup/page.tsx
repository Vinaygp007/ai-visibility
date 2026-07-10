"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("invite") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const ref = searchParams.get("ref") ?? "";

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
        window.location.href = "/";
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
          <div className="text-lg font-semibold text-white">Create your account</div>
          <div className="text-[12px] text-center" style={{ color: "#8b8d9e" }}>
            Requires a valid invite code
          </div>
        </div>

        {done ? (
          <div className="text-[13px] rounded-lg px-3 py-3 border text-center" style={{ color: "#00e5ff", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.25)" }}>
            Check your email to confirm your account.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#8b8d9e" }}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#8b8d9e" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#8b8d9e" }}>Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#8b8d9e" }}>Invite code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none border font-mono"
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <div className="text-center text-[12px] mt-5" style={{ color: "#6f7280" }}>
          Already have an account?{" "}
          <a href="/login" className="underline" style={{ color: "#8b8d9e" }}>
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
