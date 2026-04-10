// ── Operator Action Plan — Types ─────────────────────────────
//
// All TypeScript types for the Operator Action Plan.
// This artifact is a private, internal-only briefing derived from
// existing Report.metadata — no LLM calls, no DB writes in Phase 1.

// ─── Section A: Findings to Validate Manually ────────────────

export interface ValidationItem {
  category:
    | "mention_claim"
    | "competitor_claim"
    | "citation_claim"
    | "sample_size"
    | "stability";
  /** The specific claim to validate, pulled from report metadata. */
  finding: string;
  /** Why this finding warrants manual verification before client delivery. */
  concern: string;
  /** Ordered steps the operator should take to spot-check the claim. */
  checkSteps: string[];
  /** Which decision stage this relates to (e.g. "DISCOVERY"). Optional when cross-stage. */
  stage?: string;
}

// ─── Section B: Talking Points ───────────────────────────────

export interface TalkingPoint {
  /** The number to memorize and lead with (e.g. "8% mention rate vs 67% for Stripe"). */
  leadNumber: string;
  /** One-sentence finding — the exact narrative the operator rehearses. */
  headline: string;
  /** Supporting detail that backs up the headline. */
  context: string;
  /** AI response excerpt worth quoting verbally, if available. */
  quotableText?: string;
  /** 0-1 normalized score. Higher = lead this in the meeting. */
  compellingScore: number;
}

// ─── Section C: Pushback ─────────────────────────────────────

export interface PushbackPrediction {
  /** What the client will likely say in response to a finding. */
  anticipatedObjection: string;
  /** What the operator should say back — may include report-specific placeholders. */
  preparedResponse: string;
  /** Specific data from the report to point to when delivering the response. */
  supportingEvidence: string;
  /** Stable ID linking this prediction to the rule that triggered it. */
  triggerId: string;
}

// ─── Section D: Upsell / Next Engagement ─────────────────────

export type EngagementType =
  | "content_authoring"
  | "monitoring"
  | "advisory"
  | "snapshot_upgrade"
  | "full_assessment";

export interface UpsellOpportunity {
  engagementType: EngagementType;
  /** Why this engagement type fits this specific report's findings. */
  rationale: string;
  /** What this engagement would entail in concrete terms. */
  suggestedScope: string;
  /** Reference price range, pulled from config constants — never hardcoded. */
  priceRange: string;
  /** Stable ID linking this opportunity to the rule that triggered it. */
  triggerId: string;
}

// ─── Section E: Red Flags ─────────────────────────────────────

export type RedFlagSeverity = "critical" | "major" | "advisory";

export interface RedFlag {
  severity: RedFlagSeverity;
  /** What the quality issue is. */
  concern: string;
  /** Why it matters for client delivery. */
  implication: string;
  /** What the operator should do about it before or during the meeting. */
  mitigation: string;
  /** Which report section is affected, if applicable. */
  affectedSection?: string;
}

// ─── Section F: Next Engagement Plan ─────────────────────────

export interface NextEngagementPlan {
  /** When to follow up and propose the primary engagement. */
  recommendedTimeline: string;
  /** What the operator should prepare for the second conversation. */
  materialsToPrepare: string[];
  /** Topics to research further before the next meeting. */
  topicsToDeepDive: string[];
  /** The primary engagement type recommended (from upsell list). */
  primaryEngagementType: EngagementType | null;
  /** Reference price range for the primary engagement. */
  priceRange: string;
}

// ─── Section G: Questions to Ask the Client ──────────────────

export interface ClientQuestion {
  /** The question to ask. */
  question: string;
  /** What this question is probing for (operator-facing, not to be read aloud). */
  purpose: string;
  /** How the conversation naturally flows from the answer toward the upsell. */
  naturalTransition: string;
  /** Stable ID linking this question to the rule that triggered it. */
  triggerId: string;
}

// ─── Internal trigger flags ───────────────────────────────────
//
// Computed once from ReportMetadata, then passed to all builders.
// This is the single source of truth for "which conditions fired on this report."

