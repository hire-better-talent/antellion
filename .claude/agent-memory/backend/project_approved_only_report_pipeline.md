---
name: Approved-only report generation pipeline
description: Report generation is now gated to APPROVED scan results and APPROVED evidence only — non-approved data must never enter computations or evidence links
type: project
---

`generateReport` in `apps/web/src/app/(dashboard)/actions/reports.ts` was fixed to enforce approval status at every data access point.

**Three enforcement points:**
1. `prisma.scanResult.findMany` now includes `status: "APPROVED"` — CAPTURED, NEEDS_REVIEW, and REJECTED results never reach `computeScanComparison`, `computeFindingConfidence`, or the report narrative.
2. After the fetch, an explicit zero-result guard returns a user-facing error rather than generating an empty report.
3. A soft minimum of 3 approved results is enforced — fewer than 3 returns an error directing the user to approve more results before generating.

**Evidence linking** (`tx.scanEvidence.findMany` inside the transaction) now filters `status: "APPROVED"` only — DRAFT fallback was removed. Highest-version approved evidence per result is selected via `orderBy: { version: "desc" }` + first-seen dedup.

**QA check update:** `evidenceAllApproved` in `packages/core/src/qa/checks.ts` now runs two sequential checks:
1. All `ctx.scanResults` must have `status === "APPROVED"` (catches non-approved results in contributing scans).
2. All `ctx.evidence` (linked evidence records) must also have `status === "APPROVED"` (catches stale pre-fix evidence links).

**QA context scoping (verified 2026-03-27):** `buildQAContext` in `qa.ts` fetches all scan results for the contributing scan runs, then filters to only results that are linked to the report via `ReportEvidence`. The join path is: `ReportEvidence.scanEvidenceId` → `ScanEvidence.id` → `ScanEvidence.scanResultId`. The `evidence` array in `QACheckContext` is the set of `ScanEvidence` records for those linked results. This means QA evaluates the same APPROVED-only population that the report was built from — non-approved results in the scan (CAPTURED, NEEDS_REVIEW, REJECTED) are excluded and do not affect QA outcome. When a report has no `ReportEvidence` links (old reports), `linkedResultIds` is empty, `linkedResults` is empty, and `completenessHasResults` fires as a BLOCKING FAIL — which is correct behavior.

**Why:** The approval workflow was being bypassed — CAPTURED/NEEDS_REVIEW/REJECTED results were flowing into mention rates, visibility scores, confidence calculations, and the report narrative, defeating the entire review process. The QA scoping fix ensures `evidenceAllApproved` doesn't produce false positives for results that were intentionally excluded from the report.

**How to apply:** Any future code that feeds scan results into reports, computations, or evidence links must include `status: "APPROVED"`. QA context is now scoped to report-linked results only — not all results in the contributing scans.
