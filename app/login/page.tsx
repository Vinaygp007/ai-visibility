"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Authentication service is not configured. Please add Firebase environment variables.");
        setLoading(false);
        return;
      }
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Incorrect email or password. Please try again.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a moment and try again.");
      } else {
        setError("Sign in failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--c-bg)",
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,111,255,0.15), transparent 70%)",
      }}
    >
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--c-text)" }}>
            Welcome back
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--c-muted)" }}>
            Sign in to your AI Scope account
          </p>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm border"
              style={{
                background: "rgba(255,90,90,0.07)",
                borderColor: "rgba(255,90,90,0.25)",
                color: "var(--c-error)",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                style={{
                  background: "var(--c-bg)",
                  borderColor: "var(--c-border-strong)",
                  color: "var(--c-text)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--c-accent2)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--c-border-strong)")}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                  style={{
                    background: "var(--c-bg)",
                    borderColor: "var(--c-border-strong)",
                    color: "var(--c-text)",
                    outline: "none",
                    paddingRight: "3rem",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--c-accent2)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--c-border-strong)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1"
                  style={{ color: "var(--c-muted)" }}
                  tabIndex={-1}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50 mt-2"
              style={{ background: "var(--c-accent2)", color: "#fff" }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--c-border)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "var(--c-border)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--c-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold hover:opacity-80" style={{ color: "var(--c-accent2)" }}>
              Create account
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--c-muted)" }}>
          <Link href="/" className="hover:opacity-70" style={{ color: "var(--c-muted)" }}>
            ← Back to AI Scope
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
