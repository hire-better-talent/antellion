// ── Operator Action Plan — Next Engagement Priority ──────────
//
// Named priority constant controlling which upsell the action plan leads with
// when multiple opportunities fire. The next-engagement builder walks this
// list in order and picks the first fired upsell as the primary recommendation.

import type { UpsellOpportunity } from "../types";

/**
 * Priority ordering for upsell opportunity selection in the Next Engagement section.
 *
 * Ordering rationale:
 *   1. content_authoring   — most immediately billable and actionable; the operator
 *                            can scope and start a content sprint inside one week.
 *   2. monitoring          — creates recurring revenue and a reason to re-engage
 *                            every quarter; second-best because it compounds.
 *   3. advisory            — strategic retainer; highest ceiling but hardest to
 *                            scope out of a single meeting, so a weaker lead.
 *   4. snapshot_upgrade    — lightest-touch follow-on; use when nothing else fires.
 *   5. full_assessment     — fallback for snapshot-originated reports where the
 *                            only clear next step is a more thorough scan.
 *
 * NOTE: This ordering is a HYPOTHESIS. Revisit after 3-5 real deliveries based on
 * which engagements Jordan actually closes most easily. If monitoring closes more
 * than content, flip the first two. If advisory never closes from a meeting, drop
 * it lower. The rule tables are one-line changes.
 */
export const DEFAULT_UPSELL_PRIORITY: Array<UpsellOpportunity["engagementType"]> = [
  "content_authoring",    // Most immediately billable and actionable
  "monitoring",           // Recurring revenue and re-engagement hook
  "advisory",             // Harder to scope, higher value once closed
  "snapshot_upgrade",     // Lightest-touch follow-on
  "full_assessment",      // Fallback for snapshot-originated reports
];

// ── Next engagement template library ─────────────────────────
//
// Each template maps to an engagement type and provides the
// structured output for Section F of the action plan.

export interface NextEngagementTemplate {
  engagementType: UpsellOpportunity["engagementType"];
  recommendedTimeline: string;
  materialsToPrepare: string[];
  topicsToDeepDive: string[];
}

export const NEXT_ENGAGEMENT_TEMPLATES: NextEngagementTemplate[] = [
  {
    engagementType: "content_authoring",
    recommendedTimeline:
      "Follow up within 1 week. Propose a 2-week scoping call + 6-week first sprint.",
    materialsToPrepare: [
      "Sample Glassdoor response draft for 2 recent company reviews",
      "Competitor platform presence comparison (screenshot the gaps)",
      "levels.fyi verification flow walkthrough",
      "One-page content sprint proposal with deliverable list",
    ],
    topicsToDeepDive: [
      "Which gap platforms have the highest citation frequency in this client's scan",
      "Competitor content depth on Glassdoor and builtin.com",
      "Client's existing employer brand content inventory",
    ],
  },
  {
    engagementType: "monitoring",
    recommendedTimeline:
      "Propose quarterly re-scan starting 90 days after first content assets are live.",
    materialsToPrepare: [
      "Mock quarterly delta report showing before/after comparison format",
      "Stability classification explainer (1 slide: what VOLATILE_PRESENCE means)",
      "Pricing and commitment structure for quarterly vs. annual contracts",
    ],
    topicsToDeepDive: [
      "Which queries showed the most instability in this assessment",
      "Competitor stability patterns — are they stable or also volatile?",
      "What content changes would most predictably stabilize the volatile queries",
    ],
  },
  {
    engagementType: "advisory",
    recommendedTimeline:
      "Propose a 30-day discovery engagement before committing to a retainer scope.",
    materialsToPrepare: [
      "Employer brand positioning framework overview (1-2 pages)",
      "Examples of companies that reversed multi-stage collapse in 6-12 months",
      "Proposed retainer structure and milestones",
    ],
    topicsToDeepDive: [
      "Internal ownership of employer brand at the client organization",
      "Existing employer brand initiatives and their current performance metrics",
      "Which stage gap has the highest recruiting funnel business impact",
    ],
  },
  {
    engagementType: "snapshot_upgrade",
    recommendedTimeline:
      "Propose full assessment within 2-3 months while this baseline is still current.",
    materialsToPrepare: [
      "Side-by-side comparison of snapshot vs. full assessment deliverables",
      "Query expansion plan showing which new clusters would be added",
      "Multi-run stability explainer and its value for executive reporting",
    ],
    topicsToDeepDive: [
      "Which query clusters from the snapshot showed the most surprising findings",
      "What the client's internal stakeholders most want to see in a follow-up",
      "Timeline alignment with their hiring cycle or employer brand calendar",
    ],
  },
  {
    engagementType: "full_assessment",
    recommendedTimeline:
      "Propose a full assessment within 60 days to build on the current snapshot baseline.",
    materialsToPrepare: [
      "Full assessment proposal with scope, query count, and timeline",
      "Current snapshot findings as the baseline comparison anchor",
      "Confidence scoring explainer: why multi-run validation matters",
    ],
    topicsToDeepDive: [
      "Which snapshot findings the client found most surprising or concerning",
      "What their ideal report format looks like for internal presentation",
      "Decision timeline for moving from snapshot to full assessment",
    ],
  },
];
