---
name: Report lifecycle hardening — QA gate, DRAFT creation, strict transitions
description: QA is now a true blocking gate; reports create in DRAFT; transition rules are strict and skip-proof
type: project
---

Completed 2026-03-27. All five problems from the QA/lifecycle audit were fixed.

**QA infrastructure failure now throws (does not silently bypass):**
`runReportQA` in `apps/web/src/app/(dashboard)/actions/qa.ts` now throws an Error when `buildQAContext` returns null (report not found or org mismatch). Previously it returned `{ success: false }` which caused callers to silently skip the gate.

**Reports now create in DRAFT status:**
`generateReport` in `apps/web/src/app/(dashboard)/actions/reports.ts` creates reports with `status: "DRAFT"`. Previously it created in `"REVIEW"`, which bypassed the DRAFT -> REVIEW gate (and its QA auto-run and evidence approval check). Audit log `toStatus` updated from `"REVIEW"` to `"DRAFT"` to match.

**PUBLISHED gate signoff check fixed:**
The `!qa.signedOffById && !qa.signedOffAt` condition was changed to `||`. With `&&`, having only one field set would silently pass. With `||`, EITHER field being absent blocks the publish. (Auth is not wired yet so `signedOffById` is always null — `signedOffAt` is the authoritative field for now, so the `||` fix is load-bearing.)

**Strict transition table in `validateReportTransition`:**
`packages/core/src/workflow/report-rules.ts` now enforces:
- DRAFT -> REVIEW only (submit for review)
- REVIEW -> PUBLISHED or DRAFT (approve or request revision)
- PUBLISHED -> ARCHIVED or REVIEW (deliver or reopen)
- ARCHIVED -> nothing (terminal)
- GENERATING -> DRAFT only (legacy recovery, not to REVIEW)

Explicitly blocked: DRAFT -> PUBLISHED (skip review), DRAFT -> ARCHIVED, REVIEW -> ARCHIVED (skip approval). DELIVERED/IN_REVIEW were removed from the map — they are future enum values not yet in the schema.

**`evidenceAllApproved` was already correct** — it checks both `ctx.scanResults` and `ctx.evidence`. No change needed.

**Why:** The QA gate was bypassable in two ways: (1) infrastructure failure returned success:false which the caller treated as "no problem", and (2) reports started in REVIEW which skipped the DRAFT->REVIEW gate entirely. Together these meant a report could be published without QA ever running or passing.

**How to apply:** Any future code that transitions reports must go through `validateReportTransition`. Any code that calls `runReportQA` must not catch the thrown error silently — let it propagate so the transition is blocked.
