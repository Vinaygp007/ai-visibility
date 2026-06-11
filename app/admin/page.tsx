"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import type { AppSettings } from "@/types";

// ── Model catalogue ────────────────────────────────────────────────────────
const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: "Gemini 2.0 Flash (Exp)", value: "gemini-2.0-flash-exp" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
    { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
    { label: "Gemini 3.1 Pro", value: "gemini-3.1-pro" },
    { label: "Gemini 3.1 Flash", value: "gemini-3.1-flash" },
  ],
  "ai-overview": [{ label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" }],
  openai: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "o1", value: "o1" },
    { label: "o3 Mini", value: "o3-mini" },
  ],
  perplexity: [
    { label: "Sonar", value: "sonar" },
    { label: "Sonar Pro", value: "sonar-pro" },
    { label: "Sonar Reasoning", value: "sonar-reasoning" },
    { label: "Sonar Deep Research", value: "sonar-deep-research" },
  ],
  claude: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
    { label: "Claude 3 Opus", value: "claude-3-opus-20240229" },
  ],
  copilot: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "o1 Mini", value: "o1-mini" },
  ],
  youcom: [
    { label: "You.com Smart", value: "smart" },
    { label: "You.com Research", value: "research" },
  ],
  duckduckgo: [{ label: "DuckDuckGo AI Chat", value: "ddg-default" }],
  meta: [
    { label: "Llama 3.3 70B", value: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    { label: "Llama 3.1 70B", value: "meta-llama/Llama-3.1-70B-Instruct-Turbo" },
  ],
};

const PROVIDER_ICONS: Record<string, string> = {
  gemini: "✦", openai: "⬡", perplexity: "◎", claude: "◈",
  copilot: "⊞", youcom: "☿", duckduckgo: "⊛", meta: "⊕", "ai-overview": "◉",
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini: "#4285f4", openai: "#10a37f", perplexity: "#20b2aa",
  claude: "#c96442", copilot: "#0078d4", youcom: "#6366f1",
  duckduckgo: "#de5833", meta: "#0082fb", "ai-overview": "#4285f4",
};

