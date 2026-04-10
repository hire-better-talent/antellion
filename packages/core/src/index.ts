// ─── Brand tokens ───────────────────────────────────────────
export { BRAND_TOKENS } from "./brand-tokens";
export type { BrandToken } from "./brand-tokens";

// ─── Enums ──────────────────────────────────────────────────
export {
  UserRole,
  ScanRunStatus,
  ScanResultStatus,
  ContentAssetType,
  ReportStatus,
  RecommendationCategory,
  RecommendationPriority,
  RecommendationStatus,
  QAStatus,
  QACheckOutcome,
  ConfidenceTier,
  RevenueScale,
} from "./schemas";

// ─── Primitives ─────────────────────────────────────────────
export { cuid, domain, slug, email, percentScore, sentimentScore } from "./schemas";

// ─── Entity schemas ─────────────────────────────────────────
export {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateClientSchema,
  UpdateClientSchema,
  CreateCompetitorSchema,
  UpdateCompetitorSchema,
  CreateRoleProfileSchema,
  UpdateRoleProfileSchema,
  CreateQueryClusterSchema,
  UpdateQueryClusterSchema,
  CreateQuerySchema,
  UpdateQuerySchema,
  CreateScanRunSchema,
  RecordScanResultSchema,
  CreateCitationSourceSchema,
  CreateContentAssetSchema,
  UpdateContentAssetSchema,
  InlineAssetSchema,
  CreateClientWithAssetsSchema,
  CreateReportSchema,
  UpdateReportSchema,
  CreateRecommendationSchema,
  UpdateRecommendationSchema,
} from "./schemas";

// ─── Lead schemas ───────────────────────────────────────────
export {
  LeadSource,
  LeadStatus,
  CreateLeadSchema,
} from "./schemas";

// ─── Workflow schemas ───────────────────────────────────────
export {
  TriggerScanSchema,
  GenerateReportSchema,
  GenerateQueriesSchema,
  ManualScanResultSchema,
  CreateSnapshotSchema,
} from "./schemas";

// ─── Entity input types ─────────────────────────────────────
export type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateUserInput,
  UpdateUserInput,
  CreateClientInput,
  UpdateClientInput,
  CreateCompetitorInput,
  UpdateCompetitorInput,
  CreateRoleProfileInput,
  UpdateRoleProfileInput,
  CreateQueryClusterInput,
  UpdateQueryClusterInput,
  CreateQueryInput,
  UpdateQueryInput,
  CreateScanRunInput,
  RecordScanResultInput,
  CreateCitationSourceInput,
  CreateContentAssetInput,
  UpdateContentAssetInput,
  InlineAssetInput,
  CreateClientWithAssetsInput,
  CreateReportInput,
  UpdateReportInput,
  CreateRecommendationInput,
  UpdateRecommendationInput,
  TriggerScanInput,
  GenerateReportInput,
  GenerateQueriesInput,
  ManualScanResultInput,
  CreateSnapshotInput,
  CreateLeadInput,
} from "./schemas";

// ─── Validation ─────────────────────────────────────────────
export { validate, parse } from "./validation";
export type {
  ValidationResult,
  ValidationSuccess,
  ValidationFailure,
  FieldError,
} from "./validation";

// ─── Content assets ─────────────────────────────────────────
export { deriveCompanySlug, deriveStandardAssets, STANDARD_ASSET_TEMPLATES } from "./content-assets";
export type { StandardAssetTemplate, StandardAsset } from "./content-assets";

// ─── Query intelligence ─────────────────────────────────────
export {
  generateQueryIntelligence,
  deduplicateQueries,
  classifyTheme,
  classifyJobFamily,
  QUERY_THEMES,
  JOB_FAMILIES,
  THEME_CONFIG,
} from "./query-intelligence";
export type {
  QueryTheme,
  JobFamily,
  RevenueScaleLevel,
  QuerySource,
  QueryGenerationInput,
  GeneratedQuery,
  GeneratedCluster,
  QueryIntelligenceResult,
} from "./query-intelligence";

// ─── Scan analysis ──────────────────────────────────────────
export { analyzeResponse, parseCitedDomains, parseCitations } from "./scan-analysis";
export type {
  ResponseAnalysis,
  CompetitorMention,
  AnalysisInput,
  ParsedCitation,
} from "./scan-analysis";

