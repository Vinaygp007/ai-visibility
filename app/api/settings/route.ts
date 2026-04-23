import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Settings are stored in a single document: settings/config
const SETTINGS_DOC = "config";
const SETTINGS_COLLECTION = "settings";

export interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  providers: AIProvider[];
  prompts: {
    analysis: string;
    citation: string;
  };
  features: {
    enableCache: boolean;
    enableCitations: boolean;
  };
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  providers: [
    {
      id: "gemini",
      name: "Gemini 2.0 Flash",
      enabled: false,
      apiKey: "",
      model: "gemini-2.0-flash-exp",
    },
    {
      id: "openai",
      name: "ChatGPT (GPT-4o-mini)",
      enabled: false,
      apiKey: "",
      model: "gpt-4o-mini",
    },
    {
      id: "perplexity",
      name: "Perplexity Sonar",
      enabled: false,
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
I want you to run a deep-dive competitive landscape and GEO analysis for the following company:
* Company Name & URL: {company_name} — {company_url}

Phase 1: Live Research & Context Gathering

Before generating any analysis, you MUST search the web to research and establish ALL of the following about this company. Do not skip any item — each one feeds directly into the analysis:

1. Core Product/Service: What exactly do they sell or offer? Who is the primary target buyer persona?
2. Industry & Category Term: What industry do they operate in? What is the most accurate category term for their space (e.g., "Agentic AI Support", "Recruitment CRM", "Revenue Intelligence Platform")? Use the term their competitors and analysts use, not generic labels.
3. Legal Entity & Compliance: What is their registered legal entity name? Where is their HQ? Do they hold any compliance certifications (SOC 2, ISO 27001, GDPR-ready, HIPAA, FCA-regulated, etc.)? If you cannot find certifications, state that explicitly.
4. Key Personnel: Who are the founders and key executives? Any notable prior employers (ex-Google, ex-McKinsey, etc.) or domain expertise that builds credibility?
5. Recent Momentum: Any recent funding rounds, accelerator participation, partnerships, or press coverage?
6. Primary Competitor: Based on your research, identify their single most dominant competitor — the brand a buyer would most likely evaluate them against.
7. Target Keyword/Prompt: What is the most commercially valuable search query or AI prompt that a potential buyer would use when looking for a solution in this company's category? (e.g., "best AI compliance tool", "CoStar alternative", "automated accounts payable software")
8. Current Web Presence: Assess the quality and focus of their existing blog posts, case studies, whitepapers, and landing pages. Are they publishing content that targets their category term? Is it generic or specific?

Phase 2: The Analysis Generation

Using ONLY what you discovered in Phase 1 (do not fabricate details), generate the following structured analysis:

1. The Market Context
Write a brief, punchy introduction explaining the specific, nuanced market this company operates in. Define the main legacy problem they are trying to solve and how their approach changes the game. Reference the Category Term you identified.

2. The Competitive Landscape
Provide a ranked list of the leading companies in this Category Term space.

* Include legacy incumbents, direct competitors, and rising startups — as many as are genuinely relevant.
* You MUST include the Primary Competitor you identified.
* Include {company_name} only if they legitimately belong in this landscape based on your research. If they are too early-stage, too niche, or too unknown to rank alongside established players, say so explicitly — do not force them into the list. Honesty here is more useful than flattery.
* For each company, provide a 1-sentence explanation of what they are "Best for."
* If {company_name} does appear, be realistic with their placement. Do not inflate their ranking.

3. Deep Dive: Where {company_name} Stands & Why
Provide a candid breakdown of their current market position:

* What works in their favour: List 2–3 highly specific product differentiators based on your research.
* What holds them back: Be objective about their weaknesses compared to the dominant players.
* Enterprise Trust & Legal Standing: How does their legal entity, HQ location, and compliance posture help or hinder their enterprise sales motion? If they lack visible certifications, flag this as a gap.
* Current Web Presence Critique: Based on your Phase 1 assessment — are their blogs and case studies targeting the right keywords? Are they too generic? Do they have content that would surface in an AI-generated answer about their category?

4. AI Visibility & Sentiment Analysis
Simulate what a real buyer would see if they asked an AI assistant the Target Keyword/Prompt you identified in Phase 1. Answer that query as you naturally would — do not factor in that {company_name} is the subject of this report. Your uninfluenced response is the data.

After giving that response, provide the following analysis:

* Ranking: Which companies appeared in your answer and in what order? This is their current AI visibility ranking for this keyword.
* Visibility verdict for {company_name}: Did they appear? If yes, at what position and with what framing? If no, state that clearly — do not soften it.
* Sentiment breakdown: For each company that appeared in your answer, classify how you framed them:
  — Framing type: top_pick / strong_option / niche_fit / honorable_mention / not_recommended / absent
  — Sentiment score: a value from -1.0 (negative) to 1.0 (positive) based on your language
  — Key phrases: the exact words or phrases you used that signal that sentiment (e.g., "industry standard", "best for growing teams", "lacks enterprise features")
* Why {company_name} ranked where they did (or didn't appear): Be specific. What signals — content, citations, brand recognition, structured data, third-party mentions — caused this outcome?`,
  },
  features: {
    enableCache: true,
    enableCitations: true,
  },
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json(DEFAULT_SETTINGS, { headers: CORS_HEADERS });
    }

    const settingsRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    const snapshot = await settingsRef.get();

    if (!snapshot.exists) {
      // Return default settings if none exist
      return NextResponse.json(DEFAULT_SETTINGS, { headers: CORS_HEADERS });
    }

    const settings = snapshot.data() as AppSettings;
    return NextResponse.json(settings, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = body as AppSettings;

    // Validate settings structure
    if (!settings.providers || !Array.isArray(settings.providers)) {
      return NextResponse.json(
        { error: "Invalid settings: providers must be an array" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!settings.prompts || typeof settings.prompts !== "object") {
      return NextResponse.json(
        { error: "Invalid settings: prompts must be an object" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const settingsRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    await settingsRef.set({
      ...settings,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: "Settings saved successfully" },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings", details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body as Partial<AppSettings>;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const settingsRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    const snapshot = await settingsRef.get();

    if (!snapshot.exists) {
      // Create with defaults if doesn't exist
      await settingsRef.set({
        ...DEFAULT_SETTINGS,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await settingsRef.update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: true, message: "Settings updated successfully" },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings", details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
