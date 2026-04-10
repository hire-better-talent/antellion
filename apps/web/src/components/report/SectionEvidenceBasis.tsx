/**
 * SectionEvidenceBasis
 *
 * Renders an inline, always-visible evidence basis line beneath a section
 * heading. Appears in both screen and print modes. Not expandable — this is
 * the companion to EvidencePanel (deep dive on click), not a replacement.
 *
 * Example output:
 *   Based on 47 queries · 12 sourced (26%) · Confidence: MEDIUM 62%
 *
 * Renders nothing when queryCount is 0 or undefined, so legacy reports
 * (which lack stage-level query counts) are handled gracefully.
 */

import { EvidenceBadge } from "../EvidenceBadge";

export interface SectionEvidenceBasisProps {
  /** Total number of queries evaluated for this section. */
  queryCount: number;
  /** Number of those queries backed by at least one citation. */
  sourcedCount: number;
  /** Fraction of queries with citations (0-1). */
  sourcedRate: number;
  /**
   * Confidence score (0-1). Rendered via EvidenceBadge (HIGH / MEDIUM / LOW).
   * When absent, the confidence badge is omitted.
   */
  confidenceScore?: number;
  /** Applies print-safe styles when true. */
  printMode?: boolean;
}

/**
 * Derives a section-level confidence score from query count and sourced rate.
 *
 * Formula:
 *   score = clamp(queryCount/50, 0, 1) * 0.6 + sourcedRate * 0.4
 *
 * This gives:
 *   - 50 queries + 100% sourced → 1.0 (HIGH)
 *   - 25 queries + 50% sourced  → 0.5 (MEDIUM)
 *   -  5 queries + 10% sourced  → 0.1 (LOW)
 *
 * Exposed as a utility so callers can pass a pre-computed score when
 * a more authoritative value (e.g. from the backend) is available.
 */
export function deriveSectionConfidence(
  queryCount: number,
  sourcedRate: number,
): number {
  const queryFraction = Math.min(1, queryCount / 50);
  return Math.min(1, queryFraction * 0.6 + sourcedRate * 0.4);
}

export function SectionEvidenceBasis({
  queryCount,
  sourcedCount,
  sourcedRate,
  confidenceScore,
  printMode = false,
}: SectionEvidenceBasisProps) {
  // Render nothing when there is no data — prevents an empty line on legacy reports.
  if (!queryCount || queryCount === 0) return null;

  const sourcedPct = Math.round(sourcedRate * 100);

  // Use provided score, or derive one from the available counts.
  const score =
    confidenceScore !== undefined
      ? confidenceScore
      : deriveSectionConfidence(queryCount, sourcedRate);

  const containerClass = printMode
    ? "mt-1.5 mb-3 flex flex-wrap items-center gap-x-1 text-xs text-gray-500"
    : "mt-1.5 mb-3 flex flex-wrap items-center gap-x-1 text-xs text-gray-400";

  return (
    <p className={containerClass}>
      <span>
        Based on{" "}
        <span className={printMode ? "font-semibold text-gray-700" : "font-medium text-gray-500"}>
          {queryCount} {queryCount === 1 ? "query" : "queries"}
        </span>
      </span>
      <span className="mx-0.5">·</span>
      <span>
        <span className={printMode ? "font-semibold text-gray-700" : "font-medium text-gray-500"}>
          {sourcedCount}
        </span>{" "}
        sourced ({sourcedPct}%)
      </span>
      <span className="mx-0.5">·</span>
      <span className="flex items-center gap-1">
        <span>Confidence:</span>
        <EvidenceBadge confidenceScore={score} size="sm" />
      </span>
    </p>
  );
}