const DEFAULT_SETTINGS: AppSettings = {
  providers: [
    { id: "gemini",      name: "Gemini",                     enabled: true,  apiKey: "", model: "gemini-2.0-flash-exp" },
    { id: "openai",      name: "ChatGPT (OpenAI)",           enabled: true,  apiKey: "", model: "gpt-4o-mini" },
    { id: "perplexity",  name: "Perplexity",                 enabled: true,  apiKey: "", model: "sonar" },
    { id: "claude",      name: "Claude (Anthropic)",         enabled: false, apiKey: "", model: "claude-3-5-sonnet-20241022" },
    { id: "copilot",     name: "Microsoft Copilot",          enabled: false, apiKey: "", model: "gpt-4o" },
    { id: "youcom",      name: "You.com",                    enabled: false, apiKey: "", model: "smart" },
    { id: "duckduckgo",  name: "DuckDuckGo AI",              enabled: false, apiKey: "", model: "ddg-default" },
    { id: "meta",        name: "Meta AI (Llama)",            enabled: false, apiKey: "", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    { id: "ai-overview", name: "AI Overview (Google)",       enabled: false, apiKey: "", model: "gemini-2.5-pro" },
  ],
  prompts: {
    analysis: `You are an AI Visibility Auditor. Based on this real data from {url}:\n\n{facts}\n\nReturn ONLY this JSON (no markdown, no fences):\n{\n  "summary": "2 sentences about AI visibility strengths and weaknesses",\n  "recommendations": [\n    {"priority": "high", "title": "short title", "description": "specific fix", "impact": "expected result"}\n  ]\n}`,
    citation: `Act as an elite GTM Strategist and GEO expert.\nRun a deep-dive competitive landscape and GEO analysis for: {company_name} — {company_url}`,
  },
  features: { enableCache: true, enableCitations: true },
};

type AdminSection = "overview" | "providers" | "prompts" | "features" | "reports";

const ADMIN_NAV: { id: AdminSection; label: string; icon: string; desc: string }[] = [
  { id: "overview",  label: "Overview",     icon: "◈",  desc: "System status & quick links" },
  { id: "reports",   label: "All Reports",  icon: "📊", desc: "All user scans & history" },
  { id: "providers", label: "AI Providers", icon: "🤖", desc: "API keys & model selection" },
  { id: "prompts",   label: "Prompts",      icon: "✏️", desc: "Analysis & citation templates" },
  { id: "features",  label: "Features",     icon: "⚙️", desc: "Enable / disable toggles" },
];

const QUICK_LINKS = [
  { href: "/",            label: "Scan Tool",      icon: "🔍", color: "#00e5ff" },
  { href: "/bulk",        label: "Bulk Scanner",   icon: "⚡", color: "#ffb830" },
  { href: "/bulk-prompt", label: "Prompt Runner",  icon: "✦",  color: "#7c6fff" },
  { href: "/reports",     label: "Reports",        icon: "📋", color: "#00ff94" },
];

interface ScanReport {
  id: string;
  url: string;
  site_name?: string;
  overall_score?: number;
  grade?: string;
  createdAt?: string;
  summary?: string;
}

function rScore(s?: number) {
  if (s == null) return "var(--c-muted)";
  if (s >= 70) return "#00e87a";
  if (s >= 40) return "#ffb830";
  return "#ff5a5a";
}

function rTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    if (activeSection === "reports" && !reportsLoaded) {
      setReportsLoading(true);
      fetch("/api/reports?limit=50")
        .then((r) => r.json())
        .then((d) => { setReports(d.reports ?? []); setReportsLoaded(true); })
        .catch(() => setReports([]))
        .finally(() => setReportsLoading(false));
    }
  }, [activeSection, reportsLoaded]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const mergedProviders = DEFAULT_SETTINGS.providers.map((def) => {
          const saved = data?.providers?.find(
            (p: typeof def) => p.id === def.id || (def.id === "ai-overview" && p.id === "ai_overview")
          );
          return saved ? { ...def, ...saved, id: def.id } : def;
        });
        setSettings({
          providers: mergedProviders,
          prompts: { ...DEFAULT_SETTINGS.prompts, ...(data?.prompts ?? {}) },
          features: { ...DEFAULT_SETTINGS.features, ...(data?.features ?? {}) },
        });
      }
    } catch (e) {
      showToast("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) showToast("success", "Settings saved successfully");
      else showToast("error", "Failed to save settings");
    } catch {
      showToast("error", "Network error — settings not saved");
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (id: string, patch: Partial<typeof settings.providers[0]>) => {
    setSettings((prev) => ({
      ...prev,
      providers: prev.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const updatePrompt = (key: keyof typeof settings.prompts, val: string) => {
    setSettings((prev) => ({ ...prev, prompts: { ...prev.prompts, [key]: val } }));
  };

  const updateFeature = (key: keyof typeof settings.features, val: boolean) => {
    setSettings((prev) => ({ ...prev, features: { ...prev.features, [key]: val } }));
  };

  const activeProviders = settings.providers.filter((p) => p.enabled);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
        <Navbar />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div className="text-center">
            <div className="spinner w-10 h-10 rounded-full mx-auto mb-4"
              style={{ border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent2)" }} />
            <p className="text-sm font-mono" style={{ color: "var(--c-muted)" }}>Loading admin panel…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 right-5 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-xl"
          style={{
            background: toast.type === "success" ? "rgba(0,232,122,0.12)" : "rgba(255,90,90,0.12)",
            borderColor: toast.type === "success" ? "rgba(0,232,122,0.35)" : "rgba(255,90,90,0.35)",
            color: toast.type === "success" ? "var(--c-success)" : "var(--c-error)",
          }}
        >
          {toast.type === "success" ? "✓ " : "✕ "}{toast.text}
        </div>
      )}

      <div className="flex min-h-[calc(100vh-64px)]">

        {/* ── Admin Sidebar ──────────────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          {/* Admin identity */}
          <div className="px-5 py-6 border-b" style={{ borderColor: "var(--c-border)" }}>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                style={{ background: "linear-gradient(135deg, rgba(124,111,255,0.2), rgba(0,229,255,0.15))", border: "1px solid rgba(124,111,255,0.3)" }}
              >
                🛡️
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Admin Panel</div>
                <div className="text-[10px] font-mono" style={{ color: "var(--c-muted)" }}>AI Scope · Marcstrat</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,232,122,0.12)", color: "var(--c-success)", border: "1px solid rgba(0,232,122,0.25)" }}
              >
                ● LIVE
              </span>
              <span className="text-[10px]" style={{ color: "var(--c-muted)" }}>
                {activeProviders.length} provider{activeProviders.length !== 1 ? "s" : ""} active
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {ADMIN_NAV.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? "rgba(124,111,255,0.1)" : "transparent",
                    border: active ? "1px solid rgba(124,111,255,0.25)" : "1px solid transparent",
                  }}
                >
                  <span className="text-base mt-0.5">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: active ? "var(--c-accent2)" : "var(--c-text)" }}>
                      {item.label}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--c-muted)" }}>{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick links */}
          <div className="px-4 py-4 border-t" style={{ borderColor: "var(--c-border)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--c-muted)" }}>
              Quick Links
            </div>
            <div className="space-y-1">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ color: "var(--c-muted)" }}
                >
                  <span style={{ fontSize: 13 }}>{link.icon}</span>
                  {link.label}
                  <span className="ml-auto" style={{ color: "var(--c-border-strong)", fontSize: 10 }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: "var(--c-border)" }}>
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
              style={{ background: "var(--c-accent2)", color: "#fff" }}
            >
              {saving ? "Saving…" : "💾 Save All Changes"}
            </button>
            <button
              onClick={async () => {
                await fetch("/api/admin/auth", { method: "DELETE" });
                window.location.href = "/admin/login";
              }}
              className="w-full py-2 rounded-xl text-xs font-medium border transition-all hover:opacity-70"
              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-muted)", background: "transparent" }}
            >
              ↪ Sign Out of Admin
            </button>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">

          {/* Mobile section tabs */}
          <div
            className="lg:hidden flex gap-1 p-3 border-b sticky top-[64px] z-10"
            style={{ background: "var(--c-nav-bg)", borderColor: "var(--c-border)", backdropFilter: "blur(12px)" }}
          >
            {ADMIN_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeSection === item.id ? "var(--c-accent2)" : "var(--c-surface)",
                  color: activeSection === item.id ? "#fff" : "var(--c-muted)",
                }}
              >
                {item.icon}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8 max-w-4xl">

            {/* ── OVERVIEW ──────────────────────────────────────────────── */}
            {activeSection === "overview" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--c-text)" }}>Overview</h1>
                  <p className="text-sm" style={{ color: "var(--c-muted)" }}>System status for AI Scope · Marcstrat</p>
                </div>

                {/* Status cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Active Providers",
                      value: String(activeProviders.length),
                      sub: `of ${settings.providers.length} configured`,
                      color: "var(--c-accent)",
                      icon: "🤖",
                    },
                    {
                      label: "Cache",
                      value: settings.features.enableCache ? "Enabled" : "Disabled",
                      sub: settings.features.enableCache ? "Results cached 1h" : "Each scan is live",
                      color: settings.features.enableCache ? "var(--c-success)" : "var(--c-muted)",
                      icon: "⚡",
                    },
                    {
                      label: "AI Citations",
                      value: settings.features.enableCitations ? "Enabled" : "Disabled",
                      sub: settings.features.enableCitations ? "GEO analysis included" : "Basic scan only",
                      color: settings.features.enableCitations ? "var(--c-success)" : "var(--c-muted)",
                      icon: "💬",
                    },
                    {
                      label: "API Keys",
                      value: String(settings.providers.filter((p) => p.apiKey).length),
                      sub: "providers with key set",
                      color: "var(--c-accent2)",
                      icon: "🔑",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border p-5"
                      style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                    >
                      <div className="text-2xl mb-3">{card.icon}</div>
                      <div className="text-xl font-bold mb-0.5" style={{ color: card.color }}>{card.value}</div>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--c-text)" }}>{card.label}</div>
                      <div className="text-[11px]" style={{ color: "var(--c-muted)" }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Active providers list */}
                <div className="rounded-2xl border" style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}>
                  <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--c-border)" }}>
                    <h2 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Active AI Providers</h2>
                    <button
                      onClick={() => setActiveSection("providers")}
                      className="text-xs font-medium transition-all hover:opacity-70"
                      style={{ color: "var(--c-accent2)" }}
                    >
                      Manage →
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
                    {settings.providers.map((p) => {
                      const color = PROVIDER_COLORS[p.id] ?? "#8b8d9e";
                      const icon = PROVIDER_ICONS[p.id] ?? "◎";
                      return (
                        <div key={p.id} className="flex items-center gap-4 px-6 py-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
                          >
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{p.name}</div>
                            <div className="text-[11px] font-mono truncate" style={{ color: "var(--c-muted)" }}>{p.model}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {p.apiKey && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,232,122,0.1)", color: "var(--c-success)" }}>
                                KEY SET
                              </span>
                            )}
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: p.enabled ? "var(--c-success)" : "var(--c-border-strong)" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions */}
                <div>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>Quick Actions</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {QUICK_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all hover:-translate-y-0.5"
                        style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                      >
                        <span className="text-2xl">{link.icon}</span>
                        <span className="text-xs font-medium" style={{ color: "var(--c-text)" }}>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PROVIDERS ─────────────────────────────────────────────── */}
            {activeSection === "providers" && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--c-text)" }}>AI Providers</h1>
                  <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                    Configure which AI providers run your analysis. At least one provider must be enabled with a valid API key.
                  </p>
                </div>

                {settings.providers.map((provider) => {
                  const color = PROVIDER_COLORS[provider.id] ?? "#8b8d9e";
                  const icon = PROVIDER_ICONS[provider.id] ?? "◎";
                  const keyVisible = showKeys[provider.id];

                  return (
                    <div
                      key={provider.id}
                      className="rounded-2xl border transition-all"
                      style={{
                        background: "var(--c-surface)",
                        borderColor: provider.enabled ? `${color}35` : "var(--c-border)",
                      }}
                    >
                      {/* Provider header */}
                      <div
                        className="flex items-center gap-4 px-6 py-4 border-b"
                        style={{ borderColor: provider.enabled ? `${color}20` : "var(--c-border)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0"
                          style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
                        >
                          {icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-[15px] font-bold" style={{ color: "var(--c-text)" }}>{provider.name}</div>
                          <div className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>id: {provider.id}</div>
                        </div>
                        {/* Toggle */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs" style={{ color: provider.enabled ? "var(--c-success)" : "var(--c-muted)" }}>
                            {provider.enabled ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() => updateProvider(provider.id, { enabled: !provider.enabled })}
                            className="relative w-11 h-6 rounded-full transition-all"
                            style={{ background: provider.enabled ? color : "var(--c-border-strong)" }}
                          >
                            <div
                              className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                              style={{
                                background: "#fff",
                                transform: provider.enabled ? "translateX(22px)" : "translateX(2px)",
                              }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Provider config */}
                      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* API Key */}
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                            API Key
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type={keyVisible ? "text" : "password"}
                              value={provider.apiKey}
                              onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                              placeholder={provider.apiKey ? "••••••••••••••••" : "Enter API key…"}
                              className="flex-1 px-3 py-2 rounded-xl border text-sm"
                              style={{
                                background: "var(--c-bg)",
                                borderColor: "var(--c-border-strong)",
                                color: "var(--c-text)",
                              }}
                            />
                            <button
                              onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !keyVisible }))}
                              className="px-2.5 py-2 rounded-lg border text-xs transition-all hover:opacity-70"
                              style={{ borderColor: "var(--c-border-strong)", color: "var(--c-muted)", background: "var(--c-bg)" }}
                              title={keyVisible ? "Hide key" : "Show key"}
                            >
                              {keyVisible ? "🙈" : "👁"}
                            </button>
                          </div>
                          {provider.apiKey && (
                            <div className="mt-1 text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--c-success)" }}>
                              ✓ API key configured
                            </div>
                          )}
                        </div>

                        {/* Model */}
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--c-muted)" }}>
                            Model
                          </label>
                          <div className="relative">
                            <select
                              value={provider.model}
                              onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border text-sm appearance-none"
                              style={{
                                background: "var(--c-bg)",
                                borderColor: "var(--c-border-strong)",
                                color: "var(--c-text)",
                                paddingRight: "2rem",
                              }}
                            >
                              {(PROVIDER_MODELS[provider.id] ?? []).map((m) => (
                                <option key={m.value} value={m.value} style={{ background: "var(--c-surface)", color: "var(--c-text)" }}>
                                  {m.label}
                                </option>
                              ))}
                              {!(PROVIDER_MODELS[provider.id] ?? []).some((m) => m.value === provider.model) && (
                                <option value={provider.model} style={{ background: "var(--c-surface)", color: "var(--c-text)" }}>
                                  {provider.model} (custom)
                                </option>
                              )}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" style={{ color: "var(--c-muted)" }}>
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PROMPTS ───────────────────────────────────────────────── */}
            {activeSection === "prompts" && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--c-text)" }}>Prompt Templates</h1>
                  <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                    Customise the prompts sent to AI providers. Use the variable placeholders shown for each template.
                  </p>
                </div>

                {[
                  {
                    key: "analysis" as const,
                    title: "Analysis Prompt",
                    desc: "Sent to all enabled providers during a standard URL scan.",
                    vars: ["{url}", "{facts}"],
                    rows: 14,
                  },
                  {
                    key: "citation" as const,
                    title: "Citation / GEO Prompt",
                    desc: "Used for competitive landscape and GEO analysis when AI Citations is enabled.",
                    vars: ["{company_name}", "{company_url}", "{domain}"],
                    rows: 10,
                  },
                ].map(({ key, title, desc, vars, rows }) => (
                  <div
                    key={key}
                    className="rounded-2xl border"
                    style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                  >
                    <div className="px-6 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
                      <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--c-text)" }}>{title}</h3>
                      <p className="text-xs mb-2" style={{ color: "var(--c-muted)" }}>{desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vars.map((v) => (
                          <span
                            key={v}
                            className="text-[10px] font-mono px-2 py-0.5 rounded"
                            style={{ background: "rgba(0,229,255,0.08)", color: "var(--c-accent)", border: "1px solid rgba(0,229,255,0.2)" }}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={settings.prompts[key]}
                        onChange={(e) => updatePrompt(key, e.target.value)}
                        rows={rows}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-mono resize-y"
                        style={{
                          background: "var(--c-bg)",
                          borderColor: "var(--c-border-strong)",
                          color: "var(--c-text)",
                          lineHeight: 1.6,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── REPORTS ───────────────────────────────────────────────── */}
            {activeSection === "reports" && (
              <div>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--c-text)" }}>All Reports</h1>
                  <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                    Every scan run through AI Scope — all users, all time.
                  </p>
                </div>

                {reportsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="spinner w-10 h-10 rounded-full"
                      style={{ border: "3px solid var(--c-border)", borderTopColor: "var(--c-accent)" }} />
                  </div>
                ) : reports.length === 0 ? (
                  <div
                    className="rounded-2xl border flex flex-col items-center justify-center py-20 text-center"
                    style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                  >
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-text)" }}>No reports yet</p>
                    <p className="text-xs" style={{ color: "var(--c-muted)" }}>
                      Reports will appear here after users run their first scan
                    </p>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
                  >
                    {/* Table header */}
                    <div
                      className="grid grid-cols-12 gap-3 px-5 py-3 border-b text-[11px] font-mono font-semibold uppercase tracking-wider"
                      style={{ background: "var(--c-surface2)", borderColor: "var(--c-border)", color: "var(--c-muted)" }}
                    >
                      <div className="col-span-1">Score</div>
                      <div className="col-span-1">Grade</div>
                      <div className="col-span-4">Website</div>
                      <div className="col-span-4">Summary</div>
                      <div className="col-span-2 text-right">Date</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
                      {reports.map((r, idx) => (
                        <div
                          key={r.id}
                          className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-[var(--c-surface2)] transition-colors"
                          style={{ background: idx % 2 === 0 ? "var(--c-bg)" : "var(--c-surface)" }}
                        >
                          {/* Score */}
                          <div className="col-span-1">
                            <span
                              className="text-sm font-bold font-mono"
                              style={{ color: rScore(r.overall_score) }}
                            >
                              {r.overall_score ?? "—"}
                            </span>
                          </div>
                          {/* Grade */}
                          <div className="col-span-1">
                            {r.grade ? (
                              <span
                                className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: `${rScore(r.overall_score)}15`, color: rScore(r.overall_score) }}
                              >
                                {r.grade}
                              </span>
                            ) : (
                              <span style={{ color: "var(--c-muted)" }}>—</span>
                            )}
                          </div>
                          {/* URL */}
                          <div className="col-span-4 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: "var(--c-text)" }}>
                              {r.site_name || (() => { try { return new URL(r.url.startsWith("http") ? r.url : "https://" + r.url).hostname; } catch { return r.url; } })()}
                            </div>
                            <div className="text-[11px] font-mono truncate" style={{ color: "var(--c-muted)" }}>
                              {r.url}
                            </div>
                          </div>
                          {/* Summary */}
                          <div className="col-span-4 min-w-0">
                            <p className="text-xs truncate" style={{ color: "var(--c-muted)" }}>
                              {r.summary || "—"}
                            </p>
                          </div>
                          {/* Date */}
                          <div className="col-span-2 text-right">
                            <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>
                              {rTime(r.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div
                      className="px-5 py-3 border-t flex items-center justify-between"
                      style={{ borderColor: "var(--c-border)", background: "var(--c-surface2)" }}
                    >
                      <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>
                        {reports.length} report{reports.length !== 1 ? "s" : ""} shown
                      </span>
                      <a
                        href="/reports"
                        className="text-xs font-semibold hover:opacity-70"
                        style={{ color: "var(--c-accent)" }}
                      >
                        Full Reports Page →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── FEATURES ──────────────────────────────────────────────── */}
            {activeSection === "features" && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--c-text)" }}>Feature Toggles</h1>
                  <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                    Enable or disable platform-wide features. Changes take effect on the next scan.
                  </p>
                </div>

                {[
                  {
                    key: "enableCache" as const,
                    title: "Result Caching",
                    desc: "Cache scan results for 1 hour. Reduces API costs and speeds up repeat scans of the same URL.",
                    icon: "⚡",
                    color: "#ffb830",
                    impact: "Faster scans · Lower API usage",
                  },
                  {
                    key: "enableCitations" as const,
                    title: "AI Citations Research",
                    desc: "Enable full GEO competitive analysis: live queries to AI platforms, citation extraction, and brand sentiment scoring. Adds 30–60s to scan time.",
                    icon: "💬",
                    color: "#00e5ff",
                    impact: "Deeper insights · Longer scan time",
                  },
                ].map((feat) => {
                  const enabled = settings.features[feat.key];
                  return (
                    <div
                      key={feat.key}
                      className="rounded-2xl border p-6"
                      style={{
                        background: "var(--c-surface)",
                        borderColor: enabled ? `${feat.color}30` : "var(--c-border)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: `${feat.color}12`, border: `1px solid ${feat.color}25` }}
                          >
                            {feat.icon}
                          </div>
                          <div>
                            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--c-text)" }}>{feat.title}</h3>
                            <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--c-muted)" }}>{feat.desc}</p>
                            <span
                              className="text-[11px] font-mono px-2 py-0.5 rounded"
                              style={{ background: `${feat.color}10`, color: feat.color }}
                            >
                              {feat.impact}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 pt-1">
                          <span className="text-xs font-medium" style={{ color: enabled ? "var(--c-success)" : "var(--c-muted)" }}>
                            {enabled ? "ON" : "OFF"}
                          </span>
                          <button
                            onClick={() => updateFeature(feat.key, !enabled)}
                            className="relative w-11 h-6 rounded-full transition-all"
                            style={{ background: enabled ? feat.color : "var(--c-border-strong)" }}
                          >
                            <div
                              className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                              style={{ background: "#fff", transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Tip */}
                <div
                  className="rounded-xl border p-4 text-sm"
                  style={{ background: "rgba(66,133,244,0.05)", borderColor: "rgba(66,133,244,0.15)", color: "var(--c-muted)" }}
                >
                  <strong style={{ color: "var(--c-text)" }}>💡 Tip:</strong>{" "}
                  Enable at least one AI provider with a valid API key to get accurate analysis results.
                </div>
              </div>
            )}

            {/* Save button (mobile) */}
            <div className="mt-8 lg:hidden">
              <button
                onClick={save}
                disabled={saving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
                style={{ background: "var(--c-accent2)", color: "#fff" }}
              >
                {saving ? "Saving…" : "💾 Save All Changes"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
