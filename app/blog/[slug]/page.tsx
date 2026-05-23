import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getPost, getAllSlugs, posts, type Block } from "@/lib/posts";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} — AI Scope Blog`,
    description: post.excerpt,
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderBlock(block: Block, idx: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={idx} className="text-2xl font-bold mt-10 mb-4" style={{ color: "var(--c-text)" }}>
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={idx} className="text-lg font-bold mt-7 mb-3" style={{ color: "var(--c-text)" }}>
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={idx} className="text-[16px] leading-[1.8] mb-5" style={{ color: "var(--c-text-sub)" }}>
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} className="mb-5 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed" style={{ color: "var(--c-text-sub)" }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--c-accent)" }} />
              {item}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="mb-5 space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed" style={{ color: "var(--c-text-sub)" }}>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono mt-0.5"
                style={{ background: "rgba(0,229,255,0.1)", color: "var(--c-accent)" }}
              >
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div
          key={idx}
          className="rounded-xl border-l-4 px-6 py-4 mb-5 text-[15px] leading-relaxed italic"
          style={{
            borderLeftColor: "var(--c-accent)",
            background: "rgba(0,229,255,0.05)",
            color: "var(--c-text)",
          }}
        >
          {block.text}
        </div>
      );
    case "divider":
      return <hr key={idx} className="my-8" style={{ borderColor: "var(--c-border)" }} />;
    default:
      return null;
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Article header */}
      <div
        className="border-b"
        style={{
          borderColor: "var(--c-border)",
          background: `linear-gradient(180deg, ${post.accent}08 0%, var(--c-bg) 100%)`,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 pt-14 pb-10">
          {/* Back + category */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/blog"
              className="flex items-center gap-1.5 text-sm transition-all hover:opacity-70"
              style={{ color: "var(--c-muted)" }}
            >
              ← Blog
            </Link>
            <span style={{ color: "var(--c-border-strong)" }}>·</span>
            <span
              className="text-[11px] font-mono px-2.5 py-1 rounded-full border"
              style={{ color: post.accent, background: `${post.accent}12`, borderColor: `${post.accent}30` }}
            >
              {post.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5" style={{ color: "var(--c-text)" }}>
            {post.title}
          </h1>

          <p className="text-lg mb-6" style={{ color: "var(--c-muted)" }}>
            {post.excerpt}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" style={{ color: "var(--c-muted)" }}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${post.accent}40, ${post.accent}20)`, color: post.accent }}
              >
                M
              </div>
              <span>{post.author}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ color: "var(--c-muted)", opacity: 0.7 }}>{post.authorRole}</span>
            </div>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{formatDate(post.date)}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{post.readTime} min read</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg"
                style={{ background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <article>
          {post.content.map((block, idx) => renderBlock(block, idx))}
        </article>

        {/* CTA inside article */}
        <div
          className="mt-14 rounded-2xl border p-8 text-center"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-4 tracking-widest uppercase"
            style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)" }}
          >
            Try It Free
          </div>
          <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--c-text)" }}>
            Check your AI Visibility score now
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--c-muted)" }}>
            Paste your URL and get a full audit across 14+ AI systems in under 60 seconds. No account required.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--c-accent)", color: "#000" }}
          >
            Analyze My Website →
          </Link>
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="border-t py-16 px-6" style={{ borderColor: "var(--c-border)" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8" style={{ color: "var(--c-text)" }}>Related articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group block rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                >
                  <div
                    className="h-1 rounded-full mb-4"
                    style={{ background: `linear-gradient(90deg, ${p.accent}, ${p.accent}50)` }}
                  />
                  <span
                    className="text-[11px] font-mono block mb-2"
                    style={{ color: p.accent }}
                  >
                    {p.category}
                  </span>
                  <h4
                    className="text-[14px] font-semibold leading-snug mb-2 group-hover:opacity-80"
                    style={{ color: "var(--c-text)" }}
                  >
                    {p.title}
                  </h4>
                  <span className="text-xs" style={{ color: "var(--c-muted)" }}>
                    {p.readTime} min read →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="border-t py-8 px-6 text-center text-sm" style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>
        <span style={{ color: "var(--c-text)", fontWeight: 600 }}>AI Scope</span> by Marcstrat · Powered by Gemini · ChatGPT · Perplexity
      </footer>
    </div>
  );
}
