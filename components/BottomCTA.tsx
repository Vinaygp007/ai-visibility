"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function BottomCTA() {
  const { authed, checked } = useCurrentUser();

  return (
    <section className="relative overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/12788190_1920_1080_30fps.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0" style={{ background: "rgba(10, 11, 16, 0.55)" }} aria-hidden="true" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-24 text-center">
        <Reveal className="flex flex-col items-center">
          <div className="flex flex-col items-center transition-opacity duration-200" style={{ opacity: checked ? 1 : 0 }}>
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight mb-4"
              style={{ color: "#ffffff", textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}
            >
              {authed ? "Ready for another scan?" : "See how AI sees your site"}
            </h2>
            <p className="text-[15px] mb-7" style={{ color: "#c7c9d6", textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}>
              {authed
                ? "Jump back in and audit another URL."
                : "Sign up free and run your first scan in minutes."}
            </p>
            <Link
              href={authed ? "/scan" : "/signup"}
              className="inline-block rounded-xl px-7 py-3 text-sm font-semibold text-black transition-all hover:opacity-85 hover:scale-[1.03] active:scale-95"
              style={{ background: "#00e5ff", boxShadow: "0 8px 30px -8px rgba(0,229,255,0.6)" }}
            >
              {authed ? "Go to Scan →" : "Sign up free →"}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
