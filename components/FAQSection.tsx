"use client";

import { useState } from "react";
import Reveal from "@/components/Reveal";

const FAQS = [
  {
    q: "How is the visibility score calculated?",
    a: "Gemini, ChatGPT and Perplexity each independently audit your site — crawler access, llms.txt, structured data, and citation research — and we merge and average their results into one score, so no single model's quirks dominate the result.",
  },
  {
    q: "What's llms.txt and do I actually need one?",
    a: "It's a plain-text file at your site root that tells AI systems what your site is and which pages matter most, similar in spirit to robots.txt or a sitemap. Not every AI crawler uses it yet, but it's a quick, low-cost signal to publish. We tell you whether you have one and what to put in it.",
  },
  {
    q: "Is this different from regular SEO?",
    a: "Yes. Traditional SEO tools assume Googlebot can crawl your site and stop there. We check whether AI-specific crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and others) can actually reach your content, and whether AI answers already cite you.",
  },
  {
    q: "Do you store my website's data?",
    a: "We store the scan results (score, findings, recommendations) tied to your account so you can revisit past reports. We don't scrape or retain your site's full content beyond what's needed to run the audit.",
  },
  {
    q: "How do I get access?",
    a: "AiScope is invite-only during the beta. Join the waitlist and we'll email you when a spot opens up — agencies and active SEO/GEO practitioners are being let in first.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
      <Reveal className="text-center mb-12">
        <div
          className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border mb-5 tracking-widest"
          style={{ color: "var(--accent)", background: "rgba(0,229,255,0.07)", borderColor: "rgba(0,229,255,0.2)" }}
        >
          // FAQ
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text)]">
          Questions, answered
        </h2>
      </Reveal>

      <div className="space-y-3">
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={faq.q} delay={i * 70}>
              <div
                className="rounded-2xl border overflow-hidden transition-colors duration-300"
                style={{
                  background: "rgba(var(--overlay-rgb),0.03)",
                  borderColor: isOpen ? "var(--accent)" : "rgba(var(--overlay-rgb),0.08)",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="text-[15px] font-medium text-[var(--text)]">{faq.q}</span>
                  <span
                    className="text-lg flex-shrink-0 transition-transform duration-300"
                    style={{ color: "var(--accent)", transform: isOpen ? "rotate(45deg)" : "none" }}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
