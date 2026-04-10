// ── Operator Action Plan — Upsell Rule Table ─────────────────
//
// Static rule table for Section D: Upsell Opportunities.
// Each rule is triggered by TriggerFlags and outputs an UpsellOpportunity.
// Price ranges are pulled from ENGAGEMENT_PRICES in config.ts —
// never hardcoded here.

import type { TriggerFlags, UpsellOpportunity } from "../types";
import { ENGAGEMENT_PRICES } from "../config";

interface UpsellRule {
  triggerId: string;
  condition: (flags: TriggerFlags) => boolean;
  engagementType: UpsellOpportunity["engagementType"];
  rationale: string;
  suggestedScope: string;
  priceRange: string;
}

export const UPSELL_RULES: UpsellRule[] = [
  {
    triggerId: "content_gap_authoring",
    condition: (f) => f.hasContentGap,
    engagementType: "content_authoring",
    rationale:
      "Multiple employer platform gaps identified. The report shows exactly which platforms are missing {clientName} content and driving AI to surface competitors instead.",
    suggestedScope:
      "Draft the first 2-3 content assets targeting the highest-priority gap platforms. Deliverables: Glassdoor response playbook, levels.fyi compensation page, builtin.com profile refresh (as applicable to the client's gap domains).",
    priceRange: ENGAGEMENT_PRICES.CONTENT_AUTHORING,
  },
  {
    triggerId: "volatile_presence_monitoring",
    condition: (f) => f.hasStabilityIssues,
    engagementType: "monitoring",
    rationale:
      "Volatile presence detected across a meaningful share of queries. Visibility is unstable — a quarterly re-scan will tell the client whether recommendations are moving the signal, and will catch regression before the next annual review.",
    suggestedScope:
      "Quarterly re-scan across the same query set, delivered as a delta report comparing to this baseline. Includes updated stability classification and recommendation progress scoring.",
    priceRange: ENGAGEMENT_PRICES.QUARTERLY_MONITORING,
  },
  {
    triggerId: "single_scan_full_assessment",
    condition: (f) => f.isFirstAssessment,
    engagementType: "full_assessment",
    rationale:
      "This report is based on a single scan run. A full assessment includes multiple scan runs, cross-run validation, and a remediation playbook with confidence scores that a single-scan report cannot produce.",
    suggestedScope:
      "Full assessment: 2+ scan runs, multi-run stability validation, prioritized remediation plan with platform-specific actions and expected timelines.",
    priceRange: ENGAGEMENT_PRICES.FULL_ASSESSMENT,
  },
  {
    triggerId: "multi_stage_advisory",
    condition: (f) => f.hasMultiStageCollapse,
    engagementType: "advisory",
    rationale:
      "The client has weak or absent positioning across 3+ funnel stages. This is not a content execution problem — it is a brand positioning problem that requires strategic diagnosis before execution.",
    suggestedScope:
      "3-month strategic advisory retainer: employer brand audit, competitive positioning strategy, platform prioritization framework, and content strategy roadmap.",
    priceRange: ENGAGEMENT_PRICES.STRATEGIC_ADVISORY_RETAINER,
  },
  {
    triggerId: "snapshot_upgrade",
    condition: (f) =>
      !f.isFirstAssessment && !f.hasContentGap && !f.hasStabilityIssues,
    engagementType: "snapshot_upgrade",
    rationale:
      "The client has addressed initial gaps but would benefit from expanded query coverage and deeper competitive analysis than the current snapshot provides.",
    suggestedScope:
      "Expanded assessment: broader query set, additional competitor coverage, and a full remediation playbook with priority scoring.",
    priceRange: ENGAGEMENT_PRICES.SNAPSHOT_TO_FULL_UPGRADE,
  },
];

/**
 * Apply all upsell rules to the given trigger flags.
 * Returns opportunities for every rule whose condition is satisfied.
 * Callers should sort by DEFAULT_UPSELL_PRIORITY before presenting.
 */
export function buildUpsellOpportunities(
  flags: TriggerFlags,
): UpsellOpportunity[] {
  return UPSELL_RULES.filter((rule) => rule.condition(flags)).map((rule) => ({
    engagementType: rule.engagementType,
    rationale: rule.rationale,
    suggestedScope: rule.suggestedScope,
    priceRange: rule.priceRange,
    triggerId: rule.triggerId,
  }));
}
