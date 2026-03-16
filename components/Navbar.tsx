"use client";

export default function Navbar() {
  return (
    <nav
      className="flex items-center justify-between px-12 py-4 border-b sticky top-0 z-50"
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: "rgba(10,11,16,0.92)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: "linear-gradient(135deg, #7c6fff, #00e5ff)" }}
        >
          🔭
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight">AiScope</span>
          <span className="text-[15px] font-bold" style={{ color: "#8b8d9e" }}>By Marcstrat</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="text-[11px] font-mono px-2 py-1 rounded-full border tracking-wide"
          style={{
            color: "#00e5ff",
            background: "rgba(0,229,255,0.1)",
            borderColor: "rgba(0,229,255,0.25)",
          }}
        >
          BETA
        </span>
      </div>
    </nav>
  );
}
