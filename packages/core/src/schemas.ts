import { z } from "zod";

// ─── Enums (mirrors Prisma — keeps core free of @prisma/client) ─

export const UserRole = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
export type UserRole = z.infer<typeof UserRole>;

export const ScanRunStatus = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type ScanRunStatus = z.infer<typeof ScanRunStatus>;

export const ContentAssetType = z.enum([
  "CAREERS_PAGE",
  "JOB_POSTING",
  "BLOG_POST",
  "PRESS_RELEASE",
  "SOCIAL_PROFILE",
  "REVIEW_SITE",
  "OTHER",
]);
export type ContentAssetType = z.infer<typeof ContentAssetType>;

export const ReportStatus = z.enum([
  "DRAFT",
  "GENERATING",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
]);
export type ReportStatus = z.infer<typeof ReportStatus>;

export const RecommendationCategory = z.enum([
  "CONTENT_GAP",
  "COMPETITIVE_POSITIONING",
  "EMPLOYER_BRAND",
  "TECHNICAL_REPUTATION",
  "COMPENSATION_PERCEPTION",
  "CULTURE_SIGNAL",
  "DIVERSITY_INCLUSION",
  "OTHER",
]);
export type RecommendationCategory = z.infer<typeof RecommendationCategory>;

export const RecommendationPriority = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);
export type RecommendationPriority = z.infer<typeof RecommendationPriority>;

export const RecommendationStatus = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "DISMISSED",
]);
export type RecommendationStatus = z.infer<typeof RecommendationStatus>;

export const ScanResultStatus = z.enum([
  "CAPTURED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
]);
export type ScanResultStatus = z.infer<typeof ScanResultStatus>;

export const QAStatus = z.enum([
  "PENDING",
  "PASS",
  "FAIL",
  "CONDITIONAL_PASS",
]);
export type QAStatus = z.infer<typeof QAStatus>;

export const QACheckOutcome = z.enum(["PASS", "FAIL", "WARNING", "SKIPPED"]);
export type QACheckOutcome = z.infer<typeof QACheckOutcome>;

export const ConfidenceTier = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type ConfidenceTier = z.infer<typeof ConfidenceTier>;

export const RevenueScale = z.enum([
  "startup",
  "growth",
  "mid-market",
  "enterprise",
  "fortune500",
]);
export type RevenueScale = z.infer<typeof RevenueScale>;

// ─── Primitives ─────────────────────────────────────────────

export const cuid = z.string().cuid();

export const domain = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format");

export const slug = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");

export const email = z.string().email().max(320);

/** 0–100, used for visibility and relevance scores */
export const percentScore = z.number().min(0).max(100);

/** -1 to 1, used for sentiment */
export const sentimentScore = z.number().min(-1).max(1);

const shortText = z.string().min(1).max(255);
const longText = z.string().max(2000);
const url = z.string().url().max(2048);

// ─── Organization ───────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: shortText,
  slug,
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: shortText.optional(),
  slug: slug.optional(),
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

// ─── User ───────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  organizationId: cuid,
  email,
  name: shortText,
  role: UserRole.default("MEMBER"),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: shortText.optional(),
  role: UserRole.optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ─── Client ─────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  organizationId: cuid,
  name: shortText,
  domain,
  industry: z.string().max(255).optional(),
  description: longText.optional(),
  nicheKeywords: z.string().max(1000).optional(),
  logoUrl: url.optional(),
  careerUrl: url.optional(),
  // Company profile (enterprise context)
  employeeCount: z.number().int().positive().optional(),
  headquarters: z.string().max(255).optional(),
  additionalLocations: z.string().max(2000).optional(),
  publiclyTraded: z.boolean().optional(),
  revenueScale: RevenueScale.optional(),
  knownFor: z.string().max(2000).optional(),
});
export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = z.object({
  name: shortText.optional(),
  industry: z.string().max(255).optional(),
  description: longText.optional(),
  nicheKeywords: z.string().max(1000).optional(),
  logoUrl: url.optional(),
  careerUrl: url.optional(),
  // Company profile (enterprise context)
  employeeCount: z.number().int().positive().nullable().optional(),
  headquarters: z.string().max(255).optional(),
  additionalLocations: z.string().max(2000).optional(),
  publiclyTraded: z.boolean().optional(),
  revenueScale: RevenueScale.nullable().optional(),
  knownFor: z.string().max(2000).optional(),
});
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

// ─── Competitor ─────────────────────────────────────────────

