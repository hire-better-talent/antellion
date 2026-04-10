// ── Operator Action Plan — Talking Points Builder ────────────
//
// Picks the top 5 most compelling findings from journeyAnalysis using
// a deterministic compelling score formula.

import type { ReportMetadata, TriggerFlags, TalkingPoint } from "../types";
import { COMPELLING_SCORE_SAMPLE_CAP } from "../config";

export const MAX_TALKING_POINTS = 5;

/**
 * Compute the compelling score for a stage finding.
 *
 * Formula (all factors normalized to [0, 1]):
 *
 *   compellingScore = confidence * normalizedSample * gapMagnitude * sourcedRate
 *
 * - confidence:       overall confidence score / 100 (or 0.5 default when unknown)
 * - normalizedSample: log-scaled sample size, caps at COMPELLING_SCORE_SAMPLE_CAP
 * - gapMagnitude:     absolute rate delta vs. top competitor, bounded [0, 1]
 * - sourcedRate:      fraction of results with citations [0, 1]
 *
 * Why log-scale the sample: sample sizes beyond 50 do not meaningfully change
 * credibility for a VP TA buyer. At 50 queries, a finding is already defensible
 * in an executive meeting. Beyond that, additional data is diminishing returns
 * and should not dominate the ranking — otherwise a high-sample weak finding
 * would out-rank a lower-sample sharp finding.
 */
export function computeCompellingScore(
  confidence: number,     // 0..1
  sampleSize: number,     // raw query count
  gapMagnitude: number,   // 0..1 (|clientRate - topCompetitorRate|)
  sourcedRate: number,    // 0..1
): number {
  const normalizedSample = Math.min(
    Math.log(Math.max(sampleSize, 1)) / Math.log(COMPELLING_SCORE_SAMPLE_CAP),
    1,
  );
  return confidence * normalizedSample * gapMagnitude * sourcedRate;
}

/**
 * Build the top MAX_TALKING_POINTS talking points, sorted by compelling score descending.
 *
 * Derives candidates from journeyAnalysis stages. Each stage that has a competitor
 * gap or significant finding becomes a candidate. Overall-level findings are also
 * considered if no per-stage candidates score well.
 */
export function buildTalkingPoints(
  meta: ReportMetadata,
  _flags: TriggerFlags,
): TalkingPoint[] {
  const stages = meta.journeyAnalysis?.stages ?? [];
  const overallConfidence = meta.confidence?.overall?.score ?? 50;
  const perSectionConfidence = meta.confidence?.perSection ?? {};
  const totalQueries = meta.multiRunAnalysis?.totalQueries ?? Math.max(stages.length * 5, 1);
  const overallSourcedRate = meta.overallSourcedRate ?? 0.5;
  const clientName = meta.clientName ?? "the client";

  const candidates: TalkingPoint[] = [];

  // ── Per-stage candidates ─────────────────────────────────

  for (const stage of stages) {
    // Use per-section confidence when available, fall back to overall
    const sectionConf = perSectionConfidence[stage.stage];
    const confidenceNorm = sectionConf
      ? sectionConf.score / 100
      : overallConfidence / 100;

    const sourcedRate = stage.sourcedRate ?? overallSourcedRate;

    // Gap magnitude: difference vs top competitor, or mention rate itself as a signal
    const topComp = stage.topCompetitor;
    const gapMagnitude =
      topComp !== null
        ? Math.min(Math.abs(topComp.mentionRate - stage.mentionRate), 1)
        : Math.min(1 - stage.mentionRate, 1); // no competitor = full absence is the gap

    // Use total queries as the sample proxy for the stage
    // (individual per-stage counts are not in metadata, so we use the total)
    const score = computeCompellingScore(
      confidenceNorm,
      totalQueries,
      gapMagnitude,
      sourcedRate,
    );

    if (score <= 0) continue;

    // Build the lead number string
    const clientPct = Math.round(stage.mentionRate * 100);
    const compPct = topComp ? Math.round(topComp.mentionRate * 100) : null;
    const gapPt = compPct !== null ? compPct - clientPct : null;

    const leadNumber =
      compPct !== null && gapPt !== null
        ? `${clientPct}% ${stage.stage} visibility vs. ${topComp!.name}'s ${compPct}% (${gapPt > 0 ? gapPt + "-point gap" : "competitive parity"})`
        : `${clientPct}% ${stage.stage} mention rate`;

    // Use the pre-computed narrative from journey-metadata-builder verbatim
    const headline = stage.narrative.split(". ")[0] + ".";
    const context = stage.competitorCallout ?? stage.narrative;

    candidates.push({
      leadNumber,
      headline,
      context,
      compellingScore: score,
    });
  }

  // ── Overall rate fallback ─────────────────────────────────
  // If there are no stage candidates (very sparse metadata), emit one overall point

  if (candidates.length === 0 && meta.clientOverallRate !== undefined) {
    const overallPct = Math.round(meta.clientOverallRate * 100);
    candidates.push({
      leadNumber: `${overallPct}% overall AI mention rate`,
      headline: `${clientName} appears in ${overallPct}% of AI queries across all assessed stages.`,
      context:
        "This is the overall baseline visibility rate across the full query set.",
      compellingScore: (overallConfidence / 100) * 0.5 * (1 - meta.clientOverallRate) * overallSourcedRate,
    });
  }

  // ── Sort and cap ──────────────────────────────────────────

  candidates.sort((a, b) => b.compellingScore - a.compellingScore);
  return candidates.slice(0, MAX_TALKING_POINTS);
}
