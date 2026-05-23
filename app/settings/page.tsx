"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import type { AppSettings } from "@/types";

// Available models per providr
const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: "Gemini 3.1 Pro", value: "gemini-3.1-pro" },
    { label: "Gemini 3.1 Flash", value: "gemini-3.1-flash" },
    { label: "Gemini 3.0 Pro", value: "gemini-3.0-pro" },
    { label: "Gemini 3.0 Flash", value: "gemini-3.0-flash" },
    { label: "Gemini 2.0 Flash (Exp)", value: "gemini-2.0-flash-exp" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
    { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
    { label: "Gemini 1.0 Pro", value: "gemini-1.0-pro" },
  ],
  "ai-overview": [
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
  ],
  openai: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "GPT-4", value: "gpt-4" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
    { label: "o1", value: "o1" },
    { label: "o1 Mini", value: "o1-mini" },
    { label: "o3 Mini", value: "o3-mini" },
  ],
  perplexity: [
    { label: "Sonar", value: "sonar" },
    { label: "Sonar Pro", value: "sonar-pro" },
    { label: "Sonar Reasoning", value: "sonar-reasoning" },
    { label: "Sonar Reasoning Pro", value: "sonar-reasoning-pro" },
    { label: "Sonar Deep Research", value: "sonar-deep-research" },
  ],
  claude: [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
    { label: "Claude 3 Opus", value: "claude-3-opus-20240229" },
    { label: "Claude 3 Sonnet", value: "claude-3-sonnet-20240229" },
    { label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" },
  ],
  copilot: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "o1", value: "o1" },
    { label: "o1 Mini", value: "o1-mini" },
    { label: "o3 Mini", value: "o3-mini" },
  ],
  youcom: [
    { label: "You.com Smart", value: "smart" },
    { label: "You.com Research", value: "research" },
  ],
  duckduckgo: [
    { label: "DuckDuckGo AI Chat", value: "ddg-default" },
  ],
  meta: [
    { label: "Llama 3.3 70B Instruct", value: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    { label: "Llama 3.1 70B Instruct", value: "meta-llama/Llama-3.1-70B-Instruct-Turbo" },
    { label: "Llama 3.1 8B Instruct", value: "meta-llama/Llama-3.1-8B-Instruct-Turbo" },
  ],
};

