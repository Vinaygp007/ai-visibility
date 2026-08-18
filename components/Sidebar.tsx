"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Search, Layers, Terminal, FileText, History, Users, CreditCard, Settings, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PRIMARY_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/scan", label: "Scan", icon: Search },
  { href: "/bulk", label: "Bulk Scanner", icon: Layers },
  { href: "/bulk-prompt", label: "Prompt Runner", icon: Terminal },
];

export const ACCOUNT_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/reports", label: "Previous Reports", icon: FileText },
  { href: "/credits", label: "Credit History", icon: History },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export const ADMIN_LINK = { href: "/admin/providers", label: "Settings", icon: Settings };

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors"
      style={{
        color: active ? "var(--accent)" : "var(--text-muted)",
        background: active ? "rgba(0,229,255,0.1)" : "transparent",
      }}
    >
      <Icon size={17} className="shrink-0" strokeWidth={2} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const role = user?.role ?? null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 fixed inset-y-0 left-0 border-r px-3 py-6 overflow-y-auto"
      style={{
        borderColor: "rgba(var(--overlay-rgb),0.07)",
        background: "var(--surface)",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <Link href="/" className="flex items-center gap-2.5 mb-8 px-2">
        <img src="/logo-mark.png" alt="AiScope" className="w-8 h-8 flex-shrink-0" />
        <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>AiScope</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {PRIMARY_LINKS.map((link) => (
          <NavLink key={link.href} {...link} active={isActive(link.href)} />
        ))}
      </nav>

      {user && (
        <>
          <div className="h-px my-4 mx-1" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />
          <nav className="flex flex-col gap-1">
            {ACCOUNT_LINKS.map((link) => (
              <NavLink key={link.href} {...link} active={isActive(link.href)} />
            ))}
          </nav>
        </>
      )}

      <div className="flex-1" />

      {user && (
        <>
          <div className="h-px my-3 mx-1" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />
          <nav className="flex flex-col gap-1">
            {role === "admin" && <NavLink {...ADMIN_LINK} active={isActive(ADMIN_LINK.href)} />}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium text-left transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut size={17} className="shrink-0" strokeWidth={2} />
              Log out
            </button>
          </nav>
        </>
      )}
    </aside>
  );
}