// ─── Citation extractor ─────────────────────────────────────
export { extractCitationsFromResponse, KNOWN_PLATFORMS } from "./citation-extractor";
export type { ExtractedCitation } from "./citation-extractor";

// ─── Employer platform filter ────────────────────────────────
export {
  EMPLOYER_RELEVANT_PLATFORMS,
  isEmployerRelevantDomain,
} from "./employer-platforms";

// ─── Citation taxonomy ──────────────────────────────────────
export {
  classifySource,
  sourceTypeLabel,
  controlLevelColor,
  PLATFORM_REGISTRY_ENTRIES,
} from "./citation-taxonomy";
export type {
  SourceType,
  ControlLevel,
  SourceClassification,
} from "./citation-taxonomy";

// ─── Citation remediation ───────────────────────────────────
export {
  getRemediation,
  REMEDIATION_PLAYBOOKS,
} from "./citation-remediation";
export type {
  RemediationStep,
  CitationRemediation,
} from "./citation-remediation";

// ─── Scan comparison ────────────────────────────────────────
export { computeScanComparison } from "./scan-comparison";
export type {
  ScanResultData,
  EntityMentionStats,
  DomainFrequency,
  CitationAnalysis,
  ScanComparisonResult,
} from "./scan-comparison";

// ─── Report composer ────────────────────────────────────────
export {
  composeReport,
  classifySourceType,
  gapActionFor,
  hedgePhrase,
  mentionTier,
  sentimentWord,
} from "./report-composer";
export type {
  ReportInput,
  ReportConfidence,
  JourneyAnalysisInput,
  ReportTable,
  ReportSubsection,
  ReportSection,
  GeneratedRecommendation,
  CoverPage,
  ComposedReport,
  QueryThemeStats,
  AssessmentScope,
} from "./report-composer";

// ─── Snapshot composer ───────────────────────────────────────
export { composeSnapshot } from "./snapshot-composer";
export type {
  SnapshotInput,
  VisibilitySnapshot,
  SnapshotMetrics,
  SnapshotCompetitor,
  SnapshotCitationGap,
} from "./snapshot-composer";

// ─── Snapshot queries ────────────────────────────────────────
export { generateSnapshotQueries } from "./snapshot-queries";
export type { SnapshotQueryInput, SnapshotQuery } from "./snapshot-queries";

// ─── Snapshot summary ────────────────────────────────────────
export {
  computeSnapshotSummary,
  extractQuotableText,
  classifyReputationIssue,
  classifyVisibilityTier,
  scoreHook,
  splitSentences,
  stripMarkdown,
  HIGH_VISIBILITY_THRESHOLD,
  MODERATE_VISIBILITY_THRESHOLD,
  DISCOVERY_BASE,
  CONTRAST_BASE,
  CITATION_BASE,
  REPUTATION_BASE,
  TOTAL_ABSENCE_BONUS,
  COMPETITOR_DOMINANCE_THRESHOLD,
  COMPETITOR_DOMINANCE_BONUS,
  GAP_MULTIPLIER,
  COMPETITOR_FAVORED_BONUS,
  STRONG_SENTIMENT_THRESHOLD,
  STRONG_SENTIMENT_BONUS,
  NEGATIVE_FRAMING_BONUS,
  PRODUCT_FOCUS_BONUS,
  ZERO_OWNED_CITATIONS_BONUS,
  RICH_COMPETITOR_CITATIONS_THRESHOLD,
  RICH_COMPETITOR_CITATIONS_BONUS,
  buildInterpretation,
} from "./snapshot-summary";
export type {
  SnapshotResultData,
  SnapshotSummary,
  SnapshotInterpretation,
  VisibilityTier,
} from "./snapshot-summary";

// ─── Workflow rules ──────────────────────────────────────────
export type {
  TransitionContext,
  TransitionResult,
  TransitionLogEntry,
} from "./workflow";
export {
  validateScanCompletion,
  validateScanDeletion,
  validateScanCancellation,
  validateResultTransition,
  shouldAutoFlag,
  AUTO_FLAG_VISIBILITY_THRESHOLD,
  validateReportGeneration,
  validateReportTransition,
} from "./workflow";

