"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-md">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))", color: "var(--on-accent)" }}
        >
          A
        </div>
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--danger)", background: "rgba(255,90,90,0.08)", borderColor: "rgba(255,90,90,0.25)" }}
        >
          // ERROR
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text)" }}>
          Something went wrong
        </h1>
        <p className="text-[15px] leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
          An unexpected error occurred. It's been logged — try again, or head back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl px-6 py-3 text-sm font-medium border transition-all hover:border-[rgba(var(--overlay-rgb),0.3)]"
            style={{ borderColor: "rgba(var(--overlay-rgb),0.13)", color: "var(--text)" }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
