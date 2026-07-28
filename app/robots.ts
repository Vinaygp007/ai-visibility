import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiscope.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/waitlist", "/login", "/signup", "/privacy", "/terms"],
        disallow: ["/api/", "/admin/", "/scan", "/bulk", "/bulk-prompt", "/reports", "/credits", "/referrals", "/settings"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
