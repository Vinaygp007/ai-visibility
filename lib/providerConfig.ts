import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSettings, AIProvider } from "@/types";

// Maps each provider id to the server env var its key now lives in (moved
// out of Firestore's settings/config.providers[].apiKey per the M2 decision
// to use platform-owned keys metered by credits). Empty string = provider
// needs no key, or has no working implementation (duckduckgo).
export const PROVIDER_ENV_KEYS: Record<string, string> = {
  gemini: "GEMINI_API_KEY",
  "ai-overview": "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  copilot: "AZURE_OPENAI_KEY",
  youcom: "YOUCOM_API_KEY",
  duckduckgo: "",
  meta: "META_AI_API_KEY",
};

// Mirrors the id/name/model list from app/settings/page.tsx's old
// DEFAULT_SETTINGS — only `enabled` and `model` are admin-editable via
// provider_config now; `apiKey` is injected from env at read time below.
export const DEFAULT_PROVIDERS: Omit<AIProvider, "apiKey">[] = [
  { id: "gemini", name: "Gemini 3.6 Flash", enabled: true, model: "gemini-3.6-flash" },
  { id: "ai-overview", name: "Google AI Overview", enabled: false, model: "gemini-2.5-pro" },
  { id: "openai", name: "ChatGPT (OpenAI)", enabled: true, model: "gpt-4o-mini" },
  { id: "perplexity", name: "Perplexity", enabled: true, model: "sonar" },
  { id: "claude", name: "Claude (Anthropic)", enabled: false, model: "claude-sonnet-4-6" },
  { id: "copilot", name: "Microsoft Copilot", enabled: false, model: "gpt-4o" },
  { id: "youcom", name: "You.com", enabled: false, model: "smart" },
  { id: "duckduckgo", name: "DuckDuckGo AI", enabled: false, model: "ddg-default" },
  { id: "meta", name: "Meta AI (Llama via Together AI)", enabled: false, model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
];

// Deprecated/retired model ids get transparently remapped, so an admin's
// stored provider_config row never has to be hand-edited after a provider
// deprecates a model version.
const MODEL_MIGRATIONS: Record<string, string> = {
  "gemini-2.0-flash-exp": "gemini-3.6-flash",
  "gemini-2.0-flash-thinking-exp": "gemini-3.6-flash",
  "gemini-2.0-flash": "gemini-3.6-flash",
  "gemini-2.0-flash-lite": "gemini-3.6-flash",
  "gemini-1.5-flash": "gemini-3.6-flash",
  "gemini-1.5-flash-8b": "gemini-3.6-flash",
  "gemini-2.5-pro": "gemini-2.5-flash",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
  "claude-3-opus-20240229": "claude-opus-4-8",
  "claude-3-sonnet-20240229": "claude-sonnet-4-6",
  "claude-3-haiku-20240307": "claude-haiku-4-5-20251001",
};

// Empty strings — buildPrompt()/citationQuery() in the analyze route treat
// an empty customTemplate as "use the built-in default", so leaving these
// blank here reuses that existing fallback text instead of duplicating it.
export const DEFAULT_PROMPTS = { analysis: "", citation: "" };
export const DEFAULT_FEATURES = { enableCache: true, enableCitations: true };

interface ProviderConfigRow {
  providers: Partial<AIProvider>[];
  prompts: Partial<AppSettings["prompts"]>;
  features: Partial<AppSettings["features"]>;
}

async function loadProviderConfigRow(): Promise<ProviderConfigRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("provider_config").select("*").eq("id", true).maybeSingle();
  return data as ProviderConfigRow | null;
}

/**
 * Replaces the old Firestore loadSettings() — same AppSettings shape, so
 * every call site in app/api/analyze, /bulk, /prompt-run keeps working
 * unchanged. enable/model/prompt overrides come from provider_config
 * (admin-editable). apiKey prefers a key set by an admin in provider_config
 * (per-provider, set via /admin/providers) and falls back to the server env
 * var if none is stored.
 */
export async function getEffectiveSettings(): Promise<AppSettings> {
  const row = await loadProviderConfigRow();
  const storedProviders = row?.providers ?? [];

  const providers: AIProvider[] = DEFAULT_PROVIDERS.map((def) => {
    const stored = storedProviders.find((p) => p.id === def.id);
    const envKey = PROVIDER_ENV_KEYS[def.id];
    const storedApiKey = stored?.apiKey?.trim();
    const apiKey = storedApiKey || (envKey ? process.env[envKey] ?? "" : "");
    const model = (stored?.model && MODEL_MIGRATIONS[stored.model]) || stored?.model || def.model;
    return { ...def, ...stored, id: def.id, model, apiKey };
  });

  return {
    providers,
    prompts: { ...DEFAULT_PROMPTS, ...(row?.prompts ?? {}) },
    features: { ...DEFAULT_FEATURES, ...(row?.features ?? {}) },
  };
}

/**
 * Counts providers that will actually incur AI spend for one "query". If
 * both gemini and ai-overview are enabled they share a single underlying
 * Gemini call (see runAllProviders' sharedGeminiPromise) — count that pair
 * as one billable slot, not two, or the analyze route double-charges it.
 */
export function countBillableProviders(providers: AIProvider[]): number {
  const enabled = providers.filter((p) => p.enabled && p.apiKey);
  const hasGemini = enabled.some((p) => p.id === "gemini");
  const hasAiOverview = enabled.some((p) => p.id === "ai-overview" || p.id === "ai_overview");
  return hasGemini && hasAiOverview ? enabled.length - 1 : enabled.length;
}
