// ── Operator Action Plan — Public Exports ────────────────────
//
// Phase 1: pure transform from Report.metadata → OperatorActionPlan.
// Zero LLM calls, zero DB writes.

// ─── Main builder ─────────────────────────────────────────────
export { buildOperatorActionPlan } from "./build";
export type { OperatorActionPlanInput } from "./build";

// ─── Types ────────────────────────────────────────────────────
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
  ReportMetadata,
  ReportMetadataJourneyAnalysis,
  ReportMetadataJourneyStage,
  ReportMetadataCompetitor,
  ReportMetadataRemediationPlan,
  ReportMetadataMultiRunAnalysis,
  ReportMetadataReadinessWarning,
  ReportMetadataConfidence,
} from "./types";

// ─── Config ───────────────────────────────────────────────────
export {
  ENGAGEMENT_PRICES,
  COMPELLING_SCORE_SAMPLE_CAP,
  TRIGGER_THRESHOLDS,
} from "./config";

// ─── Priority constant ────────────────────────────────────────
export { DEFAULT_UPSELL_PRIORITY } from "./rules/next-engagement";

// ─── Trigger detection ────────────────────────────────────────
export { detectTriggerFlags } from "./trigger-detection";

// ─── Compelling score formula ─────────────────────────────────
export { computeCompellingScore } from "./builders/talking-points";
