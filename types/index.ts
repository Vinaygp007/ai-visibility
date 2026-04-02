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
  provider: "Gemini 2.0 Flash" | "ChatGPT (GPT-4o)" | "Perplexity Sonar";
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

export interface ProviderMeta {
  name: string;
  status: "success" | "failed";
  score: number | null;
  durationMs: number;
  error?: string | null;
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
  _cached?: boolean;
}