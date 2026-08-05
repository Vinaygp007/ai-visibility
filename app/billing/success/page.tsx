import Link from "next/link";

// Server component — no client hooks needed here, so no Suspense/useSearchParams
// wrapping like the checkout-status pages elsewhere in the app. The webhook
// (app/api/webhooks/stripe) is what actually applies the plan/credit change;
// this page is just the redirect target Stripe sends the browser to after a
// successful Checkout, so it doesn't need to re-verify anything itself.
export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
          style={{ background: "rgba(0,232,122,0.1)", color: "var(--success)" }}
        >
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">You&apos;re subscribed</h1>
        <p className="text-sm leading-relaxed mb-7" style={{ color: "var(--text-muted)" }}>
          Payment confirmed — your plan and credits have been updated. This can take a few seconds to
          reflect if you check right away.
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/billing"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            View billing
          </Link>
          <Link
            href="/scan"
            className="rounded-xl px-4 py-2.5 text-sm font-medium border transition-colors"
            style={{ color: "var(--text)", borderColor: "rgba(var(--overlay-rgb),0.13)" }}
          >
            Start a scan
          </Link>
        </div>
      </div>
    </div>
  );
}
