import type {
  ConfidenceTier,
  ConfidenceScore,
  ConfidenceFactors,
  ResultConfidenceInput,
  FindingConfidenceInput,
} from "./types";
import { applyPenalties } from "./penalties";

// ── Weight constants (tunable) ──────────────────────────────

// Result-level factor weights (must sum to 1.0)
export const RESULT_WEIGHT_RESPONSE_QUALITY = 0.30;
export const RESULT_WEIGHT_SCORE_COVERAGE = 0.30;
export const RESULT_WEIGHT_CITATION_COVERAGE = 0.25;
export const RESULT_WEIGHT_MENTION_CLARITY = 0.15;

// Finding-level factor weights (must sum to 1.0)
export const FINDING_WEIGHT_SAMPLE_SIZE = 0.30;
export const FINDING_WEIGHT_SIGNAL_CONSISTENCY = 0.35;
export const FINDING_WEIGHT_CITATION_COVERAGE = 0.20;
export const FINDING_WEIGHT_RESPONSE_QUALITY = 0.15;

// ── Tier thresholds ─────────────────────────────────────────

export const TIER_LOW_CEILING = 40;
export const TIER_MEDIUM_CEILING = 70;

// ── Tier classification ─────────────────────────────────────

/**
 * Maps a 0-100 confidence score to a tier.
 *
 * - LOW:    score < 40
 * - MEDIUM: 40 <= score < 70
 * - HIGH:   score >= 70
 */
export function confidenceTier(score: number): ConfidenceTier {
  if (score < TIER_LOW_CEILING) return "LOW";
  if (score < TIER_MEDIUM_CEILING) return "MEDIUM";
  return "HIGH";
}

// ── Result-level confidence ─────────────────────────────────

/**
 * Computes confidence for a single scan result.
 *
 * Factors:
 * - responseQuality (0.30): response length proxy
 * - scoreCoverage (0.30): are visibility and sentiment scores present?
 * - citationCoverage (0.25): has citations?
 * - mentionClarity (0.15): was entity mentioned?
 */
export function computeResultConfidence(
  input: ResultConfidenceInput,
): ConfidenceScore {
  // Factor 1: Response quality (length proxy)
  const responseQuality = scoreResponseQuality(input.responseLength);

  // Factor 2: Score coverage (both scores present?)
  const scoreCoverage = scoreScoreCoverage(
    input.hasVisibilityScore,
    input.hasSentimentScore,
  );

  // Factor 3: Citation coverage
  const citationCoverage = scoreCitationPresence(input.citationCount);

  // Factor 4: Mention clarity
  const mentionClarity = input.mentioned ? 100 : 70;

  // Weighted sum
  const rawScore = Math.round(
    responseQuality * RESULT_WEIGHT_RESPONSE_QUALITY +
      scoreCoverage * RESULT_WEIGHT_SCORE_COVERAGE +
      citationCoverage * RESULT_WEIGHT_CITATION_COVERAGE +
      mentionClarity * RESULT_WEIGHT_MENTION_CLARITY,
  );

  const score = clamp(rawScore, 0, 100);

  const factors: ConfidenceFactors = {
    sampleSize: 100, // single result: sample size is not applicable
    signalConsistency: 100, // single result: no cross-result variance
    citationCoverage,
    responseQuality,
  };

  return {
    score,
    tier: confidenceTier(score),
    factors,
    penalties: [], // result-level confidence has no penalties
  };
}

// ── Finding-level confidence ────────────────────────────────

/**
 * Computes confidence for an aggregated report-level finding.
 *
 * This is the key function. It scores how confident we are in a claim
 * like "47% mention rate" or "Apex leads by 16pp".
 *
 * After computing the raw weighted score, anti-overclaim penalties are applied.
 */
