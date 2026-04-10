import { describe, it, expect } from "vitest";
import { validateScanCompletion, validateScanDeletion, validateScanCancellation } from "../workflow/scan-rules";
import { validateResultTransition, shouldAutoFlag, AUTO_FLAG_VISIBILITY_THRESHOLD } from "../workflow/result-rules";
import { validateReportGeneration, validateReportTransition } from "../workflow/report-rules";

// ── validateScanCompletion ───────────────────────────────────

describe("validateScanCompletion", () => {
  it("passes when scan is RUNNING with results", () => {
    const check = validateScanCompletion({
      status: "RUNNING",
      queryCount: 10,
      resultCount: 10,
    });
    expect(check.valid).toBe(true);
  });

  it("blocks when scan is PENDING (not started executing; cannot complete from PENDING)", () => {
    const check = validateScanCompletion({
      status: "PENDING",
      queryCount: 5,
      resultCount: 3,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/RUNNING/i);
  });

  it("blocks when scan has no results", () => {
    const check = validateScanCompletion({
      status: "RUNNING",
      queryCount: 10,
      resultCount: 0,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/no results/i);
  });

  it("blocks when scan is already COMPLETED", () => {
    const check = validateScanCompletion({
      status: "COMPLETED",
      queryCount: 5,
      resultCount: 5,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/RUNNING/i);
  });

  it("blocks when scan is CANCELLED", () => {
    const check = validateScanCompletion({
      status: "CANCELLED",
      queryCount: 5,
      resultCount: 5,
    });
    expect(check.valid).toBe(false);
  });
});

// ── validateScanDeletion ─────────────────────────────────────

describe("validateScanDeletion", () => {
  it("allows deletion of PENDING scans", () => {
    expect(validateScanDeletion({ status: "PENDING" }).valid).toBe(true);
  });

  it("allows deletion of FAILED scans", () => {
    expect(validateScanDeletion({ status: "FAILED" }).valid).toBe(true);
  });

  it("allows deletion of CANCELLED scans", () => {
    expect(validateScanDeletion({ status: "CANCELLED" }).valid).toBe(true);
  });

  it("blocks deletion of RUNNING scans", () => {
    const check = validateScanDeletion({ status: "RUNNING" });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/RUNNING/);
  });

  it("blocks deletion of COMPLETED scans", () => {
    const check = validateScanDeletion({ status: "COMPLETED" });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/COMPLETED/);
  });

  it("includes all three deletable statuses in the error message", () => {
    const check = validateScanDeletion({ status: "COMPLETED" });
    expect(check.reason).toMatch(/PENDING/);
    expect(check.reason).toMatch(/FAILED/);
    expect(check.reason).toMatch(/CANCELLED/);
  });
});

// ── validateScanCancellation ─────────────────────────────────

describe("validateScanCancellation", () => {
  it("allows cancellation of PENDING scans", () => {
    expect(validateScanCancellation({ status: "PENDING" }).valid).toBe(true);
  });

  it("allows cancellation of RUNNING scans", () => {
    expect(validateScanCancellation({ status: "RUNNING" }).valid).toBe(true);
  });

  it("blocks cancellation of COMPLETED scans (terminal)", () => {
    const check = validateScanCancellation({ status: "COMPLETED" });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/COMPLETED/);
    expect(check.reason).toMatch(/PENDING and RUNNING/);
  });

  it("blocks cancellation of FAILED scans (terminal)", () => {
    const check = validateScanCancellation({ status: "FAILED" });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/FAILED/);
  });

  it("blocks cancellation of already-CANCELLED scans", () => {
    const check = validateScanCancellation({ status: "CANCELLED" });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/CANCELLED/);
  });
});

// ── shouldAutoFlag ───────────────────────────────────────────

describe("shouldAutoFlag", () => {
  it("flags null visibility score", () => {
    expect(shouldAutoFlag(null)).toBe(true);
  });

  it("flags scores below threshold", () => {
    expect(shouldAutoFlag(AUTO_FLAG_VISIBILITY_THRESHOLD - 1)).toBe(true);
    expect(shouldAutoFlag(0)).toBe(true);
  });

  it("does not flag scores at or above threshold", () => {
    expect(shouldAutoFlag(AUTO_FLAG_VISIBILITY_THRESHOLD)).toBe(false);
    expect(shouldAutoFlag(100)).toBe(false);
  });
});

