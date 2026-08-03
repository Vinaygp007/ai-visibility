import LegalPage from "@/components/LegalPage";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>
      {children}
    </h2>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 21, 2026">
      <p>
        AiScope ("we", "us") is currently a public beta run by Marcstrat. This policy explains what data we
        collect when you use the site and the scanner, and how it's used. As the product moves out of beta, this
        page will be updated to reflect any changes.
      </p>

      <section>
        <H2>What we collect</H2>
        <ul className="list-disc list-outside pl-5 space-y-2">
          <li><strong style={{ color: "var(--text)" }}>Account data</strong>: email, name, and password/OAuth identity via our authentication provider (Supabase) when you sign up or log in.</li>
          <li><strong style={{ color: "var(--text)" }}>Scan inputs</strong>: the URLs you submit to be audited, and the resulting reports (scores, crawler findings, citation research), which are saved to your account's report history.</li>
          <li><strong style={{ color: "var(--text)" }}>Usage analytics</strong>: product usage events (e.g. pages viewed, features used) via PostHog, to understand how the app is used and improve it.</li>
          <li><strong style={{ color: "var(--text)" }}>Credit and referral activity</strong>: scan credit balance and history, and referral relationships if you refer other users.</li>
        </ul>
      </section>

      <section>
        <H2>How we use it</H2>
        <p>
          We use this data to run the scans you request, store and display your report history, enforce fair-use
          rate limits and credit balances, prevent abuse, and understand product usage so we can improve it.
        </p>
      </section>

      <section>
        <H2>Third parties we share data with</H2>
        <p>
          When you run a scan, the URL you submit (and content fetched from it) is sent to the AI providers that
          power the audit (Google Gemini, OpenAI/ChatGPT, and Perplexity) so they can generate the analysis. We use
          Supabase for authentication and database storage, and PostHog for product analytics. We don't sell your
          personal data to third parties.
        </p>
      </section>

      <section>
        <H2>Data retention</H2>
        <p>
          Scan reports and account data are retained for as long as your account is active. You can request deletion
          of your account and associated data at any time; once processed, reports and personal data are removed
          from our active systems.
        </p>
      </section>

      <section>
        <H2>Cookies</H2>
        <p>
          We use essential cookies to keep you signed in (via Supabase auth) and analytics cookies (PostHog) to
          understand product usage. Essential cookies can't be disabled without breaking login; you can block
          analytics cookies in your browser without affecting core functionality.
        </p>
      </section>

      <section>
        <H2>Your rights</H2>
        <p>
          You can request access to, correction of, or deletion of your personal data at any time. During the
          beta, the fastest way to reach us is through the login page. We'll add a dedicated contact channel as we
          move toward general availability.
        </p>
      </section>
    </LegalPage>
  );
}
