import { MetadataRoute } from "next";
import { posts } from "@/lib/posts";

const BASE = "https://aiscope.marcstrat.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                   lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/features`,     lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/pricing`,      lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/blog`,         lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/bulk`,         lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/bulk-prompt`,  lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`,      lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes];
}