const DEFAULT_SETTINGS: AppSettings = {
  providers: [
    {
      id: "gemini",
      name: "Gemini",
      enabled: true,
      apiKey: "",
      model: "gemini-2.0-flash-exp",
    },
    {
      id: "ai-overview",
      name: "ai-overview",
      enabled: false,
      apiKey: "",
      model: "gemini-2.5-pro",
    },
    {
      id: "openai",
      name: "ChatGPT (OpenAI)",
      enabled: true,
      apiKey: "",
      model: "gpt-4o-mini",
    },
    {
      id: "perplexity",
      name: "Perplexity",
      enabled: true,
      apiKey: "",
      model: "sonar",
    },
    {
      id: "claude",
      name: "Claude (Anthropic)",
      enabled: false,
      apiKey: "",
      model: "claude-3-5-sonnet-20241022",
    },
    {
      id: "copilot",
      name: "Microsoft Copilot",
      enabled: false,
      apiKey: "",
      model: "gpt-4o",
    },
    {
      id: "youcom",
      name: "You.com",
      enabled: false,
      apiKey: "",
      model: "smart",
    },
    {
      id: "duckduckgo",
      name: "DuckDuckGo AI",
      enabled: false,
      apiKey: "",
      model: "ddg-default",
    },
    {
      id: "meta",
      name: "Meta AI (Llama via Together AI)",
      enabled: false,
      apiKey: "",
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    },
  ],
  prompts: {
    analysis: `You are an AI Visibility Auditor. Based on this real data from {url}:

{facts}

Return ONLY this JSON (no markdown, no fences):
{
  "summary": "2 sentences about AI visibility strengths and weaknesses based on the data above",
  "recommendations": [
    {"priority": "high", "title": "short title", "description": "specific fix", "impact": "expected result"},
    {"priority": "high", "title": "short title", "description": "specific fix", "impact": "expected result"},
    {"priority": "medium", "title": "short title", "description": "specific fix", "impact": "expected result"},
    {"priority": "medium", "title": "short title", "description": "specific fix", "impact": "expected result"},
    {"priority": "low", "title": "short title", "description": "specific fix", "impact": "expected result"}
  ]
}

Rules: return ONLY the JSON. No markdown. No extra text. summary must be under 150 chars. description under 100 chars. title under 50 chars. impact under 80 chars.`,
    citation: `Act as an elite Go-To-Market (GTM) Strategist and Generative Engine Optimization (GEO) expert.
I want you to run a deep-dive competitive landscape and GEO analysis for: {company_name} — {company_url}

Perform comprehensive research and return detailed competitive analysis with sentiment scoring.`,
  },
  features: {
    enableCache: true,
    enableCitations: true,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"providers" | "prompts" | "features">("providers");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const mergedProviders = DEFAULT_SETTINGS.providers.map((defaultProvider) => {
          const savedProvider = data?.providers?.find(
            (provider: typeof DEFAULT_SETTINGS.providers[number]) =>
              provider.id === defaultProvider.id ||
              (defaultProvider.id === "ai-overview" && provider.id === "ai_overview")
          );
          return savedProvider
            ? { ...defaultProvider, ...savedProvider, id: defaultProvider.id }
            : defaultProvider;
        });

        setSettings({
          providers: mergedProviders,
          prompts: {
            ...DEFAULT_SETTINGS.prompts,
            ...(data?.prompts ?? {}),
          },
          features: {
            ...DEFAULT_SETTINGS.features,
            ...(data?.features ?? {}),
          },
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      showMessage("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        showMessage("success", "Settings saved successfully!");
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showMessage("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const updateProvider = (id: string, updates: Partial<typeof settings.providers[0]>) => {
    setSettings((prev) => ({
      ...prev,
      providers: prev.providers.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  };

  const updatePrompt = (type: "analysis" | "citation", value: string) => {
    setSettings((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [type]: value,
      },
    }));
  };

  const updateFeature = (key: keyof typeof settings.features, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
        <Navbar />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div style={{ color: "var(--c-muted)" }}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-12">

        {/* Admin Panel Header */}
        <div
          className="rounded-2xl border p-6 mb-8"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(124,111,255,0.15), rgba(0,229,255,0.15))", border: "1px solid rgba(124,111,255,0.25)" }}
            >
              🛡️
            </div>
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono" style={{ color: "var(--c-muted)" }}>AI Scope</span>
                <span className="text-[11px]" style={{ color: "var(--c-border-strong)" }}>›</span>
                <span
                  className="text-[11px] font-mono font-semibold tracking-wide uppercase"
                  style={{ color: "var(--c-accent2)" }}
                >
                  Admin Panel
                </span>
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--c-text)" }}>Admin Panel</h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--c-muted)" }}>
                Manage AI providers, API keys, analysis prompts, and feature toggles
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <span
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border"
                style={{ color: "var(--c-accent2)", background: "rgba(124,111,255,0.08)", borderColor: "rgba(124,111,255,0.2)" }}
              >
                RESTRICTED
              </span>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className="mb-6 px-6 py-3 rounded-xl text-sm font-medium"
            style={{
              background: message.type === "success" ? "rgba(0, 229, 255, 0.1)" : "rgba(255, 87, 87, 0.1)",
              color: message.type === "success" ? "var(--c-accent)" : "#ff5757",
              borderLeft: `3px solid ${message.type === "success" ? "var(--c-accent)" : "#ff5757"}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Admin Tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl border"
          style={{ background: "var(--c-surface)", borderColor: "var(--c-border)" }}
        >
          {[
            { id: "providers", label: "AI Providers", icon: "🤖" },
            { id: "prompts",   label: "Prompts",      icon: "✏️" },
            { id: "features",  label: "Features",     icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? "var(--c-bg)" : "transparent",
                color: activeTab === tab.id ? "var(--c-text)" : "var(--c-muted)",
                boxShadow: activeTab === tab.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                border: activeTab === tab.id ? "1px solid var(--c-border)" : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Providers Tab */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            {settings.providers.map((provider) => (
              <div
                key={provider.id}
                className="rounded-2xl border p-6 transition-all"
                style={{
                  background: "var(--c-surface)",
                  borderColor: provider.enabled ? "rgba(0, 229, 255, 0.2)" : "var(--c-border)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "var(--c-text)" }}>{provider.name}</h3>
                    <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
                      Provider ID: {provider.id}
                    </p>
                  </div>
                  <button
                    onClick={() => updateProvider(provider.id, { enabled: !provider.enabled })}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      background: provider.enabled ? "var(--c-accent)" : "var(--c-border-strong)",
                    }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                      style={{
                        transform: provider.enabled ? "translateX(26px)" : "translateX(2px)",
                      }}
                    />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2">
                      API Key {provider.enabled && <span style={{ color: "#ff5757" }}>*</span>}
                    </label>
                    <input
                      type="password"
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                      placeholder={`Enter ${provider.name} API key...`}
                      className="w-full px-4 py-2 rounded-xl border text-sm"
                      style={{
                        background: "var(--c-surface)",
                        borderColor: "var(--c-border-strong)",
                        color: "var(--c-text)",
                      }}
                    />
                  </div>

                  {/* Model Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2">Model</label>
                    <div className="relative">
                      <select
                        value={provider.model}
                        onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border text-sm appearance-none cursor-pointer"
                        style={{
                          background: "var(--c-surface)",
                          borderColor: "var(--c-border-strong)",
                          color: "var(--c-text)",
                          paddingRight: "2.5rem",
                        }}
                      >
                        {(PROVIDER_MODELS[provider.id] ?? []).map((m) => (
                          <option
                            key={m.value}
                            value={m.value}
                            style={{ background: "var(--c-surface)", color: "var(--c-text)" }}
                          >
                            {m.label}
                          </option>
                        ))}
                        {/* Fallback: if the current model isn't in the list, show it */}
                        {!(PROVIDER_MODELS[provider.id] ?? []).some((m) => m.value === provider.model) && (
                          <option
                            value={provider.model}
                            style={{ background: "var(--c-surface)", color: "var(--c-text)" }}
                          >
                            {provider.model} (custom)
                          </option>
                        )}
                      </select>
                      {/* Chevron icon */}
                      <div
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
                        style={{ color: "var(--c-muted)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prompts Tab */}
        {activeTab === "prompts" && (
          <div className="space-y-6">
            {/* Analysis Prompt */}
            <div
              className="rounded-2xl border p-6"
              style={{
                background: "var(--c-surface)",
                borderColor: "var(--c-border)",
              }}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>Analysis Prompt</h3>
              <p className="text-xs mb-4" style={{ color: "var(--c-muted)" }}>
                Used for main AI visibility analysis. Variables: <code>{"{url}"}</code>, <code>{"{facts}"}</code>
              </p>
              <textarea
                value={settings.prompts.analysis}
                onChange={(e) => updatePrompt("analysis", e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
                style={{
                  background: "var(--c-surface)",
                  borderColor: "var(--c-border-strong)",
                  color: "var(--c-text)",
                }}
              />
            </div>

            {/* Citation Prompt */}
            <div
              className="rounded-2xl border p-6"
              style={{
                background: "var(--c-surface)",
                borderColor: "var(--c-border)",
              }}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>Citation Prompt</h3>
              <p className="text-xs mb-4" style={{ color: "var(--c-muted)" }}>
                Used for competitive landscape analysis. Variables: <code>{"{company_name}"}</code>, <code>{"{company_url}"}</code>
              </p>
              <textarea
                value={settings.prompts.citation}
                onChange={(e) => updatePrompt("citation", e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
                style={{
                  background: "var(--c-surface)",
                  borderColor: "var(--c-border-strong)",
                  color: "var(--c-text)",
                }}
              />
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === "features" && (
          <div
            className="rounded-2xl border p-6"
            style={{
              background: "var(--c-surface)",
              borderColor: "var(--c-border)",
            }}
          >
            <h3 className="text-lg font-semibold mb-6" style={{ color: "var(--c-text)" }}>Feature Toggles</h3>

            <div className="space-y-6">
              {/* Enable Cache */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--c-text)" }}>Enable Cache</div>
                  <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
                    Store and reuse scan results for 1 hour (faster analysis, reduced API costs)
                  </p>
                </div>
                <button
                  onClick={() => updateFeature("enableCache", !settings.features.enableCache)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{
                    background: settings.features.enableCache ? "var(--c-accent)" : "var(--c-border-strong)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: settings.features.enableCache ? "translateX(26px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>

              {/* Enable Citations */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--c-text)" }}>Enable Citations</div>
                  <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
                    Run competitive landscape analysis (adds 30-60s to scan time)
                  </p>
                </div>
                <button
                  onClick={() => updateFeature("enableCitations", !settings.features.enableCitations)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{
                    background: settings.features.enableCitations ? "var(--c-accent)" : "var(--c-border-strong)",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: settings.features.enableCitations ? "translateX(26px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-8 w-full px-6 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
          style={{ background: "var(--c-accent)", color: "#000" }}
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>

        {/* Info Box */}
        <div
          className="mt-6 rounded-xl border p-4"
          style={{
            background: "rgba(66,133,244,0.05)",
            borderColor: "rgba(66,133,244,0.15)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--c-muted)" }}>
            <strong style={{ color: "var(--c-text)" }}>💡 Tip:</strong> Enable at least one AI provider with a valid API key.
            Settings are stored in Firebase and apply to all future scans.
          </p>
        </div>
      </div>
    </div>
  );
}