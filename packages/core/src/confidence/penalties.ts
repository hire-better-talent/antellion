import type { AppliedPenalty } from "./types";

// ── Penalty thresholds (named constants for tuning) ─────────

export const INSUFFICIENT_SAMPLE_THRESHOLD = 5;
export const INSUFFICIENT_SAMPLE_DEDUCTION = 20;

export const SINGLE_SCAN_DEDUCTION = 10;

export const INCOMPLETE_SCAN_THRESHOLD = 0.7;
export const INCOMPLETE_SCAN_DEDUCTION = 15;

export const NEAR_FIFTY_LOW = 0.4;
export const NEAR_FIFTY_HIGH = 0.6;
export const NEAR_FIFTY_SAMPLE_THRESHOLD = 10;
export const NEAR_FIFTY_DEDUCTION = 10;

/** Confidence score never drops below this floor. */
export const SCORE_FLOOR = 5;

// ── Penalty context ─────────────────────────────────────────

export interface PenaltyContext {
  resultCount: number;
  scanRunCount: number;
  scanCompleteness: number;
  mentionRate?: number;
}

// ── Penalty application ─────────────────────────────────────

/**
 * Applies anti-overclaim penalty rules to a raw confidence score.
 *
 * Rules (cumulative):
 * 1. insufficient_sample: < 5 results => -20 points
 * 2. single_scan: scanRunCount < 2 => -10 points
 * 3. incomplete_scan: scanCompleteness < 0.7 => -15 points
 * 4. near_fifty: mention rate 0.4-0.6 AND < 10 results => -10 points
 *
 * Floor: score never drops below 5.
 */
export function applyPenalties(
  rawScore: number,
  context: PenaltyContext,
): { score: number; penalties: AppliedPenalty[] } {
  const penalties: AppliedPenalty[] = [];
  let score = rawScore;

  // Rule 1: Insufficient sample
  if (context.resultCount < INSUFFICIENT_SAMPLE_THRESHOLD) {
    penalties.push({
      rule: "insufficient_sample",
      description: `Fewer than ${INSUFFICIENT_SAMPLE_THRESHOLD} results (${context.resultCount})`,
      deduction: INSUFFICIENT_SAMPLE_DEDUCTION,
    });
    score -= INSUFFICIENT_SAMPLE_DEDUCTION;
  }

  // Rule 2: Single scan run
  if (context.scanRunCount < 2) {
    penalties.push({
      rule: "single_scan",
      description: `Only ${context.scanRunCount} scan run(s); findings are not cross-validated`,
      deduction: SINGLE_SCAN_DEDUCTION,
    });
    score -= SINGLE_SCAN_DEDUCTION;
  }

  // Rule 3: Incomplete scan
  if (context.scanCompleteness < INCOMPLETE_SCAN_THRESHOLD) {
    penalties.push({
      rule: "incomplete_scan",
      description: `Scan completeness ${Math.round(context.scanCompleteness * 100)}% is below ${Math.round(INCOMPLETE_SCAN_THRESHOLD * 100)}%`,
      deduction: INCOMPLETE_SCAN_DEDUCTION,
    });
    score -= INCOMPLETE_SCAN_DEDUCTION;
  }

  // Rule 4: Near 50/50 mention rate on small sample
  if (
    context.mentionRate !== undefined &&
    context.mentionRate >= NEAR_FIFTY_LOW &&
    context.mentionRate <= NEAR_FIFTY_HIGH &&
    context.resultCount < NEAR_FIFTY_SAMPLE_THRESHOLD
  ) {
    penalties.push({
      rule: "near_fifty",
      description: `Mention rate ${Math.round(context.mentionRate * 100)}% is near 50/50 with fewer than ${NEAR_FIFTY_SAMPLE_THRESHOLD} results`,
      deduction: NEAR_FIFTY_DEDUCTION,
    });
    score -= NEAR_FIFTY_DEDUCTION;
  }

  // Floor: never below SCORE_FLOOR
  score = Math.max(SCORE_FLOOR, score);

  return { score, penalties };
}
