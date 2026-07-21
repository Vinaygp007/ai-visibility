"use client";

import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav
      className="flex items-center justify-between px-4 sm:px-8 py-4 border-b sticky top-0 z-50"
      style={{
        borderColor: "rgba(var(--overlay-rgb),0.07)",
        background: "var(--nav-bg)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
        >
          🔭
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight">AiScope</span>
          <span className="text-[15px] font-bold" style={{ color: "var(--text-muted)" }}>By Marcstrat</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="text-[11px] font-mono px-2 py-1 rounded-full border tracking-wide"
          style={{
            color: "var(--accent)",
            background: "rgba(0,229,255,0.1)",
            borderColor: "rgba(0,229,255,0.25)",
          }}
        >
          BETA
        </span>
        <ThemeToggle />
      </div>
    </nav>
  );
}
