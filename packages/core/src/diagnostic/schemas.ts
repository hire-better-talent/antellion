/**
 * Zod schemas for Diagnostic engagement server actions.
 */
import { z } from "zod";

const cuid = z.string().cuid();
const shortText = z.string().min(1).max(255);

// ── Persona archetype ─────────────────────────────────────────

export const PersonaArchetypeSchema = z.enum([
  "EARLY_CAREER",
  "MID_CAREER_IC",
  "SENIOR_IC",
  "MANAGER",
  "EXECUTIVE",
]);
export type PersonaArchetype = z.infer<typeof PersonaArchetypeSchema>;

// ── Engagement tier ───────────────────────────────────────────

export const EngagementTierSchema = z.enum(["DIAGNOSTIC"]);
export type EngagementTier = z.infer<typeof EngagementTierSchema>;

// ── Engagement status ─────────────────────────────────────────

export const EngagementStatusSchema = z.enum([
  "SCOPING",
  "SCANNING",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
]);
export type EngagementStatus = z.infer<typeof EngagementStatusSchema>;

// ── Finding status ────────────────────────────────────────────

export const FindingStatusSchema = z.enum(["DRAFT", "APPROVED", "REJECTED"]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

// ── Finding category ──────────────────────────────────────────

export const FindingCategorySchema = z.enum([
  "ZERO_PRESENCE",
  "COMPETITOR_DOMINANCE",
  "SENTIMENT_DIVERGENCE",
  "CITATION_MONOCULTURE",
  "PERSONA_INVISIBILITY",
  "NARRATIVE_INCONSISTENCY",
  "ZERO_CITATION",
  "CONTENT_GAP",
  "COMPETITIVE_POSITIONING",
  "EMPLOYER_BRAND",
  "OTHER",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

// ── Create engagement ─────────────────────────────────────────

export const PersonaInputSchema = z.object({
  archetype: PersonaArchetypeSchema,
  label: shortText,
  intent: z.string().max(1000).optional(),
  seedContext: z.string().max(2000).optional(),
  // Per-engagement overrides
  labelOverride: shortText.optional(),
  intentOverride: z.string().max(1000).optional(),
  seedContextOverride: z.string().max(2000).optional(),
});
export type PersonaInput = z.infer<typeof PersonaInputSchema>;

export const CreateEngagementSchema = z.object({
  clientId: cuid,
  jobCategoryName: z
    .string()
    .min(1)
    .max(255)
    .describe("e.g. 'Software Engineering'. Creates the category if it does not exist."),
  jobCategorySlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  personas: z
    .array(PersonaInputSchema)
    .min(1)
    .max(5)
    .describe("3 personas selected from the 5 archetype catalog"),
  notes: z.string().max(2000).optional(),
});
export type CreateEngagementInput = z.infer<typeof CreateEngagementSchema>;

// ── Approve finding ───────────────────────────────────────────

export const ApproveFindingSchema = z.object({
  findingId: cuid,
  narrative: z.string().min(1).max(5000).describe("Analyst-written narrative for this finding"),
});
export type ApproveFindingInput = z.infer<typeof ApproveFindingSchema>;

// ── Reject finding ────────────────────────────────────────────

export const RejectFindingSchema = z.object({
  findingId: cuid,
  reason: z.string().max(500).optional(),
});
export type RejectFindingInput = z.infer<typeof RejectFindingSchema>;

// ── Update finding narrative ──────────────────────────────────

export const UpdateFindingNarrativeSchema = z.object({
  findingId: cuid,
  namedIssue: shortText.optional(),
  narrative: z.string().max(5000).optional(),
  actionableCategory: FindingCategorySchema.optional(),
});
export type UpdateFindingNarrativeInput = z.infer<typeof UpdateFindingNarrativeSchema>;

// ── Publish engagement ────────────────────────────────────────

export const PublishEngagementSchema = z.object({
  engagementId: cuid,
});
export type PublishEngagementInput = z.infer<typeof PublishEngagementSchema>;
