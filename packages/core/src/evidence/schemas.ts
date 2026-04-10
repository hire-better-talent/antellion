import { z } from "zod";

// ── Enums ──

export const LLMProviderSchema = z.enum([
  "OPENAI",
  "ANTHROPIC",
  "GOOGLE",
  "MANUAL",
]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const EvidenceStatusSchema = z.enum([
  "DRAFT",
  "APPROVED",
  "SUPERSEDED",
  "REJECTED",
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

// ── Primitives ──

const cuid = z.string().cuid();
const confidenceScore = z.number().min(0).max(1);

// ── Create evidence ──

export const CreateScanEvidenceSchema = z.object({
  scanResultId: cuid,
  promptText: z.string().min(1),
  promptVersion: z.string().max(100).optional(),
  provider: LLMProviderSchema,
  modelName: z.string().min(1).max(200),
  modelVersion: z.string().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).optional(),
  systemPrompt: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  rawResponse: z.string().min(1),
  rawTokenCount: z.number().int().min(0).optional(),
  promptTokens: z.number().int().min(0).optional(),
  latencyMs: z.number().int().min(0).optional(),
  executedAt: z.coerce.date(),
  extractedSources: z
    .array(
      z.object({
        domain: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
});
export type CreateScanEvidenceInput = z.infer<typeof CreateScanEvidenceSchema>;

// ── Update evidence (mutable fields only) ──

export const UpdateScanEvidenceSchema = z.object({
  analystNotes: z.string().optional(),
  analystConfidence: confidenceScore.optional(),
});
export type UpdateScanEvidenceInput = z.infer<typeof UpdateScanEvidenceSchema>;

// ── Approve/reject evidence ──

export const TransitionEvidenceSchema = z.object({
  evidenceId: cuid,
  targetStatus: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});
export type TransitionEvidenceInput = z.infer<typeof TransitionEvidenceSchema>;

// ── Create report evidence link ──

export const CreateReportEvidenceSchema = z.object({
  reportId: cuid,
  scanEvidenceId: cuid,
  sectionHeading: z.string().max(255).optional(),
  claimText: z.string().optional(),
  evidenceRole: z.enum(["primary", "supporting", "counter"]).optional(),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateReportEvidenceInput = z.infer<
  typeof CreateReportEvidenceSchema
>;
