// ── Confidence scoring types ────────────────────────────────

export type ConfidenceTier = "LOW" | "MEDIUM" | "HIGH";

export interface ConfidenceScore {
  /** Confidence score on a 0-100 scale. */
  score: number;
  tier: ConfidenceTier;
  factors: ConfidenceFactors;
  penalties: AppliedPenalty[];
}

export interface ConfidenceFactors {
  /** 0-100: how many results back this claim. */
  sampleSize: number;
  /** 0-100: do results agree with each other. */
  signalConsistency: number;
  /** 0-100: do results have source citations. */
  citationCoverage: number;
  /** 0-100: response length and completeness. */
  responseQuality: number;
}

export interface AppliedPenalty {
  rule: string;
  description: string;
  /** Points deducted (positive number). */
  deduction: number;
}

// ── Scoring inputs ──────────────────────────────────────────

/** Input for computing result-level confidence (single scan result). */
export interface ResultConfidenceInput {
  responseLength: number;
  hasVisibilityScore: boolean;
  hasSentimentScore: boolean;
  citationCount: number;
  mentioned: boolean;
}

/** Input for computing finding-level confidence (aggregated across results). */
export interface FindingConfidenceInput {
  results: Array<{
    mentioned: boolean;
    visibilityScore: number | null;
    sentimentScore: number | null;
    citationCount: number;
    responseLength: number;
  }>;
  scanRunCount: number;
  /** Fraction of queries that have results: resultCount / queryCount. Range 0-1. */
  scanCompleteness: number;
}
