// ─── Decision stage enum ─────────────────────────────────────

export type DecisionStage =
  | "DISCOVERY"
  | "CONSIDERATION"
  | "EVALUATION"
  | "COMMITMENT";

export const DECISION_STAGES: readonly DecisionStage[] = [
  "DISCOVERY",
  "CONSIDERATION",
  "EVALUATION",
  "COMMITMENT",
] as const;

// ─── Stage config ────────────────────────────────────────────

export interface StageConfig {
  stage: DecisionStage;
  /** Display name, e.g. "Discovery" */
  name: string;
  /** Short description, e.g. "How candidates find you" */
  description: string;
  /** The candidate question this stage answers */
  candidateQuestion: string;
  /** 1-4 funnel position */
  funnelPosition: number;
}

export const STAGE_CONFIGS: Record<DecisionStage, StageConfig> = {
  DISCOVERY: {
    stage: "DISCOVERY",
    name: "Discovery",
    description: "How candidates find you",
    candidateQuestion: "What companies should I consider?",
    funnelPosition: 1,
  },
  CONSIDERATION: {
    stage: "CONSIDERATION",
    name: "Consideration",
    description: "What candidates learn about you",
    candidateQuestion: "Tell me about [Company]",
    funnelPosition: 2,
  },
  EVALUATION: {
    stage: "EVALUATION",
    name: "Evaluation",
    description: "How candidates compare you",
    candidateQuestion: "How does [Company] compare?",
    funnelPosition: 3,
  },
  COMMITMENT: {
    stage: "COMMITMENT",
    name: "Commitment",
    description: "Why candidates apply (or don't)",
    candidateQuestion: "What's the interview process?",
    funnelPosition: 4,
  },
};

// ─── Positioning tiers ───────────────────────────────────────

export type PositioningTier =
  | "CHAMPION"
  | "CONTENDER"
  | "PERIPHERAL"
  | "CAUTIONARY"
  | "INVISIBLE";

// ─── Visibility classification ───────────────────────────────

export interface VisibilityClassification {
  /**
   * Earned: company appeared without being named in the query (Discovery,
   * Evaluation). Measures whether AI independently surfaces the company.
   */
  earnedMentionRate: number;
  /**
   * Prompted: company appeared after being named in the query (Consideration,
   * Commitment). Appearance is expected, so the rate is not a visibility signal.
   */
  promptedMentionRate: number;
  /** Stages counted toward earned visibility. */
  earnedStages: DecisionStage[];
  /** Stages counted toward prompted/positioning metrics. */
  positioningStages: DecisionStage[];
}

// ─── Per-stage visibility ────────────────────────────────────

export interface StageVisibility {
  stage: DecisionStage;
  /** Fraction of results in this stage where the client was mentioned (0-1). */
  mentionRate: number;
  /** Mean visibility score across results in this stage (0-100). */
  avgVisibility: number;
  /** Mean sentiment score across results in this stage (-1 to 1). */
  avgSentiment: number;
  /** Number of results in this stage. */
  resultCount: number;
  /** Derived positioning tier for this stage. */
  positioning: PositioningTier;
  /** Top competitor by mention rate in this stage (null if no competitor data). */
  topCompetitor: { name: string; mentionRate: number } | null;
  /** Percentage points the top competitor leads the client at this stage. */
  gapVsTopCompetitor: number;
  /** All unique domains cited in results for this stage. */
  citedDomains: string[];
  /** Domains cited in results where the client was NOT mentioned. */
  gapDomains: string[];
  /**
   * What the primary metric measures at this stage.
   * - "visibility": mention rate is earned signal (Discovery, Evaluation)
   * - "positioning": mention rate is expected; quality matters more (Consideration, Commitment)
   */
  metricType: "visibility" | "positioning";
  /** Fraction of results at this stage that have at least one citation (0-1). */
  sourcedRate: number;
}

// ─── Full journey analysis ───────────────────────────────────

export interface JourneyAnalysis {
  /** Per-stage breakdown, one entry per stage that had results. */
  stages: StageVisibility[];
  /**
   * Compounded mention-rate probability across all stages with results.
   * Product of each stage's mentionRate. Represents the fraction of
   * AI-researching candidates who survive every stage gate.
   */
  funnelThroughput: number;
  /**
   * Stage with the lowest mention rate below 0.3 — the biggest drop-off
   * point. Null if no stage is below the threshold.
   */
  criticalGapStage: DecisionStage | null;
  /** Overall positioning derived from the combined mention rate across all stages. */
  overallPositioning: PositioningTier;
  /**
   * Earned vs prompted classification.
   * Present whenever at least one earned (Discovery/Evaluation) or positioning
   * (Consideration/Commitment) stage has results.
   */
  visibility?: VisibilityClassification;
  /**
   * Average mention rate across earned stages (Discovery + Evaluation).
   * This is the primary visibility headline — excludes prompted stages.
   * Always set by computeJourneyAnalysis; optional here for hand-constructed fixtures.
   */
  earnedVisibilityRate?: number;
  /**
   * Human-readable tier for earned visibility.
   * "strong" >= 0.5 | "moderate" >= 0.3 | "weak" >= 0.15 | "invisible" < 0.15
   * Always set by computeJourneyAnalysis; optional here for hand-constructed fixtures.
   */
  earnedVisibilityTier?: "strong" | "moderate" | "weak" | "invisible";
}
