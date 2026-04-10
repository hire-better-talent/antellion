import type { TransitionContext, TransitionResult } from "./types";

// ── Valid ScanResult transitions ─────────────────────────────
//
// CAPTURED     -> NEEDS_REVIEW (auto-flag or manual)
// CAPTURED     -> APPROVED     (direct approve; reviewer != analyst)
// NEEDS_REVIEW -> APPROVED     (reviewer != analyst)
// NEEDS_REVIEW -> REJECTED     (note required; reviewer != analyst)
// APPROVED     -> NEEDS_REVIEW (reopen; rare)
//
// REJECTED is terminal — no outbound transitions on the same result.
// Re-capture creates a NEW ScanResult; the old one stays REJECTED forever.

const VALID_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  CAPTURED: new Set(["NEEDS_REVIEW", "APPROVED"]),
  NEEDS_REVIEW: new Set(["APPROVED", "REJECTED"]),
  APPROVED: new Set(["NEEDS_REVIEW"]),
  REJECTED: new Set(), // terminal
};

/**
 * Validates a ScanResult status transition.
 *
 * Co-transition invariant (enforced in the server action, not here):
 *   result -> APPROVED  =>  evidence MUST also -> APPROVED (same tx)
 *   result -> REJECTED  =>  evidence MUST also -> REJECTED (same tx)
 */
export function validateResultTransition(
  currentStatus: string,
  targetStatus: string,
  context: TransitionContext & { scanAnalystId?: string | null },
): TransitionResult {
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed) {
    return {
      valid: false,
      reason: `Unrecognized ScanResult status: ${currentStatus}.`,
    };
  }

  if (!allowed.has(targetStatus)) {
    if (currentStatus === "REJECTED") {
      return {
        valid: false,
        reason:
          "REJECTED results are terminal. Use recaptureResult to create a new result.",
      };
    }
    return {
      valid: false,
      reason: `Cannot transition ScanResult from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // Reviewer-cannot-equal-analyst guard for approval/rejection paths
  if (targetStatus === "APPROVED" || targetStatus === "REJECTED") {
    const { actorId, scanAnalystId } = context;
    if (
      actorId !== null &&
      scanAnalystId !== null &&
      scanAnalystId !== undefined &&
      actorId === scanAnalystId
    ) {
      return {
        valid: false,
        reason:
          "The analyst who recorded the scan result cannot approve or reject their own result.",
      };
    }
  }

  // Note is required when rejecting
  if (targetStatus === "REJECTED") {
    const note = context.note?.trim();
    if (!note) {
      return {
        valid: false,
        reason: "A note is required when rejecting a scan result.",
      };
    }
  }

  return { valid: true };
}

// ── Auto-flag threshold ──────────────────────────────────────

/**
 * Returns true if a newly created result should be auto-flagged for review
 * based on its visibility score. Threshold: score < 20 (or null).
 */
export const AUTO_FLAG_VISIBILITY_THRESHOLD = 20;

export function shouldAutoFlag(visibilityScore: number | null): boolean {
  return visibilityScore === null || visibilityScore < AUTO_FLAG_VISIBILITY_THRESHOLD;
}