export function computeFindingConfidence(
  input: FindingConfidenceInput,
): ConfidenceScore {
  const { results, scanRunCount, scanCompleteness } = input;
  const n = results.length;

  // Factor 1: Sample size
  const sampleSize = scoreSampleSize(n);

  // Factor 2: Signal consistency (inverted binomial variance on mentions)
  const signalConsistency = scoreSignalConsistency(results);

  // Factor 3: Citation coverage (fraction of results with at least one citation)
  const citationCoverage = scoreFindingCitationCoverage(results);

  // Factor 4: Response quality (average response length)
  const responseQuality = scoreFindingResponseQuality(results);

  // Weighted sum
  const rawWeighted = Math.round(
    sampleSize * FINDING_WEIGHT_SAMPLE_SIZE +
      signalConsistency * FINDING_WEIGHT_SIGNAL_CONSISTENCY +
      citationCoverage * FINDING_WEIGHT_CITATION_COVERAGE +
      responseQuality * FINDING_WEIGHT_RESPONSE_QUALITY,
  );

  const rawScore = clamp(rawWeighted, 0, 100);

  // Compute mention rate for penalty context
  const mentionedCount = results.filter((r) => r.mentioned).length;
  const mentionRate = n > 0 ? mentionedCount / n : undefined;

  // Apply anti-overclaim penalties
  const { score, penalties } = applyPenalties(rawScore, {
    resultCount: n,
    scanRunCount,
    scanCompleteness,
    mentionRate,
  });

  const factors: ConfidenceFactors = {
    sampleSize,
    signalConsistency,
    citationCoverage,
    responseQuality,
  };

  return {
    score,
    tier: confidenceTier(score),
    factors,
    penalties,
  };
}

// ── Factor scoring helpers (all return 0-100) ───────────────

function scoreResponseQuality(length: number): number {
  // A single AI response is inherently limited regardless of length.
  // Long responses are better than short, but ceiling is capped because
  // one response cannot establish a pattern.
  if (length < 50) return 20;
  if (length < 200) return 40;
  if (length < 500) return 55;
  if (length < 1000) return 65;
  return 75; // cap: one response is still one data point
}

function scoreScoreCoverage(
  hasVisibility: boolean,
  hasSentiment: boolean,
): number {
  // Both scores present is the expected case, not exceptional.
  if (hasVisibility && hasSentiment) return 70;
  if (hasVisibility || hasSentiment) return 45;
  return 15;
}

function scoreCitationPresence(citationCount: number): number {
  // Citations improve traceability but their presence alone
  // doesn't validate the finding.
  if (citationCount >= 3) return 80;
  if (citationCount > 0) return 60;
  return 30; // no citations = lower confidence, not just slightly lower
}

function scoreSampleSize(n: number): number {
  if (n < 5) return 20;
  if (n < 10) return 50;
  if (n < 20) return 70;
  return 100;
}

function scoreSignalConsistency(
  results: FindingConfidenceInput["results"],
): number {
  const n = results.length;
  if (n === 0) return 0;

  const mentionedCount = results.filter((r) => r.mentioned).length;
  const rate = mentionedCount / n;

  // Inverted binomial variance:
  // variance = rate * (1 - rate), max at 0.5
  // consistency = 1 - variance / 0.25, clamped to [0, 100]
  const variance = rate * (1 - rate);
  const consistency = Math.round((1 - variance / 0.25) * 100);

  return clamp(consistency, 0, 100);
}

function scoreFindingCitationCoverage(
  results: FindingConfidenceInput["results"],
): number {
  const n = results.length;
  if (n === 0) return 0;

  const withCitations = results.filter((r) => r.citationCount > 0).length;
  return Math.round((withCitations / n) * 100);
}

function scoreFindingResponseQuality(
  results: FindingConfidenceInput["results"],
): number {
  const n = results.length;
  if (n === 0) return 0;

  const avgLength =
    results.reduce((sum, r) => sum + r.responseLength, 0) / n;

  if (avgLength < 100) return 40;
  if (avgLength < 300) return 70;
  return 100;
}

// ── Utility ─────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
