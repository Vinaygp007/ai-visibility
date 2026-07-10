import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureEvent } from "@/lib/analytics/posthog";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  url: z.string().optional(),
  userAgent: z.string().optional(),
  consoleLogs: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "A title and description are required." } },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bug_reports")
    .insert({
      user_id: user?.id ?? null,
      title: parsed.data.title,
      description: parsed.data.description,
      severity: parsed.data.severity,
      url: parsed.data.url ?? null,
      user_agent: parsed.data.userAgent ?? null,
      console_logs: parsed.data.consoleLogs ?? null,
      app_version: process.env.GIT_SHA ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "internal", message: "Failed to submit report." } },
      { status: 500 }
    );
  }

  if (user) captureEvent(user.id, "bug_reported", { severity: parsed.data.severity, bug_id: data.id });

  const webhookUrl = process.env.LINEAR_WEBHOOK_URL;
  if (webhookUrl && ["high", "critical"].includes(parsed.data.severity)) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `[${parsed.data.severity}] ${parsed.data.title}`,
        description: parsed.data.description,
        url: parsed.data.url,
      }),
    }).catch((err) => console.warn("[report-bug] Linear webhook failed:", err));
  }

  return NextResponse.json({ success: true, id: data.id });
}
