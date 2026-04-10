import type { EvidenceStatus, EvidenceTransitionContext } from "./types";

// ── Field mutability constants ──

export const IMMUTABLE_FIELDS = [
  "promptText",
  "promptVersion",
  "provider",
  "modelName",
  "modelVersion",
  "temperature",
  "topP",
  "maxTokens",
  "systemPrompt",
  "parameters",
  "rawResponse",
  "rawTokenCount",
  "promptTokens",
  "latencyMs",
  "executedAt",
  "extractedSources",
] as const;

export const ALWAYS_MUTABLE_FIELDS = [
  "analystNotes",
  "analystConfidence",
] as const;

const IMMUTABLE_STATUSES: ReadonlyArray<EvidenceStatus> = [
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
];

// ── Validation ──

/**
 * Returns whether the given fields can be updated on evidence with the given status.
 * DRAFT allows all edits. APPROVED/REJECTED/SUPERSEDED block immutable field changes.
 */
export function validateEvidenceUpdate(
  currentStatus: EvidenceStatus,
  fieldsBeingUpdated: string[],
): { valid: boolean; reason?: string } {
  if (!IMMUTABLE_STATUSES.includes(currentStatus)) {
    return { valid: true };
  }

  const violations = fieldsBeingUpdated.filter((f) =>
    (IMMUTABLE_FIELDS as readonly string[]).includes(f),
  );

  if (violations.length > 0) {
    return {
      valid: false,
      reason: `Cannot modify ${violations.join(", ")} on ${currentStatus} evidence.`,
    };
  }

  return { valid: true };
}

/**
 * Validates that a status transition is permitted under the state machine rules.
 *
 * State machine (forward-only):
 *   DRAFT -> APPROVED  (actor != analyst, role must be OWNER/ADMIN/MEMBER)
 *   DRAFT -> REJECTED  (note required)
 *   APPROVED -> SUPERSEDED  (automatic when a newer version is approved)
 *   All other transitions are blocked.
 */
export function validateEvidenceTransition(
  currentStatus: EvidenceStatus,
  targetStatus: EvidenceStatus,
  context: EvidenceTransitionContext,
): { valid: boolean; reason?: string } {
  // Terminal states cannot transition
  if (currentStatus === "REJECTED" || currentStatus === "SUPERSEDED") {
    return {
      valid: false,
      reason: `Evidence in ${currentStatus} status is terminal and cannot be transitioned.`,
    };
  }

  // APPROVED can only go to SUPERSEDED (handled automatically, not by direct action)
  if (currentStatus === "APPROVED") {
    if (targetStatus !== "SUPERSEDED") {
      return {
        valid: false,
        reason: `Cannot transition from APPROVED to ${targetStatus}. APPROVED evidence can only be superseded.`,
      };
    }
    return { valid: true };
  }

  // DRAFT transitions
  if (currentStatus === "DRAFT") {
    if (targetStatus === "APPROVED") {
      // Actor cannot be the analyst who ran the scan
      if (
        context.scanAnalystId !== null &&
        context.actorId === context.scanAnalystId
      ) {
        return {
          valid: false,
          reason:
            "The analyst who recorded the scan result cannot approve their own evidence.",
        };
      }

      // Actor must have a sufficient role
      if (context.actorRole === "VIEWER") {
        return {
          valid: false,
          reason: "VIEWER role cannot approve evidence.",
        };
      }

      return { valid: true };
    }

    if (targetStatus === "REJECTED") {
      if (!context.note || context.note.trim().length === 0) {
        return {
          valid: false,
          reason: "A note is required when rejecting evidence.",
        };
      }

      if (context.actorRole === "VIEWER") {
        return {
          valid: false,
          reason: "VIEWER role cannot reject evidence.",
        };
      }

      return { valid: true };
    }

    // DRAFT -> DRAFT or DRAFT -> SUPERSEDED are not valid direct transitions
    return {
      valid: false,
      reason: `Cannot transition from DRAFT to ${targetStatus}.`,
    };
  }

  return {
    valid: false,
    reason: `Unrecognized transition from ${currentStatus} to ${targetStatus}.`,
  };
}
