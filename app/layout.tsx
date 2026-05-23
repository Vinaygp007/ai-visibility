import type { Metadata } from "next";
import "./globals.css";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "AI Scope — AI Visibility Platform by Marcstrat",
  description:
    "Audit how AI systems like ChatGPT, Claude, Perplexity, and Gemini discover, crawl, and reference your website. Get your AI Scope score in seconds.",
  keywords: [
    "AI visibility",
    "AI SEO",
    "AI Scope",
    "llms.txt",
    "robots.txt",
    "AI crawler",
    "ChatGPT SEO",
    "Marcstrat",
    "GEO",
    "generative engine optimization",
  ],
  openGraph: {
    title: "AI Scope — AI Visibility Platform by Marcstrat",
    description:
      "Know where your brand stands in the AI age. Audit your website across 14+ AI systems.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flicker: set theme class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aiscope-theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <LayoutWithSidebar>{children}</LayoutWithSidebar>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
