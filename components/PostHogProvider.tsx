"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY) return;
    const url = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!KEY || posthog.__loaded) return;
    posthog.init(KEY, {
      api_host: HOST,
      // We capture $pageview manually (below) to track SPA route changes
      // correctly instead of only the initial full page load.
      capture_pageview: false,
      capture_pageleave: true,
    });
  }, []);

  return (
    <>
      {KEY && (
        <Suspense fallback={null}>
          <PageviewTracker />
        </Suspense>
      )}
      {children}
    </>
  );
}
