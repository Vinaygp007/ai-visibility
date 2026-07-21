import Reveal from "@/components/Reveal";

const BULK_SCAN_ROWS = [
  { url: "acmehq.com", score: 92, color: "var(--success)" },
  { url: "shopfleet.io", score: 61, color: "var(--warning)" },
  { url: "runwaylab.co", score: null, color: "var(--text-dim)" },
];

export default function BulkToolsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <Reveal className="text-center max-w-2xl mx-auto mb-14">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent2)", background: "rgba(124,111,255,0.08)", borderColor: "rgba(124,111,255,0.25)" }}
        >
          // BUILT TO SCALE
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text)" }}>
          One site is a scan. A client list is a workflow.
        </h2>
        <p className="text-[16px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Two tools built specifically for agencies and teams auditing more than one site at a time.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Scanner */}
        <Reveal>
          <div
            className="rounded-2xl border p-7 h-full transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent2)] hover:shadow-lg"
            style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
          >
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="text-[17px] font-semibold mb-2" style={{ color: "var(--text)" }}>
              Bulk Scanner — up to 500 sites at once
            </h3>
            <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
              Paste a list of URLs or upload a .txt / .csv file. Every site is scanned in parallel and results stream
              in as each one finishes — built for auditing an entire client list in one pass instead of one scan at a
              time.
            </p>
            <div
              className="rounded-xl border p-3 space-y-2"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
            >
              {BULK_SCAN_ROWS.map((row) => (
                <div key={row.url} className="flex items-center justify-between text-[12px] font-mono px-2 py-1.5">
                  <span style={{ color: "var(--text)" }}>{row.url}</span>
                  <span style={{ color: row.color }}>{row.score !== null ? `${row.score}/100` : "scanning…"}</span>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] mt-4" style={{ color: "var(--text-dim)" }}>
              Included on Pro (50 URLs) and Agency (500 URLs) plans.
            </p>
          </div>
        </Reveal>

        {/* Bulk Prompt Runner */}
        <Reveal delay={120}>
          <div
            className="rounded-2xl border p-7 h-full transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent2)] hover:shadow-lg"
            style={{ background: "var(--surface)", borderColor: "rgba(var(--overlay-rgb),0.08)" }}
          >
            <div className="text-2xl mb-3">💬</div>
            <h3 className="text-[17px] font-semibold mb-2" style={{ color: "var(--text)" }}>
              Bulk Prompt Runner — up to 100 prompts in parallel
            </h3>
            <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
              Run the exact buyer-intent questions your customers ask AI — "best CRM for startups," "top project
              management tools for remote teams" — across Gemini, ChatGPT and Perplexity at once, and see whether
              you're the answer they get back.
            </p>
            <div
              className="rounded-xl border p-3.5 space-y-2"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
            >
              <div className="text-[11.5px] font-mono" style={{ color: "var(--text-dim)" }}>
                "Best 5 CRM platforms for startups — rank them with pros, cons, and pricing."
              </div>
              <div
                className="text-[11.5px] leading-relaxed rounded-lg px-2.5 py-2"
                style={{ background: "rgba(0,229,255,0.06)", color: "var(--text-muted)" }}
              >
                1. <span style={{ color: "var(--accent)" }}>Acme CRM</span> — free tier, strong automation…
              </div>
            </div>
            <p className="text-[11.5px] mt-4" style={{ color: "var(--text-dim)" }}>
              Runs on your existing scan credits — no separate tool to buy.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
