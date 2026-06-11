"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      setError("Too many failed attempts. Please wait before trying again.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setAttempts((n) => n + 1);
        setError(data.error || "Invalid credentials.");
        setPassword("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    background: "var(--c-bg)",
    borderColor: "var(--c-border-strong)",
    color: "var(--c-text)",
    outline: "none",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "var(--c-bg)",
        backgroundImage: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,111,255,0.12), transparent 65%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(124,111,255,0.2), rgba(0,229,255,0.12))",
              border: "1px solid rgba(124,111,255,0.3)",
            }}
          >
            🛡️
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-text)" }}>Admin Access</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-muted)" }}>
            AI Scope · Marcstrat
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <p className="text-sm mb-6" style={{ color: "var(--c-muted)" }}>
            Enter your admin credentials to access the control panel.
          </p>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm border flex items-start gap-2"
              style={{
                background: "rgba(255,90,90,0.07)",
                borderColor: "rgba(255,90,90,0.25)",
                color: "var(--c-error)",
              }}
            >
              <span className="flex-shrink-0">✕</span>
              {error}
            </div>
          )}

          {/* Attempts warning */}
          {attempts >= 3 && attempts < 5 && (
            <div
              className="mb-4 px-4 py-2 rounded-xl text-xs border"
              style={{
                background: "rgba(255,184,48,0.07)",
                borderColor: "rgba(255,184,48,0.25)",
                color: "var(--c-warning)",
              }}
            >
              ⚠️ {5 - attempts} attempt{5 - attempts !== 1 ? "s" : ""} remaining before lockout.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Admin ID */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Admin ID
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter admin ID"
                className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                style={inputBase}
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
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl border text-sm transition-all"
                  style={{ ...inputBase, paddingRight: "3.5rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--c-accent2)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--c-border-strong)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
                  style={{ color: "var(--c-muted)" }}
                  tabIndex={-1}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || attempts >= 5}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: "var(--c-accent2)", color: "#fff" }}
            >
              {loading ? "Verifying…" : "Access Admin Panel →"}
            </button>
          </form>
        </div>

        {/* Security note */}
        <div
          className="mt-4 rounded-xl border px-4 py-3 text-xs"
          style={{ borderColor: "var(--c-border)", color: "var(--c-muted)", background: "var(--c-surface)" }}
        >
          🔒 This page is only accessible to authorised administrators. All access attempts are logged.
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--c-muted)" }}>
          <Link href="/" className="hover:opacity-70" style={{ color: "var(--c-muted)" }}>
            ← Back to AI Scope
          </Link>
        </p>
      </div>
    </div>
  );
}
