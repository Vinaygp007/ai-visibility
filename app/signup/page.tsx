"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase-client");
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Authentication service is not configured. Please add Firebase environment variables.");
        setLoading(false);
        return;
      }
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Sign in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Please choose a stronger password (at least 8 characters).");
      } else {
        setError("Account creation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--c-bg)",
    borderColor: "var(--c-border-strong)",
    color: "var(--c-text)",
    outline: "none",
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--c-bg)",
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,255,0.1), transparent 70%)",
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
            Create your account
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--c-muted)" }}>
            Start auditing your AI visibility for free
          </p>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm border"
              style={{ background: "rgba(255,90,90,0.07)", borderColor: "rgba(255,90,90,0.25)", color: "var(--c-error)" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--c-accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--c-border-strong)")}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--c-accent)")}
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
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                  style={{ ...inputStyle, paddingRight: "3rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--c-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--c-border-strong)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "var(--c-muted)" }}
                  tabIndex={-1}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Confirm password
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Re-enter password"
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--c-accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--c-border-strong)")}
              />
            </div>

            {/* Terms note */}
            <p className="text-[11px]" style={{ color: "var(--c-muted)" }}>
              By creating an account you agree to AI Scope&apos;s terms of service and privacy policy.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
              style={{ background: "var(--c-accent)", color: "#000" }}
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--c-border)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>OR</span>
            <div className="flex-1 h-px" style={{ background: "var(--c-border)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--c-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:opacity-80" style={{ color: "var(--c-accent)" }}>
              Sign in
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