// ─── Evidence provenance ─────────────────────────────────────
export type {
  LLMProvider,
  EvidenceStatus,
  ScanEvidenceRecord,
  ReportEvidenceLink,
  CreateEvidenceInput,
  EvidenceTransitionContext,
  EvidenceTransitionResult,
  CreateReportEvidenceInput,
} from "./evidence/types";
export {
  LLMProviderSchema,
  EvidenceStatusSchema,
  CreateScanEvidenceSchema,
  UpdateScanEvidenceSchema,
  TransitionEvidenceSchema,
  CreateReportEvidenceSchema,
} from "./evidence/schemas";
export type {
  CreateScanEvidenceInput,
  UpdateScanEvidenceInput,
  TransitionEvidenceInput,
} from "./evidence/schemas";
export {
  IMMUTABLE_FIELDS,
  ALWAYS_MUTABLE_FIELDS,
  validateEvidenceUpdate,
  validateEvidenceTransition,
} from "./evidence/immutability";
export {
  SECTION_VISIBILITY,
  SECTION_COMPETITOR,
  SECTION_CITATIONS,
  mapEvidenceToSections,
} from "./evidence/section-mapping";
export type {
  ScanResultForMapping,
  EvidenceSectionAssignment,
} from "./evidence/section-mapping";

// ─── QA ─────────────────────────────────────────────────────
export { runQAChecks, ALL_CHECKS } from "./qa";
export {
  MIN_SUMMARY_LENGTH,
  MIN_CONFIDENCE_SCORE,
  MIN_CITATION_RATE,
  MIN_SECTIONS,
} from "./qa";
export type {
  QACheckSeverity,
  QACheckResult,
  QACheckContext,
  QARunResult,
  QACheckFn,
} from "./qa";

// ─── Decision journey ────────────────────────────────────────
export type {
  DecisionStage,
  StageConfig,
  PositioningTier,
  StageVisibility,
  VisibilityClassification,
  JourneyAnalysis,
  StageComparisonInput,
  StageRecommendation,
  StrategicRecommendation,
  RemediationPlan,
  RecommendationInput,
} from "./decision-journey";
export {
  DECISION_STAGES,
  STAGE_CONFIGS,
  classifyQueryStage,
  computeJourneyAnalysis,
  classifyPositioning,
  computeStageConfidence,
  generateStageRecommendations,
  computeRecommendationPriority,
  computeFunnelImpactSummary,
  buildJourneyMetadata,
} from "./decision-journey";
export type {
  JourneyStageOutput,
  JourneyCompetitorOutput,
  JourneyMetadataOutput,
  JourneyMetadataBuilderInput,
  BoundaryContext,
} from "./decision-journey";
export { computeCrossSegmentSummary } from "./decision-journey";
export type {
  SegmentSummaryInput,
  CrossSegmentSummary,
} from "./decision-journey";

// ─── Response themes ─────────────────────────────────────────
export { extractResponseThemes, extractStageThemes } from "./response-themes";
export type { ResponseThemes } from "./response-themes";

// ─── Competitor discovery ────────────────────────────────────
export { discoverCompetitors } from "./competitor-discovery";
export type { DiscoveredCompetitor } from "./competitor-discovery";

// ─── Visibility boundary analysis ────────────────────────────
export {
  generateBoundaryQueries,
  detectVisibilityBoundary,
  parseBoundarySpecificity,
  classifyNonBoundaryDiscoveryResult,
  hasSufficientBoundaryData,
  filterBoundaryResults,
  SPECIFICITY_ORDER,
} from "./visibility-boundary";
export type {
  SpecificityLevel,
  BoundaryQuery,
  BoundaryQueryInput,
  BoundaryLevelStats,
  VisibilityBoundary,
  BoundaryDetectionInput,
} from "./visibility-boundary";

