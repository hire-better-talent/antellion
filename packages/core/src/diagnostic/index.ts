// ─── Schemas ────────────────────────────────────────────────
export {
  PersonaArchetypeSchema,
  EngagementTierSchema,
  EngagementStatusSchema,
  FindingStatusSchema,
  FindingCategorySchema,
  PersonaInputSchema,
  CreateEngagementSchema,
  ApproveFindingSchema,
  RejectFindingSchema,
  UpdateFindingNarrativeSchema,
  PublishEngagementSchema,
} from "./schemas";
export type {
  PersonaArchetype,
  EngagementTier,
  EngagementStatus,
  FindingStatus,
  FindingCategory,
  PersonaInput,
  CreateEngagementInput,
  ApproveFindingInput,
  RejectFindingInput,
  UpdateFindingNarrativeInput,
  PublishEngagementInput,
} from "./schemas";

// ─── Finding extraction ─────────────────────────────────────
export { extractCandidateFindings } from "./findings";
export type {
  FindingCategoryType,
  ScanResultInput,
  CandidateFinding,
} from "./findings";

// ─── Validation gate ────────────────────────────────────────
export {
  validateDiagnosticDelivery,
  isMaterialFinding,
  buildAuditAppendix,
  MINIMUM_MATERIAL_FINDINGS,
} from "./validation";
export type {
  FindingRecord,
  DiagnosticValidationResult,
  AuditEntry,
} from "./validation";

// ─── Authority Surface Map ──────────────────────────────────
export {
  SurfaceCategorySchema,
  SCORED_SURFACE_CATEGORIES,
  SURFACE_CATEGORY_DISPLAY,
  SURFACE_CATEGORY_GROUP,
  classifySurface,
  classifyCitations,
  groupCitationsBySurface,
} from "./authority/surface-rules";
export type {
  SurfaceCategory,
  SurfaceGroup,
  SurfaceClassificationInput,
  SurfaceClassificationResult,
  ClassifiedCitation,
} from "./authority/surface-rules";
export {
  RUBRIC_VERSION,
  displayLabelFromScore,
  recencyWeight,
  densityWeightedCount,
  densitySubScore,
  voiceSubScore,
  recencySubScore,
  combineSubScores,
  scoreSurface,
  scoreAllSurfaces,
} from "./authority/score";
export type {
  AuthorityDisplayLabel,
  SubScore,
  VoiceObservation,
  VoiceAudit,
  DensityObservation,
  ScoreInput,
  ScoreResult,
} from "./authority/score";
