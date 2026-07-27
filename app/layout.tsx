import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import PostHogProvider from "@/components/PostHogProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { inter, spaceGrotesk, jetbrainsMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "AiScope — AI Visibility Checker",
  description:
    "Instantly audit how AI systems like ChatGPT, Claude, and Perplexity discover, crawl, and reference your website.",
  keywords: ["AI visibility", "SEO", "llms.txt", "robots.txt", "AI crawler", "ChatGPT SEO"],
  openGraph: {
    title: "AiScope — AI Visibility Checker",
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
        <PostHogProvider>
          <AppShell>{children}</AppShell>
        </PostHogProvider>
      </body>
    </html>
  );
}
