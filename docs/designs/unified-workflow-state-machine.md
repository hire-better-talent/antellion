# Unified Workflow State Machine Design

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Architect
**Reconciles:** analyst-workflow-design.md, evidence-provenance-system-design.md, report-qa-system-design.md, operations-dashboard-design.md
**Constrained by:** Implemented code in `packages/core/src/evidence/`, `packages/db/prisma/schema.prisma`

---

## Table of Contents

1. [State Reconciliation (Section E)](#e-state-reconciliation)
2. [State Diagrams (Section A)](#a-state-diagrams)
3. [Unified Transition Rules (Section B)](#b-unified-transition-rules)
4. [Cross-Entity Blocking Rules (Section C)](#c-cross-entity-blocking-rules)
5. [Failure and Recovery Paths (Section D)](#d-failure-and-recovery-paths)
6. [Integration Notes (Section F)](#f-integration-notes)

---

## E. State Reconciliation

This section is placed first because every subsequent design decision depends on resolving the conflicts between the three state machines that were designed at different times.

### The Three Conflicts

**Conflict 1: ScanRunStatus**

| Source | Values |
|--------|--------|
| Current Prisma schema | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED |
| Analyst workflow design | DRAFT, READY_TO_RUN, RUNNING, COMPLETE, BLOCKED, CANCELLED |
| User request | DRAFT, READY, RUNNING, COMPLETE, BLOCKED |

**Decision:** Use the analyst workflow values: **DRAFT, READY_TO_RUN, RUNNING, COMPLETE, BLOCKED, CANCELLED**.

Rationale: READY_TO_RUN is clearer than READY (it describes intent, not just a state). CANCELLED is needed as a terminal state for abandoned scans. The current schema values (PENDING/COMPLETED/FAILED) map cleanly to the new values per the analyst workflow migration plan.

**Conflict 2: EvidenceStatus**

| Source | Values |
|--------|--------|
| Current Prisma schema + implemented code | DRAFT, APPROVED, SUPERSEDED, REJECTED |
| Analyst workflow (ScanResultStatus) | CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED |
| User request (evidence states) | CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED |

This is the most consequential conflict. The implemented `EvidenceStatus` enum has four values. The analyst workflow designed a separate `ScanResultStatus` with four different values. The user's request uses the analyst workflow's names but applies them to evidence. We need to decide: does the review lifecycle live on ScanResult, on ScanEvidence, or on both?

**Decision:** The review lifecycle lives on **two separate status fields**, not one.

1. **`ScanResult.status` (ScanResultStatus):** CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED -- tracks the analyst review of the result's quality and relevance.
2. **`ScanEvidence.status` (EvidenceStatus):** DRAFT, APPROVED, SUPERSEDED, REJECTED -- tracks the provenance lock of the evidence record's immutability.

These are related but distinct concerns:

- **ScanResult review** answers: "Is this scan result good enough to use in a report?" This is a quality judgment. An analyst reads the AI response, checks whether the mention detection was correct, verifies the scores make sense. This is the CAPTURED -> NEEDS_REVIEW -> APPROVED/REJECTED lifecycle.

- **ScanEvidence lock** answers: "Is this evidence record's provenance data frozen and trustworthy?" This is an integrity operation. Once the ScanResult is approved, its evidence is locked (DRAFT -> APPROVED). If a re-capture creates a new version, the old evidence is superseded (APPROVED -> SUPERSEDED). SUPERSEDED has no equivalent in ScanResultStatus because results are replaced via `replacesResultId`, not versioned in-place.

**Why not merge them?** Three reasons:

1. **SUPERSEDED has no ScanResult analog.** ScanResult uses `replacesResultId` for re-capture chains. ScanEvidence uses `version` numbering. These are different replacement mechanisms. SUPERSEDED only makes sense on the versioned evidence record.

2. **The implemented code depends on the current EvidenceStatus values.** `validateEvidenceTransition()` in `packages/core/src/evidence/immutability.ts` is already built, tested, and correct. It handles DRAFT -> APPROVED, DRAFT -> REJECTED, and APPROVED -> SUPERSEDED. Changing these values to CAPTURED/NEEDS_REVIEW creates a rewrite of working code for zero functional gain.

3. **Timing differs.** A ScanResult can sit in NEEDS_REVIEW while an analyst decides. During that time, the ScanEvidence is in DRAFT -- it is mutable (analyst notes, confidence scores can be edited). When the ScanResult is approved, the evidence simultaneously transitions to APPROVED and becomes immutable. The two transitions happen in the same transaction, but they represent different things.

**Coordination rule:** When `ScanResult.status` transitions to APPROVED, `ScanEvidence.status` MUST transition to APPROVED in the same transaction. When `ScanResult.status` transitions to REJECTED, `ScanEvidence.status` MUST transition to REJECTED in the same transaction. This is not a cross-entity blocking rule -- it is a **co-transition invariant**. The server action that approves a result must also approve its evidence.

**Mapping table:**

| ScanResult.status | ScanEvidence.status | Meaning |
|---|---|---|
| CAPTURED | DRAFT | Result recorded, evidence captured, both awaiting review |
| NEEDS_REVIEW | DRAFT | Result flagged for human review, evidence still mutable |
| APPROVED | APPROVED | Result confirmed quality, evidence locked immutable |
| REJECTED | REJECTED | Result rejected, evidence preserved for audit trail |
| (replaced via re-capture) | SUPERSEDED | Old evidence replaced by new version |

**No enum changes to EvidenceStatus.** The implemented enum (DRAFT, APPROVED, SUPERSEDED, REJECTED) is kept as-is. The `validateEvidenceTransition()` function is kept as-is. ScanResultStatus is a new enum added alongside EvidenceStatus.

**Conflict 3: ReportStatus**

| Source | Values |
|--------|--------|
| Current Prisma schema | DRAFT, GENERATING, REVIEW, PUBLISHED, ARCHIVED |
| Analyst workflow design | DRAFT, IN_REVIEW, APPROVED, DELIVERED |
| User request | DRAFT, IN_REVIEW, APPROVED, DELIVERED |

**Decision:** Use the analyst workflow values: **DRAFT, IN_REVIEW, APPROVED, DELIVERED**.

Rationale (from analyst workflow design): GENERATING is unnecessary because report generation is synchronous. ARCHIVED becomes a timestamp flag (`archivedAt`) rather than a status, because archiving is orthogonal to the review lifecycle. PUBLISHED maps to DELIVERED (which is more precise for enterprise consulting context). REVIEW maps to IN_REVIEW. The analyst workflow migration plan handles this cleanly.

### Summary of Final Enum Values

```
enum ScanRunStatus {
  DRAFT          // Scan created, being configured
  READY_TO_RUN   // Analyst assigned, queries selected, ready to execute
  RUNNING        // Scan actively executing queries
  COMPLETE       // All queries processed within failure tolerance
  BLOCKED        // Execution halted due to errors or missing prerequisites
  CANCELLED      // Explicitly abandoned
}

enum ScanResultStatus {   // NEW ENUM
  CAPTURED       // Result recorded, scores computed
  NEEDS_REVIEW   // Flagged for human review (auto or manual)
  APPROVED       // Human confirmed quality
  REJECTED       // Human rejected quality (terminal; re-capture creates new result)
}

enum EvidenceStatus {     // UNCHANGED from implemented code
  DRAFT          // Evidence captured, provenance fields mutable
  APPROVED       // Evidence locked, provenance immutable
  SUPERSEDED     // Replaced by newer version, immutable, preserved for audit
  REJECTED       // Discarded, immutable, preserved for audit
}

enum ReportStatus {
  DRAFT          // Report generated, being reviewed internally
  IN_REVIEW      // Submitted for formal review
  APPROVED       // Reviewer signed off
  DELIVERED      // Sent to client (terminal for normal operations)
}
```

---

## A. State Diagrams

### Scan (ScanRun) State Machine

```
                    +---------+
                    |  DRAFT  |
                    +---------+
                      |     ^
   assignAnalyst +    |     | backToDraft
   selectQueries +    |     | [reconfigure]
   [analyst set,      |     |
    >= 1 query]       v     |
                 +--------------+
                 | READY_TO_RUN |
                 +--------------+
                       |
                       | startScan
                       | [ADMIN/MEMBER triggers]
                       v
                  +---------+
         +------->| RUNNING |<-------+
         |        +---------+        |
         |           |    |          |
         |           |    |          | unblockScan
         |           |    |          | [block resolved,
         |           |    |          |  ADMIN provides note]
         |           |    |     +---------+
         |           |    +---->| BLOCKED |
         |           |          +---------+
         |           |    [failedCount > maxFailures
         |           |     OR external dependency missing]
         |           |
         |           | completeScan
         |           | [all ScanQuery in terminal state,
         |           |  failedCount <= maxFailures]
         |           v
         |      +----------+
         |      | COMPLETE |
         |      +----------+
         |
         | rerunScan (creates NEW ScanRun
         |  with parentScanRunId)
         +

  Any non-terminal state ----> CANCELLED
  [ADMIN explicit cancel]

  Terminal states: COMPLETE, CANCELLED
```

### ScanResult State Machine

```
              +----------+
              | CAPTURED |
              +----------+
               |        |
               |        | approveResult (direct)
               |        | [high confidence, policy allows]
               |        v
               |   +----------+
               |   | APPROVED |<---------+
               |   +----------+          |
               |        |                |
               |        | reopenReview   | approveResult
               |        | [ADMIN only]   | [reviewer != analyst]
               |        v                |
               |  +--------------+       |
               +->| NEEDS_REVIEW |-------+
                  +--------------+
  flagForReview        |
  [auto: low score,    | rejectResult
   manual: analyst     | [reviewer != analyst,
   flags it]           |  rejection note required]
                       v
                  +----------+
                  | REJECTED |
                  +----------+
                       |
                       | recaptureResult
                       | [creates NEW ScanResult
                       |  with replacesResultId]
                       v
                  (new CAPTURED result)

  Terminal state: REJECTED (old result stays REJECTED forever)
  APPROVED -> NEEDS_REVIEW is a rare reopen path (ADMIN only)
```

### ScanEvidence State Machine (IMPLEMENTED)

```
              +-------+
              | DRAFT |
              +-------+
               |     |
               |     | rejectEvidence
               |     | [rejection note required,
               |     |  VIEWER cannot reject]
               |     v
               | +----------+
               | | REJECTED |
               | +----------+
               |
               | approveEvidence
               | [actor != scan analyst,
               |  VIEWER cannot approve]
               v
           +----------+
           | APPROVED |
           +----------+
                |
                | (automatic: when newer version
                |  of same scanResultId is approved)
                v
          +------------+
          | SUPERSEDED |
          +------------+

  Terminal states: REJECTED, SUPERSEDED
  APPROVED -> SUPERSEDED is automatic, not user-triggered

  Co-transition invariant:
    ScanResult -> APPROVED triggers ScanEvidence -> APPROVED (same tx)
    ScanResult -> REJECTED triggers ScanEvidence -> REJECTED (same tx)
```

### Report State Machine

```
            +---------+
            |  DRAFT  |<---------+
            +---------+          |
                 |               |
                 | submitForReview
                 | [reviewer assigned,           requestRevision
                 |  reviewer != author,          [reviewer only,
                 |  all linked evidence          revision note
                 |  APPROVED]                    required]
                 v               |
           +-----------+        |
      +--->| IN_REVIEW |--------+
      |    +-----------+
      |         |
      |         | approveReport
      |         | [assigned reviewer only,
      |         |  QA status PASS or
      |         |  CONDITIONAL_PASS]
      |         v
      |    +----------+
      |    | APPROVED |
      |    +----------+
      |         |
      |         | deliverReport
      |         | [ADMIN/OWNER only]
      |         v
      |    +-----------+
      |    | DELIVERED |
      |    +-----------+
      |
      | reopenReview [ADMIN only, rare]
      +

  Terminal state: DELIVERED (for normal operations)
  APPROVED -> IN_REVIEW is a rare reopen path (ADMIN only)
```

---

## B. Unified Transition Rules

### ScanRun Transitions

| From | To | Conditions | Required Role | Side Effects | Cross-Entity Effects |
|------|-----|-----------|---------------|-------------|---------------------|
| (new) | DRAFT | Client exists, org scoping valid | ADMIN, MEMBER | Create ScanRun, create ScanQuery records for selected queries | None |
| DRAFT | READY_TO_RUN | `analystId` set, `scanQueryCount >= 1`, all ScanQuery are PENDING | ADMIN, MEMBER | Set `queryCount` from ScanQuery count | None |
| READY_TO_RUN | RUNNING | None beyond role check | ADMIN, MEMBER | Set `startedAt`, set `triggeredById` to actor | None |
| READY_TO_RUN | DRAFT | None | ADMIN, MEMBER | Optionally clear `analystId` | None |
| RUNNING | COMPLETE | All ScanQuery in terminal state (SUCCEEDED/FAILED/SKIPPED), `failedCount <= maxFailures` | ADMIN, MEMBER, System | Set `completedAt`, update `resultCount`, `failedCount` | All CAPTURED ScanResults with auto-approvable confidence should be flagged for batch review. Does NOT auto-approve anything. |
| RUNNING | BLOCKED | `failedCount > maxFailures` OR external dependency missing | ADMIN, System | Set `blockedAt`, `blockReason` (note required) | None |
| BLOCKED | RUNNING | Block reason resolved | ADMIN | Clear `blockedAt`, clear `blockReason`, audit log with unblock note | None |
| Any non-terminal | CANCELLED | Explicit cancellation | ADMIN | Set `completedAt` to now | All ScanQuery records set to SKIPPED. ScanResults stay in current state (preserved for audit). ScanEvidence stays in current state. |

### ScanResult Transitions

| From | To | Conditions | Required Role | Side Effects | Cross-Entity Effects |
|------|-----|-----------|---------------|-------------|---------------------|
| (new) | CAPTURED | ScanRun is RUNNING, ScanQuery exists and is SUCCEEDED | System, MEMBER | Create ScanResult, create ScanEvidence v1 in DRAFT, update ScanRun.resultCount, update ScanQuery.status to SUCCEEDED | ScanEvidence record created in DRAFT in same transaction |
| CAPTURED | NEEDS_REVIEW | Auto-flag (low confidence, null visibility) or manual flag | System, MEMBER, ADMIN | None | None |
| CAPTURED | APPROVED | Direct approval (high confidence, policy allows skip) | ADMIN, MEMBER (not the scan analyst) | Set `reviewedById`, `reviewedAt` | **ScanEvidence MUST transition DRAFT -> APPROVED in same tx.** Set `ScanEvidence.approvedAt`, `ScanEvidence.approvedById`. |
| NEEDS_REVIEW | APPROVED | Reviewer verifies quality | ADMIN, MEMBER (not the scan analyst) | Set `reviewedById`, `reviewedAt` | **ScanEvidence MUST transition DRAFT -> APPROVED in same tx.** |
| NEEDS_REVIEW | REJECTED | Reviewer identifies quality issue | ADMIN, MEMBER (not the scan analyst) | Set `reviewedById`, `reviewedAt`, `reviewNote` (note required) | **ScanEvidence MUST transition DRAFT -> REJECTED in same tx.** |
| APPROVED | NEEDS_REVIEW | Reopen for re-review (rare) | ADMIN | Clear `reviewedById`, `reviewedAt` | **ScanEvidence stays APPROVED.** The evidence lock is NOT rolled back. If re-review results in changes, a new evidence version is created. The old APPROVED evidence transitions to SUPERSEDED when the new version is approved. |
| REJECTED | (new CAPTURED) | Re-capture creates new ScanResult with `replacesResultId` | ADMIN, MEMBER | Old result stays REJECTED. New result has independent lifecycle. | Old ScanEvidence stays REJECTED. New ScanEvidence v1 created as DRAFT for the new ScanResult. |

### ScanEvidence Transitions (IMPLEMENTED -- no changes)

| From | To | Conditions | Required Role | Side Effects | Cross-Entity Effects |
|------|-----|-----------|---------------|-------------|---------------------|
| (new) | DRAFT | ScanResult being created | System | Created in same tx as ScanResult | None |
| DRAFT | APPROVED | Actor != scan analyst, actor role is not VIEWER | ADMIN, MEMBER, OWNER | Set `approvedAt`, `approvedById` | **Triggered by ScanResult -> APPROVED co-transition.** Not invoked independently in normal flow. |
| DRAFT | REJECTED | Rejection note required, actor role is not VIEWER | ADMIN, MEMBER, OWNER | Set analyst notes with rejection reason | **Triggered by ScanResult -> REJECTED co-transition.** Not invoked independently in normal flow. |
| APPROVED | SUPERSEDED | Automatic: when a newer version for the same `scanResultId` is approved | System (automatic) | None | Only triggered when a re-captured result's new evidence is approved. The old APPROVED evidence for the same scanResultId auto-supersedes. |

**Critical implementation note:** The `validateEvidenceTransition()` function in `packages/core/src/evidence/immutability.ts` is the authoritative implementation. The transitions above match its rules exactly. The only addition is the co-transition invariant: the server action that transitions a ScanResult MUST also transition its ScanEvidence in the same database transaction.

### Report Transitions

| From | To | Conditions | Required Role | Side Effects | Cross-Entity Effects |
|------|-----|-----------|---------------|-------------|---------------------|
| (new) | DRAFT | Client exists, >= 1 COMPLETE scan selected, >= 1 APPROVED ScanResult in those scans | ADMIN, MEMBER | Create Report, create ReportScan join records, create ReportEvidence links (only for APPROVED evidence), generate content via `composeReport()` | Report only links to APPROVED evidence via ReportEvidence. DRAFT/REJECTED/SUPERSEDED evidence is excluded. |
| DRAFT | IN_REVIEW | `reviewerId` set, `reviewerId != generatedById`, **all ScanEvidence linked via ReportEvidence are APPROVED** | ADMIN, MEMBER | Audit log entry. QA run triggered (creates ReportQA in PENDING). | QA automated checks begin execution |
| IN_REVIEW | APPROVED | Reviewer signs off. **QA status is PASS or CONDITIONAL_PASS** (all warnings acknowledged). | The assigned `reviewerId` only | Audit log entry | None |
| IN_REVIEW | DRAFT | Revision requested | The assigned `reviewerId` only | Set `revisionNote` (note required), audit log entry | QA record status reset to PENDING (checks must re-run after revision) |
| APPROVED | DELIVERED | Delivery triggered | ADMIN, OWNER | Set `deliveredAt`, audit log entry | Engagement status updated to DELIVERED (if engagement exists) |
| APPROVED | IN_REVIEW | Reopen (rare) | ADMIN | Audit log entry | QA must re-run |

---

## C. Cross-Entity Blocking Rules

### What blocks scan completion?

| Rule | Enforced by | Error message |
|------|------------|---------------|
| Not all ScanQuery records are in terminal state (SUCCEEDED/FAILED/SKIPPED) | `validateScanTransition()` RUNNING -> COMPLETE | "{N} queries are still pending. All queries must reach a terminal state." |
| `failedCount > maxFailures` | `validateScanTransition()` RUNNING -> COMPLETE | "Failed query count ({N}) exceeds maximum allowed failures ({M})." |

Scan completion does NOT require ScanResult approval. Scans complete based on query execution status, not result review status. Result review happens after scan completion.

### What blocks evidence approval?

| Rule | Enforced by | Error message |
|------|------------|---------------|
| Actor is the same person as the scan analyst | `validateEvidenceTransition()` DRAFT -> APPROVED | "The analyst who recorded the scan result cannot approve their own evidence." |
| Actor has VIEWER role | `validateEvidenceTransition()` DRAFT -> APPROVED | "VIEWER role cannot approve evidence." |
| Evidence is in terminal state (REJECTED/SUPERSEDED) | `validateEvidenceTransition()` | "Evidence in {status} status is terminal and cannot be transitioned." |

### What blocks report generation?

| Rule | Enforced by | Error message |
|------|------------|---------------|
| No selected scans are COMPLETE | `generateReport()` server action pre-check | "All selected scans must be in COMPLETE status." |
| No APPROVED ScanResults exist in the selected scans | `generateReport()` server action pre-check | "No approved scan results found in the selected scans. At least one result must be approved." |

Report generation creates the report in DRAFT status. It links only to APPROVED evidence. It does NOT require all results to be approved -- a report can be generated from a subset. But it requires at least one.

### What blocks report review submission (DRAFT -> IN_REVIEW)?

| Rule | Enforced by | Error message |
|------|------------|---------------|
| No reviewer assigned | `validateReportTransition()` DRAFT -> IN_REVIEW | "A reviewer must be assigned before submitting for review." |
| Reviewer is the same person as the report author | `validateReportTransition()` DRAFT -> IN_REVIEW | "The reviewer cannot be the same person who generated the report." |
| Any ScanEvidence linked via ReportEvidence is NOT APPROVED | `validateReportTransition()` DRAFT -> IN_REVIEW (checks `includedResultStatuses`) | "{N} scan result(s) have not been approved yet. All results must be APPROVED before submitting report for review." |

This is the critical cross-entity gate. The report-machine checks `includedResultStatuses` -- it counts the ScanResult statuses (not EvidenceStatus) for all results across the report's linked scans. Since the co-transition invariant guarantees ScanResult.APPROVED <=> ScanEvidence.APPROVED, checking ScanResult.status is sufficient. Both MUST be APPROVED.

### What blocks report approval (IN_REVIEW -> APPROVED)?

| Rule | Enforced by | Error message |
|------|------------|---------------|
| Actor is not the assigned reviewer | `validateReportTransition()` IN_REVIEW -> APPROVED | "Only the assigned reviewer can approve this report." |
| QA status is FAIL | QA gating check (separate from report-machine, enforced in server action) | "Report cannot be approved while QA status is FAIL. {N} blocking issues remain." |
| QA status is CONDITIONAL_PASS with unacknowledged warnings | QA gating check | "Report has {N} unacknowledged QA warnings. All warnings must be acknowledged before approval." |

The QA gate is NOT inside `validateReportTransition()`. It is enforced by the server action that calls `validateReportTransition()`. This keeps the report state machine focused on workflow rules while the QA system handles quality rules. The server action checks both: first the state machine, then the QA gate.

### What blocks report delivery (APPROVED -> DELIVERED)?

| Rule | Enforced by | Error message |
|------|------------|---------------|
| Actor does not have ADMIN or OWNER role | `validateReportTransition()` APPROVED -> DELIVERED | Role permission check |

No additional cross-entity checks. Once a report is APPROVED, delivery is purely a role-gated action.

### Cross-entity blocking summary diagram

```
ScanQuery terminal states
        |
        | [all queries done, failures within tolerance]
        v
ScanRun COMPLETE
        |
        | [at least 1 APPROVED result required]
        v
Report DRAFT (generated)
        ^
        | [requires all linked evidence APPROVED]
        |
ScanResult APPROVED  <==> ScanEvidence APPROVED (co-transition)
        ^                        ^
        |                        |
   [reviewer != analyst]    [reviewer != analyst]
   [not VIEWER role]        [not VIEWER role]

Report DRAFT --> IN_REVIEW
        |
        | [requires QA PASS or CONDITIONAL_PASS]
        v
Report IN_REVIEW --> APPROVED
        |
        | [ADMIN/OWNER only]
        v
Report APPROVED --> DELIVERED
```

---

## D. Failure and Recovery Paths

### D1: What happens when evidence is rejected?

**Trigger:** ScanResult transitions to REJECTED (reviewer identifies quality issue with a mandatory rejection note).

**Immediate effects (same transaction):**
1. ScanResult.status = REJECTED, reviewedById set, reviewedAt set, reviewNote set
2. ScanEvidence.status = REJECTED (co-transition)
3. Audit log entry for ScanResult: NEEDS_REVIEW -> REJECTED
4. Audit log entry for ScanEvidence: DRAFT -> REJECTED

**State after rejection:**
- ScanResult: REJECTED (terminal -- cannot transition further)
- ScanEvidence: REJECTED (terminal -- provenance preserved for audit)
- ScanRun: unchanged (can still COMPLETE; rejected results count toward processed, not toward failures)
- Report: if evidence was linked to a report, the report's ReportEvidence link now points to REJECTED evidence. This will cause the report's DRAFT -> IN_REVIEW transition to fail until the link is removed or replaced.

**Recovery path: re-capture**
1. Analyst calls `recaptureResult(originalResultId, formData)`.
2. A NEW ScanResult (SR2) is created with `replacesResultId = SR1.id`. SR2 enters CAPTURED.
3. A NEW ScanEvidence v1 is created for SR2 in DRAFT.
4. SR1 stays REJECTED forever. Its evidence stays REJECTED forever.
5. SR2 goes through the normal review lifecycle independently.
6. If SR2 is approved, its evidence (DRAFT -> APPROVED) is used. The old rejected evidence remains for audit.
7. If a report had linked the old evidence, the report should be regenerated or its evidence links should be updated to point to the replacement's evidence.

### D2: What happens when a scan is blocked?

**Trigger:** System or admin detects `failedCount > maxFailures` during a running scan, or an external dependency is unavailable.

**Immediate effects:**
1. ScanRun.status = BLOCKED, blockedAt set, blockReason set
2. Audit log entry: RUNNING -> BLOCKED
3. No effect on existing ScanResults or ScanEvidence (they are preserved)
4. ScanQuery records that were IN_PROGRESS may stay IN_PROGRESS (the worker stops processing)

**State after blocking:**
- ScanRun: BLOCKED (not terminal -- recoverable)
- Existing ScanResults: unchanged (CAPTURED, NEEDS_REVIEW, or APPROVED results survive)
- ScanQuery: FAILED queries stay FAILED; PENDING/IN_PROGRESS stay as-is

**Recovery path: unblock + retry**
1. Admin investigates the block reason.
2. Admin retries failed queries: `rerunQuery(scanId, queryId)` resets ScanQuery status to PENDING (if `attempts < maxRetries`).
3. Admin unblocks: `unblockScan(scanId, note)` transitions BLOCKED -> RUNNING.
4. The scan resumes execution of PENDING queries.
5. When all queries reach terminal state and `failedCount <= maxFailures`, the scan can COMPLETE.

**Alternative recovery: cancel**
1. Admin decides the scan is unrecoverable.
2. `cancelScan(scanId)` transitions BLOCKED -> CANCELLED.
3. All non-terminal ScanQuery records are set to SKIPPED.
4. Existing results/evidence are preserved for partial use.

### D3: What happens when a report fails review?

**Trigger:** Reviewer requests revision (IN_REVIEW -> DRAFT) with a mandatory revision note.

**Immediate effects:**
1. Report.status = DRAFT, revisionNote set
2. Audit log entry: IN_REVIEW -> DRAFT with revision note
3. QA record (ReportQA) status reset to PENDING (checks must re-run after revision)

**State after revision request:**
- Report: DRAFT (back to editable state)
- ReportEvidence links: unchanged (evidence is still linked)
- ScanResults: unchanged (still APPROVED)
- ScanEvidence: unchanged (still APPROVED, immutable)

**Recovery path: revise and resubmit**
1. Author reads the revisionNote to understand what needs to change.
2. Author makes changes to the report (edit summary, adjust recommendations, update sections in metadata).
3. Author resubmits: `submitReportForReview(reportId)` transitions DRAFT -> IN_REVIEW.
4. QA automated checks re-run against the updated content.
5. The same reviewer (or a newly assigned one) reviews again.

**Note:** Report revisions do NOT affect the underlying evidence. Evidence is immutable once APPROVED. If the issue is with the evidence itself (e.g., "this data is wrong"), the fix path is:
1. Reopen the ScanResult review (APPROVED -> NEEDS_REVIEW, ADMIN only).
2. This does NOT unlock the evidence. Instead, if re-capture is needed, a new ScanResult/ScanEvidence pair is created.
3. The report should then be regenerated with the corrected data.

### D4: How does re-capture work for rejected evidence?

Re-capture does NOT modify existing records. It creates new ones.

```
Original:
  ScanResult SR1 (REJECTED) --> ScanEvidence SE1v1 (REJECTED)

After recaptureResult(SR1, newFormData):
  ScanResult SR1 (REJECTED)  --> ScanEvidence SE1v1 (REJECTED)   [unchanged, preserved]
  ScanResult SR2 (CAPTURED)  --> ScanEvidence SE2v1 (DRAFT)      [new records]
       ^
       |__ SR2.replacesResultId = SR1.id

After review of SR2:
  ScanResult SR2 (APPROVED) --> ScanEvidence SE2v1 (APPROVED)    [locked]
```

Key points:
- SR1 and SE1v1 are never modified. They are audit artifacts.
- SR2 is a brand new ScanResult. It gets its own ScanEvidence.
- The `replacesResultId` chain (SR2 -> SR1) preserves lineage for audit and ops metrics (rework rate).
- Report generation queries only APPROVED results, so SR1 is automatically excluded.

### D5: How does re-run work for failed scan queries?

Re-run operates at two levels:

**Query-level retry (within the same scan):**
1. `rerunQuery(scanId, queryId)` -- resets one ScanQuery from FAILED to PENDING.
2. Requires `attempts < maxRetries`. Increments nothing; `attempts` is incremented when execution runs.
3. The scan must be in RUNNING or BLOCKED state.
4. If the scan is BLOCKED, it must be unblocked before the query will actually execute.

**Scan-level re-run (new scan):**
1. `rerunScan(scanId)` -- creates a NEW ScanRun with `parentScanRunId = scanId`.
2. Copies the ScanQuery records from the parent scan (all reset to PENDING).
3. Does NOT copy results or evidence. The new scan starts fresh.
4. The parent scan stays in whatever state it was in (usually COMPLETE or CANCELLED).
5. The new scan enters DRAFT and goes through the full lifecycle.

---

## F. Integration Notes

### F1: QA System Integration

**How each state machine interacts with the QA system:**

The QA system sits between IN_REVIEW and APPROVED on the Report state machine. It does not directly interact with Scan or Evidence state machines, but it reads their state.

**Trigger:** When a report transitions DRAFT -> IN_REVIEW, a `ReportQA` record is created (or reset) with status = PENDING. The automated check runner is invoked.

**Evidence checks:** The QA system's `evidence.all_results_approved` check (BLOCKING severity) queries all ScanEvidence linked via ReportEvidence and verifies `status = 'APPROVED'`. Because of the co-transition invariant, this is equivalent to checking ScanResult.status = 'APPROVED'. The QA check uses the explicit ReportEvidence links, not the ScanRun -> ScanResult chain.

**QA gating:** The report approval action (IN_REVIEW -> APPROVED) checks QA status AFTER calling `validateReportTransition()`. The gate logic:

```
if (qaStatus === 'FAIL') block approval
if (qaStatus === 'CONDITIONAL_PASS' && unacknowledgedWarnings > 0) block approval
if (qaStatus === 'PASS' || (qaStatus === 'CONDITIONAL_PASS' && unacknowledgedWarnings === 0)) allow
if (qaStatus === 'PENDING' || qaStatus === 'RUNNING') block (checks not yet complete)
```

**Revision reset:** When a report transitions IN_REVIEW -> DRAFT (revision requested), the QA record's status is reset to PENDING and its `version` is incremented. Previous check results are preserved (they have the old version number). This ensures QA re-runs against the revised content.

### F2: Operations Dashboard Integration

**How each state machine feeds the ops dashboard:**

The ops dashboard reads state; it never writes to workflow entities. All metrics are derived from status fields and timestamps.

**Scan metrics:**
- Active scans: `ScanRun WHERE status IN (DRAFT, READY_TO_RUN, RUNNING, BLOCKED)`
- Blocked scans: `ScanRun WHERE status = 'BLOCKED'` with `now() - blockedAt` for duration
- Scan velocity: `completedAt - startedAt` for COMPLETE scans
- Per-query progress: `ScanQuery GROUP BY status WHERE scanRunId = ?`

**Evidence metrics:**
- Evidence awaiting approval: `ScanEvidence WHERE status = 'DRAFT'` (implies result not yet approved)
- Evidence approval rate: `COUNT(APPROVED) / COUNT(*)` per engagement
- Stale evidence: `ScanEvidence WHERE status = 'DRAFT' AND executedAt < now() - interval '90 days'`
- Average confidence: `AVG(confidenceScore) WHERE status = 'APPROVED'` per scan

**Result metrics:**
- Results needing review: `ScanResult WHERE status = 'NEEDS_REVIEW'`
- Rework rate: `ScanResult WHERE replacesResultId IS NOT NULL` / total results
- Review backlog per analyst: `ScanResult WHERE status = 'NEEDS_REVIEW' AND scanRun.analystId = ?`

**Report metrics:**
- Reports in review: `Report WHERE status = 'IN_REVIEW'`
- Time in review: diff between audit log entries for DRAFT -> IN_REVIEW and IN_REVIEW -> APPROVED
- Report revision rate: count of audit log entries where `action = 'requestRevision'` per report
- Delivery pipeline: reports grouped by status

**Engagement metrics (when Engagement model is implemented):**
- Engagement phase derived from `EngagementStatus`
- Time in phase: `now() - updatedAt`
- Overdue engagements: `WHERE slaDeadline < now() AND status NOT IN ('DELIVERED')`

### F3: Confidence Scoring Integration

**How each state machine interacts with the confidence scoring system:**

Confidence scoring is computed, not governed by state transitions. But the state machines create the moments when computation happens.

**Computation timing:**
- `ResultConfidence` (the 4-factor score) is computed when `ScanEvidence` is created (alongside the ScanResult). The score is stored in `ScanEvidence.confidenceScore`.
- `analystConfidence` (human override) is set by the analyst while evidence is in DRAFT. Once evidence transitions to APPROVED, `analystConfidence` becomes immutable.
- Finding-level confidence is computed at report composition time as a derived aggregate of result-level scores. Not stored on evidence.

**Auto-review trigger:**
- `shouldAutoFlagForReview(visibilityScore)` from the result-machine returns true when `visibilityScore < 20` or is null. This causes newly CAPTURED results to enter NEEDS_REVIEW instead of staying CAPTURED.
- The evidence provenance design adds a parallel trigger: evidence with `provider = 'MANUAL'` and empty `promptText` should also flag for review. This is implemented as an extension to `shouldAutoFlagForReview`, not as a separate mechanism.

**Stale data penalty:**
- The confidence scoring design specifies a 15% penalty for evidence older than 90 days and 30% for older than 180 days (Rule 5). This uses `ScanEvidence.executedAt`, which is an immutable provenance field. The penalty is applied at read time when computing aggregate confidence for reports, not stored on the evidence record.

**Confidence thresholds in QA:**
- The QA check `evidence.confidence_above_threshold` (WARNING severity) flags evidence with `confidenceScore < 0.5`. This check reads from `ScanEvidence.confidenceScore` and reports warnings during the IN_REVIEW phase. It does not block any state transition directly (it is WARNING, not BLOCKING), but unacknowledged warnings prevent report approval per the QA gate.

---

## Appendix: Implementation Compatibility

### What stays unchanged in implemented code

1. **`EvidenceStatus` enum** (Prisma + core types): DRAFT, APPROVED, SUPERSEDED, REJECTED -- no changes.
2. **`validateEvidenceTransition()`** in `packages/core/src/evidence/immutability.ts` -- no changes. The function correctly implements DRAFT -> APPROVED, DRAFT -> REJECTED, APPROVED -> SUPERSEDED with role checks and analyst-separation enforcement.
3. **`validateEvidenceUpdate()`** in `packages/core/src/evidence/immutability.ts` -- no changes. Immutability rules are correct.
4. **`ScanEvidenceRecord`** and related types in `packages/core/src/evidence/types.ts` -- no changes.
5. **`EvidenceTransitionContext`** in `packages/core/src/evidence/types.ts` -- no changes.
6. **Zod schemas** in `packages/core/src/evidence/schemas.ts` -- no changes.
7. **`mapEvidenceToSections()`** in `packages/core/src/evidence/section-mapping.ts` -- no changes.
8. **`ReportEvidence`** model -- no changes. The join table correctly links reports to evidence.

### What must change (schema migration required)

1. **`ScanRunStatus` enum**: Add DRAFT, READY_TO_RUN, COMPLETE, BLOCKED. Remove PENDING, COMPLETED, FAILED. Migrate existing data per analyst workflow migration plan.
2. **`ScanResultStatus` enum**: New enum. Add `status` column to ScanResult model. Backfill existing results to CAPTURED (or APPROVED for results already used in reports).
3. **`ReportStatus` enum**: Add IN_REVIEW, APPROVED, DELIVERED. Remove GENERATING, REVIEW, PUBLISHED, ARCHIVED. Add `archivedAt` timestamp column. Migrate per analyst workflow plan.
4. **`ScanResult` model**: Add `status`, `reviewedById`, `reviewedAt`, `reviewNote`, `replacesResultId` columns.
5. **`ScanRun` model**: Add `analystId`, `failedCount`, `maxFailures`, `blockedAt`, `blockReason`, `parentScanRunId` columns.
6. **`Report` model**: Add `reviewerId`, `revisionNote`, `deliveredAt`, `archivedAt` columns.
7. **New models**: `ScanQuery`, `ReportScan`, `AuditLog` per analyst workflow design.
8. **`AuditEntityType` enum**: New enum with SCAN_RUN, SCAN_RESULT, REPORT, SCAN_EVIDENCE.

### What must change (code changes required)

1. **`createScan` action**: Change from creating in RUNNING to creating in DRAFT with ScanQuery records.
2. **`completeScan` action**: Add validation via `validateScanTransition()` instead of unconditional update.
3. **`recordResult` action**: Create ScanEvidence in same transaction (already does this). Add initial ScanResult status (CAPTURED or NEEDS_REVIEW based on `shouldAutoFlagForReview()`).
4. **`generateReport` action**: Filter for APPROVED results only. Create ReportScan join records. Create report in DRAFT (not REVIEW).
5. **`updateReportStatus` action**: Replace free-form status update with `validateReportTransition()` call.
6. **New server actions**: scan-workflow.ts, result-workflow.ts, report-workflow.ts per analyst workflow design.
7. **New core modules**: `packages/core/src/workflow/` with scan-machine.ts, result-machine.ts, report-machine.ts per analyst workflow design.
8. **Co-transition enforcement**: The result approval action must call both `validateResultTransition()` AND `validateEvidenceTransition()` and apply both transitions in a single transaction.

### Migration ordering

The migrations must be ordered to avoid breaking existing functionality:

1. **Phase 1: Additive schema changes** -- Add new columns and enums without removing old ones. Add ScanResultStatus, ScanQuery, ReportScan, AuditLog. Add new columns to ScanRun, ScanResult, Report.
2. **Phase 2: Data migration** -- Backfill new columns. Map old ScanRunStatus values to new ones. Set ScanResult.status for existing rows. Map old ReportStatus values.
3. **Phase 3: Remove old enum values** -- Update Prisma schema to reflect final enum values. Run migration to drop old values.
4. **Phase 4: Code changes** -- Update server actions to use new state machines. Deploy new workflow actions.

Phases 1-2 are safe to deploy without code changes (additive only). Phase 3 requires Phase 4 to be deployed simultaneously.
