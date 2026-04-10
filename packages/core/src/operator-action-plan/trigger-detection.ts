// ── Operator Action Plan — Trigger Detection ─────────────────
//
// Pure inspection of Report.metadata. Computes TriggerFlags once;
// all builders (upsell, questions, pushback, etc.) consume the same
// flags object so there is one source of truth for "which conditions
// fired on this report."

import type { ReportMetadata, TriggerFlags } from "./types";
import { TRIGGER_THRESHOLDS } from "./config";

/**
 * Analyze report metadata and return all trigger flags.
 *
 * Every flag is deterministic — same input always produces same output.
 * No side effects, no LLM calls.
 */
export function detectTriggerFlags(meta: ReportMetadata): TriggerFlags {
  const stages = meta.journeyAnalysis?.stages ?? [];
  const competitors = meta.competitors ?? [];
  const remediationPlan = meta.remediationPlan;
  const multiRun = meta.multiRunAnalysis;
  const readinessWarnings = meta.readinessWarnings ?? [];
  const overallSourcedRate = meta.overallSourcedRate ?? 0;

  // ── Gap domain helpers ────────────────────────────────────

  // Collect all gap domains across all journey stages
  const allGapDomains = stages.flatMap((s) => s.gapDomains ?? []);
  const gapDomainSet = new Set(
    allGapDomains.map((d) => d.toLowerCase().replace(/^www\./, "")),
  );

  // ── Platform-specific gap flags ───────────────────────────

  const hasGlassdoorGap = gapDomainSet.has("glassdoor.com");
  const hasLinkedInGap = gapDomainSet.has("linkedin.com");
  const hasLevelsFyiGap = gapDomainSet.has("levels.fyi");

  // Content gap: any employer-relevant platform is absent from citations
  // but present in competitor citations (reflected in gap domains)
  const hasContentGap = allGapDomains.length > 0;

  // ── Stage-specific gap flags ──────────────────────────────

  const discoveryStage = stages.find((s) => s.stage === "DISCOVERY");
  const evaluationStage = stages.find((s) => s.stage === "EVALUATION");
  const commitmentStage = stages.find((s) => s.stage === "COMMITMENT");

  const hasCriticalDiscoveryGap =
    discoveryStage !== undefined &&
    discoveryStage.mentionRate <= TRIGGER_THRESHOLDS.CRITICAL_STAGE_RATE;

  const hasCriticalEvaluationGap =
    evaluationStage !== undefined &&
    evaluationStage.mentionRate <= TRIGGER_THRESHOLDS.CRITICAL_STAGE_RATE;

  const hasCriticalCommitmentGap =
    commitmentStage !== undefined &&
    (commitmentStage.positioning === "INVISIBLE" ||
      commitmentStage.sourcedRate === 0);

  // Multi-stage collapse: 3+ stages where positioning is PERIPHERAL or INVISIBLE
  const weakStageCount = stages.filter(
    (s) =>
      s.positioning === "PERIPHERAL" ||
      s.positioning === "INVISIBLE" ||
      s.positioning === "CAUTIONARY",
  ).length;
  const hasMultiStageCollapse = weakStageCount >= 3;

  // ── Competitor contrast flag ──────────────────────────────

  // Strong contrast: any stage where the gap vs top competitor exceeds threshold
  const hasStrongCompetitorContrast = stages.some(
    (s) =>
      s.gapVsTopCompetitor >= TRIGGER_THRESHOLDS.STRONG_CONTRAST_GAP ||
      (s.topCompetitor !== null &&
        s.topCompetitor.mentionRate - s.mentionRate >=
          TRIGGER_THRESHOLDS.STRONG_CONTRAST_GAP),
  );

  // ── Citation / sourced rate flags ─────────────────────────

  // Zero owned citations: overall sourced rate is effectively zero
  const hasZeroOwnedCitations =
    overallSourcedRate < TRIGGER_THRESHOLDS.ZERO_OWNED_CITATIONS_RATE;

  // Low sourced rate: below 50% — AI is recalling from memory more than sources
  const hasLowSourcedRate =
    overallSourcedRate < TRIGGER_THRESHOLDS.LOW_SOURCED_RATE;

  // ── Sample size flag ──────────────────────────────────────

  const totalQueries = multiRun?.totalQueries ?? stages.length;
  const hasLowSampleSize =
    totalQueries < TRIGGER_THRESHOLDS.LOW_SAMPLE_SIZE ||
    readinessWarnings.some(
      (w) =>
        w.severity === "critical" &&
        (w.title.toLowerCase().includes("discovery data") ||
          w.title.toLowerCase().includes("evaluation data") ||
          w.title.toLowerCase().includes("thin")),
    );

  // ── Stability flags ───────────────────────────────────────

  // Stability issues: volatile presence rate > 30%
  const volatileCount = multiRun?.stabilityDistribution.VOLATILE_PRESENCE ?? 0;
  const totalForStability = multiRun?.totalQueries ?? 1;
  const hasStabilityIssues =
    totalForStability > 0 &&
    volatileCount / totalForStability > TRIGGER_THRESHOLDS.HIGH_VOLATILITY_RATE;

  // ── First assessment flag ─────────────────────────────────

  // First assessment: only one scan run, and no baseline comparison data
  // We detect this from effectiveScanRunCount and scan run count
  const scanRunCount = meta.scanRunIds?.length ?? 1;
  const isFirstAssessment =
    scanRunCount <= 1 ||
    (multiRun?.effectiveScanRunCount ?? 1) <= 1;

  // ── Sentiment flag ────────────────────────────────────────

  const avgSentiments = stages
    .map((s) => s.avgSentiment)
    .filter((v) => typeof v === "number");
  const overallAvgSentiment =
    avgSentiments.length > 0
      ? avgSentiments.reduce((a, b) => a + b, 0) / avgSentiments.length
      : 0;
  const hasNegativeSentiment =
    overallAvgSentiment < TRIGGER_THRESHOLDS.NEGATIVE_SENTIMENT;

  return {
    hasGlassdoorGap,
    hasLinkedInGap,
    hasLevelsFyiGap,
    hasContentGap,
    hasCriticalDiscoveryGap,
    hasCriticalEvaluationGap,
    hasCriticalCommitmentGap,
    hasMultiStageCollapse,
    hasStrongCompetitorContrast,
    hasZeroOwnedCitations,
    hasLowSampleSize,
    hasStabilityIssues,
    isFirstAssessment,
    hasNegativeSentiment,
    hasLowSourcedRate,
  };
}
