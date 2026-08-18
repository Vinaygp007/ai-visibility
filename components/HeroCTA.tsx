"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";

// Kept as its own small client component (rather than making the whole
// homepage a client component) so the rest of the marketing page stays
// server-rendered for SEO/crawlability — the one thing this product is
// actually about.
export default function HeroCTA() {
  const { authed, checked } = useCurrentUser();

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4 transition-opacity duration-200"
        style={{ opacity: checked ? 1 : 0 }}
      >
        <Link
          href={authed ? "/scan" : "/signup"}
          prefetch={false}
          className="rounded-xl px-7 py-3 text-sm font-semibold text-[var(--on-accent)] transition-all hover:opacity-85 hover:scale-[1.03] active:scale-95"
          style={{ background: "var(--accent)", boxShadow: "0 8px 30px -8px rgba(0,229,255,0.5)" }}
        >
          {authed ? "Go to Scan →" : "Sign up free →"}
        </Link>
        {!authed && (
          <Link
            href="/login"
            prefetch={false}
            className="rounded-xl px-7 py-3 text-sm font-medium border transition-all hover:border-[rgba(var(--overlay-rgb),0.3)]"
            style={{ borderColor: "rgba(var(--overlay-rgb),0.13)", color: "var(--text)" }}
          >
            Log in
          </Link>
        )}
      </div>
      {checked && !authed && (
        <p className="animate-fade-up fade-up-4 text-[12px]" style={{ color: "var(--text-dim)" }}>
          Free to sign up. Agencies and active SEO/GEO practitioners run scans in seconds.
        </p>
      )}
    </>
  );
}
