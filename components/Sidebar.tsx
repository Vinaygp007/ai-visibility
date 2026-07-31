"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const PRIMARY_LINKS = [
  { href: "/scan", label: "Scan" },
  { href: "/bulk", label: "Bulk Scanner" },
  { href: "/bulk-prompt", label: "Prompt Runner" },
];

export const ACCOUNT_LINKS = [
  { href: "/reports", label: "Previous Reports" },
  { href: "/credits", label: "Credit History" },
  { href: "/referrals", label: "Referrals" },
];

export const ADMIN_LINK = { href: "/admin/providers", label: "Settings" };

function NavLink({ href, label, active, small }: { href: string; label: string; active: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg font-medium transition-colors ${small ? "text-[13.5px]" : "text-[14px]"}`}
      style={{
        color: active ? "var(--accent)" : "var(--text-muted)",
        background: active ? "rgba(0,229,255,0.08)" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 sticky top-0 h-screen border-r px-3 py-6 overflow-y-auto"
      style={{ borderColor: "rgba(var(--overlay-rgb),0.07)", background: "var(--surface)" }}
    >
      <Link href="/" className="flex items-center gap-2.5 mb-8 px-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))" }}
        >
          🔭
        </div>
        <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>AiScope</span>
      </Link>

      <nav className="flex flex-col gap-1 mb-6">
        {PRIMARY_LINKS.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={pathname === link.href || pathname.startsWith(link.href + "/")}
          />
        ))}
      </nav>
    </aside>
  );
}
