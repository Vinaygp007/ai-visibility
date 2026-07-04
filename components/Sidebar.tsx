"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/bulk", label: "Bulk Scanner", icon: "⚡" },
    { href: "/bulk-prompt", label: "Prompt Runner", icon: "✦" },
    { href: "/reports", label: "Previous Reports", icon: "📋" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 border-r flex flex-col z-40 transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
      style={{ background: "#0a0b10", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none"
        style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        aria-label="Close menu"
      >
        ×
      </button>
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
        <button
          onClick={handleLogout}
          className="w-full text-left mb-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
          style={{ color: "#8b8d9e", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          Log out
        </button>
        <div className="font-bold mb-1">By Marcstrat</div>
        <div style={{ color: "#4b5563" }}>Powered by Gemini · ChatGPT · Perplexity</div>
      </div>
    </aside>
  );
}