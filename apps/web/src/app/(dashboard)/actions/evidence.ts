"use server";

import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  CreateScanEvidenceSchema,
  TransitionEvidenceSchema,
  validateEvidenceTransition,
  validateEvidenceUpdate,
  validateResultTransition,
} from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { getAuthContext } from "@/lib/auth";

// ── createEvidence ──────────────────────────────────────────────────────────

/**
 * Creates a ScanEvidence record in DRAFT status for the given scan result.
 * The scan result must belong to the current organization.
 */
export async function createEvidence(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { evidenceId?: string }> {
  const result = validate(CreateScanEvidenceSchema, {
    scanResultId: formData.get("scanResultId"),
    promptText: formData.get("promptText"),
    provider: formData.get("provider"),
    modelName: formData.get("modelName"),
    rawResponse: formData.get("rawResponse"),
    executedAt: formData.get("executedAt") ?? new Date().toISOString(),
    promptVersion: formData.get("promptVersion") ?? undefined,
    modelVersion: formData.get("modelVersion") ?? undefined,
    temperature: formData.get("temperature")
      ? Number(formData.get("temperature"))
      : undefined,
    topP: formData.get("topP") ? Number(formData.get("topP")) : undefined,
    maxTokens: formData.get("maxTokens")
      ? Number(formData.get("maxTokens"))
      : undefined,
    latencyMs: formData.get("latencyMs")
      ? Number(formData.get("latencyMs"))
      : undefined,
    rawTokenCount: formData.get("rawTokenCount")
      ? Number(formData.get("rawTokenCount"))
      : undefined,
    promptTokens: formData.get("promptTokens")
      ? Number(formData.get("promptTokens"))
      : undefined,
  });

  if (!result.success) return { errors: result.errors };

  const {
    scanResultId,
    parameters,
    extractedSources,
    ...plainData
  } = result.data;
  const { organizationId } = await getAuthContext();

  // Verify the scan result belongs to the current org
  const scanResult = await prisma.scanResult.findFirst({
    where: {
      id: scanResultId,
      scanRun: { client: { organizationId } },
    },
    select: { id: true },
  });

  if (!scanResult) return { message: "Scan result not found." };

  // Determine next version number
  const latestEvidence = await prisma.scanEvidence.findFirst({
    where: { scanResultId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = latestEvidence ? latestEvidence.version + 1 : 1;

  const evidence = await prisma.scanEvidence.create({
    data: {
      ...plainData,
      scanResultId,
      version,
      status: "DRAFT",
      // Cast JSON fields explicitly to satisfy Prisma's InputJsonValue constraint
      parameters: parameters !== undefined
        ? (parameters as Prisma.InputJsonObject)
        : undefined,
      extractedSources: extractedSources !== undefined
        ? (extractedSources as unknown as Prisma.InputJsonArray)
        : undefined,
    },
    select: { id: true },
  });

  return { evidenceId: evidence.id };
}

// ── approveEvidence ─────────────────────────────────────────────────────────

/**
 * Approves or rejects a ScanEvidence record.
 *
 * Enforces:
 * - Org scoping through the evidence -> result -> scan -> client chain
 * - State machine transition via validateEvidenceTransition()
 * - Co-transition invariant: when evidence is approved/rejected, the parent
 *   ScanResult is updated to the matching status in the same transaction.
 * - Transition logs for both the evidence and the result transitions.
 */
export async function approveEvidence(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(TransitionEvidenceSchema, {
    evidenceId: formData.get("evidenceId"),
    targetStatus: formData.get("targetStatus"),
    note: formData.get("note") ?? undefined,
  });

  if (!result.success) return { errors: result.errors };

  const { evidenceId, targetStatus, note } = result.data;
  const { userId, organizationId, role } = await getAuthContext();

  // Fetch evidence and verify org ownership through the chain:
  // ScanEvidence -> ScanResult -> ScanRun -> Client -> Organization
  const evidence = await prisma.scanEvidence.findFirst({
    where: {
      id: evidenceId,
      scanResult: { scanRun: { client: { organizationId } } },
    },
    select: {
      id: true,
      status: true,
      scanResult: {
        select: {
          id: true,
          status: true,
          scanRun: {
            select: {
              triggeredById: true,
            },
          },
        },
      },
    },
  });

  if (!evidence) return { message: "Evidence not found." };

  const currentStatus = evidence.status as
    | "DRAFT"
    | "APPROVED"
    | "SUPERSEDED"
    | "REJECTED";

  // Validate immutability (no-op for empty field list, guards future callers)
  const immutabilityCheck = validateEvidenceUpdate(currentStatus, []);
  if (!immutabilityCheck.valid) {
    return { message: immutabilityCheck.reason };
  }

  // Self-review guard with role-based override.
  //
  // OWNER and ADMIN users are permitted to approve evidence they also triggered.
  // This is the expected solo-operator pattern and is explicitly logged via
  // self_approved: true in the transition log note so the audit trail is clear.
  // MEMBER and VIEWER roles still hit the standard reviewer-cannot-equal-analyst guard.
  const scanAnalystId = evidence.scanResult.scanRun.triggeredById;
  const isSelfReview = scanAnalystId !== null && userId === scanAnalystId;
  const selfReviewPermitted = isSelfReview && (role === "OWNER" || role === "ADMIN");

  // For the evidence transition, pass a sentinel actorId when self-review is
  // permitted so the validator's identity check does not block it.
  const effectiveActorId = selfReviewPermitted ? "self-approved-override" : userId;

  const transitionCheck = validateEvidenceTransition(
    currentStatus,
    targetStatus,
    {
      actorId: effectiveActorId,
      actorRole: role,
      scanAnalystId: selfReviewPermitted ? null : scanAnalystId,
      note,
    },
  );

  if (!transitionCheck.valid) {
    return { message: transitionCheck.reason };
  }

  // Map evidence target status to the corresponding ScanResult status
  const resultTargetStatus =
    targetStatus === "APPROVED" ? "APPROVED" : "REJECTED";
  const currentResultStatus = evidence.scanResult.status;
  const resultId = evidence.scanResult.id;

  // Guard: validate the co-transition on the parent ScanResult before writing.
  // Without this check, approving evidence on a REJECTED result would bypass the
  // result state machine and silently force it back to APPROVED.
  // For self-review by OWNER/ADMIN, pass null for actorId so the identity guard
  // does not interfere — the evidence transition already permitted self-review above.
  const resultTransitionCheck = validateResultTransition(
    currentResultStatus,
    resultTargetStatus,
    {
      actorId: selfReviewPermitted ? null : userId,
      scanAnalystId: selfReviewPermitted ? null : scanAnalystId,
    },
  );

  if (!resultTransitionCheck.valid) {
    return { message: `Cannot co-transition result: ${resultTransitionCheck.reason}` };
  }

  // Apply the transition and co-transition in a single transaction
  await prisma.$transaction(async (tx) => {
    // 1. Transition the evidence record
    await tx.scanEvidence.update({
      where: { id: evidenceId },
      data: {
        status: targetStatus,
        ...(targetStatus === "APPROVED"
          ? { approvedAt: new Date(), approvedById: userId }
          : {}),
        ...(note ? { analystNotes: note } : {}),
      },
    });

    // 2. Co-transition the parent ScanResult (invariant from design)
    await tx.scanResult.update({
      where: { id: resultId },
      data: { status: resultTargetStatus },
    });

    // 3. Log the evidence transition
    // When an OWNER/ADMIN self-approves, the note records self_approved: true
    // so the audit trail remains interpretable without losing the approval.
    const selfApproveNote = isSelfReview && selfReviewPermitted
      ? `self_approved: true${note ? ` — ${note}` : ""}`
      : note;

    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_EVIDENCE",
        entityId: evidenceId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        action: targetStatus === "APPROVED" ? "approveEvidence" : "rejectEvidence",
        actorId: userId,
        note: selfApproveNote,
      },
    });

    // 4. Log the result co-transition
    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RESULT",
        entityId: resultId,
        fromStatus: currentResultStatus,
        toStatus: resultTargetStatus,
        action: targetStatus === "APPROVED" ? "approveEvidence" : "rejectEvidence",
        actorId: userId,
        note: "Co-transition from evidence approval/rejection.",
      },
    });
  });

  return {};
}

