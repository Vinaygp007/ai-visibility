"use client";

import { useState, useEffect } from "react";

interface AdminProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  model: string;
  hasApiKey: boolean;
  keySource: "database" | "env" | "none";
}

interface AdminSettings {
  providers: AdminProviderConfig[];
  prompts: { analysis: string; citation: string };
  features: { enableCache: boolean; enableCitations: boolean };
}

// Available models per provider (display only — API keys live in server env vars)
const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [{ label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" }],
  "ai-overview": [{ label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" }],
  openai: [{ label: "GPT-4o Mini", value: "gpt-4o-mini" }],
  perplexity: [{ label: "Sonar", value: "sonar" }],
  claude: [{ label: "Claude Sonnet", value: "claude-sonnet-4-6" }],
  copilot: [{ label: "GPT-4o", value: "gpt-4o" }],
  youcom: [{ label: "You.com Smart", value: "smart" }],
  duckduckgo: [{ label: "DuckDuckGo AI Chat", value: "ddg-default" }],
  meta: [{ label: "Llama 3.3 70B Instruct", value: "meta-llama/Llama-3.3-70B-Instruct-Turbo" }],
};

export default function AdminProvidersPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"providers" | "prompts" | "features">("providers");
  // undefined = untouched, leave the stored key alone. "" or a real value =
  // explicitly set/clear on save. Never prefilled from the server — GET
  // never returns the actual key.
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSettings)
      .catch(() => showMessage("error", "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = {
        ...settings,
        providers: settings.providers.map(({ id, name, enabled, model }) => ({
          id,
          name,
          enabled,
          model,
          ...(apiKeyDrafts[id] !== undefined ? { apiKey: apiKeyDrafts[id] } : {}),
        })),
      };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showMessage("success", "Settings saved successfully!");
        setApiKeyDrafts({});
        fetch("/api/settings")
          .then((r) => (r.ok ? r.json() : null))
          .then((s) => s && setSettings(s));
      } else {
        const data = await res.json();
        showMessage("error", data.error?.message || "Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const updateProvider = (id: string, updates: Partial<AdminProviderConfig>) => {
    setSettings((prev) =>
      prev ? { ...prev, providers: prev.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)) } : prev
    );
  };

  const updatePrompt = (type: "analysis" | "citation", value: string) => {
    setSettings((prev) => (prev ? { ...prev, prompts: { ...prev.prompts, [type]: value } } : prev));
  };

  const updateFeature = (key: keyof AdminSettings["features"], value: boolean) => {
    setSettings((prev) => (prev ? { ...prev, features: { ...prev.features, [key]: value } } : prev));
  };

  if (loading || !settings) {
    return <div className="text-[var(--text)]">Loading...</div>;
  }

  return (
    <div>
      {message && (
        <div
          className="mb-6 px-6 py-3 rounded-xl text-sm font-medium"
          style={{
            background: message.type === "success" ? "rgba(0, 229, 255, 0.1)" : "rgba(255, 87, 87, 0.1)",
            color: message.type === "success" ? "var(--accent)" : "#ff5757",
            borderLeft: `3px solid ${message.type === "success" ? "var(--accent)" : "#ff5757"}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {["providers", "prompts", "features"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "rgba(0, 229, 255, 0.1)" : "rgba(var(--overlay-rgb),0.02)",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "none",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "providers" && (
        <div className="space-y-4">
          {settings.providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-2xl border p-6 transition-all"
              style={{
                background: "rgba(var(--overlay-rgb),0.02)",
                borderColor: provider.enabled ? "rgba(0, 229, 255, 0.2)" : "rgba(var(--overlay-rgb),0.07)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)]">{provider.name}</h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Provider ID: {provider.id}</p>
                </div>
                <button
                  onClick={() => updateProvider(provider.id, { enabled: !provider.enabled })}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ background: provider.enabled ? "var(--accent)" : "rgba(var(--overlay-rgb),0.1)" }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: provider.enabled ? "translateX(26px)" : "translateX(2px)" }}
                  />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text)] mb-2">Model</label>
                <div
                  className="w-full px-4 py-2 rounded-xl border text-sm"
                  style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                >
                  {(PROVIDER_MODELS[provider.id] ?? []).find((m) => m.value === provider.model)?.label ?? provider.model}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text)] mb-2">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    value={apiKeyDrafts[provider.id] ?? ""}
                    onChange={(e) =>
                      setApiKeyDrafts((prev) => ({ ...prev, [provider.id]: e.target.value }))
                    }
                    placeholder={
                      apiKeyDrafts[provider.id] !== undefined
                        ? ""
                        : provider.keySource === "database"
                          ? "•••••••••••••• (stored: leave blank to keep)"
                          : provider.keySource === "env"
                            ? "Using server env var: leave blank to keep"
                            : "No key set"
                    }
                    className="flex-1 px-4 py-2 rounded-xl border text-sm"
                    style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
                  />
                  {(provider.keySource === "database" || apiKeyDrafts[provider.id]) && (
                    <button
                      type="button"
                      onClick={() => setApiKeyDrafts((prev) => ({ ...prev, [provider.id]: "" }))}
                      className="px-4 py-2 rounded-xl border text-xs font-medium"
                      style={{ background: "rgba(255,87,87,0.06)", borderColor: "rgba(255,87,87,0.2)", color: "#ff5757" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: "var(--text-dim)" }}>
                  {provider.keySource === "database"
                    ? "Stored in the database, overrides the server env var."
                    : provider.keySource === "env"
                      ? "Falling back to the server env var. Set one here to override without redeploying."
                      : "No key available from the database or server env vars. This provider will be skipped."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "prompts" && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-6" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Analysis Prompt</h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Variables: <code>{"{url}"}</code>, <code>{"{facts}"}</code>. Leave blank to use the built-in default.
            </p>
            <textarea
              value={settings.prompts.analysis}
              onChange={(e) => updatePrompt("analysis", e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
            />
          </div>

          <div className="rounded-2xl border p-6" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Citation Prompt</h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Variables: <code>{"{company_name}"}</code>, <code>{"{company_url}"}</code>. Leave blank to use the built-in default.
            </p>
            <textarea
              value={settings.prompts.citation}
              onChange={(e) => updatePrompt("citation", e.target.value)}
              rows={12}
              className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
              style={{ background: "rgba(var(--overlay-rgb),0.03)", borderColor: "rgba(var(--overlay-rgb),0.1)", color: "var(--text)" }}
            />
          </div>
        </div>
      )}

      {activeTab === "features" && (
        <div className="rounded-2xl border p-6" style={{ background: "rgba(var(--overlay-rgb),0.02)", borderColor: "rgba(var(--overlay-rgb),0.07)" }}>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-6">Feature Toggles</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">Enable Cache</div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Reuse a user's own scan results for 1 hour (faster, no repeat credit charge)
                </p>
              </div>
              <button
                onClick={() => updateFeature("enableCache", !settings.features.enableCache)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: settings.features.enableCache ? "var(--accent)" : "rgba(var(--overlay-rgb),0.1)" }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: settings.features.enableCache ? "translateX(26px)" : "translateX(2px)" }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">Enable Citations</div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Run competitive landscape analysis (adds 30-60s and doubles the credit cost per scan)
                </p>
              </div>
              <button
                onClick={() => updateFeature("enableCitations", !settings.features.enableCitations)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: settings.features.enableCitations ? "var(--accent)" : "rgba(var(--overlay-rgb),0.1)" }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: settings.features.enableCitations ? "translateX(26px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={saveSettings}
        disabled={saving}
        className="mt-8 w-full px-6 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
      >
        {saving ? "Saving..." : "Save All Settings"}
      </button>

      <div className="mt-6 rounded-xl border p-4" style={{ background: "rgba(66,133,244,0.05)", borderColor: "rgba(66,133,244,0.15)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <strong className="text-[var(--text)]">💡 Note:</strong> API keys entered here are stored in the database and
          take priority over server environment variables. Leave a key field blank to keep whatever's already
          stored. The actual value is never shown again once saved.
        </p>
      </div>
    </div>
  );
}
