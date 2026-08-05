"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/useCurrentUser";

export const PRIMARY_LINKS = [
  { href: "/scan", label: "Scan" },
  { href: "/bulk", label: "Bulk Scanner" },
  { href: "/bulk-prompt", label: "Prompt Runner" },
];

export const ACCOUNT_LINKS = [
  { href: "/reports", label: "Previous Reports" },
  { href: "/credits", label: "Credit History" },
  { href: "/referrals", label: "Referrals" },
  { href: "/billing", label: "Billing" },
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
  const router = useRouter();
  const { user } = useCurrentUser();
  const role = user?.role ?? null;
  const accountLinks = role === "admin" ? [...ACCOUNT_LINKS, ADMIN_LINK] : ACCOUNT_LINKS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

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

      <div className="flex-1" />

      {user && (
        <>
          <div className="h-px my-3 mx-1" style={{ background: "rgba(var(--overlay-rgb),0.08)" }} />
          <nav className="flex flex-col gap-1">
            {accountLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                small
                active={pathname === link.href || pathname.startsWith(link.href + "/")}
              />
            ))}
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg font-medium text-[13.5px] text-left transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Log out
            </button>
          </nav>
        </>
      )}
    </aside>
  );
}
