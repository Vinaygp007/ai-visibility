import type { Metadata } from "next";
import "./globals.css";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";

const BASE_URL = "https://aiscope.marcstrat.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AI Scope — AI Visibility Platform by Marcstrat",
    template: "%s | AI Scope by Marcstrat",
  },
  description:
    "Audit how AI systems like ChatGPT, Claude, Perplexity, and Gemini discover, crawl, and reference your website. Get your AI Visibility Score in under 60 seconds — free.",
  keywords: [
    "AI visibility",
    "AI SEO",
    "GEO",
    "generative engine optimization",
    "AI Scope",
    "llms.txt",
    "robots.txt audit",
    "AI crawler",
    "ChatGPT SEO",
    "Perplexity optimization",
    "Claude optimization",
    "Marcstrat",
    "AI brand discovery",
    "AI citations",
    "AI share of voice",
  ],
  authors: [{ name: "Marcstrat", url: "https://marcstrat.com" }],
  creator: "Marcstrat",
  publisher: "Marcstrat",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "AI Scope by Marcstrat",
    title: "AI Scope — AI Visibility Platform by Marcstrat",
    description:
      "Know where your brand stands in the AI age. Audit your website across 14+ AI systems — ChatGPT, Claude, Perplexity, Gemini and more. Free to start.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Scope — AI Visibility Platform by Marcstrat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Scope — AI Visibility Platform by Marcstrat",
    description:
      "Audit how AI systems discover and cite your brand. Get your AI Visibility Score in under 60 seconds.",
    images: ["/opengraph-image"],
    creator: "@marcstrat",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Marcstrat",
      url: "https://marcstrat.com",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/opengraph-image`,
      },
      description:
        "Marcstrat is a GTM and brand strategy firm specialising in AI-era growth. AI Scope is their AI visibility auditing platform.",
      email: "team@marcstrat.com",
      sameAs: ["https://marcstrat.com"],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "AI Scope by Marcstrat",
      description:
        "AI Visibility Platform — audit how ChatGPT, Claude, Perplexity, Gemini and 10+ AI systems discover your brand.",
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/?url={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/#product`,
      name: "AI Scope",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "AI Scope audits any website URL and returns an AI Visibility Score (0–100), verification across 14+ AI crawlers, structured data analysis, live AI citation research, and prioritised recommendations — in under 60 seconds.",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "0",
          priceCurrency: "USD",
          description: "Free forever — 5 scans/month, full AI Visibility Score, 14 bots checked.",
        },
        {
          "@type": "Offer",
          name: "Growth",
          price: "29",
          priceCurrency: "USD",
          description: "100 scans/month, AI Citations Research, Bulk Scanner (100 URLs), CSV & PDF export.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "79",
          priceCurrency: "USD",
          description: "Unlimited scans, 500 URL bulk scan, API access, white-label PDF reports.",
        },
      ],
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
  ],
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
        {/* Global JSON-LD: Organization + WebSite + SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
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
