import { describe, it, expect } from "vitest";
import {
  validateDiagnosticDelivery,
  isMaterialFinding,
  buildAuditAppendix,
  MINIMUM_MATERIAL_FINDINGS,
} from "../diagnostic/validation";
import type { FindingRecord } from "../diagnostic/validation";

// ── Helpers ─────────────────────────────────────────────────

function makeFinding(overrides: Partial<FindingRecord> = {}): FindingRecord {
  return {
    id: `finding-${Math.random().toString(36).slice(2, 8)}`,
    namedIssue: "Zero presence — absent from all 3 model responses",
    evidenceScanResultIds: ["sr-1", "sr-2"],
    actionableCategory: "ZERO_PRESENCE",
    status: "APPROVED",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("isMaterialFinding", () => {
  it("returns true when all 3 criteria are met", () => {
    const finding = makeFinding();
    expect(isMaterialFinding(finding)).toBe(true);
  });

  it("returns false when namedIssue is missing", () => {
    expect(isMaterialFinding(makeFinding({ namedIssue: null }))).toBe(false);
    expect(isMaterialFinding(makeFinding({ namedIssue: "  " }))).toBe(false);
    expect(isMaterialFinding(makeFinding({ namedIssue: "" }))).toBe(false);
  });

  it("returns false when evidenceScanResultIds is empty", () => {
    expect(isMaterialFinding(makeFinding({ evidenceScanResultIds: [] }))).toBe(false);
  });

  it("returns false when actionableCategory is missing", () => {
    expect(isMaterialFinding(makeFinding({ actionableCategory: null }))).toBe(false);
    expect(isMaterialFinding(makeFinding({ actionableCategory: "" }))).toBe(false);
  });
});

describe("validateDiagnosticDelivery", () => {
  it("returns valid=true when there are 10+ approved material findings", () => {
    const findings = Array.from({ length: 10 }, () => makeFinding());
    const result = validateDiagnosticDelivery(findings);

    expect(result.valid).toBe(true);
    expect(result.approvedMaterialCount).toBe(10);
    expect(result.shortfall).toBe(0);
  });

  it("returns valid=false when there are fewer than 10 approved material findings", () => {
    const findings = Array.from({ length: 8 }, () => makeFinding());
    const result = validateDiagnosticDelivery(findings);

    expect(result.valid).toBe(false);
    expect(result.approvedMaterialCount).toBe(8);
    expect(result.shortfall).toBe(2);
  });

  it("does not count DRAFT findings as approved", () => {
    const findings = [
      ...Array.from({ length: 5 }, () => makeFinding({ status: "APPROVED" })),
      ...Array.from({ length: 5 }, () => makeFinding({ status: "DRAFT" })),
    ];
    const result = validateDiagnosticDelivery(findings);

    expect(result.valid).toBe(false);
    expect(result.approvedMaterialCount).toBe(5);
    expect(result.draftCount).toBe(5);
  });

  it("does not count REJECTED findings", () => {
    const findings = [
      ...Array.from({ length: 7 }, () => makeFinding({ status: "APPROVED" })),
      ...Array.from({ length: 5 }, () => makeFinding({ status: "REJECTED" })),
    ];
    const result = validateDiagnosticDelivery(findings);

    expect(result.valid).toBe(false);
    expect(result.approvedMaterialCount).toBe(7);
    expect(result.rejectedCount).toBe(5);
  });

  it("does not count approved-but-non-material findings toward the threshold", () => {
    const findings = [
      // 7 proper findings
      ...Array.from({ length: 7 }, () => makeFinding({ status: "APPROVED" })),
      // 3 approved but no evidence
      ...Array.from({ length: 3 }, () =>
        makeFinding({ status: "APPROVED", evidenceScanResultIds: [] }),
      ),
    ];
    const result = validateDiagnosticDelivery(findings);

    expect(result.valid).toBe(false);
    expect(result.approvedMaterialCount).toBe(7);
    expect(result.nonMaterialApprovedCount).toBe(3);
    expect(result.shortfall).toBe(3);
  });

  it("returns correct counts for empty findings list", () => {
    const result = validateDiagnosticDelivery([]);

    expect(result.valid).toBe(false);
    expect(result.approvedMaterialCount).toBe(0);
    expect(result.shortfall).toBe(MINIMUM_MATERIAL_FINDINGS);
    expect(result.totalFindings).toBe(0);
  });

  it("MINIMUM_MATERIAL_FINDINGS is 10", () => {
    expect(MINIMUM_MATERIAL_FINDINGS).toBe(10);
  });
});

describe("buildAuditAppendix", () => {
  it("returns only APPROVED material findings", () => {
    const findings = [
      { ...makeFinding({ status: "APPROVED" }), index: 1, approvedById: "user-1", approvedAt: new Date() },
      { ...makeFinding({ status: "DRAFT" }), index: 2, approvedById: null, approvedAt: null },
      { ...makeFinding({ status: "REJECTED" }), index: 3, approvedById: null, approvedAt: null },
      { ...makeFinding({ status: "APPROVED", evidenceScanResultIds: [] }), index: 4, approvedById: "user-1", approvedAt: new Date() },
    ];

    const appendix = buildAuditAppendix(findings);
    expect(appendix).toHaveLength(1);
    expect(appendix[0]!.index).toBe(1);
    expect(appendix[0]!.isMaterial).toBe(true);
  });

  it("is sorted by finding index", () => {
    const now = new Date();
    const findings = [
      { ...makeFinding({ status: "APPROVED" }), index: 3, approvedById: "u", approvedAt: now },
      { ...makeFinding({ status: "APPROVED" }), index: 1, approvedById: "u", approvedAt: now },
      { ...makeFinding({ status: "APPROVED" }), index: 2, approvedById: "u", approvedAt: now },
    ];

    const appendix = buildAuditAppendix(findings);
    expect(appendix.map((e) => e.index)).toEqual([1, 2, 3]);
  });

  it("captures the 3-criteria check on each entry", () => {
    const now = new Date();
    const finding = {
      ...makeFinding({ status: "APPROVED" }),
      index: 1,
      approvedById: "user-1",
      approvedAt: now,
    };

    const appendix = buildAuditAppendix([finding]);
    expect(appendix[0]!.hasNamedIssue).toBe(true);
    expect(appendix[0]!.hasEvidence).toBe(true);
    expect(appendix[0]!.hasActionableCategory).toBe(true);
    expect(appendix[0]!.isMaterial).toBe(true);
    expect(appendix[0]!.evidenceCount).toBe(2); // makeFinding has ["sr-1", "sr-2"]
  });
});
