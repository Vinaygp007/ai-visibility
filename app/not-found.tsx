import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="relative overflow-hidden min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="aurora-blob aurora-blob-1"
          style={{ width: 420, height: 420, top: -140, left: "2%", background: "var(--accent)", opacity: 0.16 }}
        />
        <div
          className="aurora-blob aurora-blob-2"
          style={{ width: 380, height: 380, top: 20, right: "4%", background: "var(--accent2)", opacity: 0.14 }}
        />
        <div
          className="aurora-blob aurora-blob-3"
          style={{ width: 340, height: 340, bottom: -140, left: "38%", background: "var(--success)", opacity: 0.12 }}
        />
      </div>

      <div className="text-center max-w-lg animate-fade-up">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-6 tracking-widest"
          style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          // 404
        </div>

        <h1
          className="heading-shimmer text-7xl md:text-8xl font-bold leading-none tracking-tight mb-5"
          style={{
            background: "linear-gradient(110deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        <h2 className="text-2xl font-bold tracking-tight mb-3" style={{ color: "var(--text)" }}>
          This page isn&apos;t visible to AI, or anyone
        </h2>
        <p className="text-[15px] leading-relaxed mb-9 max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you somewhere useful.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/scan"
            className="rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Run a scan
          </Link>
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