export const CreateCompetitorSchema = z.object({
  clientId: cuid,
  name: shortText,
  domain,
  industry: z.string().max(255).optional(),
  description: longText.optional(),
  careerUrl: url.optional(),
});
export type CreateCompetitorInput = z.infer<typeof CreateCompetitorSchema>;

export const UpdateCompetitorSchema = z.object({
  name: shortText.optional(),
  industry: z.string().max(255).optional(),
  description: longText.optional(),
  careerUrl: url.optional(),
});
export type UpdateCompetitorInput = z.infer<typeof UpdateCompetitorSchema>;

// ─── Role Profile ───────────────────────────────────────────

export const CreateRoleProfileSchema = z.object({
  clientId: cuid,
  title: shortText,
  department: z.string().max(255).optional(),
  seniority: z.string().max(100).optional(),
  description: longText.optional(),
});
export type CreateRoleProfileInput = z.infer<typeof CreateRoleProfileSchema>;

export const UpdateRoleProfileSchema = z.object({
  title: shortText.optional(),
  department: z.string().max(255).optional(),
  seniority: z.string().max(100).optional(),
  description: longText.optional(),
});
export type UpdateRoleProfileInput = z.infer<typeof UpdateRoleProfileSchema>;

// ─── Query Cluster & Query ──────────────────────────────────

export const CreateQueryClusterSchema = z.object({
  clientId: cuid,
  roleProfileId: cuid.optional(),
  name: shortText,
  intent: z.string().max(500).optional(),
  description: longText.optional(),
});
export type CreateQueryClusterInput = z.infer<typeof CreateQueryClusterSchema>;

export const UpdateQueryClusterSchema = z.object({
  roleProfileId: cuid.nullable().optional(),
  name: shortText.optional(),
  intent: z.string().max(500).optional(),
  description: longText.optional(),
});
export type UpdateQueryClusterInput = z.infer<typeof UpdateQueryClusterSchema>;

export const CreateQuerySchema = z.object({
  queryClusterId: cuid,
  text: z.string().min(1).max(1000),
  intent: z.string().max(500).optional(),
});
export type CreateQueryInput = z.infer<typeof CreateQuerySchema>;