export interface TriggerFlags {
  hasGlassdoorGap: boolean;
  hasLinkedInGap: boolean;
  hasLevelsFyiGap: boolean;
  hasContentGap: boolean;
  hasCriticalDiscoveryGap: boolean;
  hasCriticalEvaluationGap: boolean;
  hasCriticalCommitmentGap: boolean;
  hasMultiStageCollapse: boolean;
  hasStrongCompetitorContrast: boolean;
  hasZeroOwnedCitations: boolean;
  hasLowSampleSize: boolean;
  hasStabilityIssues: boolean;
  isFirstAssessment: boolean;
  hasNegativeSentiment: boolean;
  hasLowSourcedRate: boolean;
}

// ─── Report metadata shape ────────────────────────────────────
//
// This mirrors the structure written by generateReport() in
// apps/web/src/app/(dashboard)/actions/reports.ts.
// Only the fields consumed by the action plan are declared here.
// All fields are optional because report generation is incremental and
// some reports may pre-date certain metadata fields.

export interface ReportMetadataConfidence {
  overall?: {
    score: number;
    tier: "LOW" | "MEDIUM" | "HIGH";
  };
  perSection?: Record<
    string,
    {
      score: number;
      tier: "LOW" | "MEDIUM" | "HIGH";
    }
  >;
}

export interface ReportMetadataJourneyStage {
  stage: string;
  mentionRate: number;
  avgSentiment: number;
  positioning: string;
  sourcedRate: number;
  topCompetitor: { name: string; mentionRate: number } | null;
  gapVsTopCompetitor: number;
  gapDomains: string[];
  narrative: string;
  competitorCallout?: string;
}

export interface ReportMetadataJourneyAnalysis {
  stages: ReportMetadataJourneyStage[];
  funnelThroughput: number;
  criticalGapStage: string | null;
  overallPositioning: string;
  earnedVisibilityRate: number;
  earnedVisibilityTier: "strong" | "moderate" | "weak" | "invisible";
}

export interface ReportMetadataCompetitor {
  name: string;
  overallRate: number;
  threatLevel: string;
  stages: Array<{
    stage: string;
    mentionRate: number;
    positioning: string;
  }>;
}

export interface ReportMetadataRemediationPlan {
  recommendations: Array<{
    id: string;
    stage: string;
    priority: string;
    title: string;
    summary: string;
    evidenceBasis: string;
    targetPlatforms: string[];
    actions: string[];
    expectedImpact: string;
    effort: string;
    timeframe: string;
    whyItMatters: string;
  }>;
  criticalCount: number;
  highCount: number;
  topPriorityStage: string | null;
  funnelImpactSummary: string;
}

export interface ReportMetadataMultiRunAnalysis {
  totalQueries: number;
  validatedQueryCount: number;
  validationRate: number;
  stabilityDistribution: {
    STABLE_PRESENCE: number;
    VOLATILE_PRESENCE: number;
    STABLE_ABSENCE: number;
    UNVALIDATED: number;
  };
  effectiveScanRunCount: number;
}

export interface ReportMetadataReadinessWarning {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
}

export interface ReportMetadata {
  // Journey analysis — present for full assessment reports
  journeyAnalysis?: ReportMetadataJourneyAnalysis;
  clientName?: string;
  clientOverallRate?: number;
  competitors?: ReportMetadataCompetitor[];
  remediationPlan?: ReportMetadataRemediationPlan;
  // Confidence
  confidence?: ReportMetadataConfidence;
  // Multi-run stability
  multiRunAnalysis?: ReportMetadataMultiRunAnalysis;
  // Readiness warnings captured at generation time
  readinessWarnings?: ReportMetadataReadinessWarning[];
  // Fraction of results that have at least one citation (0-1)
  overallSourcedRate?: number;
  // Number of scan runs that went into this report
  scanRunIds?: string[];
}

// ─── Complete action plan output ──────────────────────────────

export interface OperatorActionPlan {
  reportId: string;
  clientName: string;
  /** ISO timestamp of when the plan was generated. */
  generatedAt: string;
  validationItems: ValidationItem[];
  /** Top 5, sorted by compellingScore descending. */
  talkingPoints: TalkingPoint[];
  pushbackPredictions: PushbackPrediction[];
  upsellOpportunities: UpsellOpportunity[];
  /** Sorted: critical > major > advisory. */
  redFlags: RedFlag[];
  nextEngagementPlan: NextEngagementPlan;
  /** Max 3 questions, selected in DEFAULT_UPSELL_PRIORITY order. */
  clientQuestions: ClientQuestion[];
}
