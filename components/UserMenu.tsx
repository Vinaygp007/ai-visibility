"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function UserMenu({
  name,
  links,
  onLogout,
}: {
  name: string;
  links: { href: string; label: string }[];
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors"
        style={{ color: "var(--text)", background: open ? "rgba(var(--overlay-rgb),0.06)" : "transparent" }}
      >
        {name}
        <span style={{ color: "var(--text-muted)", fontSize: 10, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl border overflow-hidden z-50 min-w-[200px]"
          style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.1)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--overlay-rgb),0.04)]"
              style={{ color: "var(--text)" }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[rgba(var(--overlay-rgb),0.04)] border-t"
            style={{ color: "var(--text-muted)", borderColor: "rgba(var(--overlay-rgb),0.06)" }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