export const UpdateQuerySchema = z.object({
  text: z.string().min(1).max(1000).optional(),
  intent: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateQueryInput = z.infer<typeof UpdateQuerySchema>;

// ─── Scan ───────────────────────────────────────────────────

export const CreateScanRunSchema = z.object({
  clientId: cuid,
  triggeredById: cuid.optional(),
  model: z.string().max(100).optional(),
});
export type CreateScanRunInput = z.infer<typeof CreateScanRunSchema>;

export const RecordScanResultSchema = z.object({
  scanRunId: cuid,
  queryId: cuid,
  competitorId: cuid.optional(),
  response: z.string().min(1),
  visibilityScore: percentScore.optional(),
  sentimentScore: sentimentScore.optional(),
  relevanceScore: percentScore.optional(),
  ranking: z.number().int().min(0).optional(),
  mentioned: z.boolean().default(false),
  tokenCount: z.number().int().min(0).optional(),
  latencyMs: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type RecordScanResultInput = z.infer<typeof RecordScanResultSchema>;

export const CreateCitationSourceSchema = z.object({
  scanResultId: cuid,
  url: url,
  title: z.string().max(500).optional(),
  domain: z.string().max(255).optional(),
  sourceType: z.string().max(100).optional(),
});
export type CreateCitationSourceInput = z.infer<
  typeof CreateCitationSourceSchema
>;

// ─── Content Asset ──────────────────────────────────────────

export const CreateContentAssetSchema = z.object({
  clientId: cuid,
  url: url,
  title: z.string().max(500).optional(),
  assetType: ContentAssetType,
  content: z.string().optional(),
});
export type CreateContentAssetInput = z.infer<typeof CreateContentAssetSchema>;

/** Inline asset shape submitted alongside the client form on creation. */
export const InlineAssetSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500),
  assetType: ContentAssetType,
});
export type InlineAssetInput = z.infer<typeof InlineAssetSchema>;

/**
 * Extended client creation schema that includes the 6 standard content assets.
 * Used by createClient when the form submits assets alongside client fields.
 */
export const CreateClientWithAssetsSchema = CreateClientSchema.extend({
  assets: z.array(InlineAssetSchema).min(1),
});
export type CreateClientWithAssetsInput = z.infer<
  typeof CreateClientWithAssetsSchema
>;

export const UpdateContentAssetSchema = z.object({
  title: z.string().max(500).optional(),
  assetType: ContentAssetType.optional(),
  content: z.string().optional(),
  lastCrawled: z.coerce.date().optional(),
});
export type UpdateContentAssetInput = z.infer<typeof UpdateContentAssetSchema>;

// ─── Report ─────────────────────────────────────────────────

export const CreateReportSchema = z.object({
  clientId: cuid,
  generatedById: cuid.optional(),
  title: shortText,
  summary: z.string().optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const UpdateReportSchema = z.object({
  title: shortText.optional(),
  status: ReportStatus.optional(),
  summary: z.string().optional(),
});
export type UpdateReportInput = z.infer<typeof UpdateReportSchema>;

// ─── Recommendation ─────────────────────────────────────────

export const CreateRecommendationSchema = z.object({
  reportId: cuid,
  category: RecommendationCategory,
  priority: RecommendationPriority.default("MEDIUM"),
  title: shortText,
  description: z.string().min(1),
  impact: z.string().optional(),
  effort: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateRecommendationInput = z.infer<
  typeof CreateRecommendationSchema
>;

export const UpdateRecommendationSchema = z.object({
  category: RecommendationCategory.optional(),
  priority: RecommendationPriority.optional(),
  title: shortText.optional(),
  description: z.string().min(1).optional(),
  impact: z.string().optional(),
  effort: z.string().max(50).optional(),
  status: RecommendationStatus.optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateRecommendationInput = z.infer<
  typeof UpdateRecommendationSchema
>;

// ─── Workflow schemas ───────────────────────────────────────

/** Trigger a scan for a client across selected query clusters. */
export const TriggerScanSchema = z.object({
  clientId: cuid,
  triggeredById: cuid.optional(),
  model: z.string().max(100).optional(),
  queryDepth: z.string().max(100).optional(),
  focusArea: z.string().max(255).optional(),
  queryClusterIds: z.array(cuid).min(1, "Select at least one query cluster"),
  includeCompetitors: z.boolean().default(true),
});
export type TriggerScanInput = z.infer<typeof TriggerScanSchema>;

/** Request generation of an audit report from completed scans. */
export const GenerateReportSchema = z.object({
  clientId: cuid,
  generatedById: cuid.optional(),
  title: shortText,
  scanRunIds: z.array(cuid).min(1, "Select at least one completed scan"),
});
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;

/** Generate candidate-intent and employer-brand queries for a client. */
export const GenerateQueriesSchema = z.object({
  clientId: cuid,
  roleTitle: shortText,
  geography: shortText.optional(),
  businessContext: longText.optional(),
});
export type GenerateQueriesInput = z.infer<typeof GenerateQueriesSchema>;

/** Manual entry of an AI response for a scan query. */
export const ManualScanResultSchema = z.object({
  scanRunId: cuid,
  queryId: cuid,
  response: z.string().min(1, "Response text is required"),
  citedDomains: z.string().optional(),
});
export type ManualScanResultInput = z.infer<typeof ManualScanResultSchema>;

// ─── Lead ──────────────────────────────────────────────────

export const LeadSource = z.enum(["landing_page", "linkedin", "referral"]);
export type LeadSource = z.infer<typeof LeadSource>;

export const LeadStatus = z.enum([
  "NEW",
  "CONTACTED",
  "SNAPSHOT_SENT",
  "CONVERTED",
  "DECLINED",
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const CreateLeadSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  companyDomain: domain,
  contactName: z.string().min(1, "Your name is required").max(255),
  contactEmail: z.string().email("Valid work email is required").max(255),
  contactTitle: z.string().max(255).optional(),
  topCompetitor: z.string().max(255).optional(),
  primaryRole: z.string().max(255).optional(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

/** Create a snapshot scan for a prospect — orchestrates client, competitors, queries, and scan. */
export const CreateSnapshotSchema = z.object({
  prospectName: z.string().min(1).max(255),
  prospectDomain: domain,
  industry: z.string().min(1).max(255),
  nicheKeywords: z.string().max(1000).optional(),
  geography: z.string().max(255).optional(),
  competitors: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        domain,
      }),
    )
    .min(2)
    .max(5),
  roleTitle: z.string().min(1).max(255),
});
export type CreateSnapshotInput = z.infer<typeof CreateSnapshotSchema>;