// ─── Confidence scoring ─────────────────────────────────────
export {
  confidenceTier,
  computeResultConfidence,
  computeFindingConfidence,
  applyPenalties,
  RESULT_WEIGHT_RESPONSE_QUALITY,
  RESULT_WEIGHT_SCORE_COVERAGE,
  RESULT_WEIGHT_CITATION_COVERAGE,
  RESULT_WEIGHT_MENTION_CLARITY,
  FINDING_WEIGHT_SAMPLE_SIZE,
  FINDING_WEIGHT_SIGNAL_CONSISTENCY,
  FINDING_WEIGHT_CITATION_COVERAGE,
  FINDING_WEIGHT_RESPONSE_QUALITY,
  TIER_LOW_CEILING,
  TIER_MEDIUM_CEILING,
  INSUFFICIENT_SAMPLE_THRESHOLD,
  INSUFFICIENT_SAMPLE_DEDUCTION,
  SINGLE_SCAN_DEDUCTION,
  INCOMPLETE_SCAN_THRESHOLD,
  INCOMPLETE_SCAN_DEDUCTION,
  NEAR_FIFTY_LOW,
  NEAR_FIFTY_HIGH,
  NEAR_FIFTY_SAMPLE_THRESHOLD,
  NEAR_FIFTY_DEDUCTION,
  SCORE_FLOOR,
} from "./confidence";
export type {
  ConfidenceScore,
  ConfidenceFactors,
  AppliedPenalty,
  ResultConfidenceInput,
  FindingConfidenceInput,
  PenaltyContext,
} from "./confidence";

// ─── Business context ───────────────────────────────────────
export { buildBusinessContext } from "./business-context";
export type { BusinessContextInput } from "./business-context";

// ─── Supplemental queries ────────────────────────────────────
export { validateSupplementalQueries, verifySupplementalStages } from "./supplemental-queries";
export type { SupplementalQueryInput, SupplementalQuery } from "./supplemental-queries";

// ─── Baseline comparison ────────────────────────────────────
export { computeBaselineComparison } from "./baseline-comparison";
export type {
  BaselineSnapshot,
  MetricChange,
  BaselineComparison,
  ChangeDirection,
  Significance,
} from "./baseline-comparison";

// ─── Assessment readiness ──────────────────────────────────
export {
  assessReadiness,
  MIN_DISCOVERY_QUERIES,
  MIN_EVALUATION_QUERIES,
  MIN_TOTAL_RESULTS,
  MIN_READINESS_CITATION_RATE,
} from "./assessment-readiness";
export type {
  ReadinessSeverity,
  ReadinessActionType,
  SuggestedAction,
  ReadinessWarning,
  ReadinessInput,
} from "./assessment-readiness";

// ─── Query signal scoring ────────────────────────────────────
export {
  scoreQuerySignal,
  jaccardSimilarity,
  DUPLICATE_JACCARD_THRESHOLD,
} from "./query-signal-scoring";
export type {
  SignalYieldInput,
  SignalYield,
} from "./query-signal-scoring";

// ─── Multi-run aggregation ───────────────────────────────────
export {
  classifyStability,
  aggregateQueryResults,
  computeMultiRunAnalysis,
  groupResultsByQuery,
} from "./multi-run-aggregation";
export type {
  StabilityClassification,
  MultiRunResultInput,
  QueryResultSet,
  QueryAggregation,
  MultiRunAnalysis,
} from "./multi-run-aggregation";

// ─── Operator Action Plan ────────────────────────────────────
export type {
  OperatorActionPlan,
  ValidationItem,
  TalkingPoint,
  PushbackPrediction,
  UpsellOpportunity,
  EngagementType,
  RedFlag,
  RedFlagSeverity,
  NextEngagementPlan,
  ClientQuestion,
  TriggerFlags,
  ReportMetadata as OperatorActionPlanReportMetadata,
  ReportMetadataJourneyAnalysis,
  ReportMetadataJourneyStage,
  ReportMetadataCompetitor,
  ReportMetadataRemediationPlan,
  ReportMetadataMultiRunAnalysis,
  ReportMetadataReadinessWarning,
  ReportMetadataConfidence,
  OperatorActionPlanInput,
} from "./operator-action-plan";
export {
  buildOperatorActionPlan,
  detectTriggerFlags,
  computeCompellingScore,
  DEFAULT_UPSELL_PRIORITY,
  ENGAGEMENT_PRICES,
  COMPELLING_SCORE_SAMPLE_CAP,
  TRIGGER_THRESHOLDS,
} from "./operator-action-plan";
