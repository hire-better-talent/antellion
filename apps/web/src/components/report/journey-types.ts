/**
 * The shape expected in report.metadata when a journey-format report has been generated.
 * Both the dashboard detail page and the export page use this type to detect and
 * render new-format reports.
 *
 * This mirrors the domain types from @antellion/core but is kept as a plain
 * interface so UI components do not depend on the core module's runtime exports.
 */

export interface JourneyStageData {
  stage: string; // "DISCOVERY" | "CONSIDERATION" | "EVALUATION" | "COMMITMENT"
  label: string; // "Discovery"
  description: string; // "How candidates find you"
  candidateQuestion: string; // "What companies should I consider?"
  mentionRate: number; // 0-1
  positioning: string; // PositioningTier
  topCompetitor: { name: string; mentionRate: number } | null;
  gapVsTopCompetitor: number; // percentage points
  citedDomains: string[];
  gapDomains: string[];
  narrative: string; // generated prose for this stage
  competitorCallout?: string; // e.g. "Apex dominates at 75%"
  citationContext?: string; // e.g. "Key sources: Levels.fyi, Glassdoor"
  confidence?: string; // "HIGH" | "MEDIUM" | "LOW"
  /** "visibility" = earned (Discovery/Evaluation); "positioning" = prompted (Consideration/Commitment) */
  metricType?: "visibility" | "positioning";
  /** Fraction of results at this stage backed by at least one citation (0-1). */
  sourcedRate?: number;
  /** Qualitative themes extracted from AI response texts for this stage */
  themes?: {
    positiveAttributes: string[];
    negativeAttributes: string[];
    unsolicitedCompetitors: string[];
    industryFraming: string;
    compensationDetail: "specific" | "vague" | "absent";
    cultureDetail: "specific" | "vague" | "absent";
  };
}

export interface JourneyCompetitorData {
  name: string;
  stages: Array<{
    stage: string;
    mentionRate: number;
    positioning: string;
  }>;
  overallRate: number;
  threatLevel: string; // "Primary" | "Secondary" | "Minimal"
}

/**
 * Longitudinal benchmarking types — mirrors @antellion/core BaselineComparison
 * without depending on core runtime exports (consistent with journey-types pattern).
 */
export interface BaselineMetricChange {
  metric: string;
  label: string;
  previous: number | string | null;
  current: number | string | null;
  changePp?: number;
  changeDirection: "improved" | "declined" | "unchanged" | "new";
  significance: "meaningful" | "marginal" | "unchanged";
}

export interface BaselineSnapshotData {
  earnedVisibilityRate: number;
  discoveryMentionRate: number | null;
  evaluationMentionRate: number | null;
  considerationMentionRate: number | null;
  commitmentMentionRate: number | null;
  overallMentionRate: number;
  avgSentiment: number | null;
  topCompetitorName: string | null;
  topCompetitorRate: number | null;
  competitorGapPp: number | null;
  totalGapDomains: number;
  employerGapDomains: number;
  overallPositioning: string | null;
  queryCount: number;
  assessmentDate: string; // ISO string from JSON serialization
}

export interface BaselineComparisonData {
  previous: BaselineSnapshotData;
  current: BaselineSnapshotData;
  daysBetween: number;
  changes: BaselineMetricChange[];
  summary: string;
  overallDirection: "improved" | "declined" | "mixed" | "unchanged";
}

