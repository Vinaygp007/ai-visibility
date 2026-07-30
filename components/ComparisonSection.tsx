import Reveal from "@/components/Reveal";

type MarkValue = "yes" | "no" | "partial";

const ROWS: { label: string; traditional: MarkValue; aiscope: MarkValue }[] = [
  { label: "Googlebot crawlability", traditional: "yes", aiscope: "yes" },
  { label: "Keyword rank tracking", traditional: "yes", aiscope: "no" },
  { label: "AI-bot crawlability (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)", traditional: "no", aiscope: "yes" },
  { label: "llms.txt detection & guidance", traditional: "no", aiscope: "yes" },
  { label: "Structured data audit for AI parsing", traditional: "partial", aiscope: "yes" },
  { label: "Tracks whether ChatGPT/Perplexity cite you", traditional: "no", aiscope: "yes" },
  { label: "Multi-AI-provider scoring (not single-engine)", traditional: "no", aiscope: "yes" },
];

function Mark({ value }: { value: MarkValue }) {
  if (value === "yes") {
    return <span style={{ color: "var(--success)" }}>✓</span>;
  }
  if (value === "partial") {
    return <span style={{ color: "var(--warning)" }}>~</span>;
  }
  return <span style={{ color: "var(--text-dim)" }}>-</span>;
}

export default function ComparisonSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-12">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent2)", background: "rgba(124,111,255,0.08)", borderColor: "rgba(124,111,255,0.25)" }}
        >
          // AISCOPE VS TRADITIONAL SEO TOOLS
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text)" }}>
          A complement, not a replacement
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Keep your rank tracker for Google. Use AiScope for the half of search it was never built to see.
        </p>
      </Reveal>

      <Reveal delay={100}>
        <div
          className="rounded-2xl border overflow-x-auto"
          style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
        >
          <table className="w-full text-[13.5px] min-w-[560px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(var(--overlay-rgb),0.08)" }}>
                <th className="text-left font-medium px-6 py-4" style={{ color: "var(--text-dim)" }}>Capability</th>
                <th className="text-center font-medium px-4 py-4 w-40" style={{ color: "var(--text-dim)" }}>Traditional SEO Tools</th>
                <th className="text-center font-medium px-4 py-4 w-40" style={{ color: "var(--accent)" }}>AiScope</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className="transition-colors hover:bg-[rgba(var(--overlay-rgb),0.03)]"
                  style={{ borderBottom: i < ROWS.length - 1 ? "1px solid rgba(var(--overlay-rgb),0.06)" : "none" }}
                >
                  <td className="px-6 py-3.5" style={{ color: "var(--text)" }}>{row.label}</td>
                  <td className="text-center px-4 py-3.5 text-base"><Mark value={row.traditional} /></td>
                  <td className="text-center px-4 py-3.5 text-base"><Mark value={row.aiscope} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}
