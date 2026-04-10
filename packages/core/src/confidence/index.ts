// ── Types ──
export type {
  ConfidenceTier,
  ConfidenceScore,
  ConfidenceFactors,
  AppliedPenalty,
  ResultConfidenceInput,
  FindingConfidenceInput,
} from "./types";

// ── Scoring ──
export {
  confidenceTier,
  computeResultConfidence,
  computeFindingConfidence,
  RESULT_WEIGHT_RESPONSE_QUALITY,
  RESULT_WEIGHT_SCORE_COVERAGE,
  RESULT_WEIGHT_CITATION_COVERAGE,
  RESULT_WEIGHT_MENTION_CLARITY,
  FINDING_WEIGHT_SAMPLE_SIZE,
  FINDING_WEIGHT_SIGNAL_CONSISTENCY,
  FINDING_WEIGHT_CITATION_COVERAGE,
  FINDING_WEIGHT_RESPONSE_QUALITY,
  TIER_LOW_CEILING,
  TIER_MEDIUM_CEILING,
} from "./scoring";

// ── Penalties ──
export {
  applyPenalties,
  INSUFFICIENT_SAMPLE_THRESHOLD,
  INSUFFICIENT_SAMPLE_DEDUCTION,
  SINGLE_SCAN_DEDUCTION,
  INCOMPLETE_SCAN_THRESHOLD,
  INCOMPLETE_SCAN_DEDUCTION,
  NEAR_FIFTY_LOW,
  NEAR_FIFTY_HIGH,
  NEAR_FIFTY_SAMPLE_THRESHOLD,
  NEAR_FIFTY_DEDUCTION,
  SCORE_FLOOR,
} from "./penalties";
export type { PenaltyContext } from "./penalties";
