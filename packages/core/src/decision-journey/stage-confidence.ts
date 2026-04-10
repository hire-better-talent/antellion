import { computeFindingConfidence } from "../confidence/scoring";
import type { ConfidenceScore } from "../confidence/types";

// ─── Stage confidence ────────────────────────────────────────

/**
 * Computes finding-level confidence for a single decision stage.
 *
 * Delegates to the shared `computeFindingConfidence()` function, passing the
 * stage's subset of results while using the TOTAL query count as the
 * `scanCompleteness` denominator. This correctly penalises stages that cover
 * only a fraction of the full query set (e.g. 6 of 36 queries → completeness
 * of 0.17, triggering the incomplete_scan penalty).
 *
 * @param stageResults    Results belonging to this stage only.
 * @param scanRunCount    Number of scan runs that produced these results.
 * @param totalQueryCount Total queries across ALL stages (not just this stage).
 */
export function computeStageConfidence(
  stageResults: Array<{
    mentioned: boolean;
    visibilityScore: number | null;
    sentimentScore: number | null;
    citationCount: number;
    responseLength: number;
  }>,
  scanRunCount: number,
  totalQueryCount: number,
): ConfidenceScore {
  return computeFindingConfidence({
    results: stageResults,
    scanRunCount,
    scanCompleteness: stageResults.length / Math.max(totalQueryCount, 1),
  });
}
