---
name: Workflow State Machine Implementation
description: Status and key decisions from implementing the unified workflow state machine (ScanResultStatus, TransitionLog, workflow rules, server action enforcement)
type: project
---

The unified workflow state machine from `docs/designs/unified-workflow-state-machine.md` has been partially implemented (Phase 1 — additive only, no enum renames yet).

**What was done:**
- Added `ScanResultStatus` enum (`CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED`) to Prisma schema
- Added `status ScanResultStatus @default(CAPTURED)` field to `ScanResult` model
- Added `TransitionLog` model for auditing all state changes
- Created `packages/core/src/workflow/` module with `scan-rules.ts`, `result-rules.ts`, `report-rules.ts`, `types.ts`, `index.ts`
- Added `ScanResultStatus` Zod enum to `packages/core/src/schemas.ts`
- Exported all workflow types/functions from `packages/core/src/index.ts`
- Enforced `validateScanCompletion` in `completeScan` action (throws on empty results or wrong status)
- Auto-flags low visibility results (< 20) as `NEEDS_REVIEW` in `recordResult`
- Co-transition invariant enforced in `approveEvidence`: approving/rejecting evidence also transitions parent `ScanResult` in the same tx, with logs for both
- Enforced `validateReportGeneration` in `generateReport` (all scans must be COMPLETED, at least 1 approved result)
- Enforced `validateReportTransition` in `updateReportStatus` (checks unapproved evidence count for DRAFT -> REVIEW gate)
- Created new `actions/result-workflow.ts` with `approveResult`, `rejectResult`, `flagResultForReview`
- 35 new tests in `packages/core/src/__tests__/workflow.test.ts`

**QA enforcement — completed (2026-03-26):**
- `generateReport` creates a `ReportQA` in PENDING status inside the same transaction as report creation
- `updateReportStatus` auto-runs QA on REVIEW transition and blocks if status is FAIL
- `updateReportStatus` enforces a PUBLISHED gate: requires QA record, status PASS or CONDITIONAL_PASS, and signoff (signedOffAt not null)
- `runReportQA` is re-runnable: deletes old check results, updates status, clears prior signoff, appends a `TransitionLog` entry for each run
- `signoffQA` appends a `TransitionLog` entry on signoff
- `signoffQA` only accepts PASS or CONDITIONAL_PASS status; validates confidence (LOW/MEDIUM/HIGH)
- `QAStatus`, `QACheckOutcome`, `ReportQA`, `QACheckResult` are all exported from `packages/db/src/index.ts`

**Enforcement audit hardening — completed (2026-03-27):**
- `validateScanCompletion`: removed PENDING from COMPLETABLE_STATUSES — only RUNNING (and future COMPLETE) can be completed
- Added `validateScanDeletion` to `scan-rules.ts`: PENDING/FAILED/CANCELLED are deletable; RUNNING/COMPLETED are not
- `deleteScan` now calls `validateScanDeletion` and error message correctly lists PENDING, FAILED, CANCELLED
- `deleteReport` now blocks deletion of PUBLISHED and ARCHIVED reports (previously had no status guard at all)
- `approveResult` now requires at least one evidence record to exist before approving
- All places that pass `actorId: null` or `actorId: "system"` to bypass reviewer≠analyst checks are marked with `TODO(auth)` comments explaining the bypass and what to fix when auth lands
- `validateScanDeletion` exported from `workflow/index.ts` and `core/index.ts`
- workflow.test.ts updated: PENDING completion test now expects failure; 7 new `validateScanDeletion` tests added; total 47 workflow tests all passing
- All 363 core tests pass; full monorepo typecheck clean

**What is NOT done yet (deferred):**
- `ScanRunStatus` enum rename: PENDING/RUNNING/COMPLETED/FAILED/CANCELLED -> DRAFT/READY_TO_RUN/RUNNING/COMPLETE/BLOCKED/CANCELLED
- `ReportStatus` enum rename: DRAFT/GENERATING/REVIEW/PUBLISHED/ARCHIVED -> DRAFT/IN_REVIEW/APPROVED/DELIVERED
- These are separate migration steps. The workflow rules already handle both old and new enum values.

**Why:**
The design explicitly deferred enum renames to a separate step. Current schema values are in use throughout the UI and seed data; adding the new enum + model as an additive change is safe and unblocking.

**How to apply:**
When the enum renames are tackled, update `ScanRunStatus` and `ReportStatus` in both the Prisma schema and `packages/core/src/schemas.ts`. The workflow rule functions already accept both old and new string values.
