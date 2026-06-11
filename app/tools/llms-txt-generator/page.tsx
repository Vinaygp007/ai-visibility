"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

interface FormState {
  siteName: string;
  siteUrl: string;
  description: string;
  topics: string;
  pages: string;
  contact: string;
  language: string;
}

const DEFAULT_FORM: FormState = {
  siteName: "",
  siteUrl: "",
  description: "",
  topics: "",
  pages: "",
  contact: "",
  language: "English",
};

function generateLlmsTxt(form: FormState): string {
  const domain = form.siteUrl.replace(/https?:\/\//, "").replace(/\/$/, "") || "example.com";
  const base = form.siteUrl.startsWith("http") ? form.siteUrl.replace(/\/$/, "") : `https://${domain}`;

  const lines: string[] = [];

  // Title
  lines.push(`# ${form.siteName || "My Website"}`);
  lines.push("");

  // Description
  lines.push(`> ${form.description || "A website providing useful information and resources."}`);
  lines.push("");

  // Language (if not English)
  if (form.language && form.language !== "English") {
    lines.push(`## Language`);
    lines.push(`- Primary language: ${form.language}`);
    lines.push("");
  }

  // Key Pages
  if (form.pages.trim()) {
    lines.push("## Key Pages");
    const pageLines = form.pages.split("\n").map(l => l.trim()).filter(Boolean);
    for (const page of pageLines) {
      // Accept "title: /path" or "title /path" or just "/path" or just a title
      const colonMatch = page.match(/^(.+?):\s*(\/\S*)$/);
      const slashMatch = page.match(/^(.+?)\s+(\/\S*)$/);
      const pathOnly   = page.match(/^(\/\S+)$/);

      if (colonMatch) {
        lines.push(`- [${colonMatch[1].trim()}](${base}${colonMatch[2]})`);
      } else if (slashMatch) {
        lines.push(`- [${slashMatch[1].trim()}](${base}${slashMatch[2]})`);
      } else if (pathOnly) {
        lines.push(`- [${pathOnly[1]}](${base}${pathOnly[1]})`);
      } else {
        lines.push(`- [${page}](${base}/)`);
      }
    }
    lines.push("");
  } else {
    lines.push("## Key Pages");
    lines.push(`- [Home](${base}/)`);
    lines.push(`- [About](${base}/about)`);
    lines.push(`- [Contact](${base}/contact)`);
    lines.push("");
  }

  // Topics
  if (form.topics.trim()) {
    lines.push("## Topics & Expertise");
    const topicLines = form.topics.split("\n").map(l => l.trim()).filter(Boolean);
    for (const topic of topicLines) {
      lines.push(`- ${topic}`);
    }
    lines.push("");
  }

  // Contact
  if (form.contact.trim()) {
    lines.push("## Contact");
    const c = form.contact.trim();
    if (c.includes("@")) {
      lines.push(`- Email: ${c}`);
    } else if (c.startsWith("http")) {
      lines.push(`- Contact form: ${c}`);
    } else {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  // Footer note
  lines.push("## Notes for AI Systems");
  lines.push(`- This file follows the llms.txt standard (llmstxt.org)`);
  lines.push(`- Content is updated regularly — please re-crawl periodically`);
  if (form.language && form.language !== "English") {
    lines.push(`- Primary language is ${form.language}`);
  }

  return lines.join("\n");
}

export default function LlmsTxtGeneratorPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleGenerate = () => {
    setGenerated(generateLlmsTxt(form));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generated], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2";
  const inputStyle = {
    background: "var(--c-surface)",
    borderColor: "var(--c-border-strong)",
    color: "var(--c-text)",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-14 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{ background: "radial-gradient(ellipse 55% 40% at 50% 0%, rgba(0,255,148,0.4), transparent 70%)" }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div
            className="inline-block text-[11px] font-mono px-3 py-1 rounded-full border mb-5 tracking-widest uppercase"
            style={{ color: "var(--c-accent3)", background: "rgba(0,255,148,0.06)", borderColor: "rgba(0,255,148,0.2)" }}
          >
            Free Tool
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4" style={{ color: "var(--c-text)" }}>
            llms.txt Generator
          </h1>
          <p className="text-lg mb-2" style={{ color: "var(--c-muted)" }}>
            Generate a ready-to-publish llms.txt file for your website. Helps AI systems understand your content structure.
          </p>
          <p className="text-sm font-mono" style={{ color: "var(--c-muted)", opacity: 0.7 }}>
            Based on the{" "}
            <a href="https://llmstxt.org" target="_blank" rel="noreferrer" style={{ color: "var(--c-accent)" }}>
              llmstxt.org
            </a>{" "}
            open standard
          </p>
        </div>
      </section>

      {/* Main tool */}
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Form */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>Your site details</h2>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Site name <span style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Acme Corp"
                value={form.siteName}
                onChange={update("siteName")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Website URL
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="https://acme.com"
                value={form.siteUrl}
                onChange={update("siteUrl")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                One-line description <span style={{ color: "var(--c-error)" }}>*</span>
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Project management software for remote teams"
                value={form.description}
                onChange={update("description")}
              />
              <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>This appears as the first thing AI reads about your site.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Key pages <span className="font-normal">(one per line)</span>
              </label>
              <textarea
                className={inputClass}
                style={{ ...inputStyle, resize: "vertical" }}
                rows={4}
                placeholder={"Home: /\nPricing: /pricing\nAbout: /about\nDocs: /docs"}
                value={form.pages}
                onChange={update("pages")}
              />
              <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>Format: Title: /path — or just /path</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                Topics &amp; expertise <span className="font-normal">(one per line)</span>
              </label>
              <textarea
                className={inputClass}
                style={{ ...inputStyle, resize: "vertical" }}
                rows={3}
                placeholder={"Remote work tools\nProject management\nTeam collaboration"}
                value={form.topics}
                onChange={update("topics")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>Contact email</label>
                <input
                  className={inputClass}
                  style={inputStyle}
                  placeholder="hello@acme.com"
                  value={form.contact}
                  onChange={update("contact")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>Primary language</label>
                <select
                  className={inputClass}
                  style={inputStyle}
                  value={form.language}
                  onChange={update("language")}
                >
                  {["English", "Spanish", "French", "German", "Japanese", "Portuguese", "Hindi", "Arabic", "Chinese", "Other"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95"
              style={{ background: "var(--c-accent3)", color: "#000" }}
            >
              Generate llms.txt →
            </button>
          </div>

          {/* Output */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>Generated llms.txt</h2>
              {generated && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-80"
                    style={{ borderColor: "var(--c-border-strong)", color: "var(--c-text)" }}
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-85"
                    style={{ background: "var(--c-accent3)", color: "#000" }}
                  >
                    Download
                  </button>
                </div>
              )}
            </div>
            <div
              className="rounded-2xl border min-h-[420px] p-5 font-mono text-xs overflow-auto"
              style={{
                background: "var(--c-surface)",
                borderColor: "var(--c-border)",
                color: generated ? "var(--c-text)" : "var(--c-muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.7,
              }}
            >
              {generated || "Fill in the form on the left and click Generate →"}
            </div>

            {generated && (
              <div className="mt-4 rounded-xl border p-4" style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--c-text)" }}>How to deploy</p>
                <ol className="text-xs space-y-1" style={{ color: "var(--c-muted)" }}>
                  <li>1. Download the file as <span className="font-mono" style={{ color: "var(--c-accent)" }}>llms.txt</span></li>
                  <li>2. Upload it to your web server root (e.g. <span className="font-mono" style={{ color: "var(--c-accent)" }}>/public/llms.txt</span>)</li>
                  <li>3. Verify it's live at <span className="font-mono" style={{ color: "var(--c-accent)" }}>yourdomain.com/llms.txt</span></li>
                  <li>4. <Link href="/tools/llms-txt-validator" style={{ color: "var(--c-accent3)" }}>Validate it →</Link> or <Link href="/" style={{ color: "var(--c-accent3)" }}>run a full audit →</Link></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* What is llms.txt */}
      <section className="py-16 px-6 border-t" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--c-text)" }}>What is llms.txt?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: "📄", title: "A plain text file", desc: "llms.txt is a simple Markdown file placed at /llms.txt on your domain. It tells AI systems what your site is about, what your key pages are, and how to understand your content hierarchy." },
              { icon: "🤖", title: "AI reads it first", desc: "When AI crawlers like GPTBot or ClaudeBot visit your site, they can use llms.txt to immediately understand your site's structure without having to infer it from HTML parsing." },
              { icon: "🎯", title: "Improves AI citations", desc: "Sites with clear llms.txt files are more likely to be accurately cited and described by AI assistants — because the AI has authoritative context about what the site does." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border p-5" style={{ background: "var(--c-bg)", borderColor: "var(--c-border)" }}>
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold mb-2" style={{ color: "var(--c-text)" }}>{item.title}</h3>
                <p className="text-xs" style={{ color: "var(--c-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