// ── Confidence extraction helper ─────────────────────────────────────────────

/**
 * Safely extracts per-section confidence data from raw report metadata.
 * Returns an empty record if metadata is absent or malformed (backward compat).
 */
function extractPerSectionConfidence(
  metadata: unknown,
): Record<string, { score: number; tier: string }> {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  const meta = metadata as Record<string, unknown>;
  const confidence = meta.confidence;

  if (!confidence || typeof confidence !== "object" || Array.isArray(confidence)) {
    return {};
  }

  const conf = confidence as Record<string, unknown>;
  const perSection = conf.perSection;

  if (!perSection || typeof perSection !== "object" || Array.isArray(perSection)) {
    return {};
  }

  const result: Record<string, { score: number; tier: string }> = {};

  for (const [section, value] of Object.entries(perSection as Record<string, unknown>)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as Record<string, unknown>).score === "number" &&
      typeof (value as Record<string, unknown>).tier === "string"
    ) {
      result[section] = {
        score: (value as Record<string, unknown>).score as number,
        tier: (value as Record<string, unknown>).tier as string,
      };
    }
  }

  return result;
}

// ── getEvidenceByReport ─────────────────────────────────────────────────────

export interface EvidenceBySection {
  sectionHeading: string;
  confidence?: {
    score: number;
    tier: string;
  };
  items: {
    id: string;
    scanResultId: string;
    provider: string;
    modelName: string;
    executedAt: Date;
    status: string;
    confidenceScore: number | null;
    promptText: string;
    queryText: string | null;
    claimText: string | null;
    evidenceRole: string | null;
    sortOrder: number;
  }[];
}

