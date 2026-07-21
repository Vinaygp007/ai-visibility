const BOTS = [
  "GPTBot", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "PerplexityBot",
  "Googlebot-Extended", "meta-externalagent", "cohere-ai", "Bytespider",
  "CCBot", "Amazonbot", "YouBot", "Applebot-Extended", "DuckAssistBot",
];

export default function BotMarquee() {
  return (
    <div
      className="relative overflow-hidden py-5 border-y"
      style={{ borderColor: "rgba(var(--overlay-rgb),0.07)", background: "var(--surface)" }}
      aria-hidden="true"
    >
      {/* Edge fades */}
      <div
        className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, var(--surface), transparent)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, var(--surface), transparent)" }}
      />

      <div className="marquee-track flex items-center gap-8 w-max">
        {[...BOTS, ...BOTS].map((bot, i) => (
          <span
            key={`${bot}-${i}`}
            className="flex items-center gap-2 text-[13px] font-mono whitespace-nowrap"
            style={{ color: "var(--text-dim)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
            {bot}
          </span>
        ))}
      </div>
    </div>
  );
}
