import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const CITATION_SYSTEM_PROMPT =
    "You are an elite Go-To-Market (GTM) Strategist and Generative Engine Optimization (GEO) expert. " +
    "Use live web research when tools are available. " +
    "Do not fabricate; if you cannot find a required detail, state that explicitly.";

  const CITATION_USER_TEMPLATE =
    "Act as an elite Go-To-Market (GTM) Strategist and Generative Engine Optimization (GEO) expert.\n" +
    "I want you to run a deep-dive competitive landscape and GEO analysis for the following company:\n" +
    "* Company Name & URL: {company_name} — {domain}\n\n" +
    "Phase 1: Live Research & Context Gathering\n\n" +
    "Before generating any analysis, you MUST search the web to research and establish ALL of the following about this company. Do not skip any item — each one feeds directly into the analysis:\n\n" +
    "1. Core Product/Service: What exactly do they sell or offer? Who is the primary target buyer persona?\n" +
    "2. Industry & Category Term: What industry do they operate in? What is the most accurate category term for their space (e.g., \"Agentic AI Support\", \"Recruitment CRM\", \"Revenue Intelligence Platform\")? Use the term their competitors and analysts use, not generic labels.\n" +
    "3. Legal Entity & Compliance: What is their registered legal entity name? Where is their HQ? Do they hold any compliance certifications (SOC 2, ISO 27001, GDPR-ready, HIPAA, FCA-regulated, etc.)? If you cannot find certifications, state that explicitly.\n" +
    "4. Key Personnel: Who are the founders and key executives? Any notable prior employers (ex-Google, ex-McKinsey, etc.) or domain expertise that builds credibility?\n" +
    "5. Recent Momentum: Any recent funding rounds, accelerator participation, partnerships, or press coverage?\n" +
    "6. Primary Competitor: Based on your research, identify their single most dominant competitor — the brand a buyer would most likely evaluate them against.\n" +
    "7. Target Keyword/Prompt: What is the most commercially valuable search query or AI prompt that a potential buyer would use when looking for a solution in this company's category? (e.g., \"best AI compliance tool\", \"CoStar alternative\", \"automated accounts payable software\")\n" +
    "8. Current Web Presence: Assess the quality and focus of their existing blog posts, case studies, whitepapers, and landing pages. Are they publishing content that targets their category term? Is it generic or specific?\n\n" +
    "Phase 2: The Analysis Generation\n\n" +
    "Using ONLY what you discovered in Phase 1 (do not fabricate details), generate the following structured analysis:\n\n" +
    "1. The Market Context\n" +
    "Write a brief, punchy introduction explaining the specific, nuanced market this company operates in. Define the main legacy problem they are trying to solve and how their approach changes the game. Reference the Category Term you identified.\n\n" +
    "2. The Competitive Landscape\n" +
    "Provide a ranked list of the leading companies in this Category Term space.\n\n" +
    "* Include legacy incumbents, direct competitors, and rising startups — as many as are genuinely relevant.\n" +
    "* You MUST include the Primary Competitor you identified.\n" +
    "* Include {company_name} only if they legitimately belong in this landscape based on your research. If they are too early-stage, too niche, or too unknown to rank alongside established players, say so explicitly — do not force them into the list. Honesty here is more useful than flattery.\n" +
    "* For each company, provide a 1-sentence explanation of what they are \"Best for.\"\n" +
    "* If {company_name} does appear, be realistic with their placement. Do not inflate their ranking.\n\n" +
    "3. Deep Dive: Where {company_name} Stands & Why\n" +
    "Provide a candid breakdown of their current market position:\n\n" +
    "* What works in their favour: List 2–3 highly specific product differentiators based on your research.\n" +
    "* What holds them back: Be objective about their weaknesses compared to the dominant players.\n" +
    "* Enterprise Trust & Legal Standing: How does their legal entity, HQ location, and compliance posture help or hinder their enterprise sales motion? If they lack visible certifications, flag this as a gap.\n" +
    "* Current Web Presence Critique: Based on your Phase 1 assessment — are their blogs and case studies targeting the right keywords? Are they too generic? Do they have content that would surface in an AI-generated answer about their category?\n\n" +
    "4. AI Visibility & Sentiment Analysis\n" +
    "Simulate what a real buyer would see if they asked an AI assistant the Target Keyword/Prompt you identified in Phase 1. Answer that query as you naturally would — do not factor in that {company_name} is the subject of this report. Your uninfluenced response is the data.\n\n" +
    "After giving that response, provide the following analysis:\n\n" +
    "* Ranking: Which companies appeared in your answer and in what order? This is their current AI visibility ranking for this keyword.\n" +
    "* Visibility verdict for {company_name}: Did they appear? If yes, at what position and with what framing? If no, state that clearly — do not soften it.\n" +
    "* Sentiment breakdown: For each company that appeared in your answer, classify how you framed them:\n" +
    "  — Framing type: top_pick / strong_option / niche_fit / honorable_mention / not_recommended / absent\n" +
    "  — Sentiment score: a value from -1.0 (negative) to 1.0 (positive) based on your language\n" +
    "  — Key phrases: the exact words or phrases you used that signal that sentiment (e.g., \"industry standard\", \"best for growing teams\", \"lacks enterprise features\")\n" +
    "* Why {company_name} ranked where they did (or didn't appear): Be specific. What signals — content, citations, brand recognition, structured data, third-party mentions — caused this outcome?";

  const spec = {
    openapi: "3.0.0",
    info: {
      title: "AiScope — AI Visibility Analyzer API",
      version: "2.1.0",
      description:
        "Analyze any website's visibility to AI crawlers, language models, and search engines. Returns deterministic scores, structured data checks, bot access rules, and live citation data from Gemini, ChatGPT, and Perplexity.",
      contact: {
        name: "AiScope",
      },
    },
    servers: [{ url: "/", description: "Current server" }],
    "x-prompts": {
      citations: {
        system: CITATION_SYSTEM_PROMPT,
        user_template: CITATION_USER_TEMPLATE,
        placeholders: {
          company_name: "Detected company/site name (from page title or meta tags)",
          domain: "Company website origin URL (e.g., https://example.com)",
        },
      },
    },
    paths: {
      "/api/analyze": {
        get: {
          summary: "OpenAPI Spec (this document)",
          description:
            "Returns this OpenAPI 3.0 spec JSON.\n\nUse POST /api/analyze for scans.",
          operationId: "getAnalyzeOrDocs",
          tags: ["Analyze"],
          parameters: [
            {
              name: "url",
              in: "query",
              required: false,
              description: "(Unused) Present for backward compatibility.",
              schema: { type: "string", example: "https://example.com" },
            },
          ],
          responses: {
            "200": {
              description: "OpenAPI spec JSON",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                  examples: {
                    spec: {
                      summary: "OpenAPI spec",
                      value: { openapi: "3.0.0", info: { title: "AiScope — AI Visibility Analyzer API" } },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
          },
        },
        post: {
          summary: "Full AI Visibility Scan",
          description:
            "Runs a comprehensive AI visibility audit on the given URL. Fetches robots.txt, llms.txt, llms-full.txt, sitemap.xml, and the homepage, then computes deterministic scores across 5 categories and asks AI providers (Gemini, ChatGPT, Perplexity) for recommendations and live citation data.",
          operationId: "postAnalyze",
          tags: ["Analyze"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyzeRequest" },
                examples: {
                  basic: {
                    summary: "Basic scan",
                    value: { url: "https://example.com" },
                  },
                  bust_cache: {
                    summary: "Force fresh scan",
                    value: { url: "https://example.com", bustCache: true },
                  },
                  with_citations: {
                    summary: "Scan + live GEO/GTM citation research",
                    value: { url: "https://example.com", runCitations: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Full scan result",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AnalyzeResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "500": { $ref: "#/components/responses/ServerError" },
          },
        },
        options: {
          summary: "CORS Preflight",
          operationId: "optionsAnalyze",
          tags: ["CORS"],
          responses: { "204": { description: "No content" } },
        },
      },
    },
    components: {
      schemas: {
        AnalyzeRequest: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              description: "The website URL to analyze",
              example: "https://example.com",
            },
            bustCache: {
              type: "boolean",
              description: "If true, bypasses the 1-hour Firebase cache and forces a fresh scan",
              default: false,
            },
            runCitations: {
              type: "boolean",
              description:
                "If true, runs live research-style citation checks using the client GTM/GEO prompt against Gemini, ChatGPT, and Perplexity.",
              default: false,
            },
          },
        },
        AnalyzeResponse: {
          type: "object",
          properties: {
            site_name: { type: "string", description: "Detected site name from meta tags or title", example: "Example" },
            url: { type: "string", example: "https://example.com" },
            overall_score: { type: "integer", minimum: 0, maximum: 100, description: "Deterministic aggregate score across all categories", example: 72 },
            grade: { type: "string", enum: ["A+", "A", "B", "C", "D", "F"], description: "Letter grade derived from overall_score", example: "B" },
            summary: { type: "string", description: "AI-written 2-sentence summary of strengths and weaknesses" },
            stats: { $ref: "#/components/schemas/CheckStats" },
            categories: {
              type: "array",
              description: "Scored categories with individual check results",
              items: { $ref: "#/components/schemas/ScoredCategory" },
            },
            ai_platform_coverage: { $ref: "#/components/schemas/AIPlatformCoverage" },
            recommendations: {
              type: "array",
              items: { $ref: "#/components/schemas/Recommendation" },
            },
            citations: {
              type: "array",
              description: "Live citation check results from AI search providers",
              items: { $ref: "#/components/schemas/CitationResult" },
            },
            _providers: {
              type: "array",
              description: "Metadata about each AI provider used",
              items: { $ref: "#/components/schemas/ProviderMeta" },
            },
            _cached: {
              type: "boolean",
              description: "Present and true when the result was served from Firebase cache",
            },
          },
        },
        CheckStats: {
          type: "object",
          properties: {
            checks_passed: { type: "integer", example: 18 },
            checks_failed: { type: "integer", example: 4 },
            checks_warned: { type: "integer", example: 5 },
          },
        },
        ScoredCategory: {
          type: "object",
          properties: {
            name: {
              type: "string",
              enum: [
                "AI Crawler Access",
                "llms.txt and AI Context",
                "Structured Data",
                "Content Discoverability",
                "Technical AI SEO",
              ],
              example: "AI Crawler Access",
            },
            icon: { type: "string", example: "🤖" },
            score: { type: "integer", minimum: 0, maximum: 100, example: 85 },
            color: { type: "string", enum: ["green", "yellow", "red"], example: "green" },
            checks: {
              type: "array",
              items: { $ref: "#/components/schemas/CheckItem" },
            },
          },
        },
        CheckItem: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pass", "fail", "warn"] },
            label: { type: "string", example: "robots.txt found" },
            detail: { type: "string", example: "14/14 AI bots allowed" },
          },
        },
        AIPlatformCoverage: {
          type: "object",
          description: "Whether each major AI platform's crawler is allowed or blocked",
          properties: {
            chatgpt:    { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            claude:     { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            perplexity: { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            gemini:     { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            meta_ai:    { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            you_com:    { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            duckduckgo: { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
            apple:      { type: "string", enum: ["indexed", "blocked"], example: "indexed" },
          },
        },
        Recommendation: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["high", "medium", "low"], example: "high" },
            title: { type: "string", example: "Add llms.txt" },
            description: { type: "string", example: "Create /llms.txt to give AI systems structured context about your site" },
            impact: { type: "string", example: "Improves AI comprehension and citation accuracy" },
          },
        },
        CitationResult: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: ["Gemini 2.0 Flash", "ChatGPT (GPT-4o)", "Perplexity Sonar"],
              example: "Gemini 2.0 Flash",
            },
            query: { type: "string", description: "The question posed to the AI provider (filled prompt)" },
            systemPrompt: { type: "string", description: "System prompt used for the citation check" },
            rawAnswer: { type: "string", description: "Full text response from the AI provider" },
            count: { type: "integer", description: "Total citation + mention count for this domain", example: 5 },
            urls: {
              type: "array",
              description: "URLs from the scanned site that were cited",
              items: { type: "string" },
              example: ["https://example.com/about"],
            },
            allCitationUrls: {
              type: "array",
              description: "All URLs cited in the AI answer (any domain)",
              items: { type: "string" },
            },
            snippets: {
              type: "array",
              description: "Sentences from the AI answer that mention the domain",
              items: { type: "string" },
            },
            dataSource: {
              type: "string",
              enum: ["live_search", "fetched_content", "training_data"],
              description: "How the AI provider sourced its answer",
              example: "live_search",
            },
            status: {
              type: "string",
              enum: ["success", "failed", "unavailable"],
              example: "success",
            },
            error: {
              type: "string",
              description: "Error message if status is failed",
            },
          },
        },
        CitationPrompt: {
          type: "object",
          description: "Prompt template used for live citation checks.",
          properties: {
            systemPrompt: {
              type: "string",
              example:
                CITATION_SYSTEM_PROMPT,
            },
            userPromptTemplate: {
              type: "string",
              description:
                "Template with placeholders {company_name} and {domain} (filled at runtime).",
              example:
                CITATION_USER_TEMPLATE,
            },
          },
        },
        ProviderMeta: {
          type: "object",
          properties: {
            name: { type: "string", example: "Gemini 2.0 Flash" },
            status: { type: "string", enum: ["success", "failed"], example: "success" },
            score: { type: "integer", nullable: true, example: 72 },
            durationMs: { type: "integer", description: "Time taken in milliseconds", example: 1240 },
            error: { type: "string", nullable: true },
          },
        },
        CitationOnlyResponse: {
          type: "object",
          description: "Returned by GET /api/analyze?url= — lightweight citation-only check",
          properties: {
            url: { type: "string", example: "https://example.com" },
            domain: { type: "string", example: "example.com" },
            citation_summary: {
              type: "object",
              properties: {
                total_mentions: { type: "integer", example: 12 },
                providers_checked: { type: "integer", example: 3 },
                providers_succeeded: { type: "integer", example: 3 },
                ai_visibility_score: { type: "integer", minimum: 0, maximum: 100, example: 40 },
              },
            },
            citations: {
              type: "array",
              items: { $ref: "#/components/schemas/CitationResult" },
            },
            _generated_at: { type: "string", format: "date-time" },
            _cached: { type: "boolean" },
          },
        },
        IntegrationDocs: {
          type: "object",
          description: "Returned by GET /api/analyze (no url param) — integration documentation",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            description: { type: "string" },
            cors: { type: "string" },
            auth_required: { type: "boolean" },
            endpoints: { type: "object" },
            citation_result_shape: { type: "object" },
            citation_prompt: { $ref: "#/components/schemas/CitationPrompt" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "URL is required" },
            errorCode: {
              type: "string",
              enum: ["MISSING_URL", "INVALID_URL", "MISSING_KEY", "QUOTA_EXCEEDED", "INVALID_KEY", "UNKNOWN"],
              example: "MISSING_URL",
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request — missing or invalid parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ServerError: {
          description: "Server error — AI provider issue or configuration problem",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
    tags: [
      { name: "Analyze", description: "AI visibility analysis and citation checking endpoints" },
      { name: "CORS", description: "Cross-origin preflight" },
    ],
  };

  return NextResponse.json(spec, { headers: CORS_HEADERS });
}