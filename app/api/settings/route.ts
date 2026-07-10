import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGate";
import { DEFAULT_PROVIDERS, DEFAULT_PROMPTS, DEFAULT_FEATURES, PROVIDER_ENV_KEYS } from "@/lib/providerConfig";
import type { AIProvider } from "@/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Admin-facing shape — the actual apiKey value is write-only: GET only ever
// tells the admin whether a key is set and where it came from, it never
// echoes the stored/env value back to the browser.
export interface AdminProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  model: string;
  hasApiKey: boolean;
  keySource: "database" | "env" | "none";
}

export interface AdminSettings {
  providers: AdminProviderConfig[];
  prompts: { analysis: string; citation: string };
  features: { enableCache: boolean; enableCitations: boolean };
}

const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  model: z.string(),
  // Omitted entirely = leave the stored key untouched. Present (including
  // "") = explicitly set/clear the stored key for this provider.
  apiKey: z.string().optional(),
});

const settingsSchema = z.object({
  providers: z.array(providerSchema),
  prompts: z.object({ analysis: z.string(), citation: z.string() }),
  features: z.object({ enableCache: z.boolean(), enableCitations: z.boolean() }),
});

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const admin = createAdminClient();
  const { data } = await admin.from("provider_config").select("*").eq("id", true).maybeSingle();

  const storedProviders: Partial<AIProvider>[] = data?.providers ?? [];
  const providers: AdminProviderConfig[] = DEFAULT_PROVIDERS.map((def) => {
    const stored = storedProviders.find((p) => p.id === def.id);
    const storedKey = stored?.apiKey?.trim();
    const envVarName = PROVIDER_ENV_KEYS[def.id];
    const hasEnvKey = Boolean(envVarName && process.env[envVarName]);
    const keySource: AdminProviderConfig["keySource"] = storedKey ? "database" : hasEnvKey ? "env" : "none";
    return {
      id: def.id,
      name: def.name,
      enabled: stored?.enabled ?? def.enabled,
      model: stored?.model || def.model,
      hasApiKey: keySource !== "none",
      keySource,
    };
  });

  const settings: AdminSettings = {
    providers,
    prompts: { ...DEFAULT_PROMPTS, ...(data?.prompts ?? {}) },
    features: { ...DEFAULT_FEATURES, ...(data?.features ?? {}) },
  };

  return NextResponse.json(settings, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.error;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Invalid settings payload." } },
      { status: 422, headers: CORS_HEADERS }
    );
  }

  const admin = createAdminClient();

  // apiKey is write-only from the client's perspective (GET never returns
  // it), so a provider entry with no `apiKey` field means "leave whatever's
  // already stored alone" — must merge against the existing row, not
  // overwrite it, or every save would silently wipe out prior keys.
  const { data: existingRow } = await admin.from("provider_config").select("providers").eq("id", true).maybeSingle();
  const existingProviders: Partial<AIProvider>[] = existingRow?.providers ?? [];

  const mergedProviders = parsed.data.providers.map((p) => {
    const existing = existingProviders.find((e) => e.id === p.id);
    const apiKey = p.apiKey !== undefined ? p.apiKey : existing?.apiKey ?? "";
    return { ...p, apiKey };
  });

  const { error } = await admin.from("provider_config").upsert({
    id: true,
    providers: mergedProviders,
    prompts: parsed.data.prompts,
    features: parsed.data.features,
    updated_by: gate.user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "internal", message: "Failed to save settings." } },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
}
