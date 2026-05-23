import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { posts } from "@/lib/posts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — AI Scope by Marcstrat",
  description:
    "Insights on AI Visibility, Generative Engine Optimization (GEO), brand strategy, and how to win in the age of AI search.",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPage() {
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-14 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,255,148,0.35), transparent 70%)" }}
        />
        <div
          className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
          style={{ color: "var(--c-accent3)", background: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.2)" }}
        >
          Blog
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 max-w-3xl mx-auto" style={{ color: "var(--c-text)" }}>
          Insights on{" "}
          <span style={{ background: "linear-gradient(135deg, var(--c-accent3), var(--c-accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            AI Visibility
          </span>
        </h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--c-muted)" }}>
          GEO strategy, technical guides, competitive intelligence, and brand growth in the age of AI search — by the Marcstrat team.
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        {/* Featured post */}
        <Link
          href={`/blog/${featured.slug}`}
          className="group block rounded-3xl border overflow-hidden mb-12 transition-all hover:-translate-y-0.5"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Color panel */}
            <div
              className="flex items-center justify-center p-8 sm:p-16 text-6xl"
              style={{
                background: `linear-gradient(135deg, ${featured.accent}20, ${featured.accent}08)`,
                borderRight: "1px solid var(--c-border)",
                minHeight: 240,
              }}
            >
              📰
            </div>
            {/* Content */}
            <div className="p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-[11px] font-mono px-2.5 py-1 rounded-full border"
                    style={{ color: featured.accent, background: `${featured.accent}12`, borderColor: `${featured.accent}30` }}
                  >
                    {featured.category}
                  </span>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded"
                    style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.08)" }}
                  >
                    Featured
                  </span>
                </div>
                <h2
                  className="text-2xl font-bold mb-3 leading-tight group-hover:opacity-80 transition-opacity"
                  style={{ color: "var(--c-text)" }}
                >
                  {featured.title}
                </h2>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--c-muted)" }}>
                  {featured.excerpt}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--c-muted)" }}>
                  <span>{featured.author}</span>
                  <span>·</span>
                  <span>{formatDate(featured.date)}</span>
                  <span>·</span>
                  <span>{featured.readTime} min read</span>
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--c-accent)" }}>
                  Read →
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Post grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5"
              style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
            >
              {/* Color band */}
              <div
                className="h-2 flex-shrink-0"
                style={{ background: `linear-gradient(90deg, ${post.accent}, ${post.accent}60)` }}
              />

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full border"
                    style={{ color: post.accent, background: `${post.accent}10`, borderColor: `${post.accent}25` }}
                  >
                    {post.category}
                  </span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>
                    {post.readTime} min
                  </span>
                </div>

                <h3
                  className="text-[15px] font-bold mb-2 leading-snug group-hover:opacity-80 transition-opacity flex-1"
                  style={{ color: "var(--c-text)" }}
                >
                  {post.title}
                </h3>

                <p className="text-sm leading-relaxed mb-4 line-clamp-2" style={{ color: "var(--c-muted)" }}>
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[12px]" style={{ color: "var(--c-muted)" }}>
                    {formatDate(post.date)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: post.accent }}>
                    Read →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter / CTA strip */}
        <div
          className="mt-16 rounded-2xl border p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: "var(--c-text)" }}>
              Want AI Visibility insights in your inbox?
            </h3>
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>
              New posts on GEO strategy, competitive intelligence, and AI search every week.
            </p>
          </div>
          <a
            href="mailto:team@marcstrat.com?subject=Subscribe to AI Scope Blog"
            className="flex-shrink-0 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--c-accent)", color: "#000", whiteSpace: "nowrap" }}
          >
            Subscribe →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
