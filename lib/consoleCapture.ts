// Client-only rolling buffer of recent console.error calls, patched once at
// module load. Used by the bug-report widget to auto-attach recent errors —
// far more useful for triage than asking the reporter to describe them.
const MAX_ENTRIES = 20;
const buffer: string[] = [];
let patched = false;

export function initConsoleCapture(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const original = console.error;
  console.error = (...args: unknown[]) => {
    try {
      const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      buffer.push(line);
      if (buffer.length > MAX_ENTRIES) buffer.shift();
    } catch {
      // ignore serialization failures
    }
    original.apply(console, args as []);
  };
}

export function getRecentConsoleErrors(): string[] {
  return [...buffer];
}