// ── validateResultTransition ─────────────────────────────────

describe("validateResultTransition", () => {
  const ctx = { actorId: "reviewer-1", scanAnalystId: "analyst-1" };
  const systemCtx = { actorId: null, scanAnalystId: null };

  it("allows CAPTURED -> NEEDS_REVIEW", () => {
    expect(validateResultTransition("CAPTURED", "NEEDS_REVIEW", systemCtx).valid).toBe(true);
  });

  it("allows CAPTURED -> APPROVED when reviewer != analyst", () => {
    const check = validateResultTransition("CAPTURED", "APPROVED", ctx);
    expect(check.valid).toBe(true);
  });

  it("blocks CAPTURED -> APPROVED when reviewer === analyst", () => {
    const sameActor = { actorId: "analyst-1", scanAnalystId: "analyst-1" };
    const check = validateResultTransition("CAPTURED", "APPROVED", sameActor);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/cannot approve.*own/i);
  });

  it("allows NEEDS_REVIEW -> APPROVED when reviewer != analyst", () => {
    expect(validateResultTransition("NEEDS_REVIEW", "APPROVED", ctx).valid).toBe(true);
  });

  it("allows NEEDS_REVIEW -> REJECTED with a note", () => {
    const check = validateResultTransition("NEEDS_REVIEW", "REJECTED", {
      ...ctx,
      note: "Response was inaccurate.",
    });
    expect(check.valid).toBe(true);
  });

  it("blocks NEEDS_REVIEW -> REJECTED without a note", () => {
    const check = validateResultTransition("NEEDS_REVIEW", "REJECTED", ctx);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/note is required/i);
  });

  it("blocks NEEDS_REVIEW -> REJECTED with empty note", () => {
    const check = validateResultTransition("NEEDS_REVIEW", "REJECTED", {
      ...ctx,
      note: "   ",
    });
    expect(check.valid).toBe(false);
  });

  it("allows APPROVED -> NEEDS_REVIEW (reopen)", () => {
    expect(validateResultTransition("APPROVED", "NEEDS_REVIEW", ctx).valid).toBe(true);
  });

  it("blocks REJECTED -> APPROVED (terminal)", () => {
    const check = validateResultTransition("REJECTED", "APPROVED", ctx);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/terminal/i);
  });

  it("blocks CAPTURED -> REJECTED (not a valid direct transition)", () => {
    const check = validateResultTransition("CAPTURED", "REJECTED", {
      ...ctx,
      note: "bad",
    });
    expect(check.valid).toBe(false);
  });

  it("returns error for unrecognized current status", () => {
    const check = validateResultTransition("UNKNOWN", "APPROVED", ctx);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/unrecognized/i);
  });
});

// ── validateReportGeneration ─────────────────────────────────

describe("validateReportGeneration", () => {
  it("passes with all completed scans and approved results", () => {
    const check = validateReportGeneration([
      { id: "s1", status: "COMPLETED", approvedResultCount: 3 },
      { id: "s2", status: "COMPLETED", approvedResultCount: 1 },
    ]);
    expect(check.valid).toBe(true);
  });

  it("blocks with no scans selected", () => {
    expect(validateReportGeneration([]).valid).toBe(false);
  });

  it("blocks when any scan is not COMPLETED", () => {
    const check = validateReportGeneration([
      { id: "s1", status: "COMPLETED", approvedResultCount: 2 },
      { id: "s2", status: "RUNNING", approvedResultCount: 0 },
    ]);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/COMPLETED/i);
  });

  it("also accepts COMPLETE status (future enum value)", () => {
    const check = validateReportGeneration([
      { id: "s1", status: "COMPLETE", approvedResultCount: 2 },
    ]);
    expect(check.valid).toBe(true);
  });

  it("blocks when no approved results exist across all scans", () => {
    const check = validateReportGeneration([
      { id: "s1", status: "COMPLETED", approvedResultCount: 0 },
      { id: "s2", status: "COMPLETED", approvedResultCount: 0 },
    ]);
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/approved/i);
  });
});

