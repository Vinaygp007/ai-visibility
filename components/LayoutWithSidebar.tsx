"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function LayoutWithSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide sidebar on /docs page
  const showSidebar = !pathname.startsWith("/docs");

  return (
    <>
      {showSidebar && <Sidebar />}
      {children}
    </>
  );
}
