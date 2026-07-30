import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import PostHogProvider from "@/components/PostHogProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { inter, spaceGrotesk, jetbrainsMono } from "@/lib/fonts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiscope.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "AiScope: AI Visibility Checker",
  description:
    "Instantly audit how AI systems like ChatGPT, Claude, and Perplexity discover, crawl, and reference your website.",
  keywords: ["AI visibility", "SEO", "llms.txt", "robots.txt", "AI crawler", "ChatGPT SEO"],
  openGraph: {
    title: "AiScope: AI Visibility Checker",
    description: "Check how visible your website is to AI systems.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {/* Shared gradient def for icon-blue-gradient — referenced via
            color="url(#icon-blue-gradient)" wherever a lucide icon should
            render with the radiant blue treatment instead of a flat color. */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <linearGradient id="icon-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <PostHogProvider>
          <AppShell>{children}</AppShell>
        </PostHogProvider>
      </body>
    </html>
  );
}
