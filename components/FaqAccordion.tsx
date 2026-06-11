"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "var(--c-surface)",
              borderColor: isOpen ? "var(--c-border-strong)" : "var(--c-border)",
              transition: "border-color 0.2s ease",
            }}
          >
            <button
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span className="text-[15px] font-semibold" style={{ color: "var(--c-text)" }}>
                {faq.q}
              </span>
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base font-bold"
                style={{
                  background: isOpen ? "rgba(0,229,255,0.12)" : "var(--c-surface2)",
                  color: isOpen ? "var(--c-accent)" : "var(--c-muted)",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease, background 0.2s ease, color 0.2s ease",
                }}
              >
                +
              </span>
            </button>
            <div
              style={{
                maxHeight: isOpen ? 400 : 0,
                overflow: "hidden",
                transition: "max-height 0.3s ease",
              }}
            >
              <div
                className="px-6 pb-5 border-t"
                style={{ borderColor: "var(--c-border)" }}
              >
                <p className="text-sm leading-relaxed pt-4" style={{ color: "var(--c-muted)" }}>
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
