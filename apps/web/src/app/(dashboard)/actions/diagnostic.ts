"use server";

import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  CreateEngagementSchema,
  ApproveFindingSchema,
  RejectFindingSchema,
  UpdateFindingNarrativeSchema,
  PublishEngagementSchema,
  validateDiagnosticDelivery,
  isMaterialFinding,
  extractCandidateFindings,
} from "@antellion/core";
import { getAuthContext } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { nanoid } from "nanoid";

// ── Default personas seeded per category on first creation ───

const DEFAULT_PERSONAS_FOR_CATEGORY = [
  {
    archetype: "EARLY_CAREER" as const,
    label: "Early-career hire",
    intent: "Entry-level candidate (0-3 yrs) evaluating employers for career start",
    seedContext:
      "You are an early-career candidate (0-3 years of experience) evaluating potential employers. You care about learning opportunities, mentorship, culture fit, and starting salary.",
  },
  {
    archetype: "MID_CAREER_IC" as const,
    label: "Mid-career individual contributor",
    intent: "Mid-career IC (4-8 yrs) comparing employers on growth and compensation",
    seedContext:
      "You are a mid-career individual contributor (4-8 years of experience) evaluating potential employers. You care about compensation, growth trajectory, technical challenges, and work-life balance.",
  },
  {
    archetype: "SENIOR_IC" as const,
    label: "Senior individual contributor",
    intent: "Senior IC (8-15 yrs) evaluating employer reputation and technical excellence",
    seedContext:
      "You are a senior individual contributor (8-15 years of experience) evaluating potential employers. You care about engineering quality, autonomy, impact, equity compensation, and leadership quality.",
  },
  {
    archetype: "MANAGER" as const,
    label: "People manager",
    intent: "People manager (5+ yrs) assessing leadership culture and org structure",
    seedContext:
      "You are a people manager (5+ years of experience) evaluating potential employers. You care about company culture, leadership quality, management philosophy, headcount growth, and career advancement.",
  },
  {
    archetype: "EXECUTIVE" as const,
    label: "Executive / VP-level candidate",
    intent: "Executive (VP/C-level) evaluating strategic fit and organizational health",
    seedContext:
      "You are a VP or C-level executive candidate evaluating potential employers. You care about company vision, board composition, executive team quality, financial health, and strategic positioning.",
  },
] as const;

// ── createEngagement ─────────────────────────────────────────

/**
 * Create a new Diagnostic engagement.
 *
 * Lazy-creates the JobCategory + default Persona catalog if this is the
 * first engagement for this category. Binds the selected 3 personas to
 * the engagement via EngagementPersona join rows.
 */