// ── validateReportTransition ─────────────────────────────────
//
// NOTE: validateReportTransition covers only the pure state-machine rules
// (valid transitions, reviewer assignment, unapproved evidence count).
// The QA status gate and signoff gate for REVIEW → PUBLISHED are enforced
// in the server action layer (apps/web/src/app/(dashboard)/actions/reports.ts),
// not here, because they require a live Prisma query. Those gates are not
// unit-testable without mocking Prisma.
//
// Pre-auth note: the publish signoff check gates on signedOffAt only.
// Once auth lands, it should require BOTH signedOffById AND signedOffAt.
// See the TODO(auth) comment in updateReportStatus.

describe("validateReportTransition", () => {
  const baseCtx = {
    actorId: null as string | null,
    hasReviewer: true,
    reviewerIsAuthor: false,
    unapprovedEvidenceCount: 0,
  };

  it("allows DRAFT -> REVIEW with reviewer assigned and all evidence approved", () => {
    const check = validateReportTransition("DRAFT", "REVIEW", baseCtx);
    expect(check.valid).toBe(true);
  });

  it("blocks DRAFT -> REVIEW when no reviewer is assigned", () => {
    const check = validateReportTransition("DRAFT", "REVIEW", {
      ...baseCtx,
      hasReviewer: false,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/reviewer must be assigned/i);
  });

  it("blocks DRAFT -> REVIEW when reviewer is the report author", () => {
    const check = validateReportTransition("DRAFT", "REVIEW", {
      ...baseCtx,
      reviewerIsAuthor: true,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/same person/i);
  });

  it("blocks DRAFT -> REVIEW when unapproved evidence exists", () => {
    const check = validateReportTransition("DRAFT", "REVIEW", {
      ...baseCtx,
      unapprovedEvidenceCount: 3,
    });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/3/);
    expect(check.reason).toMatch(/approved/i);
  });

  it("allows REVIEW -> PUBLISHED", () => {
    const check = validateReportTransition("REVIEW", "PUBLISHED", { actorId: null });
    expect(check.valid).toBe(true);
  });

  it("allows REVIEW -> DRAFT with a note (revision requested)", () => {
    const check = validateReportTransition("REVIEW", "DRAFT", {
      actorId: null,
      note: "Needs more data on Q3 results.",
    });
    expect(check.valid).toBe(true);
  });

  it("blocks REVIEW -> DRAFT without a note", () => {
    const check = validateReportTransition("REVIEW", "DRAFT", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/note is required/i);
  });

  it("allows PUBLISHED -> ARCHIVED (deliver)", () => {
    expect(validateReportTransition("PUBLISHED", "ARCHIVED", { actorId: null }).valid).toBe(true);
  });

  it("allows PUBLISHED -> REVIEW (reopen)", () => {
    expect(validateReportTransition("PUBLISHED", "REVIEW", { actorId: null }).valid).toBe(true);
  });

  it("blocks REVIEW -> ARCHIVED (cannot skip approval)", () => {
    const check = validateReportTransition("REVIEW", "ARCHIVED", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/cannot transition/i);
  });

  it("blocks DRAFT -> PUBLISHED (cannot skip review)", () => {
    const check = validateReportTransition("DRAFT", "PUBLISHED", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/cannot transition/i);
  });

  it("blocks DRAFT -> ARCHIVED (cannot skip review and approval)", () => {
    const check = validateReportTransition("DRAFT", "ARCHIVED", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/cannot transition/i);
  });

  it("blocks ARCHIVED -> anything (terminal)", () => {
    const check = validateReportTransition("ARCHIVED", "DRAFT", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/ARCHIVED/i);
  });

  it("blocks GENERATING -> REVIEW (legacy status; recovery path only)", () => {
    const check = validateReportTransition("GENERATING", "REVIEW", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/cannot transition/i);
  });

  it("allows GENERATING -> DRAFT (legacy recovery)", () => {
    const check = validateReportTransition("GENERATING", "DRAFT", { actorId: null });
    expect(check.valid).toBe(true);
  });

  it("blocks unrecognized current status", () => {
    const check = validateReportTransition("MYSTERY_STATE", "DRAFT", { actorId: null });
    expect(check.valid).toBe(false);
    expect(check.reason).toMatch(/unrecognized/i);
  });

  it("blocks invalid forward-skip transitions (DRAFT -> PUBLISHED)", () => {
    const check = validateReportTransition("DRAFT", "PUBLISHED", { actorId: null });
    expect(check.valid).toBe(false);
  });
});
