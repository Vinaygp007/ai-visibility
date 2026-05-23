import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AI Scope by Marcstrat",
  description: "Learn how AI Scope collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const updated = "May 23, 2026";

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)" }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <span
            className="inline-block text-[10px] font-mono font-bold px-3 py-1 rounded-full mb-4"
            style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.08)", border: "1px solid rgba(124,111,255,0.2)", letterSpacing: 2 }}
          >
            LEGAL
          </span>
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--c-text)" }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>
            Last updated: {updated}
          </p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--c-text-sub)" }}>
          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>1. Information We Collect</h2>
            <p>
              When you use AI Scope, we may collect the following types of information:
            </p>
            <ul className="mt-2 flex flex-col gap-1 pl-4 list-disc">
              <li><strong>Account data</strong> — name, email address, and password when you register.</li>
              <li><strong>Usage data</strong> — URLs you scan, prompts you run, and feature interactions to improve the product.</li>
              <li><strong>Device &amp; log data</strong> — IP address, browser type, and access timestamps for security and analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>2. How We Use Your Information</h2>
            <ul className="flex flex-col gap-1 pl-4 list-disc">
              <li>To provide, operate, and improve AI Scope features.</li>
              <li>To send transactional emails (account confirmation, password reset).</li>
              <li>To detect and prevent fraud or abuse.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>3. Third-Party Services</h2>
            <p>
              AI Scope queries third-party AI providers (OpenAI, Google Gemini, Perplexity) on your behalf. Your prompts are sent to these services subject to their own privacy policies. We do not store the raw responses longer than necessary to display them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>4. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. You may request deletion at any time by contacting us. Scan and prompt history may be retained for up to 90 days for debugging purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>5. Cookies</h2>
            <p>
              We use strictly necessary cookies for authentication and session management. We do not use advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>6. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data. To exercise these rights, email us at{" "}
              <a href="mailto:privacy@marcstrat.com" style={{ color: "var(--c-accent)" }} className="underline">
                privacy@marcstrat.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision. Continued use of AI Scope after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--c-text)" }}>8. Contact</h2>
            <p>
              Questions? Reach us at{" "}
              <a href="mailto:privacy@marcstrat.com" style={{ color: "var(--c-accent)" }} className="underline">
                privacy@marcstrat.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
