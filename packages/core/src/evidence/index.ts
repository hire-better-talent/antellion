// ── Types ──
export type {
  LLMProvider,
  EvidenceStatus,
  ScanEvidenceRecord,
  ReportEvidenceLink,
  CreateEvidenceInput,
  EvidenceTransitionContext,
  EvidenceTransitionResult,
  CreateReportEvidenceInput,
} from "./types";

// ── Schemas ──
export {
  LLMProviderSchema,
  EvidenceStatusSchema,
  CreateScanEvidenceSchema,
  UpdateScanEvidenceSchema,
  TransitionEvidenceSchema,
  CreateReportEvidenceSchema,
} from "./schemas";
export type {
  CreateScanEvidenceInput,
  UpdateScanEvidenceInput,
  TransitionEvidenceInput,
} from "./schemas";
// Note: CreateReportEvidenceInput from schemas.ts is the Zod-inferred form.
// CreateReportEvidenceInput from types.ts is the interface form.
// Both are exported from their respective modules; consumers import from core directly.
export type { CreateReportEvidenceInput as CreateReportEvidenceSchemaInput } from "./schemas";

// ── Immutability ──
export {
  IMMUTABLE_FIELDS,
  ALWAYS_MUTABLE_FIELDS,
  validateEvidenceUpdate,
  validateEvidenceTransition,
} from "./immutability";

// ── Section mapping ──
export {
  SECTION_VISIBILITY,
  SECTION_COMPETITOR,
  SECTION_CITATIONS,
  mapEvidenceToSections,
} from "./section-mapping";
export type { ScanResultForMapping, EvidenceSectionAssignment } from "./section-mapping";
