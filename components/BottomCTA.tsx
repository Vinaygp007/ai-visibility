"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function BottomCTA() {
  const { authed, checked } = useCurrentUser();

  return (
    <section className="max-w-2xl mx-auto px-6 pb-24 text-center">
      <Reveal className="flex flex-col items-center">
        <div className="flex flex-col items-center transition-opacity duration-200" style={{ opacity: checked ? 1 : 0 }}>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-[var(--text)]">
            {authed ? "Ready for another scan?" : "See how AI sees your site"}
          </h2>
          <p className="text-[15px] mb-7" style={{ color: "var(--text-muted)" }}>
            {authed
              ? "Jump back in and audit another URL."
              : "Sign up free and run your first scan in minutes."}
          </p>
          <Link
            href={authed ? "/scan" : "/signup"}
            className="inline-block rounded-xl px-7 py-3 text-sm font-semibold text-[var(--on-accent)] transition-all hover:opacity-85 hover:scale-[1.03] active:scale-95"
            style={{ background: "var(--accent)", boxShadow: "0 8px 30px -8px rgba(0,229,255,0.5)" }}
          >
            {authed ? "Go to Scan →" : "Sign up free →"}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