/**
 * Fetches all evidence linked to a report, grouped by section heading.
 * The report must belong to the current organization.
 */
export async function getEvidenceByReport(
  reportId: string,
): Promise<EvidenceBySection[]> {
  const { organizationId } = await getAuthContext();

  // Verify report belongs to current org and fetch metadata for confidence data
  const report = await prisma.report.findFirst({
    where: { id: reportId, client: { organizationId } },
    select: { id: true, metadata: true },
  });

  if (!report) throw new Error("Report not found.");

  // Extract per-section confidence from report metadata (stored by generateReport)
  const perSectionConfidence = extractPerSectionConfidence(report.metadata);

  const links = await prisma.reportEvidence.findMany({
    where: { reportId },
    orderBy: [{ sectionHeading: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      sectionHeading: true,
      claimText: true,
      evidenceRole: true,
      sortOrder: true,
      scanEvidence: {
        select: {
          id: true,
          scanResultId: true,
          provider: true,
          modelName: true,
          executedAt: true,
          status: true,
          confidenceScore: true,
          promptText: true,
          scanResult: {
            select: {
              query: {
                select: { text: true },
              },
            },
          },
        },
      },
    },
  });

  // Group by section heading
  const sectionMap = new Map<string, EvidenceBySection["items"]>();

  for (const link of links) {
    const heading = link.sectionHeading ?? "General";
    const existing = sectionMap.get(heading) ?? [];

    existing.push({
      id: link.scanEvidence.id,
      scanResultId: link.scanEvidence.scanResultId,
      provider: link.scanEvidence.provider,
      modelName: link.scanEvidence.modelName,
      executedAt: link.scanEvidence.executedAt,
      status: link.scanEvidence.status,
      confidenceScore: link.scanEvidence.confidenceScore,
      promptText: link.scanEvidence.promptText,
      queryText: link.scanEvidence.scanResult.query?.text ?? null,
      claimText: link.claimText,
      evidenceRole: link.evidenceRole,
      sortOrder: link.sortOrder,
    });

    sectionMap.set(heading, existing);
  }

  return [...sectionMap.entries()].map(([sectionHeading, items]) => ({
    sectionHeading,
    confidence: perSectionConfidence[sectionHeading],
    items,
  }));
}
