"use client";

import { useEffect, useState } from "react";
import { applyTheme, getCurrentTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getCurrentTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${className}`}
      style={{ borderColor: "rgba(var(--overlay-rgb), 0.13)", color: "var(--text-muted)", background: "transparent" }}
    >
      <span className="text-base leading-none" suppressHydrationWarning>
        {mounted ? (theme === "dark" ? "☀️" : "🌙") : "🌙"}
      </span>
    </button>
  );
}
