"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@antellion/db";
import { validateResultTransition, validateEvidenceTransition } from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { getOrganizationId } from "@/lib/auth";

// ── Shared result fetcher ────────────────────────────────────

/**
 * Fetches a ScanResult with org scoping and enough data to perform
 * result + evidence transitions. Returns null if not found or out of scope.
 */
async function fetchResultWithOrgScope(resultId: string, organizationId: string) {
  return prisma.scanResult.findFirst({
    where: {
      id: resultId,
      scanRun: { client: { organizationId } },
    },
    select: {
      id: true,
      status: true,
      scanRun: {
        select: {
          id: true,
          triggeredById: true,
        },
      },
      evidence: {
        where: { status: { in: ["DRAFT", "APPROVED"] } },
        orderBy: { version: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
}

// ── approveResult ────────────────────────────────────────────

/**
 * Transitions a ScanResult from CAPTURED or NEEDS_REVIEW to APPROVED.
 *
 * Co-transition invariant: the latest DRAFT evidence record for this result
 * is also transitioned to APPROVED in the same database transaction.
 *
 * Org scoping: verified through ScanResult -> ScanRun -> Client -> Organization.
 */
export async function approveResult(resultId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const result = await fetchResultWithOrgScope(resultId, organizationId);

  if (!result) return { message: "Scan result not found." };

  // Evidence must exist before a result can be approved. An approval without
  // any backing evidence record is meaningless and breaks the audit chain.
  if (!result.evidence || result.evidence.length === 0) {
    return {
      message:
        "Cannot approve: no evidence record exists for this result. Evidence must be captured before approval.",
    };
  }

  const currentStatus = result.status;

  // Validate the ScanResult transition.
  // TODO(auth): replace actorId: null with the real authenticated user ID.
  // With actorId: null the reviewer-cannot-equal-analyst guard in
  // validateResultTransition is intentionally bypassed (the guard only fires
  // when both IDs are non-null and equal). Once auth is wired, pass the real
  // actorId here and remove this comment.
  const resultCheck = validateResultTransition(currentStatus, "APPROVED", {
    actorId: null,
    scanAnalystId: result.scanRun.triggeredById,
  });

  if (!resultCheck.valid) {
    return { message: resultCheck.reason };
  }

  // Find the evidence to co-transition (must be DRAFT).
  // If the top evidence record is already APPROVED (e.g., re-approve after reopen),
  // the co-transition is skipped — APPROVED evidence is immutable.
  const evidence = result.evidence[0];

  await prisma.$transaction(async (tx) => {
    // 1. Transition the ScanResult
    await tx.scanResult.update({
      where: { id: resultId },
      data: { status: "APPROVED" },
    });

    // 2. Transition logs for the result
    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RESULT",
        entityId: resultId,
        fromStatus: currentStatus,
        toStatus: "APPROVED",
        action: "approveResult",
        actorId: null,
      },
    });

    // 3. Co-transition DRAFT evidence -> APPROVED
    if (evidence && evidence.status === "DRAFT") {
      // Validate evidence co-transition.
      // TODO(auth): replace actorId: "system" with the real authenticated user ID.
      // See the approveEvidence action for the same bypass and rationale.
      const evidenceCheck = validateEvidenceTransition("DRAFT", "APPROVED", {
        actorId: "system",
        actorRole: "ADMIN",
        scanAnalystId: result.scanRun.triggeredById,
      });

      if (!evidenceCheck.valid) {
        throw new Error(`Evidence co-transition blocked: ${evidenceCheck.reason}`);
      }

      await tx.scanEvidence.update({
        where: { id: evidence.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: null, // TODO: real actorId once auth is wired
        },
      });

      await tx.transitionLog.create({
        data: {
          entityType: "SCAN_EVIDENCE",
          entityId: evidence.id,
          fromStatus: "DRAFT",
          toStatus: "APPROVED",
          action: "approveResult",
          actorId: null,
          note: "Co-transition from approveResult.",
        },
      });
    }
  });

  revalidatePath(`/scans/${result.scanRun.id}`);
  return {};
}

// ── rejectResult ─────────────────────────────────────────────

/**
 * Transitions a ScanResult from NEEDS_REVIEW to REJECTED.
 *
 * Co-transition invariant: the latest DRAFT evidence record for this result
 * is also transitioned to REJECTED in the same database transaction.
 *
 * A non-empty rejection note is required.
 */
export async function rejectResult(
  resultId: string,
  note: string,
): Promise<ActionState> {
  if (!note || note.trim().length === 0) {
    return { message: "A rejection note is required." };
  }

  const organizationId = await getOrganizationId();
  const result = await fetchResultWithOrgScope(resultId, organizationId);

  if (!result) return { message: "Scan result not found." };

  const currentStatus = result.status;

  // Validate the ScanResult transition.
  // TODO(auth): replace actorId: null with the real authenticated user ID.
  // The reviewer-cannot-equal-analyst guard is bypassed while auth is not wired.
  const resultCheck = validateResultTransition(currentStatus, "REJECTED", {
    actorId: null,
    scanAnalystId: result.scanRun.triggeredById,
    note,
  });

  if (!resultCheck.valid) {
    return { message: resultCheck.reason };
  }

  const evidence = result.evidence[0];

  await prisma.$transaction(async (tx) => {
    // 1. Transition the ScanResult
    await tx.scanResult.update({
      where: { id: resultId },
      data: { status: "REJECTED" },
    });

    // 2. Log the result transition
    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RESULT",
        entityId: resultId,
        fromStatus: currentStatus,
        toStatus: "REJECTED",
        action: "rejectResult",
        actorId: null,
        note,
      },
    });

    // 3. Co-transition DRAFT evidence -> REJECTED
    if (evidence && evidence.status === "DRAFT") {
      // TODO(auth): replace actorId: "system" with the real authenticated user ID.
      // See the approveEvidence action for the same bypass and rationale.
      const evidenceCheck = validateEvidenceTransition("DRAFT", "REJECTED", {
        actorId: "system",
        actorRole: "ADMIN",
        scanAnalystId: result.scanRun.triggeredById,
        note,
      });

      if (!evidenceCheck.valid) {
        throw new Error(`Evidence co-transition blocked: ${evidenceCheck.reason}`);
      }

      await tx.scanEvidence.update({
        where: { id: evidence.id },
        data: {
          status: "REJECTED",
          analystNotes: note,
        },
      });

      await tx.transitionLog.create({
        data: {
          entityType: "SCAN_EVIDENCE",
          entityId: evidence.id,
          fromStatus: "DRAFT",
          toStatus: "REJECTED",
          action: "rejectResult",
          actorId: null,
          note: "Co-transition from rejectResult.",
        },
      });
    }
  });

  revalidatePath(`/scans/${result.scanRun.id}`);
  return {};
}

