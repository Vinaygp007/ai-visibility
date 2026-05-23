"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getFirebaseDb } from "@/lib/firebase-client";

type FormState = "idle" | "submitting" | "success" | "error";

const SUBJECTS = [
  "General Inquiry",
  "Product Demo",
  "Pricing & Plans",
  "Technical Support",
  "Partnership",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: SUBJECTS[0],
    message: "",
  });
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const db = getFirebaseDb();
      if (!db) throw new Error("Database unavailable");

      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

      await addDoc(collection(db, "contacts"), {
        name:      form.name.trim(),
        email:     form.email.trim(),
        company:   form.company.trim() || null,
        subject:   form.subject,
        message:   form.message.trim(),
        createdAt: serverTimestamp(),
        status:    "new",
      });

      setState("success");
      setForm({ name: "", email: "", company: "", subject: SUBJECTS[0], message: "" });
    } catch (err) {
      setErrorMsg(String(err));
      setState("error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--c-input-bg)",
    border: "1px solid var(--c-border-strong)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--c-text)",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--c-muted)",
    marginBottom: 6,
    display: "block",
    letterSpacing: "0.02em",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)" }}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12 text-center">
          <span
            className="inline-block text-[10px] font-mono font-bold px-3 py-1 rounded-full mb-4"
            style={{ color: "var(--c-accent)", background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", letterSpacing: 2 }}
          >
            GET IN TOUCH
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: "var(--c-text)" }}>
            Contact Us
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--c-muted)" }}>
            Have a question, want a demo, or exploring a partnership? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-10">

          {/* Left info panel */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {[
              {
                icon: "✉",
                title: "Email",
                detail: "info@marcstrat.com",
                href: "mailto:info@marcstrat.com",
              },
              {
                icon: "🌐",
                title: "Website",
                detail: "marcstrat.com",
                href: "https://marcstrat.com",
              },
              {
                icon: "⚡",
                title: "Response time",
                detail: "Within 24 hours on business days",
                href: null,
              },
            ].map(({ icon, title, detail, href }) => (
              <div
                key={title}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border-strong)" }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--c-muted)" }}>
                    {title}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ color: "var(--c-accent)" }}
                    >
                      {detail}
                    </a>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div
            className="md:col-span-3 rounded-2xl p-8"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}
          >
            {state === "success" ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: "rgba(0,232,122,0.1)", border: "1px solid rgba(0,232,122,0.25)" }}
                >
                  ✓
                </div>
                <h2 className="text-xl font-bold" style={{ color: "var(--c-text)" }}>Message Sent!</h2>
                <p className="text-sm max-w-xs" style={{ color: "var(--c-muted)" }}>
                  Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setState("idle")}
                  className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border-strong)", color: "var(--c-text)" }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label style={labelStyle}>Name <span style={{ color: "var(--c-error)" }}>*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email <span style={{ color: "var(--c-error)" }}>*</span></label>
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input
                      type="text"
                      placeholder="Acme Inc. (optional)"
                      value={form.company}
                      onChange={(e) => set("company", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Message <span style={{ color: "var(--c-error)" }}>*</span></label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us how we can help…"
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>

                {state === "error" && (
                  <div
                    className="text-sm px-4 py-3 rounded-xl"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--c-error)" }}
                  >
                    {errorMsg || "Something went wrong. Please try again."}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: state === "submitting" ? "var(--c-surface2)" : "linear-gradient(135deg, #00e5ff, #4285f4)",
                    color: state === "submitting" ? "var(--c-muted)" : "#000",
                    border: "none",
                    cursor: state === "submitting" ? "not-allowed" : "pointer",
                  }}
                >
                  {state === "submitting" ? "Sending…" : "Send Message →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
