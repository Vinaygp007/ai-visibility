export type CheckStatus = "pass" | "fail" | "warn";

export interface Check {
  status: CheckStatus;
  label: string;
  detail?: string;
}

export interface Category {
  name: string;
  icon: string;
  score: number;
  color: "green" | "yellow" | "red";
  checks: Check[];
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact?: string;
}

export interface AnalysisStats {
  checks_passed: number;
  checks_failed: number;
  checks_warned: number;
}

export type CitationDataSource = "live_search" | "fetched_content" | "training_data";
export type CitationStatus = "success" | "failed" | "unavailable";

export interface CitationResult {
  provider: string;
  query: string;
  systemPrompt?: string;
  rawAnswer: string;
  count: number;
  urls: string[];
  allCitationUrls: string[];
  snippets: string[];
  dataSource: CitationDataSource;
  status: CitationStatus;
  error?: string;
}

export type BlockType =
  | "explicit_allow"
  | "explicit_block"
  | "global_block"
  | "not_mentioned"
  | "no_robots";

export interface BotDetail {
  key: string;
  label: string;
  company: string;
  allowed: boolean;
  reason: string;
  directive: string | null;
  blockType: BlockType;
}

export interface ProviderMeta {
  name: string;
  status: "success" | "failed";
  score: number | null;
  durationMs: number;
  error?: string | null;
  prompt: string;
  rawResponse: string;
}

export interface AIPlatformCoverage {
  chatgpt?: "indexed" | "blocked";
  claude?: "indexed" | "blocked";
  perplexity?: "indexed" | "blocked";
  gemini?: "indexed" | "blocked";
  meta_ai?: "indexed" | "blocked";
  you_com?: "indexed" | "blocked";
  duckduckgo?: "indexed" | "blocked";
  apple?: "indexed" | "blocked";
}

export interface AnalysisResult {
  site_name: string;
  url: string;
  overall_score: number;
  grade: string;
  summary: string;
  stats: AnalysisStats;
  categories: Category[];
  ai_platform_coverage?: AIPlatformCoverage;
  recommendations: Recommendation[];
  // Citations are included by default when runCitations is true (the default)
  citations?: CitationResult[];
  _providers?: ProviderMeta[];
  _botResults?: BotDetail[];
  keywords?: { word: string; count: number; inTitle: boolean; inH1: boolean; inMeta: boolean }[];
  _cached?: boolean;
  createdAt?: number | null;
}

// ── Speed / Core Web Vitals Types ─────────────────────────────────────────

export interface SpeedMetricValue {
  displayValue: string;
  score: number | null;
  numericValue?: number;
}

export interface SpeedResult {
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  metrics: {
    lcp: SpeedMetricValue;
    cls: SpeedMetricValue;
    inp: SpeedMetricValue;
    fcp: SpeedMetricValue;
    ttfb: SpeedMetricValue;
    tbt: SpeedMetricValue;
  };
  opportunities: { title: string; description: string; savingsMs?: number }[];
  diagnostics: string[];
  fetchTime: string;
  error?: string;
}

// ── Crawl Types ───────────────────────────────────────────────────────────

export interface CrawlPage {
  url: string;
  status: number;
  responseTimeMs: number;
  wordCount: number;
  h1Text: string;
  h1Count: number;
  h2Count: number;
  textRatioPercent: number;
  metaTitle: string;
  metaTitleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  isIndexable: boolean;
  hasCanonical: boolean;
  linkDepth: number;
  inboundLinkCount: number;
  issues: string[];
}

export interface CrawlResult {
  baseUrl: string;
  pagesCrawled: number;
  pagesBroken: number;
  crawlDurationMs: number;
  avgResponseTimeMs: number;
  totalIssues: number;
  statusBreakdown: Record<string, number>;
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  orphanPages: string[];
  avgLinkDepth: number;
  pages: CrawlPage[];
}

// ── Settings Types ────────────────────────────────────────────────────────

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