// ── flagResultForReview ──────────────────────────────────────

/**
 * Transitions a ScanResult from CAPTURED to NEEDS_REVIEW.
 * Used for manual flagging by an analyst.
 *
 * No evidence co-transition is required — evidence stays DRAFT while
 * the result is under review.
 */
export async function flagResultForReview(resultId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const result = await fetchResultWithOrgScope(resultId, organizationId);

  if (!result) return { message: "Scan result not found." };

  const currentStatus = result.status;

  // TODO(auth): replace actorId: null with the real authenticated user ID.
  const resultCheck = validateResultTransition(currentStatus, "NEEDS_REVIEW", {
    actorId: null,
    scanAnalystId: result.scanRun.triggeredById,
  });

  if (!resultCheck.valid) {
    return { message: resultCheck.reason };
  }

  await prisma.$transaction(async (tx) => {
    await tx.scanResult.update({
      where: { id: resultId },
      data: { status: "NEEDS_REVIEW" },
    });

    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RESULT",
        entityId: resultId,
        fromStatus: currentStatus,
        toStatus: "NEEDS_REVIEW",
        action: "flagResultForReview",
        actorId: null,
      },
    });
  });

  revalidatePath(`/scans/${result.scanRun.id}`);
  return {};
}

// ── Bulk approve all results in a scan ──────────────────────

/**
 * Approves ALL results in a scan that are in CAPTURED or NEEDS_REVIEW status.
 * Also co-transitions their evidence from DRAFT to APPROVED.
 * This is the fast path for automated scans where manual per-result review isn't needed.
 */
export async function bulkApproveResults(
  scanRunId: string,
): Promise<ActionState & { approvedCount?: number }> {
  const organizationId = await getOrganizationId();

  // Verify scan belongs to org
  const scan = await prisma.scanRun.findFirst({
    where: { id: scanRunId, client: { organizationId } },
    select: { id: true },
  });
  if (!scan) return { message: "Scan not found." };

  // Find all results that need approval
  const results = await prisma.scanResult.findMany({
    where: {
      scanRunId,
      status: { in: ["CAPTURED", "NEEDS_REVIEW"] },
    },
    select: {
      id: true,
      status: true,
      evidence: {
        where: { status: "DRAFT" },
        select: { id: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (results.length === 0) {
    return { message: "No results to approve.", approvedCount: 0 };
  }

  // Bulk approve in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const result of results) {
      await tx.scanResult.update({
        where: { id: result.id },
        data: { status: "APPROVED" },
      });

      const evidence = result.evidence[0];
      if (evidence) {
        await tx.scanEvidence.update({
          where: { id: evidence.id },
          data: { status: "APPROVED", approvedAt: new Date() },
        });
      }
    }

    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RUN",
        entityId: scanRunId,
        fromStatus: "RUNNING",
        toStatus: "RUNNING",
        action: "bulkApproveResults",
        actorId: null,
        note: `Bulk approved ${results.length} results.`,
      },
    });
  });

  revalidatePath(`/scans/${scanRunId}`);
  return { approvedCount: results.length };
}
