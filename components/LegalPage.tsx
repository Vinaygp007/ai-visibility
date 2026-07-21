import MarketingNav from "@/components/MarketingNav";
import Footer from "@/components/Footer";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <MarketingNav />
      <article className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>
          {title}
        </h1>
        <p className="text-[13px] font-mono mb-10" style={{ color: "var(--text-dim)" }}>
          Last updated: {updated}
        </p>
        <div className="space-y-8 text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {children}
        </div>
      </article>
      <Footer />
    </div>
  );
}