export async function createEngagement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { engagementId?: string }> {
  let personasRaw: unknown;
  try {
    const raw = formData.get("personas");
    personasRaw = raw ? JSON.parse(String(raw)) : [];
  } catch {
    return { message: "Invalid personas format — expected JSON." };
  }

  const result = validate(CreateEngagementSchema, {
    clientId: formData.get("clientId"),
    jobCategoryName: formData.get("jobCategoryName"),
    jobCategorySlug: formData.get("jobCategorySlug"),
    personas: personasRaw,
    notes: formData.get("notes") || undefined,
  });

  if (!result.success) return { errors: result.errors };

  const { clientId, jobCategoryName, jobCategorySlug, personas, notes } = result.data;
  const { organizationId, userId } = await getAuthContext();

  // Org scope check on client
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true, name: true },
  });
  if (!client) return { message: "Client not found." };

  let engagementId: string;

  try {
    engagementId = await prisma.$transaction(async (tx) => {
      // ── Lazy-create JobCategory ──────────────────────────
      let jobCategory = await tx.jobCategory.findFirst({
        where: { organizationId, slug: jobCategorySlug },
        select: { id: true },
      });

      if (!jobCategory) {
        jobCategory = await tx.jobCategory.create({
          data: {
            organizationId,
            slug: jobCategorySlug,
            name: jobCategoryName,
          },
          select: { id: true },
        });

        // Seed the 5 default personas for this new category
        await tx.persona.createMany({
          data: DEFAULT_PERSONAS_FOR_CATEGORY.map((p) => ({
            organizationId,
            jobCategoryId: jobCategory!.id,
            archetype: p.archetype,
            label: p.label,
            intent: p.intent,
            seedContext: p.seedContext,
            isCatalog: true,
          })),
          skipDuplicates: true,
        });
      }

      const jobCategoryId = jobCategory.id;

      // ── Upsert personas from input ───────────────────────
      const personaIds: string[] = [];
      for (const personaInput of personas) {
        // Find or create the catalog persona for this archetype
        let persona = await tx.persona.findFirst({
          where: {
            organizationId,
            jobCategoryId,
            archetype: personaInput.archetype,
          },
          select: { id: true },
        });

        if (!persona) {
          persona = await tx.persona.create({
            data: {
              organizationId,
              jobCategoryId,
              archetype: personaInput.archetype,
              label: personaInput.label,
              intent: personaInput.intent ?? null,
              seedContext: personaInput.seedContext ?? null,
              isCatalog: true,
            },
            select: { id: true },
          });
        }

        personaIds.push(persona.id);
      }

      // ── Create the Engagement ────────────────────────────
      const engagement = await tx.engagement.create({
        data: {
          organizationId,
          clientId,
          jobCategoryId,
          tier: "DIAGNOSTIC",
          status: "SCOPING",
          notes: notes ?? null,
        },
        select: { id: true },
      });

      // ── Bind personas via EngagementPersona ──────────────
      for (let i = 0; i < personaIds.length; i++) {
        const personaId = personaIds[i]!;
        const personaInput = personas[i]!;

        await tx.engagementPersona.create({
          data: {
            engagementId: engagement.id,
            personaId,
            labelOverride: personaInput.labelOverride ?? null,
            intentOverride: personaInput.intentOverride ?? null,
            seedContextOverride: personaInput.seedContextOverride ?? null,
            sortOrder: i,
          },
        });
      }

      return engagement.id;
    });
  } catch (e) {
    console.error("createEngagement failed:", e);
    return { message: "Failed to create engagement. Please try again." };
  }

  return { engagementId };
}

// ── triggerEngagementScan ────────────────────────────────────

/**
 * Create a ScanRun for a Diagnostic engagement with the matrix dimensions.
 *
 * Sets metadata.models and metadata.personaIds so the scan worker knows
 * to expand the (query × model × persona) matrix.
 */
