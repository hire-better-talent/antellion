/**
 * cross-segment-summary.ts
 *
 * Computes a comparative summary across multiple per-segment journey analyses.
 * Used when a report includes scans from 2+ distinct focusArea groups.
 *
 * The summary is deterministic: all fields are computed from input data.
 * The summaryNarrative is a template-driven sentence — no LLM calls.
 */

// ─── Input / output types ────────────────────────────────────

export interface SegmentSummaryInput {
  /** The focusArea label, e.g. "Software Engineer" */
  name: string;
  /** Overall earned visibility rate for this segment (0–1) */
  earnedVisibilityRate: number;
  /** Tier: "strong" | "moderate" | "weak" | "invisible" */
  earnedVisibilityTier: string;
  /** All gap domains across all stages for this segment */
  gapDomains: string[];
  /** Overall positioning tier (e.g. "CONTENDER") */
  overallPositioning: string;
}

export interface CrossSegmentSummary {
  segmentCount: number;
  strongestSegment: {
    name: string;
    earnedVisibilityRate: number;
    earnedVisibilityTier: string;
  };
  weakestSegment: {
    name: string;
    earnedVisibilityRate: number;
    earnedVisibilityTier: string;
  };
  /** Citation-gap domains that appear across ALL segments */
  commonGaps: string[];
  /** Citation-gap domains unique to each individual segment */
  segmentSpecificGaps: Array<{
    segment: string;
    gaps: string[];
  }>;
  /** One-sentence executive narrative summarizing the cross-segment picture */
  summaryNarrative: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function pct(rate: number): string {
  return `${Math.round(Math.max(0, Math.min(1, rate)) * 100)}%`;
}

/**
 * Finds domains that appear in the gap list for every segment.
 * A domain must be present in ALL segments' gap lists to be considered "common".
 */
function findCommonGaps(segments: SegmentSummaryInput[]): string[] {
  if (segments.length === 0) return [];

  // Start with the first segment's gaps, then intersect with every subsequent segment
  const [first, ...rest] = segments;
  let common = new Set(first.gapDomains);

  for (const seg of rest) {
    const segSet = new Set(seg.gapDomains);
    common = new Set([...common].filter((d) => segSet.has(d)));
  }

  return [...common].sort();
}

/**
 * Generates a deterministic one-sentence narrative for the executive summary.
 * Handles: 2+ segments, all similar, single dominant gap, etc.
 */
function buildSummaryNarrative(
  clientName: string,
  strongest: SegmentSummaryInput,
  weakest: SegmentSummaryInput,
  segmentCount: number,
): string {
  const strongRate = pct(strongest.earnedVisibilityRate);
  const weakRate = pct(weakest.earnedVisibilityRate);

  // All segments perform similarly — rates within 10 points of each other
  const rateDelta = strongest.earnedVisibilityRate - weakest.earnedVisibilityRate;
  if (rateDelta < 0.1) {
    const avgRate = pct(
      (strongest.earnedVisibilityRate + weakest.earnedVisibilityRate) / 2,
    );
    return (
      `${clientName} has consistent AI visibility across all ${segmentCount} assessed talent segments at approximately ${avgRate} earned discovery, ` +
      `with limited variation between hiring markets.`
    );
  }

  // Normal case: meaningful spread between strongest and weakest
  if (weakest.earnedVisibilityTier === "invisible") {
    return (
      `${clientName} has strong AI visibility for ${strongest.name} hiring (${strongRate} earned discovery) ` +
      `but is nearly invisible for ${weakest.name} talent (${weakRate} earned discovery), ` +
      `representing a critical gap in AI-driven candidate acquisition for that market.`
    );
  }

  return (
    `${clientName} has strong AI visibility for ${strongest.name} hiring (${strongRate} earned discovery) ` +
    `but significantly weaker visibility for ${weakest.name} talent (${weakRate} earned discovery) — ` +
    `a ${Math.round(rateDelta * 100)}-point gap that limits AI-driven pipeline for that market.`
  );
}

// ─── Main function ────────────────────────────────────────────

/**
 * Computes a cross-segment comparative summary from per-segment journey analyses.
 *
 * Caller is responsible for ensuring segments.length >= 2 before calling.
 */
export function computeCrossSegmentSummary(
  clientName: string,
  segments: SegmentSummaryInput[],
): CrossSegmentSummary {
  if (segments.length === 0) {
    throw new Error("computeCrossSegmentSummary requires at least one segment");
  }

  // Find strongest and weakest by earnedVisibilityRate
  let strongest = segments[0];
  let weakest = segments[0];

  for (const seg of segments) {
    if (seg.earnedVisibilityRate > strongest.earnedVisibilityRate) {
      strongest = seg;
    }
    if (seg.earnedVisibilityRate < weakest.earnedVisibilityRate) {
      weakest = seg;
    }
  }

  const commonGaps = findCommonGaps(segments);
  const commonGapSet = new Set(commonGaps);

  const segmentSpecificGaps = segments.map((seg) => ({
    segment: seg.name,
    gaps: seg.gapDomains.filter((d) => !commonGapSet.has(d)).sort(),
  }));

  const summaryNarrative = buildSummaryNarrative(
    clientName,
    strongest,
    weakest,
    segments.length,
  );

  return {
    segmentCount: segments.length,
    strongestSegment: {
      name: strongest.name,
      earnedVisibilityRate: strongest.earnedVisibilityRate,
      earnedVisibilityTier: strongest.earnedVisibilityTier,
    },
    weakestSegment: {
      name: weakest.name,
      earnedVisibilityRate: weakest.earnedVisibilityRate,
      earnedVisibilityTier: weakest.earnedVisibilityTier,
    },
    commonGaps,
    segmentSpecificGaps,
    summaryNarrative,
  };
}
