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
