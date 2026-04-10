// ── Operator Action Plan — Validation Item Builder ───────────
//
// Surfaces findings that are high-impact but low-confidence.
// These are things the operator should spot-check manually before
// the report is delivered to the client.
//
// Inclusion rules (all deterministic):
//   - Any section with confidence.perSection[key].tier === "LOW"
//   - Any journey stage with sourcedRate < 0.3
//   - Any competitor callout where the gap is large (>20pt)
//   - Any stage where there are fewer than 5 results (thin sample)
//   - Any readiness warning of severity "critical" or "warning"
//   - Any finding where multiRunAnalysis shows high volatile presence

import type { ReportMetadata, TriggerFlags, ValidationItem } from "../types";

/** Minimum sourced rate below which a finding warrants manual verification. */
const LOW_SOURCED_RATE_THRESHOLD = 0.3;

/** Competitor gap above this threshold warrants citation verification. */
const LARGE_COMPETITOR_GAP_THRESHOLD = 0.2;

/**
 * Build the list of findings the operator should manually verify before
 * sending the report. Ordered: readiness warnings first (highest urgency),
 * then low-confidence sections, then thin samples, then sourcing issues.
 */
export function buildValidationItems(
  meta: ReportMetadata,
  _flags: TriggerFlags,
): ValidationItem[] {
  const items: ValidationItem[] = [];
  const stages = meta.journeyAnalysis?.stages ?? [];
  const readinessWarnings = meta.readinessWarnings ?? [];
  const multiRun = meta.multiRunAnalysis;
  const perSectionConfidence = meta.confidence?.perSection ?? {};

  // ── 1. Readiness warnings (critical and warning severity) ─

  for (const warning of readinessWarnings) {
    if (warning.severity !== "critical" && warning.severity !== "warning") {
      continue;
    }
    items.push({
      category: "sample_size",
      finding: warning.title,
      concern: warning.description,
      checkSteps: [
        "Review the scan configuration and confirm query counts match the assessment scope.",
        "If sample is thin, consider qualifying the finding verbally rather than as a hard number.",
        "For critical warnings, consider omitting the affected section or heavily caveating it.",
      ],
    });
  }

  // ── 2. Low-confidence sections ───────────────────────────

  for (const [sectionKey, confidence] of Object.entries(perSectionConfidence)) {
    if (confidence.tier !== "LOW") continue;
    items.push({
      category: "mention_claim",
      finding: `${sectionKey} section confidence is LOW (score: ${Math.round(confidence.score)})`,
      concern:
        "Low confidence means the finding is based on thin, inconsistent, or poorly-sourced data. Presenting it as a hard finding may mislead the client.",
      checkSteps: [
        `Re-read the ${sectionKey} section of the report and identify any quantified claims.`,
        "Verify those claims against the underlying scan results manually.",
        "If the claim cannot be verified, downplay the specific number and lead with the qualitative direction instead.",
      ],
      affectedSection: sectionKey,
    } as ValidationItem & { affectedSection: string });
  }

  // ── 3. Journey stages with low sourced rate ───────────────

  for (const stage of stages) {
    if (stage.sourcedRate >= LOW_SOURCED_RATE_THRESHOLD) continue;
    const pct = Math.round(stage.sourcedRate * 100);
    items.push({
      category: "mention_claim",
      finding: `${stage.stage} stage sourced rate = ${pct}% (AI recalling from memory, not indexed sources)`,
      concern:
        `Only ${pct}% of ${stage.stage} results had citation sources. AI is generating responses from parametric memory, which is harder to verify and may not reflect current indexed content.`,
      checkSteps: [
        `Re-run 2-3 high-signal ${stage.stage} queries manually in ChatGPT web and Claude web.`,
        "Confirm whether the client appears or is absent, and whether the response cites specific sources.",
        "If the manual re-run contradicts the report finding, note the discrepancy before delivery.",
      ],
      stage: stage.stage,
    });
  }

  // ── 4. Competitor citation claims (large gap, verify platforms) ──

  for (const stage of stages) {
    if (!stage.topCompetitor) continue;
    const gap = stage.topCompetitor.mentionRate - stage.mentionRate;
    if (gap <= LARGE_COMPETITOR_GAP_THRESHOLD) continue;
    const gapPct = Math.round(gap * 100);
    const competitor = stage.topCompetitor.name;
    items.push({
      category: "competitor_claim",
      finding: `Report asserts ${competitor} leads ${stage.stage} by ${gapPct} points`,
      concern:
        "Large competitor gaps are compelling talking points but can also be the most challenged by clients who are familiar with the competitor. The claim should be spot-verified before leading with it.",
      checkSteps: [
        `Check ${competitor}'s presence on the gap platforms listed in the ${stage.stage} section of the report.`,
        `Confirm ${competitor} does actually appear in AI responses for representative ${stage.stage} queries.`,
        "If the competitor's advantage is platform-specific (e.g., Glassdoor), verify the specific page exists and has review volume.",
      ],
      stage: stage.stage,
    });
  }

  // ── 5. Stability — high volatile presence ─────────────────

  if (multiRun) {
    const volatileCount = multiRun.stabilityDistribution.VOLATILE_PRESENCE;
    const total = multiRun.totalQueries;
    if (total > 0 && volatileCount / total > 0.3) {
      const volatilePct = Math.round((volatileCount / total) * 100);
      items.push({
        category: "stability",
        finding: `${volatilePct}% of queries show VOLATILE_PRESENCE (${volatileCount} of ${total} queries)`,
        concern:
          "Volatile findings flipped between scan runs. A third run could show the opposite result. Leading with a volatile finding as a hard number risks being contradicted by a live re-run.",
        checkSteps: [
          "Identify which stage the volatile queries are concentrated in.",
          "For any finding you plan to lead with, verify it is classified as STABLE_PRESENCE, not VOLATILE_PRESENCE.",
          "If the key finding is volatile, qualify it verbally: 'We see this in roughly X out of Y runs' rather than as an absolute rate.",
        ],
      });
    }
  }

  return items;
}
