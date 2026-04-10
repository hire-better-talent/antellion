// ── Operator Action Plan — Configuration ────────────────────
//
// All price constants, thresholds, and scoring caps live here.
// Rule tables in pushback.ts, upsell.ts, and questions.ts reference
// these constants by name — they never embed literal values.
//
// Review schedule: quarterly, alongside the pricing conversation.

// ─── Engagement price ranges ─────────────────────────────────

export const ENGAGEMENT_PRICES = {
  CONTENT_AUTHORING: "$8K-$12K",
  MONTHLY_MONITORING: "$2K-$4K/mo",
  QUARTERLY_MONITORING: "$6K-$10K/quarter",
  STRATEGIC_ADVISORY_RETAINER: "$5K-$8K/mo",
  SNAPSHOT_TO_FULL_UPGRADE: "$8K-$15K",
  FULL_ASSESSMENT: "$10K-$15K",
} as const;

// ─── Compelling score normalization ──────────────────────────

/**
 * Log-scale cap for sample size normalization in the compelling score formula.
 *
 * Why 50: sample sizes beyond 50 do not meaningfully change credibility for a
 * VP TA buyer. At 50 queries, a finding is already defensible in an executive
 * meeting. Beyond that, additional data yields diminishing returns and should
 * not dominate the ranking — otherwise a high-sample weak finding would
 * out-rank a lower-sample sharp finding, which is the opposite of what the
 * operator needs.
 */
export const COMPELLING_SCORE_SAMPLE_CAP = 50;

// ─── Trigger thresholds ──────────────────────────────────────

export const TRIGGER_THRESHOLDS = {
  /**
   * Total query count below this value triggers the LOW_SAMPLE_SIZE flag.
   * Findings built from fewer than 20 queries warrant explicit validation.
   */
  LOW_SAMPLE_SIZE: 20,

  /**
   * Sourced rate below this fraction triggers the LOW_SOURCED_RATE flag.
   * Below 50%, AI is drawing on parametric memory more than indexed content.
   */
  LOW_SOURCED_RATE: 0.5,

  /**
   * Gap vs top competitor above this magnitude (absolute rate delta)
   * triggers the STRONG_CONTRAST flag. 0.3 = a 30-point gap.
   */
  STRONG_CONTRAST_GAP: 0.3,

  /**
   * Stage mention rate at or below this value triggers critical stage flags.
   * A 10% rate means the client is absent from 9 out of 10 relevant queries.
   */
  CRITICAL_STAGE_RATE: 0.1,

  /**
   * Average sentiment below this value triggers the NEGATIVE_SENTIMENT flag.
   * Scores are on a -1 to 1 scale; -0.1 is a slight-to-moderate negative tilt.
   */
  NEGATIVE_SENTIMENT: -0.1,

  /**
   * Fraction of VOLATILE_PRESENCE queries above this triggers stability upsell.
   * 30% of queries flipping between runs signals an unstable signal.
   */
  HIGH_VOLATILITY_RATE: 0.3,

  /**
   * Overall sourced rate below this threshold indicates zero-owned citations.
   * Below 0.1, the client appears to have virtually no indexed owned content.
   */
  ZERO_OWNED_CITATIONS_RATE: 0.1,

  /**
   * Minimum critical + high recommendation count before content upsell fires.
   */
  CONTENT_UPSELL_MIN_CRITICALS: 3,
} as const;
