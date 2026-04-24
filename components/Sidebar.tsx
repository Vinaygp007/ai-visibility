"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/bulk", label: "Bulk Scanner", icon: "⚡" },
    { href: "/reports", label: "Previous Reports", icon: "📋" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 border-r flex flex-col z-10"
      style={{ background: "#0a0b10", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: "linear-gradient(135deg, #4285f4 0%, #00e5ff 100%)" }}
          >
            AI
          </div>
          <div>
            <div className="text-sm font-bold text-white">AI Visibility</div>
            <div className="text-[10px] font-mono" style={{ color: "#8b8d9e" }}>
              Scanner
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: isActive ? "rgba(0,229,255,0.1)" : "transparent",
                border: isActive ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                color: isActive ? "#00e5ff" : "#8b8d9e",
              }}
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-6 py-4 border-t text-[11px]"
        style={{ borderColor: "rgba(255,255,255,0.07)", color: "#6f7280" }}
      >
        <div className="font-bold mb-1">By Marcstrat</div>
        <div style={{ color: "#4b5563" }}>Powered by Gemini · ChatGPT · Perplexity</div>
      </div>
    </aside>
  );
}