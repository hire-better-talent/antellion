// ── Operator Action Plan — Next Engagement Plan Builder ──────
//
// Derives the primary next engagement recommendation from the fired
// upsell opportunities, using DEFAULT_UPSELL_PRIORITY to pick the lead.

import type {
  ReportMetadata,
  TriggerFlags,
  UpsellOpportunity,
  NextEngagementPlan,
} from "../types";
import {
  DEFAULT_UPSELL_PRIORITY,
  NEXT_ENGAGEMENT_TEMPLATES,
} from "../rules/next-engagement";

/**
 * Build the next engagement plan by walking DEFAULT_UPSELL_PRIORITY
 * and selecting the first fired upsell as the primary recommendation.
 *
 * When no upsell fires, falls back to a generic follow-up plan.
 */
export function buildNextEngagementPlan(
  _meta: ReportMetadata,
  _flags: TriggerFlags,
  upsell: UpsellOpportunity[],
): NextEngagementPlan {
  // Walk priority list, find first fired upsell type
  const firedTypes = new Set(upsell.map((u) => u.engagementType));

  const primaryType =
    DEFAULT_UPSELL_PRIORITY.find((type) => firedTypes.has(type)) ?? null;

  const primaryUpsell = primaryType
    ? upsell.find((u) => u.engagementType === primaryType) ?? null
    : null;

  const template = primaryType
    ? NEXT_ENGAGEMENT_TEMPLATES.find((t) => t.engagementType === primaryType) ?? null
    : null;

  if (!template || !primaryUpsell) {
    // No upsell fired — generic follow-up
    return {
      primaryEngagementType: null,
      priceRange: "",
      recommendedTimeline:
        "Follow up within 2 weeks while the report findings are fresh.",
      materialsToPrepare: [
        "Re-read the report and note 2-3 questions the client may ask about methodology.",
        "Review the red flags section and prepare verbal qualifications for any critical items.",
      ],
      topicsToDeepDive: [
        "Which finding in the report the client is most likely to act on immediately.",
        "Whether the client has any existing employer brand measurement in place.",
      ],
    };
  }

  return {
    primaryEngagementType: primaryType,
    priceRange: primaryUpsell.priceRange,
    recommendedTimeline: template.recommendedTimeline,
    materialsToPrepare: template.materialsToPrepare,
    topicsToDeepDive: template.topicsToDeepDive,
  };
}
