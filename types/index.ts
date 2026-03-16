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

export interface AnalysisResult {
  site_name: string;
  url: string;
  overall_score: number;
  grade: string;
  summary: string;
  stats: AnalysisStats;
  categories: Category[];
  recommendations: Recommendation[];
}