export async function triggerEngagementScan(
  engagementId: string,
  queryClusterIds: string[],
): Promise<{ scanRunId: string } | { error: string }> {
  const { organizationId } = await getAuthContext();

  const engagement = await prisma.engagement.findFirst({
    where: { id: engagementId, organizationId },
    select: {
      id: true,
      status: true,
      clientId: true,
      personas: {
        select: {
          personaId: true,
          seedContextOverride: true,
          persona: {
            select: { id: true, label: true, seedContext: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!engagement) return { error: "Engagement not found." };
  if (engagement.status !== "SCOPING" && engagement.status !== "REVIEW") {
    return { error: "Engagement is not in a state that can be scanned." };
  }

  const personaIds = engagement.personas.map((ep) => ep.personaId);

  // Diagnostic uses all 4 providers
  const diagnosticModels = [
    "gpt-4o",
    "claude-3-5-sonnet-20241022",
    "gemini-1.5-pro",
    "sonar-pro",
  ];

  const scanRun = await prisma.scanRun.create({
    data: {
      clientId: engagement.clientId,
      engagementId: engagement.id,
      status: "RUNNING",
      startedAt: new Date(),
      queryCount: queryClusterIds.length, // will be updated by worker
      metadata: {
        automated: true,
        diagnostic: true,
        engagementId: engagement.id,
        queryClusterIds,
        models: diagnosticModels,
        personaIds,
      } satisfies Prisma.InputJsonObject,
    },
    select: { id: true },
  });

  // Transition engagement to SCANNING
  await prisma.engagement.update({
    where: { id: engagement.id },
    data: { status: "SCANNING" },
  });

  return { scanRunId: scanRun.id };
}

// ── materializeCandidateFindings ─────────────────────────────

/**
 * Run the deterministic candidate-finding extractor and persist results
 * as DRAFT Finding records for operator review.
 *
 * Called after the engagement scan completes. Idempotent: existing DRAFT
 * findings are cleared and replaced with the fresh extraction.
 */
export async function materializeCandidateFindings(
  engagementId: string,
): Promise<{ count: number } | { error: string }> {
  const { organizationId } = await getAuthContext();

  const engagement = await prisma.engagement.findFirst({
    where: { id: engagementId, organizationId },
    select: {
      id: true,
      status: true,
      client: { select: { name: true } },
      scanRuns: {
        where: { status: "COMPLETED" },
        select: { id: true },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!engagement) return { error: "Engagement not found." };

  const latestScan = engagement.scanRuns[0];
  if (!latestScan) return { error: "No completed scan run found for this engagement." };

  // Fetch all scan results for this scan run with required fields
  const rawResults = await prisma.scanResult.findMany({
    where: { scanRunId: latestScan.id, competitorId: null },
    select: {
      id: true,
      queryId: true,
      modelName: true,
      personaId: true,
      mentioned: true,
      visibilityScore: true,
      sentimentScore: true,
      response: true,
      metadata: true,
      citations: { select: { domain: true } },
      query: {
        select: {
          text: true,
          stage: true,
          queryCluster: { select: { stage: true } },
        },
      },
    },
  });

  // Shape results for the extractor
  const results = rawResults.map((r) => {
    const meta = r.metadata as Record<string, unknown> | null;
    const competitorMentions = Array.isArray(meta?.competitorMentions)
      ? (meta.competitorMentions as Array<{ name: string; mentioned: boolean }>)
      : [];

    const stage = (r.query.stage ?? r.query.queryCluster.stage ?? null) as string | null;

    return {
      id: r.id,
      queryId: r.queryId,
      queryText: r.query.text,
      stage,
      modelName: r.modelName,
      personaId: r.personaId,
      personaLabel: (meta?.personaLabel as string | null) ?? null,
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore,
      sentimentScore: r.sentimentScore,
      response: r.response,
      citationDomains: r.citations.map((c) => c.domain ?? "").filter(Boolean),
      competitorMentions,
    };
  });

  const candidates = extractCandidateFindings(results, engagement.client.name);

  // Clear existing DRAFT findings and replace (idempotent)
  await prisma.$transaction(async (tx) => {
    await tx.finding.deleteMany({
      where: { engagementId, status: "DRAFT" },
    });

    if (candidates.length > 0) {
      await tx.finding.createMany({
        data: candidates.map((c, i) => ({
          engagementId,
          index: i + 1,
          namedIssue: c.namedIssue,
          evidenceScanResultIds: c.evidenceScanResultIds,
          evidenceCitations: c.evidenceCitations as Prisma.InputJsonObject[],
          actionableCategory: c.actionableCategory,
          personaId: c.personaId,
          modelName: c.modelName,
          stage: c.stage as any,
          competitorId: null,
          narrative: null,
          status: "DRAFT",
        })),
      });
    }
  });

  // Transition engagement to REVIEW
  if (engagement.status === "SCANNING") {
    await prisma.engagement.update({
      where: { id: engagement.id },
      data: { status: "REVIEW" },
    });
  }

  return { count: candidates.length };
}

// ── approveFinding ───────────────────────────────────────────

/**
 * Approve a finding: set status=APPROVED, freeze the narrative, record who approved.
 * Only DRAFT findings can be approved.
 */
export async function approveFinding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(ApproveFindingSchema, {
    findingId: formData.get("findingId"),
    narrative: formData.get("narrative"),
  });
  if (!result.success) return { errors: result.errors };

  const { findingId, narrative } = result.data;
  const { organizationId, userId } = await getAuthContext();

  const finding = await prisma.finding.findFirst({
    where: {
      id: findingId,
      engagement: { organizationId },
    },
    select: { id: true, status: true, engagementId: true },
  });

  if (!finding) return { message: "Finding not found." };
  if (finding.status !== "DRAFT") {
    return { message: "Only DRAFT findings can be approved." };
  }

  await prisma.finding.update({
    where: { id: findingId },
    data: {
      status: "APPROVED",
      narrative,
      approvedById: userId,
      approvedAt: new Date(),
    },
  });

  return null;
}

// ── rejectFinding ────────────────────────────────────────────

export async function rejectFinding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(RejectFindingSchema, {
    findingId: formData.get("findingId"),
    reason: formData.get("reason") || undefined,
  });
  if (!result.success) return { errors: result.errors };

  const { findingId, reason } = result.data;
  const { organizationId } = await getAuthContext();

  const finding = await prisma.finding.findFirst({
    where: {
      id: findingId,
      engagement: { organizationId },
    },
    select: { id: true, status: true },
  });

  if (!finding) return { message: "Finding not found." };
  if (finding.status === "APPROVED") {
    return { message: "Approved findings cannot be rejected." };
  }

  await prisma.finding.update({
    where: { id: findingId },
    data: {
      status: "REJECTED",
      narrative: reason ? `Rejected: ${reason}` : undefined,
    },
  });

  return null;
}

// ── updateFindingNarrative ────────────────────────────────────

export async function updateFindingNarrative(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(UpdateFindingNarrativeSchema, {
    findingId: formData.get("findingId"),
    namedIssue: formData.get("namedIssue") || undefined,
    narrative: formData.get("narrative") || undefined,
    actionableCategory: formData.get("actionableCategory") || undefined,
  });
  if (!result.success) return { errors: result.errors };

  const { findingId, namedIssue, narrative, actionableCategory } = result.data;
  const { organizationId } = await getAuthContext();

  const finding = await prisma.finding.findFirst({
    where: {
      id: findingId,
      engagement: { organizationId },
    },
    select: { id: true, status: true },
  });

  if (!finding) return { message: "Finding not found." };
  if (finding.status === "APPROVED") {
    return { message: "Approved findings are frozen. Reject and re-create to revise." };
  }

  await prisma.finding.update({
    where: { id: findingId },
    data: {
      ...(namedIssue !== undefined ? { namedIssue } : {}),
      ...(narrative !== undefined ? { narrative } : {}),
      ...(actionableCategory !== undefined ? { actionableCategory } : {}),
    },
  });

  return null;
}

// ── publishEngagement ────────────────────────────────────────

/**
 * Publish a Diagnostic engagement.
 *
 * Hard-block: returns 422-equivalent error if approvedMaterialFindingCount < 10.
 * On success: sets status=PUBLISHED, generates shareToken, materializes
 * FindingAuditEntry records for the Finding Audit Appendix.
 */
export async function publishEngagement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { shareToken?: string }> {
  const result = validate(PublishEngagementSchema, {
    engagementId: formData.get("engagementId"),
  });
  if (!result.success) return { errors: result.errors };

  const { engagementId } = result.data;
  const { organizationId } = await getAuthContext();

  const engagement = await prisma.engagement.findFirst({
    where: { id: engagementId, organizationId },
    select: {
      id: true,
      status: true,
      shareToken: true,
      shareTokenRevokedAt: true,
      findings: {
        select: {
          id: true,
          index: true,
          namedIssue: true,
          evidenceScanResultIds: true,
          actionableCategory: true,
          status: true,
          approvedById: true,
          approvedAt: true,
        },
      },
    },
  });

  if (!engagement) return { message: "Engagement not found." };
  if (engagement.status === "PUBLISHED") {
    // Idempotent: return existing token
    return { shareToken: engagement.shareToken ?? undefined };
  }
  if (!["REVIEW", "APPROVED"].includes(engagement.status)) {
    return { message: "Engagement must be in REVIEW or APPROVED status to publish." };
  }

  // ── Hard-block refund gate ───────────────────────────────
  const findingRecords = engagement.findings.map((f) => ({
    id: f.id,
    namedIssue: f.namedIssue,
    evidenceScanResultIds: f.evidenceScanResultIds as string[],
    actionableCategory: f.actionableCategory,
    status: f.status as "DRAFT" | "APPROVED" | "REJECTED",
  }));

  const validation = validateDiagnosticDelivery(findingRecords);

  if (!validation.valid) {
    // TODO: trigger Slack/email alert to Jordan on first trigger per engagement
    return {
      message: `Publish blocked: only ${validation.approvedMaterialCount} of ${validation.required} required material findings are approved. ${validation.shortfall} more needed.`,
    };
  }

  // ── Publish in transaction ───────────────────────────────
  const token = engagement.shareToken && !engagement.shareTokenRevokedAt
    ? engagement.shareToken
    : nanoid(16);

  await prisma.$transaction(async (tx) => {
    // Update engagement status
    await tx.engagement.update({
      where: { id: engagement.id },
      data: {
        status: "PUBLISHED",
        shareToken: token,
        shareTokenRevokedAt: null,
      },
    });

    // Materialize FindingAuditEntry records (immutable at publish time)
    const approvedMaterial = findingRecords.filter(
      (f) => f.status === "APPROVED" && isMaterialFinding(f),
    );

    for (const finding of approvedMaterial) {
      const full = engagement.findings.find((f) => f.id === finding.id)!;

      // Upsert: if re-publishing after revoke, replace the old entry
      await tx.findingAuditEntry.upsert({
        where: { findingId: finding.id },
        create: {
          findingId: finding.id,
          hasNamedIssue: Boolean(finding.namedIssue?.trim()),
          hasEvidence: finding.evidenceScanResultIds.length > 0,
          hasActionableCategory: Boolean(finding.actionableCategory?.trim()),
          isMaterial: true,
          namedIssueCopy: finding.namedIssue ?? "",
          actionableCategoryCopy: finding.actionableCategory ?? "",
          evidenceCount: finding.evidenceScanResultIds.length,
          approvedById: full.approvedById,
          approvedAt: full.approvedAt,
        },
        update: {
          hasNamedIssue: Boolean(finding.namedIssue?.trim()),
          hasEvidence: finding.evidenceScanResultIds.length > 0,
          hasActionableCategory: Boolean(finding.actionableCategory?.trim()),
          isMaterial: true,
          namedIssueCopy: finding.namedIssue ?? "",
          actionableCategoryCopy: finding.actionableCategory ?? "",
          evidenceCount: finding.evidenceScanResultIds.length,
          approvedById: full.approvedById,
          approvedAt: full.approvedAt,
        },
      });
    }
  });

  return { shareToken: token };
}

// ── generateEngagementShareToken ─────────────────────────────

/**
 * Idempotently generate or return the share token for a published engagement.
 */
export async function generateEngagementShareToken(
  engagementId: string,
): Promise<{ token: string; url: string }> {
  const { organizationId } = await getAuthContext();

  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const engagement = await prisma.engagement.findFirst({
    where: { id: engagementId, organizationId },
    select: { id: true, shareToken: true, shareTokenRevokedAt: true, status: true },
  });

  if (!engagement) throw new Error("Engagement not found.");
  if (engagement.status !== "PUBLISHED") throw new Error("Engagement is not published.");

  if (engagement.shareToken && !engagement.shareTokenRevokedAt) {
    return {
      token: engagement.shareToken,
      url: `${APP_URL}/diagnostic/${engagement.shareToken}`,
    };
  }

  const token = nanoid(16);
  await prisma.engagement.update({
    where: { id: engagement.id },
    data: { shareToken: token, shareTokenRevokedAt: null },
  });

  return { token, url: `${APP_URL}/diagnostic/${token}` };
}
