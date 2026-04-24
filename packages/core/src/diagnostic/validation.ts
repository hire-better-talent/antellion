/**
 * Diagnostic delivery validation gate.
 *
 * The refund guarantee requires >= 10 material findings at publish time.
 * This module provides the pure validation logic; the server action wires
 * it to the database and blocks publish on failure.
 *
 * isMaterial is computed deterministically:
 *   !!namedIssue && evidenceScanResultIds.length > 0 && !!actionableCategory
 */

// ── Types ────────────────────────────────────────────────────

export interface FindingRecord {
  id: string;
  namedIssue: string | null;
  evidenceScanResultIds: string[];
  actionableCategory: string | null;
  status: "DRAFT" | "APPROVED" | "REJECTED";
}

export interface DiagnosticValidationResult {
  valid: boolean;
  approvedMaterialCount: number;
  required: number;
  shortfall: number;
  // Breakdown for the operator banner
  totalFindings: number;
  approvedCount: number;
  draftCount: number;
  rejectedCount: number;
  nonMaterialApprovedCount: number;
}

// ── Constants ─────────────────────────────────────────────────

export const MINIMUM_MATERIAL_FINDINGS = 10;

// ── Helpers ───────────────────────────────────────────────────

/**
 * Compute isMaterial for a single finding.
 * Pure function — deterministic, no DB access.
 */
export function isMaterialFinding(finding: FindingRecord): boolean {
  return (
    Boolean(finding.namedIssue?.trim()) &&
    finding.evidenceScanResultIds.length > 0 &&
    Boolean(finding.actionableCategory?.trim())
  );
}

// ── Public API ────────────────────────────────────────────────

/**
 * Validate whether an engagement's findings meet the delivery threshold.
 *
 * Counts APPROVED findings that satisfy the 3-criteria materiality check.
 * Returns a structured result for both the server action and the UI banner.
 *
 * Pure function — call it with the findings already fetched from the DB.
 */
export function validateDiagnosticDelivery(
  findings: FindingRecord[],
): DiagnosticValidationResult {
  const totalFindings = findings.length;
  const approvedFindings = findings.filter((f) => f.status === "APPROVED");
  const draftCount = findings.filter((f) => f.status === "DRAFT").length;
  const rejectedCount = findings.filter((f) => f.status === "REJECTED").length;

  const materialApproved = approvedFindings.filter(isMaterialFinding);
  const nonMaterialApprovedCount = approvedFindings.length - materialApproved.length;

  const approvedMaterialCount = materialApproved.length;
  const shortfall = Math.max(0, MINIMUM_MATERIAL_FINDINGS - approvedMaterialCount);

  return {
    valid: approvedMaterialCount >= MINIMUM_MATERIAL_FINDINGS,
    approvedMaterialCount,
    required: MINIMUM_MATERIAL_FINDINGS,
    shortfall,
    totalFindings,
    approvedCount: approvedFindings.length,
    draftCount,
    rejectedCount,
    nonMaterialApprovedCount,
  };
}

/**
 * Build the Finding Audit Appendix entries from approved material findings.
 *
 * Pure function over Finding records — NEVER an LLM call.
 * This is the deterministic audit trail that backs the refund guarantee.
 */
export interface AuditEntry {
  index: number;
  findingId: string;
  namedIssue: string;
  hasNamedIssue: boolean;
  hasEvidence: boolean;
  hasActionableCategory: boolean;
  isMaterial: boolean;
  evidenceCount: number;
  actionableCategory: string;
  approvedById: string | null;
  approvedAt: Date | null;
}

export function buildAuditAppendix(
  findings: Array<FindingRecord & { index: number; approvedById: string | null; approvedAt: Date | null }>,
): AuditEntry[] {
  return findings
    .filter((f) => f.status === "APPROVED" && isMaterialFinding(f))
    .sort((a, b) => a.index - b.index)
    .map((f) => ({
      index: f.index,
      findingId: f.id,
      namedIssue: f.namedIssue ?? "",
      hasNamedIssue: Boolean(f.namedIssue?.trim()),
      hasEvidence: f.evidenceScanResultIds.length > 0,
      hasActionableCategory: Boolean(f.actionableCategory?.trim()),
      isMaterial: isMaterialFinding(f),
      evidenceCount: f.evidenceScanResultIds.length,
      actionableCategory: f.actionableCategory ?? "",
      approvedById: f.approvedById,
      approvedAt: f.approvedAt,
    }));
}
