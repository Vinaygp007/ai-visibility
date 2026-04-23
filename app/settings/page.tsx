"use client";

import { useState, useEffect } from "react";
import type { AppSettings } from "@/types";

const DEFAULT_SETTINGS: AppSettings = {
  providers: [
    {
      id: "gemini",
      name: "Gemini 2.0 Flash",
      enabled: true,
      apiKey: "",
      model: "gemini-2.0-flash-exp",
    },
    {
      id: "openai",
      name: "ChatGPT (GPT-4o-mini)",
      enabled: true,
      apiKey: "",
      model: "gpt-4o-mini",
    },
    {
      id: "perplexity",
      name: "Perplexity Sonar",
      enabled: true,
      apiKey: "",
      model: "sonar",
    },
    {
      id: "claude",
      name: "Claude 3.5 Sonnet",
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
        setSettings(data);
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
      <div className="min-h-screen pl-64 flex items-center justify-center" style={{ background: "#0a0b10" }}>
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pl-64" style={{ background: "#0a0b10" }}>
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-sm" style={{ color: "#8b8d9e" }}>
            Configure AI providers, prompts, and analysis options
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className="mb-6 px-6 py-3 rounded-xl text-sm font-medium"
            style={{
              background: message.type === "success" ? "rgba(0, 229, 255, 0.1)" : "rgba(255, 87, 87, 0.1)",
              color: message.type === "success" ? "#00e5ff" : "#ff5757",
              borderLeft: `3px solid ${message.type === "success" ? "#00e5ff" : "#ff5757"}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {["providers", "prompts", "features"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab ? "rgba(0, 229, 255, 0.1)" : "rgba(255,255,255,0.02)",
                color: activeTab === tab ? "#00e5ff" : "#8b8d9e",
                borderBottom: activeTab === tab ? "2px solid #00e5ff" : "none",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Providers Tab */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            {settings.providers.map((provider) => (
              <div
                key={provider.id}
                className="rounded-2xl border p-6"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: provider.enabled ? "rgba(0, 229, 255, 0.2)" : "rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                    <p className="text-xs mt-1" style={{ color: "#8b8d9e" }}>
                      Provider ID: {provider.id}
                    </p>
                  </div>
                  <button
                    onClick={() => updateProvider(provider.id, { enabled: !provider.enabled })}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      background: provider.enabled ? "#00e5ff" : "rgba(255,255,255,0.1)",
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
                        background: "rgba(255,255,255,0.03)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#f0f0f5",
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white mb-2">Model</label>
                    <input
                      type="text"
                      value={provider.model}
                      onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                      placeholder="Model name..."
                      className="w-full px-4 py-2 rounded-xl border text-sm"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#f0f0f5",
                      }}
                    />
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
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Analysis Prompt</h3>
              <p className="text-xs mb-4" style={{ color: "#8b8d9e" }}>
                Used for main AI visibility analysis. Variables: <code>{"{url}"}</code>, <code>{"{facts}"}</code>
              </p>
              <textarea
                value={settings.prompts.analysis}
                onChange={(e) => updatePrompt("analysis", e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#f0f0f5",
                }}
              />
            </div>

            {/* Citation Prompt */}
            <div
              className="rounded-2xl border p-6"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Citation Prompt</h3>
              <p className="text-xs mb-4" style={{ color: "#8b8d9e" }}>
                Used for competitive landscape analysis. Variables: <code>{"{company_name}"}</code>, <code>{"{company_url}"}</code>
              </p>
              <textarea
                value={settings.prompts.citation}
                onChange={(e) => updatePrompt("citation", e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#f0f0f5",
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
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-6">Feature Toggles</h3>

            <div className="space-y-6">
              {/* Enable Cache */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Enable Cache</div>
                  <p className="text-xs mt-1" style={{ color: "#8b8d9e" }}>
                    Store and reuse scan results for 1 hour (faster analysis, reduced API costs)
                  </p>
                </div>
                <button
                  onClick={() => updateFeature("enableCache", !settings.features.enableCache)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{
                    background: settings.features.enableCache ? "#00e5ff" : "rgba(255,255,255,0.1)",
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
                  <div className="text-sm font-medium text-white">Enable Citations</div>
                  <p className="text-xs mt-1" style={{ color: "#8b8d9e" }}>
                    Run competitive landscape analysis (adds 30-60s to scan time)
                  </p>
                </div>
                <button
                  onClick={() => updateFeature("enableCitations", !settings.features.enableCitations)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{
                    background: settings.features.enableCitations ? "#00e5ff" : "rgba(255,255,255,0.1)",
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
          style={{ background: "#00e5ff", color: "#000" }}
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
          <p className="text-xs" style={{ color: "#8b8d9e" }}>
            <strong className="text-white">💡 Tip:</strong> Enable at least one AI provider with a valid API key. 
            Settings are stored in Firebase and apply to all future scans.
          </p>
        </div>
      </div>
    </div>
  );
}
