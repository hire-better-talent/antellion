import type { TransitionResult } from "./types";

// ── Completable statuses ─────────────────────────────────────
// Only RUNNING scans can be completed. PENDING scans have not started
// executing yet and must not be completed directly — they must transition
// to RUNNING first. "COMPLETE" is included as the anticipated future enum
// rename (schema uses COMPLETED today) so the rule survives that migration.
const COMPLETABLE_STATUSES = new Set(["RUNNING", "COMPLETE"]);

/**
 * Validates whether a scan can be completed.
 *
 * Rules (from unified workflow design):
 * 1. Scan must be in a completable state (RUNNING under current enum).
 * 2. At least one result must have been recorded (resultCount > 0).
 *    We do not require resultCount === queryCount because manual scans
 *    can complete with a subset of results.
 *
 * Note: the design's full completion gate also checks that all ScanQuery
 * records are in a terminal state. That check will be added when the
 * ScanQuery model is introduced. For now we enforce the result count
 * check as the minimum safety bar.
 */
export function validateScanCompletion(scan: {
  status: string;
  queryCount: number;
  resultCount: number;
}): TransitionResult {
  if (!COMPLETABLE_STATUSES.has(scan.status)) {
    return {
      valid: false,
      reason: `Cannot complete a scan in ${scan.status} status. Scan must be in RUNNING status.`,
    };
  }

  if (scan.resultCount === 0) {
    return {
      valid: false,
      reason:
        "Cannot complete a scan with no results. Record at least one result before completing.",
    };
  }

  return { valid: true };
}

// ── Cancellable statuses ─────────────────────────────────────
// Only PENDING and RUNNING scans can be cancelled. COMPLETED, FAILED, and
// CANCELLED scans are already terminal or already cancelled.
const CANCELLABLE_STATUSES = new Set(["PENDING", "RUNNING"]);

/**
 * Validates whether a scan can be cancelled.
 *
 * Rules:
 * - PENDING and RUNNING scans may be cancelled.
 * - COMPLETED, FAILED, and CANCELLED scans may not — they are already terminal.
 */
export function validateScanCancellation(scan: { status: string }): TransitionResult {
  if (!CANCELLABLE_STATUSES.has(scan.status)) {
    return {
      valid: false,
      reason: `Cannot cancel a scan in ${scan.status} status. Only PENDING and RUNNING scans can be cancelled.`,
    };
  }
  return { valid: true };
}

// ── Deletable statuses ───────────────────────────────────────
// A scan may only be deleted when it has not produced any meaningful
// persisted work product. RUNNING and COMPLETED scans may have results
// and evidence attached; deleting them would silently remove audit trail.
const DELETABLE_STATUSES = new Set(["PENDING", "FAILED", "CANCELLED"]);

/**
 * Validates whether a scan can be deleted.
 *
 * Rules:
 * - PENDING, FAILED, and CANCELLED scans may be deleted.
 * - RUNNING and COMPLETED scans may not — they carry results and audit trail.
 */
export function validateScanDeletion(scan: { status: string }): TransitionResult {
  if (!DELETABLE_STATUSES.has(scan.status)) {
    return {
      valid: false,
      reason: `Cannot delete a scan in ${scan.status} status. Only PENDING, FAILED, or CANCELLED scans may be deleted.`,
    };
  }
  return { valid: true };
}
