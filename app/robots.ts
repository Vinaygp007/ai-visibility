import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/", "/settings/"],
      },
      // Explicitly welcome every major AI crawler
      { userAgent: "GPTBot",             allow: "/" },
      { userAgent: "ChatGPT-User",       allow: "/" },
      { userAgent: "ClaudeBot",          allow: "/" },
      { userAgent: "Claude-Web",         allow: "/" },
      { userAgent: "PerplexityBot",      allow: "/" },
      { userAgent: "OAI-SearchBot",      allow: "/" },
      { userAgent: "Google-Extended",    allow: "/" },
      { userAgent: "Applebot-Extended",  allow: "/" },
      { userAgent: "Meta-ExternalAgent", allow: "/" },
      { userAgent: "DuckDuckBot",        allow: "/" },
      { userAgent: "Cohere-AI",          allow: "/" },
    ],
    sitemap: "https://aiscope.marcstrat.com/sitemap.xml",
  };
}
