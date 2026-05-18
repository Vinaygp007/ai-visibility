"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide sidebar on /docs page
  const showSidebar = !pathname.startsWith("/docs");

  return (
    <>
      {showSidebar && (
        <>
          <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

          {/* Backdrop — tap to close on mobile */}
          {mobileOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Hamburger button — only visible on mobile when sidebar is closed */}
          {!mobileOpen && (
            <button
              onClick={() => setMobileOpen(true)}
              className="fixed top-3 left-3 z-50 md:hidden flex flex-col gap-[5px] p-2 rounded-lg"
              style={{
                background: "rgba(10,11,16,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
              }}
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-white" />
              <span className="block w-5 h-0.5 bg-white" />
              <span className="block w-5 h-0.5 bg-white" />
            </button>
          )}
        </>
      )}
      {children}
    </>
  );
}
