import Link from "next/link";

export default function NotFound() {
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
          style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          // 404
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--text)" }}>
          This page isn't visible to AI, or anyone
        </h1>
        <p className="text-[15px] leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
