"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ChevronDown, CreditCard, LogOut } from "lucide-react";

export default function UserMenu({ name, email }: { name: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg transition-colors hover:bg-[rgba(var(--overlay-rgb),0.05)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent2), var(--accent))", color: "var(--on-accent)" }}
        >
          {initial}
        </span>
        <span className="hidden lg:block text-[14px] font-medium max-w-[120px] truncate" style={{ color: "var(--text)" }}>
          {name}
        </span>
        <ChevronDown size={14} className="hidden lg:block" style={{ color: "var(--text-dim)" }} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border overflow-hidden shadow-lg z-50"
          style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)" }}
        >
          <div className="px-3.5 py-3" style={{ borderBottom: "1px solid rgba(var(--overlay-rgb),0.08)" }}>
            <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text)" }}>{name}</div>
            {email && <div className="text-[12px] truncate mt-0.5" style={{ color: "var(--text-dim)" }}>{email}</div>}
          </div>

          <Link
            href="/billing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors hover:bg-[rgba(var(--overlay-rgb),0.05)]"
            style={{ color: "var(--text)" }}
          >
            <CreditCard size={15} style={{ color: "var(--text-dim)" }} />
            Billing
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium text-left transition-colors hover:bg-[rgba(var(--overlay-rgb),0.05)]"
            style={{ color: "var(--danger)" }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
