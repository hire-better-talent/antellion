import type { TransitionContext, TransitionResult } from "./types";

// ── Completed scan statuses ──────────────────────────────────
// Accepts both the current "COMPLETED" value and the future "COMPLETE" value
// so the rule survives the planned enum rename without a code change.
const COMPLETE_STATUSES = new Set(["COMPLETED", "COMPLETE"]);

/**
 * Validates whether a report can be generated from the given scans.
 *
 * Rules (from unified workflow design, Section C):
 * 1. All selected scans must be in a COMPLETE/COMPLETED state.
 * 2. At least 1 approved scan result must exist across the selected scans.
 */
export function validateReportGeneration(
  scans: Array<{
    id: string;
    status: string;
    approvedResultCount: number;
  }>,
): TransitionResult {
  if (scans.length === 0) {
    return {
      valid: false,
      reason: "At least one scan must be selected to generate a report.",
    };
  }

  const incomplete = scans.filter((s) => !COMPLETE_STATUSES.has(s.status));
  if (incomplete.length > 0) {
    return {
      valid: false,
      reason: `All selected scans must be in COMPLETED status. ${incomplete.length} scan(s) are not yet complete.`,
    };
  }

  const totalApproved = scans.reduce((sum, s) => sum + s.approvedResultCount, 0);
  if (totalApproved === 0) {
    return {
      valid: false,
      reason:
        "No approved scan results found in the selected scans. At least one result must be approved before generating a report.",
    };
  }

  return { valid: true };
}

// ── Valid report transitions ─────────────────────────────────
//
// Lifecycle (using current ReportStatus enum values as aliases):
//   DRAFT     = DRAFT     — report generated, awaiting submission for review
//   REVIEW    = IN_REVIEW — submitted for review; QA auto-runs on entry
//   PUBLISHED = APPROVED  — QA passed + signed off; approved for delivery
//   ARCHIVED  = DELIVERED — report delivered; terminal
//
// Valid transitions:
//   DRAFT     -> REVIEW    (submit for review; QA auto-runs; reviewer must be assigned)
//   REVIEW    -> PUBLISHED (approve — requires QA PASS/CONDITIONAL_PASS + signoff)
//   REVIEW    -> DRAFT     (revision requested — note required)
//   PUBLISHED -> ARCHIVED  (deliver — terminal next step)
//   PUBLISHED -> REVIEW    (reopen — rare; ADMIN only)
//
// Explicitly blocked:
//   DRAFT     -> PUBLISHED  (cannot skip review)
//   DRAFT     -> ARCHIVED   (cannot deliver without review + approval)
//   REVIEW    -> ARCHIVED   (cannot deliver without being approved first)
//   ARCHIVED  -> anything   (terminal)
//   GENERATING -> anything  (legacy status; treat as stuck — must be manually recovered to DRAFT)

const VALID_REPORT_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  DRAFT: new Set(["REVIEW"]),                  // REVIEW = current enum for IN_REVIEW
  GENERATING: new Set(["DRAFT"]),              // legacy recovery path only
  REVIEW: new Set(["PUBLISHED", "DRAFT"]),     // PUBLISHED = current enum for APPROVED; no ARCHIVED skip
  PUBLISHED: new Set(["ARCHIVED", "REVIEW"]),  // ARCHIVED = current enum for DELIVERED; REVIEW = reopen
  ARCHIVED: new Set(),                         // terminal
};

/**
 * Validates a report status transition.
 *
 * Context fields:
 * - hasReviewer: reviewer is assigned to the report
 * - reviewerIsAuthor: reviewer and report author are the same person
 * - unapprovedEvidenceCount: number of linked evidence records not in APPROVED status
 */
export function validateReportTransition(
  currentStatus: string,
  targetStatus: string,
  context: TransitionContext & {
    hasReviewer?: boolean;
    reviewerIsAuthor?: boolean;
    unapprovedEvidenceCount?: number;
  },
): TransitionResult {
  const allowed = VALID_REPORT_TRANSITIONS[currentStatus];

  if (!allowed) {
    return {
      valid: false,
      reason: `Unrecognized report status: ${currentStatus}.`,
    };
  }

  if (!allowed.has(targetStatus)) {
    if (currentStatus === "ARCHIVED") {
      return { valid: false, reason: "ARCHIVED reports cannot be transitioned." };
    }
    return {
      valid: false,
      reason: `Cannot transition report from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // DRAFT -> REVIEW gate: reviewer must be assigned and must not be the author,
  // and all linked evidence must be APPROVED.
  // "REVIEW" is the current enum value for the IN_REVIEW lifecycle stage.
  if (currentStatus === "DRAFT" && targetStatus === "REVIEW") {
    if (context.hasReviewer === false) {
      return {
        valid: false,
        reason: "A reviewer must be assigned before submitting the report for review.",
      };
    }

    if (context.reviewerIsAuthor === true) {
      return {
        valid: false,
        reason: "The reviewer cannot be the same person who generated the report.",
      };
    }

    const unapproved = context.unapprovedEvidenceCount ?? 0;
    if (unapproved > 0) {
      return {
        valid: false,
        reason: `${unapproved} scan result(s) have not been approved yet. All linked evidence must be APPROVED before submitting the report for review.`,
      };
    }
  }

  // REVIEW -> DRAFT (revision request): note required.
  // "REVIEW" is the current enum value for IN_REVIEW; "DRAFT" is the revision target.
  if (currentStatus === "REVIEW" && targetStatus === "DRAFT") {
    const note = context.note?.trim();
    if (!note) {
      return {
        valid: false,
        reason: "A revision note is required when requesting changes to a report.",
      };
    }
  }

  return { valid: true };
}
