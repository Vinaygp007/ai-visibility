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
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "AiScope — AI Visibility Analyzer API",
      version: "2.0.0",
      description:
        "Analyze any website's visibility to AI crawlers, language models, and search engines. Returns deterministic scores, structured data checks, bot access rules, and live citation data from Gemini, ChatGPT, and Perplexity.",
      contact: {
        name: "AiScope",
      },
    },
    servers: [{ url: "/", description: "Current server" }],
    paths: {
      "/api/analyze": {
        get: {
          summary: "Integration Docs / Citation-Only Check",
          description:
            "Without a `url` param: returns full integration documentation and response schemas.\n\nWith `?url=`: runs a fast citation-only check — asks Gemini, ChatGPT, and Perplexity whether they know this site. Great for embedding in other projects without a full scan.",
          operationId: "getAnalyzeOrDocs",
          tags: ["Analyze"],
          parameters: [
            {
              name: "url",
              in: "query",
              required: false,
              description: "Website URL to check citations for (e.g. https://example.com)",
              schema: { type: "string", example: "https://example.com" },
            },
          ],
          responses: {
            "200": {
              description: "Citation-only result (when url provided) or integration docs",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      { $ref: "#/components/schemas/CitationOnlyResponse" },
                      { $ref: "#/components/schemas/IntegrationDocs" },
                    ],
                  },
                  examples: {
                    citation_check: {
                      summary: "Citation-only result",
                      value: {
                        url: "https://example.com",
                        domain: "example.com",
                        citation_summary: {
                          total_mentions: 12,
                          providers_checked: 3,
                          providers_succeeded: 3,
                          ai_visibility_score: 40,
                        },
                        citations: [],
                        _generated_at: "2024-01-01T00:00:00.000Z",
                      },
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
            query: { type: "string", description: "The question posed to the AI provider" },
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