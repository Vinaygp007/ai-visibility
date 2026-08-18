// Small "Beta" tag dropped next to the AiScope wordmark everywhere it
// appears (nav, sidebar, footer, auth pages) — this build is v1, not the
// final release.
export default function BetaBadge() {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none"
      style={{ color: "var(--accent)", background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.25)" }}
    >
      Beta
    </span>
  );
}