export interface JourneyMetadata {
  /** Journey-format flag — presence of this key signals new format */
  journeyAnalysis: {
    stages: JourneyStageData[];
    funnelThroughput: number;
    criticalGapStage: string | null;
    overallPositioning: string;
    /** Present on reports generated after earned-visibility framing was added. */
    earnedVisibilityRate?: number;
    /** Present on reports generated after earned-visibility framing was added. */
    earnedVisibilityTier?: "strong" | "moderate" | "weak" | "invisible";
    visibility?: {
      earnedMentionRate: number;
      promptedMentionRate: number;
      earnedStages: string[];
      positioningStages: string[];
    };
  };
  clientName: string;
  clientOverallRate: number;
  competitors: JourneyCompetitorData[];
  remediationPlan: {
    recommendations: Array<{
      id: string;
      stage: string;
      priority: string;
      title: string;
      summary: string;
      whyItMatters: string;
      targetPlatforms: string[];
      actions: string[];
      evidenceBasis: string;
      expectedImpact: string;
      effort: string;
      timeframe: string;
    }>;
    criticalCount: number;
    highCount: number;
    topPriorityStage: string | null;
    funnelImpactSummary: string;
  };
  /**
   * Visibility boundary analysis — present when at least 2 specificity levels
   * have boundary-tagged scan results and the client has niche keywords configured.
   */
  visibilityBoundary?: {
    firstAppearsAt: "broad" | "industry" | "niche" | "hyper_specific" | "never";
    consistencyAtBoundary: number;
    rateByLevel: Record<
      "broad" | "industry" | "niche" | "hyper_specific",
      { rate: number; queryCount: number }
    >;
    competitorBoundaries: Array<{
      name: string;
      firstAppearsAt: "broad" | "industry" | "niche" | "hyper_specific" | "never";
    }>;
    boundaryNarrative: string;
  };
  /**
   * Assessment parameters — captured at scan creation and stored on the report.
   * Present on all reports generated after this feature was added.
   */
  assessmentParameters?: {
    aiModel: string;
    queryDepth: string;
    focusArea: string;
    queryCount: number;
    scanCount: number;
    assessmentDate: string;
  };
  /** Aggregate themes extracted from all AI response texts across stages */
  overallThemes?: {
    positiveAttributes: string[];
    negativeAttributes: string[];
    unsolicitedCompetitors: string[];
    industryFraming: string;
    compensationDetail: "specific" | "vague" | "absent";
    cultureDetail: "specific" | "vague" | "absent";
  };
  /**
   * Per-theme competitor mention rates — present when competitors exist.
   * Shows which competitor dominates each query theme.
   */
  themeCompetitorRates?: Array<{
    theme: string;
    queryCount: number;
    mentionCount: number;
    mentionRate: number;
    topCompetitor: { name: string; rate: number };
  }>;
  /** Optional — present on all reports */
  sections?: unknown[];
  coverPage?: unknown;
  scanRunIds?: string[];

  /**
   * Per-segment data — present only when the report was generated from 2+
   * distinct focusArea groups. Each entry has the same shape as the top-level
   * journey keys but scoped to one segment's scan results.
   */
  segments?: SegmentData[];

  /**
   * Cross-segment comparative summary — present only when segments is populated.
   */
  crossSegmentSummary?: CrossSegmentSummary;

  /**
   * LLM-generated prose for the Executive Summary Card.
   * Generated at report creation time by calling Claude Sonnet.
   * Absent on older reports — the ExecutiveSummaryCard falls back to
   * template-driven content when this field is missing.
   */
  executiveSummaryProse?: {
    situation: string;
    topRecommendation: string;
  };

  /**
   * Longitudinal benchmarking — before/after comparison with the previous
   * assessment baseline. Present only when a prior AssessmentBaseline exists
   * for this client. The JourneyReportRenderer renders a comparison section
   * when this key is present.
   */
  baselineComparison?: BaselineComparisonData;

  /**
   * Multi-run stability analysis — present when the report was generated from
   * 2+ scan runs of the same query set. Absent on single-run reports (which
   * will have all queries classified as UNVALIDATED).
   *
   * The renderer displays an "Assessment Confidence" callout when this field
   * is present and validatedQueryCount > 0.
   */
  multiRunAnalysis?: {
    totalQueries: number;
    validatedQueryCount: number;
    validationRate: number;
    stabilityDistribution: Record<
      "STABLE_PRESENCE" | "VOLATILE_PRESENCE" | "STABLE_ABSENCE" | "UNVALIDATED",
      number
    >;
    perQueryAggregations: Array<{
      queryId: string;
      queryText: string;
      stage: string | null;
      stability: "STABLE_PRESENCE" | "VOLATILE_PRESENCE" | "STABLE_ABSENCE" | "UNVALIDATED";
      mentionRate: number;
      runCount: number;
      avgVisibilityScore: number | null;
    }>;
    stageSummaries: Array<{
      stage: string;
      totalQueries: number;
      stablePresence: number;
      volatilePresence: number;
      stableAbsence: number;
      unvalidated: number;
      avgMentionRate: number;
    }>;
    effectiveScanRunCount: number;
  };
}

/**
 * Per-segment analysis entry, matching the shape of the top-level JourneyMetadata
 * journey keys but scoped to one focusArea group.
 */
export interface SegmentData {
  name: string;
  scanRunIds: string[];
  journeyAnalysis: JourneyMetadata["journeyAnalysis"];
  clientOverallRate: number;
  competitors: JourneyCompetitorData[];
  remediationPlan: JourneyMetadata["remediationPlan"];
  visibilityBoundary?: JourneyMetadata["visibilityBoundary"];
  overallThemes?: JourneyMetadata["overallThemes"];
  assessmentParameters?: JourneyMetadata["assessmentParameters"];
  confidence?: unknown;
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

/**
 * Returns the journey metadata if present, otherwise null.
 * Used by both the detail page and the export page for dual-mode detection.
 */
export function extractJourneyMetadata(
  raw: unknown,
): JourneyMetadata | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.journeyAnalysis || typeof obj.journeyAnalysis !== "object") {
    return null;
  }
  return obj as unknown as JourneyMetadata;
}
