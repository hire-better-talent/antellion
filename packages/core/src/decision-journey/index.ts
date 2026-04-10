// ─── Types ───────────────────────────────────────────────────
export type {
  DecisionStage,
  StageConfig,
  PositioningTier,
  StageVisibility,
  JourneyAnalysis,
  VisibilityClassification,
} from "./types";
export { DECISION_STAGES, STAGE_CONFIGS } from "./types";

// ─── Classifier ──────────────────────────────────────────────
export { classifyQueryStage } from "./classifier";

// ─── Stage comparison ────────────────────────────────────────
export { computeJourneyAnalysis, classifyPositioning } from "./stage-comparison";
export type { StageComparisonInput } from "./stage-comparison";

// ─── Stage confidence ────────────────────────────────────────
export { computeStageConfidence } from "./stage-confidence";

// ─── Stage recommendations ───────────────────────────────────
export {
  generateStageRecommendations,
  computeRecommendationPriority,
  computeFunnelImpactSummary,
} from "./recommendations";
export type {
  StageRecommendation,
  StrategicRecommendation,
  RemediationPlan,
  RecommendationInput,
} from "./recommendations";

// ─── Journey metadata builder ────────────────────────────────
export { buildJourneyMetadata } from "./journey-metadata-builder";
export type {
  JourneyStageOutput,
  JourneyCompetitorOutput,
  JourneyMetadataOutput,
  JourneyMetadataBuilderInput,
  BoundaryContext,
} from "./journey-metadata-builder";

// ─── Cross-segment summary ────────────────────────────────────
export { computeCrossSegmentSummary } from "./cross-segment-summary";
export type {
  SegmentSummaryInput,
  CrossSegmentSummary,
} from "./cross-segment-summary";
