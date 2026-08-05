import Link from "next/link";

// Stripe's cancel_url only fires when someone backs out of hosted Checkout
// before paying (e.g. clicks its back arrow) — a declined card is handled
// entirely inside Checkout itself, which lets them retry without ever
// leaving that page, so it never reaches this route.
export default function BillingCanceledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
          style={{ background: "rgba(var(--overlay-rgb),0.06)", color: "var(--text-muted)" }}
        >
          ✕
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Checkout canceled</h1>
        <p className="text-sm leading-relaxed mb-7" style={{ color: "var(--text-muted)" }}>
          No changes were made and you weren&apos;t charged. You can pick a plan again any time.
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/#pricing"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            View plans
          </Link>
          <Link
            href="/billing"
            className="rounded-xl px-4 py-2.5 text-sm font-medium border transition-colors"
            style={{ color: "var(--text)", borderColor: "rgba(var(--overlay-rgb),0.13)" }}
          >
            Back to billing
          </Link>
        </div>
      </div>
    </div>
  );
}
