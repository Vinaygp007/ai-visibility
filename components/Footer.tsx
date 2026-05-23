import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t px-6 py-12"
      style={{ borderColor: "var(--c-border)" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* Main columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #7c6fff, #00e5ff)" }}
              >
                AI
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--c-text)" }}>AI Scope</div>
                <div className="text-[11px]" style={{ color: "var(--c-muted)" }}>by Marcstrat</div>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--c-muted)" }}>
              AI visibility platform helping brands measure and grow their presence across ChatGPT, Gemini, and Perplexity.
            </p>
            <p className="text-[11px]" style={{ color: "var(--c-muted)", opacity: 0.7 }}>
              Powered by Gemini · ChatGPT · Perplexity
            </p>
          </div>

          {/* Product column */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--c-text)" }}>
              Product
            </p>
            <Link href="/#features" className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Features</Link>
            <Link href="/pricing"   className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Pricing</Link>
            <Link href="/bulk"      className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Bulk Scan</Link>
            <Link href="/bulk-prompt" className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Prompt Runner</Link>
          </div>

          {/* Company column */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--c-text)" }}>
              Company
            </p>
            <Link href="/blog"    className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Blog</Link>
            <Link href="/contact" className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Contact</Link>
            <a href="https://marcstrat.com" target="_blank" rel="noreferrer" className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Marcstrat</a>
          </div>

          {/* Legal column */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--c-text)" }}>
              Legal
            </p>
            <Link href="/privacy" className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Privacy Policy</Link>
            <Link href="/terms"   className="text-sm transition-opacity hover:opacity-100" style={{ color: "var(--c-muted)", opacity: 0.8 }}>Terms of Service</Link>
          </div>

        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-wrap items-center justify-between gap-3 text-[12px]"
          style={{ borderTop: "1px solid var(--c-border)", color: "var(--c-muted)" }}
        >
          <span style={{ opacity: 0.6 }}>© {year} Marcstrat. All rights reserved.</span>
          <span style={{ opacity: 0.5 }}>AI Scope — AI Visibility Platform</span>
        </div>

      </div>
    </footer>
  );
}
