import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
