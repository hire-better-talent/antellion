# Structured Analyst Workflow Design

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Architect

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [State Diagrams](#a-state-diagrams)
3. [Prisma Schema Design](#b-prisma-schema-design)
4. [Transition Rules Table](#c-transition-rules-table)
5. [Core Domain Logic](#d-core-domain-logic)
6. [Server Action Patterns](#e-server-action-patterns)
7. [Example Flows](#f-example-flows)
8. [Migration Strategy](#g-migration-strategy)

---

## 1. Current State Analysis

### What exists today

**ScanRun** has `ScanRunStatus`: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED. The `createScan` action in `apps/web/src/app/(dashboard)/actions/scans.ts` skips PENDING entirely — it creates scans directly in RUNNING status. `completeScan` unconditionally sets COMPLETED with no validation that results exist. There is no DRAFT state and no ability to configure a scan before running it.

**ScanResult** has no lifecycle state at all. Once a result is recorded via `recordResult`, it is final. There is no review, approval, or rejection. The `analyzeResponse` function in `packages/core/src/scan-analysis.ts` runs heuristic scoring at capture time, and the scores become permanent. There is no re-capture path for bad results.

**Report** has `ReportStatus`: DRAFT, GENERATING, REVIEW, PUBLISHED, ARCHIVED. The `generateReport` action in `apps/web/src/app/(dashboard)/actions/reports.ts` creates reports directly in REVIEW status (skipping DRAFT and GENERATING). `updateReportStatus` accepts any valid enum value with no transition validation — you can jump from DRAFT to PUBLISHED or from PUBLISHED back to DRAFT.

**Assignment:** `ScanRun.triggeredById` tracks who started a scan. `Report.generatedById` tracks who generated a report. Neither has a reviewer assignment. There is no concept of analyst-vs-reviewer separation.

**Audit trail:** None. No record of state changes, who made them, or why.

**Auth:** `apps/web/src/lib/auth.ts` is a stub that returns the first organization. `UserRole` exists (OWNER, ADMIN, MEMBER, VIEWER) but is never checked in any action.

**Jobs worker:** `apps/jobs/src/index.ts` is a skeleton with TODO comments. No scan automation exists.

### Specific gaps

1. `completeScan` has no guard — can complete a scan with 0 results.
2. `generateReport` fetches all results from selected scans with no status filter — it would include rejected/unreviewed results if they existed.
3. `updateReportStatus` has no transition rules — any status can move to any other status.
4. `recordResult` prevents duplicates (same scanRunId + queryId + null competitorId) but has no mechanism for re-capture after a result is deemed bad.
5. No per-query failure tracking. If a query fails during automated scan execution, there is no way to mark it failed and re-run just that query.
6. The `metadata` JSON field on ScanRun stores `queryClusterIds` but there is no structured relationship between a scan and the queries it should execute.

---

## A. State Diagrams

### Scan (ScanRun) States

```
                    +---------+
                    |  DRAFT  |
                    +---------+
                         |
                         | assignAnalyst + selectQueries
                         | [analyst assigned, >= 1 query selected]
                         v
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
           |           |    |          | [blocking issues resolved]
           |           |    |          |
           |           |    |     +---------+
           |           |    +---->| BLOCKED |
           |           |          +---------+
           |           |    [failureRate > threshold
           |           |     OR missing prerequisites]
           |           |
           |           | completeScan
           |           | [all queries processed,
           |           |  failedCount <= maxFailures]
           |           v
           |      +----------+
           |      | COMPLETE |
           |      +----------+
           |
           | rerunScan (creates new ScanRun
           |  linked via parentScanRunId)
           +
```

Valid transitions:
- DRAFT -> READY_TO_RUN
- READY_TO_RUN -> RUNNING
- READY_TO_RUN -> DRAFT (remove analyst, reconfigure)
- RUNNING -> COMPLETE
- RUNNING -> BLOCKED
- BLOCKED -> RUNNING (after unblock)
- (Any non-COMPLETE state) -> CANCELLED (explicit cancel)

Note: FAILED is removed as a terminal state. Scans that encounter errors go to BLOCKED (recoverable). A scan with partial results can still be COMPLETE if the failure count is within tolerance. Total failure means the scan stays BLOCKED until manually cancelled.

### ScanResult States

```
               +----------+
               | CAPTURED |
               +----------+
                    |
                    | flagForReview (auto or manual)
                    | [low confidence, edge case,
                    |  or policy requires review]
                    v
              +--------------+
         +--->| NEEDS_REVIEW |---+
         |    +--------------+   |
         |         |             |
         |         |             | rejectResult
         |         |             | [reviewer identifies
         |         |             |  quality issue]
         |         |             v
         |         |        +----------+
         |         |        | REJECTED |
         |         |        +----------+
         |         |             |
         |         |             | recaptureResult
         |         |             | [creates new ScanResult
         |         |             |  linked via replacesResultId]
         |         |             v
         |         |        (new CAPTURED result)
         |         |
         |         | approveResult
         |         | [reviewer confirms quality]
         |         v
         |    +----------+
         |    | APPROVED |
         |    +----------+
         |
         | requestReview (reopen)
         +
```

Valid transitions:
- CAPTURED -> NEEDS_REVIEW
- CAPTURED -> APPROVED (direct approve, bypasses review)
- NEEDS_REVIEW -> APPROVED
- NEEDS_REVIEW -> REJECTED
- REJECTED -> (new CAPTURED via recapture — old result stays REJECTED)
- APPROVED -> NEEDS_REVIEW (reopen for re-review, rare)

### Report States

```
             +---------+
             |  DRAFT  |
             +---------+
                  |
                  | submitForReview
                  | [all included scan results APPROVED,
                  |  reviewer assigned, reviewer != author]
                  v
            +-----------+
       +--->| IN_REVIEW |---+
       |    +-----------+   |
       |         |          |
       |         |          | requestRevision
       |         |          | [reviewer identifies issues]
       |         |          v
       |         |     +---------+
       |         |     |  DRAFT  | (back to DRAFT with
       |         |     +---------+  revision notes)
       |         |
       |         | approveReport
       |         | [reviewer signs off]
       |         v
       |    +----------+
       |    | APPROVED |
       |    +----------+
       |         |
       |         | deliverReport
       |         | [ADMIN/OWNER triggers delivery]
       |         v
       |    +-----------+
       |    | DELIVERED |
       |    +-----------+
       |
       | reopenReview (ADMIN only, rare)
       +
```

Valid transitions:
- DRAFT -> IN_REVIEW
- IN_REVIEW -> APPROVED
- IN_REVIEW -> DRAFT (revision requested)
- APPROVED -> DELIVERED
- APPROVED -> IN_REVIEW (reopen, ADMIN only)
- DELIVERED is terminal for normal operations

Note: GENERATING and ARCHIVED are removed. Generation is a synchronous operation during DRAFT creation (current behavior). Archiving can be a soft-delete flag rather than a status, since it is orthogonal to the review lifecycle.

---

## B. Prisma Schema Design

### Modified Enums

```prisma
enum ScanRunStatus {
  DRAFT
  READY_TO_RUN
  RUNNING
  COMPLETE
  BLOCKED
  CANCELLED
}

enum ScanResultStatus {
  CAPTURED
  NEEDS_REVIEW
  APPROVED
  REJECTED
}

enum ReportStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  DELIVERED
}

// UserRole stays the same
enum UserRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

// New enum for audit log
enum AuditEntityType {
  SCAN_RUN
  SCAN_RESULT
  REPORT
}
```

### Modified Models

```prisma
model ScanRun {
  id              String        @id @default(cuid())
  clientId        String
  triggeredById   String?
  analystId       String?
  status          ScanRunStatus @default(DRAFT)
  model           String?
  queryCount      Int           @default(0)
  resultCount     Int           @default(0)
  failedCount     Int           @default(0)
  maxFailures     Int           @default(0)
  startedAt       DateTime?
  completedAt     DateTime?
  blockedAt       DateTime?
  blockReason     String?       @db.Text
  errorMessage    String?       @db.Text
  parentScanRunId String?
  metadata        Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  client         Client       @relation(fields: [clientId], references: [id])
  triggeredBy    User?        @relation("TriggeredBy", fields: [triggeredById], references: [id], onDelete: SetNull)
  analyst        User?        @relation("ScanAnalyst", fields: [analystId], references: [id], onDelete: SetNull)
  parentScanRun  ScanRun?     @relation("ScanRerun", fields: [parentScanRunId], references: [id], onDelete: SetNull)
  childScanRuns  ScanRun[]    @relation("ScanRerun")
  results        ScanResult[]
  scanQueries    ScanQuery[]

  @@index([clientId])
  @@index([status])
  @@index([analystId])
  @@index([parentScanRunId])
  @@map("scan_runs")
}

model ScanQuery {
  id         String          @id @default(cuid())
  scanRunId  String
  queryId    String
  status     ScanQueryStatus @default(PENDING)
  attempts   Int             @default(0)
  maxRetries Int             @default(2)
  lastError  String?         @db.Text
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  scanRun ScanRun @relation(fields: [scanRunId], references: [id], onDelete: Cascade)
  query   Query   @relation(fields: [queryId], references: [id])

  @@unique([scanRunId, queryId])
  @@index([scanRunId])
  @@index([status])
  @@map("scan_queries")
}

enum ScanQueryStatus {
  PENDING
  IN_PROGRESS
  SUCCEEDED
  FAILED
  SKIPPED
}

model ScanResult {
  id                String           @id @default(cuid())
  scanRunId         String
  queryId           String
  competitorId      String?
  status            ScanResultStatus @default(CAPTURED)
  reviewedById      String?
  reviewedAt        DateTime?
  reviewNote        String?          @db.Text
  replacesResultId  String?          @unique
  response          String           @db.Text
  visibilityScore   Float?
  sentimentScore    Float?
  relevanceScore    Float?
  ranking           Int?
  mentioned         Boolean          @default(false)
  tokenCount        Int?
  latencyMs         Int?
  metadata          Json?
  createdAt         DateTime         @default(now())

  scanRun           ScanRun          @relation(fields: [scanRunId], references: [id], onDelete: Cascade)
  query             Query            @relation(fields: [queryId], references: [id])
  competitor        Competitor?      @relation(fields: [competitorId], references: [id], onDelete: SetNull)
  reviewedBy        User?            @relation("ResultReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  replacesResult    ScanResult?      @relation("ResultReplacement", fields: [replacesResultId], references: [id], onDelete: SetNull)
  replacedByResult  ScanResult?      @relation("ResultReplacement")
  citations         CitationSource[]

  @@index([scanRunId])
  @@index([queryId])
  @@index([competitorId])
  @@index([status])
  @@index([reviewedById])
  @@map("scan_results")
}

model Report {
  id            String       @id @default(cuid())
  clientId      String
  generatedById String?
  reviewerId    String?
  title         String
  status        ReportStatus @default(DRAFT)
  summary       String?      @db.Text
  revisionNote  String?      @db.Text
  generatedAt   DateTime?
  publishedAt   DateTime?
  deliveredAt   DateTime?
  archivedAt    DateTime?
  metadata      Json?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  client          Client           @relation(fields: [clientId], references: [id])
  generatedBy     User?            @relation("GeneratedBy", fields: [generatedById], references: [id], onDelete: SetNull)
  reviewer        User?            @relation("ReportReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)
  recommendations Recommendation[]
  reportScans     ReportScan[]

  @@index([clientId])
  @@index([status])
  @@index([reviewerId])
  @@map("reports")
}

model ReportScan {
  id        String   @id @default(cuid())
  reportId  String
  scanRunId String
  createdAt DateTime @default(now())

  report  Report  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  scanRun ScanRun @relation(fields: [scanRunId], references: [id])

  @@unique([reportId, scanRunId])
  @@index([reportId])
  @@index([scanRunId])
  @@map("report_scans")
}
```

### New Models

```prisma
model AuditLog {
  id           String          @id @default(cuid())
  entityType   AuditEntityType
  entityId     String
  actorId      String?
  fromStatus   String?
  toStatus     String
  action       String
  note         String?         @db.Text
  metadata     Json?
  createdAt    DateTime        @default(now())

  actor User? @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Updated User Relations

```prisma
model User {
  id             String   @id @default(cuid())
  organizationId String
  email          String   @unique
  name           String
  role           UserRole @default(MEMBER)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization     Organization @relation(fields: [organizationId], references: [id])
  scanRuns         ScanRun[]    @relation("TriggeredBy")
  analystScanRuns  ScanRun[]    @relation("ScanAnalyst")
  reports          Report[]     @relation("GeneratedBy")
  reviewedReports  Report[]     @relation("ReportReviewer")
  reviewedResults  ScanResult[] @relation("ResultReviewer")
  auditLogs        AuditLog[]   @relation("AuditActor")

  @@index([organizationId])
  @@map("users")
}
```

### Updated Query Model (new relation)

```prisma
model Query {
  id             String   @id @default(cuid())
  queryClusterId String
  text           String
  intent         String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  queryCluster QueryCluster @relation(fields: [queryClusterId], references: [id], onDelete: Cascade)
  scanResults  ScanResult[]
  scanQueries  ScanQuery[]

  @@index([queryClusterId])
  @@map("queries")
}
```

### Design Rationale

**ScanQuery join table:** The current system stores `queryClusterIds` in a JSON metadata field on ScanRun, then counts queries at creation time. This makes it impossible to track per-query execution status. The `ScanQuery` model creates an explicit, indexed relationship between a scan and each query it should execute. This enables per-query failure tracking, retry logic, and progress reporting.

**ReportScan join table:** Currently `scanRunIds` are stored in report metadata JSON. Making this an explicit relation enables foreign-key integrity, allows querying "which reports used this scan," and prevents orphaned references.

**replacesResultId on ScanResult:** A one-to-one self-relation. When a result is REJECTED and re-captured, the new result points to the old one. This preserves history without polluting the active result set. The `@@unique` constraint ensures a result can only be replaced once.

**parentScanRunId on ScanRun:** For scan re-runs, the new scan links back to its parent. This preserves lineage while keeping each scan as an independent entity with its own lifecycle.

**archivedAt on Report:** Archiving is now a timestamp flag rather than a status value. This allows a DELIVERED report to be archived without interfering with its lifecycle status. UI filters on `archivedAt IS NULL` to hide archived reports by default.

**maxFailures on ScanRun:** Configurable tolerance. A scan with 20 queries and `maxFailures = 3` can still COMPLETE if 3 or fewer queries failed. This prevents one flaky query from blocking an entire scan.

---

## C. Transition Rules Table

### ScanRun Transitions

| From | To | Conditions | Required Role | Side Effects |
|------|-----|-----------|---------------|-------------|
| (new) | DRAFT | Client exists, org scoping valid | ADMIN, MEMBER | Create ScanRun record |
| DRAFT | READY_TO_RUN | `analystId` is set, `scanQueries` count >= 1, all scan queries are PENDING | ADMIN, MEMBER | Set `queryCount` from scanQueries count |
| READY_TO_RUN | RUNNING | None beyond role check | ADMIN, MEMBER | Set `startedAt`, set triggeredById to actor |
| READY_TO_RUN | DRAFT | None | ADMIN, MEMBER | Clear analystId if desired |
| RUNNING | COMPLETE | All scanQueries in terminal state (SUCCEEDED, FAILED, SKIPPED), failedCount <= maxFailures | ADMIN, MEMBER, (or system/job) | Set `completedAt`, update `resultCount` and `failedCount` |
| RUNNING | BLOCKED | failedCount > maxFailures OR external dependency missing | System or ADMIN | Set `blockedAt`, `blockReason` |
| BLOCKED | RUNNING | Block reason resolved, actor provides unblock note | ADMIN | Clear `blockedAt`, clear `blockReason`, audit log entry with unblock reason |
| Any non-COMPLETE | CANCELLED | Explicit cancellation | ADMIN | Set `completedAt` to now |

### ScanResult Transitions

| From | To | Conditions | Required Role | Side Effects |
|------|-----|-----------|---------------|-------------|
| (new) | CAPTURED | ScanRun is RUNNING, scanQuery exists and is SUCCEEDED | System, MEMBER | Create ScanResult, update ScanRun.resultCount |
| CAPTURED | NEEDS_REVIEW | Flag triggered (auto: low confidence score, manual: analyst flags) | System, MEMBER, ADMIN | None |
| CAPTURED | APPROVED | Direct approval (high-confidence results, policy allows skip) | ADMIN, MEMBER | Set `reviewedById`, `reviewedAt` |
| NEEDS_REVIEW | APPROVED | Reviewer verifies quality | ADMIN, MEMBER (not the analyst who captured it — see assignment rules) | Set `reviewedById`, `reviewedAt` |
| NEEDS_REVIEW | REJECTED | Reviewer identifies quality issue | ADMIN, MEMBER | Set `reviewedById`, `reviewedAt`, `reviewNote` required |
| APPROVED | NEEDS_REVIEW | Reopen for re-review | ADMIN | Clear `reviewedById`, `reviewedAt` |
| REJECTED | (new CAPTURED) | Re-capture creates a new ScanResult with `replacesResultId` pointing to this one | ADMIN, MEMBER | Old result stays REJECTED. New result enters lifecycle independently |

### Report Transitions

| From | To | Conditions | Required Role | Side Effects |
|------|-----|-----------|---------------|-------------|
| (new) | DRAFT | Client exists, at least one COMPLETE scan selected, scan results include >= 1 APPROVED result | ADMIN, MEMBER | Create Report, generate content via `composeReport` |
| DRAFT | IN_REVIEW | `reviewerId` is set, `reviewerId != generatedById`, all included scan results are APPROVED | ADMIN, MEMBER | Audit log entry |
| IN_REVIEW | APPROVED | Reviewer signs off | The assigned `reviewerId` only | Audit log entry |
| IN_REVIEW | DRAFT | Revision requested | The assigned `reviewerId` only | Set `revisionNote`, audit log entry |
| APPROVED | DELIVERED | Delivery triggered | ADMIN, OWNER | Set `deliveredAt`, audit log entry |
| APPROVED | IN_REVIEW | Reopen | ADMIN | Clear `deliveredAt` if not yet delivered, audit log entry |

---

## D. Core Domain Logic

All state machine logic goes in `packages/core/src/workflow/`. This creates a new subdirectory within core to house the workflow engine without polluting existing modules.

### File Structure

```
packages/core/src/workflow/
  scan-machine.ts      -- ScanRun state machine
  result-machine.ts    -- ScanResult state machine
  report-machine.ts    -- Report state machine
  audit.ts             -- Audit log builder
  errors.ts            -- Workflow error types
  types.ts             -- Shared workflow types
  index.ts             -- Barrel export
```

### Error Types (`packages/core/src/workflow/errors.ts`)

```typescript
export class TransitionError extends Error {
  constructor(
    public readonly entityType: "ScanRun" | "ScanResult" | "Report",
    public readonly entityId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly reason: string,
  ) {
    super(
      `Invalid transition: ${entityType} ${entityId} cannot move from ${fromStatus} to ${toStatus}. ${reason}`,
    );
    this.name = "TransitionError";
  }
}

export class InsufficientRoleError extends Error {
  constructor(
    public readonly requiredRoles: string[],
    public readonly actualRole: string,
    public readonly action: string,
  ) {
    super(
      `Role ${actualRole} cannot perform ${action}. Required: ${requiredRoles.join(", ")}`,
    );
    this.name = "InsufficientRoleError";
  }
}

export class AssignmentError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly reason: string,
  ) {
    super(`Assignment error for ${entityType}: ${reason}`);
    this.name = "AssignmentError";
  }
}
```

### Shared Types (`packages/core/src/workflow/types.ts`)

```typescript
export interface TransitionContext {
  actorId: string;
  actorRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  note?: string;
  timestamp?: Date;
}

export interface TransitionResult<TStatus> {
  newStatus: TStatus;
  sideEffects: SideEffect[];
  auditEntry: AuditEntry;
}

export interface SideEffect {
  type: "set_field" | "increment_counter" | "create_entity";
  field?: string;
  value?: unknown;
}

export interface AuditEntry {
  entityType: "SCAN_RUN" | "SCAN_RESULT" | "REPORT";
  entityId: string;
  actorId: string;
  fromStatus: string | null;
  toStatus: string;
  action: string;
  note?: string;
  metadata?: Record<string, unknown>;
}
```

### Scan Machine (`packages/core/src/workflow/scan-machine.ts`)

```typescript
import type { TransitionContext, TransitionResult } from "./types";
import { TransitionError, InsufficientRoleError } from "./errors";

// Mirrors the Prisma enum — keeps core free of @prisma/client
export type ScanStatus =
  | "DRAFT"
  | "READY_TO_RUN"
  | "RUNNING"
  | "COMPLETE"
  | "BLOCKED"
  | "CANCELLED";

export interface ScanState {
  id: string;
  status: ScanStatus;
  analystId: string | null;
  scanQueryCount: number;       // count of ScanQuery records
  resultCount: number;
  failedCount: number;
  maxFailures: number;
  pendingQueryCount: number;    // ScanQuery records still PENDING or IN_PROGRESS
  terminalQueryCount: number;   // ScanQuery records in SUCCEEDED/FAILED/SKIPPED
}

const ALLOWED_TRANSITIONS: Record<ScanStatus, ScanStatus[]> = {
  DRAFT: ["READY_TO_RUN", "CANCELLED"],
  READY_TO_RUN: ["RUNNING", "DRAFT", "CANCELLED"],
  RUNNING: ["COMPLETE", "BLOCKED", "CANCELLED"],
  BLOCKED: ["RUNNING", "CANCELLED"],
  COMPLETE: [],
  CANCELLED: [],
};

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  readyToRun: new Set(["OWNER", "ADMIN", "MEMBER"]),
  start: new Set(["OWNER", "ADMIN", "MEMBER"]),
  complete: new Set(["OWNER", "ADMIN", "MEMBER"]),
  block: new Set(["OWNER", "ADMIN"]),
  unblock: new Set(["OWNER", "ADMIN"]),
  cancel: new Set(["OWNER", "ADMIN"]),
  backToDraft: new Set(["OWNER", "ADMIN", "MEMBER"]),
};

export function validateScanTransition(
  state: ScanState,
  targetStatus: ScanStatus,
  ctx: TransitionContext,
): TransitionResult<ScanStatus> {
  // 1. Check if transition is structurally valid
  const allowed = ALLOWED_TRANSITIONS[state.status];
  if (!allowed.includes(targetStatus)) {
    throw new TransitionError(
      "ScanRun",
      state.id,
      state.status,
      targetStatus,
      `Transition not allowed. Valid targets from ${state.status}: ${allowed.join(", ") || "none"}`,
    );
  }

  // 2. Determine the action name for role checking
  const actionName = resolveActionName(state.status, targetStatus);

  // 3. Check role permissions
  const requiredRoles = ROLE_PERMISSIONS[actionName];
  if (requiredRoles && !requiredRoles.has(ctx.actorRole)) {
    throw new InsufficientRoleError(
      [...requiredRoles],
      ctx.actorRole,
      actionName,
    );
  }

  // 4. Check conditions specific to each transition
  const sideEffects = validateConditions(state, targetStatus, ctx);

  const ts = ctx.timestamp ?? new Date();

  return {
    newStatus: targetStatus,
    sideEffects,
    auditEntry: {
      entityType: "SCAN_RUN",
      entityId: state.id,
      actorId: ctx.actorId,
      fromStatus: state.status,
      toStatus: targetStatus,
      action: actionName,
      note: ctx.note,
    },
  };
}

function resolveActionName(from: ScanStatus, to: ScanStatus): string {
  if (to === "READY_TO_RUN") return "readyToRun";
  if (to === "RUNNING" && from === "BLOCKED") return "unblock";
  if (to === "RUNNING") return "start";
  if (to === "COMPLETE") return "complete";
  if (to === "BLOCKED") return "block";
  if (to === "CANCELLED") return "cancel";
  if (to === "DRAFT") return "backToDraft";
  return "unknown";
}

function validateConditions(
  state: ScanState,
  targetStatus: ScanStatus,
  ctx: TransitionContext,
): SideEffect[] {
  const effects: SideEffect[] = [];

  switch (targetStatus) {
    case "READY_TO_RUN": {
      if (!state.analystId) {
        throw new TransitionError(
          "ScanRun", state.id, state.status, targetStatus,
          "An analyst must be assigned before marking scan ready.",
        );
      }
      if (state.scanQueryCount === 0) {
        throw new TransitionError(
          "ScanRun", state.id, state.status, targetStatus,
          "At least one query must be added to the scan.",
        );
      }
      effects.push({ type: "set_field", field: "queryCount", value: state.scanQueryCount });
      break;
    }

    case "RUNNING": {
      effects.push({ type: "set_field", field: "startedAt", value: "NOW" });
      break;
    }

    case "COMPLETE": {
      if (state.pendingQueryCount > 0) {
        throw new TransitionError(
          "ScanRun", state.id, state.status, targetStatus,
          `${state.pendingQueryCount} queries are still pending. All queries must reach a terminal state.`,
        );
      }
      if (state.failedCount > state.maxFailures) {
        throw new TransitionError(
          "ScanRun", state.id, state.status, targetStatus,
          `Failed query count (${state.failedCount}) exceeds maximum allowed failures (${state.maxFailures}). Resolve failures or increase tolerance.`,
        );
      }
      effects.push({ type: "set_field", field: "completedAt", value: "NOW" });
      break;
    }

    case "BLOCKED": {
      if (!ctx.note) {
        throw new TransitionError(
          "ScanRun", state.id, state.status, targetStatus,
          "A block reason is required.",
        );
      }
      effects.push({ type: "set_field", field: "blockedAt", value: "NOW" });
      effects.push({ type: "set_field", field: "blockReason", value: ctx.note });
      break;
    }

    case "CANCELLED": {
      effects.push({ type: "set_field", field: "completedAt", value: "NOW" });
      break;
    }

    default:
      break;
  }

  return effects;
}

/** Returns the set of valid next states for a given scan status. Used by UI to render available actions. */
export function availableScanTransitions(status: ScanStatus): ScanStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
```

### Result Machine (`packages/core/src/workflow/result-machine.ts`)

```typescript
import type { TransitionContext, TransitionResult } from "./types";
import { TransitionError, InsufficientRoleError, AssignmentError } from "./errors";

export type ResultStatus = "CAPTURED" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED";

export interface ResultState {
  id: string;
  status: ResultStatus;
  scanRunAnalystId: string | null;  // The analyst who owns the parent scan
  reviewedById: string | null;
  visibilityScore: number | null;
  replacesResultId: string | null;
}

/** Threshold below which results are auto-flagged for review. */
export const LOW_CONFIDENCE_THRESHOLD = 20;

const ALLOWED_TRANSITIONS: Record<ResultStatus, ResultStatus[]> = {
  CAPTURED: ["NEEDS_REVIEW", "APPROVED"],
  NEEDS_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["NEEDS_REVIEW"],
  REJECTED: [],  // REJECTED is terminal; re-capture creates a NEW result
};

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  flagForReview: new Set(["OWNER", "ADMIN", "MEMBER"]),
  approve: new Set(["OWNER", "ADMIN", "MEMBER"]),
  reject: new Set(["OWNER", "ADMIN", "MEMBER"]),
  reopenReview: new Set(["OWNER", "ADMIN"]),
};

export function validateResultTransition(
  state: ResultState,
  targetStatus: ResultStatus,
  ctx: TransitionContext,
): TransitionResult<ResultStatus> {
  const allowed = ALLOWED_TRANSITIONS[state.status];
  if (!allowed.includes(targetStatus)) {
    throw new TransitionError(
      "ScanResult",
      state.id,
      state.status,
      targetStatus,
      `Valid targets from ${state.status}: ${allowed.join(", ") || "none (terminal state)"}`,
    );
  }

  const actionName = resolveResultAction(state.status, targetStatus);
  const requiredRoles = ROLE_PERMISSIONS[actionName];
  if (requiredRoles && !requiredRoles.has(ctx.actorRole)) {
    throw new InsufficientRoleError([...requiredRoles], ctx.actorRole, actionName);
  }

  const sideEffects = validateResultConditions(state, targetStatus, ctx);

  return {
    newStatus: targetStatus,
    sideEffects,
    auditEntry: {
      entityType: "SCAN_RESULT",
      entityId: state.id,
      actorId: ctx.actorId,
      fromStatus: state.status,
      toStatus: targetStatus,
      action: actionName,
      note: ctx.note,
    },
  };
}

function resolveResultAction(from: ResultStatus, to: ResultStatus): string {
  if (to === "NEEDS_REVIEW" && from === "CAPTURED") return "flagForReview";
  if (to === "NEEDS_REVIEW" && from === "APPROVED") return "reopenReview";
  if (to === "APPROVED") return "approve";
  if (to === "REJECTED") return "reject";
  return "unknown";
}

function validateResultConditions(
  state: ResultState,
  targetStatus: ResultStatus,
  ctx: TransitionContext,
): SideEffect[] {
  const effects: SideEffect[] = [];

  switch (targetStatus) {
    case "APPROVED":
    case "REJECTED": {
      // Reviewer cannot be the same person as the scan analyst
      if (state.scanRunAnalystId && ctx.actorId === state.scanRunAnalystId) {
        throw new AssignmentError(
          "ScanResult",
          "The reviewer cannot be the same person who performed the scan. Assign a different reviewer.",
        );
      }
      effects.push({ type: "set_field", field: "reviewedById", value: ctx.actorId });
      effects.push({ type: "set_field", field: "reviewedAt", value: "NOW" });

      if (targetStatus === "REJECTED" && !ctx.note) {
        throw new TransitionError(
          "ScanResult", state.id, state.status, targetStatus,
          "A rejection reason is required.",
        );
      }
      if (targetStatus === "REJECTED") {
        effects.push({ type: "set_field", field: "reviewNote", value: ctx.note });
      }
      break;
    }

    case "NEEDS_REVIEW": {
      if (state.status === "APPROVED") {
        // Reopening a previously approved result — clear review data
        effects.push({ type: "set_field", field: "reviewedById", value: null });
        effects.push({ type: "set_field", field: "reviewedAt", value: null });
      }
      break;
    }
  }

  return effects;
}

/** Determine if a newly captured result should be auto-flagged for review. */
export function shouldAutoFlagForReview(
  visibilityScore: number | null,
): boolean {
  if (visibilityScore === null) return true;  // No score = always review
  return visibilityScore < LOW_CONFIDENCE_THRESHOLD;
}

export function availableResultTransitions(status: ResultStatus): ResultStatus[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
```

### Report Machine (`packages/core/src/workflow/report-machine.ts`)

```typescript
import type { TransitionContext, TransitionResult } from "./types";
import { TransitionError, InsufficientRoleError, AssignmentError } from "./errors";

export type ReportStatusValue = "DRAFT" | "IN_REVIEW" | "APPROVED" | "DELIVERED";

export interface ReportState {
  id: string;
  status: ReportStatusValue;
  generatedById: string | null;
  reviewerId: string | null;
  includedResultStatuses: ResultStatusCounts;
}

export interface ResultStatusCounts {
  captured: number;
  needsReview: number;
  approved: number;
  rejected: number;
}

const ALLOWED_TRANSITIONS: Record<ReportStatusValue, ReportStatusValue[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["DELIVERED", "IN_REVIEW"],
  DELIVERED: [],
};

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  submitForReview: new Set(["OWNER", "ADMIN", "MEMBER"]),
  approve: new Set(["OWNER", "ADMIN", "MEMBER"]),  // further restricted to assigned reviewer
  requestRevision: new Set(["OWNER", "ADMIN", "MEMBER"]),  // further restricted to assigned reviewer
  deliver: new Set(["OWNER", "ADMIN"]),
  reopenReview: new Set(["OWNER", "ADMIN"]),
};

export function validateReportTransition(
  state: ReportState,
  targetStatus: ReportStatusValue,
  ctx: TransitionContext,
): TransitionResult<ReportStatusValue> {
  const allowed = ALLOWED_TRANSITIONS[state.status];
  if (!allowed.includes(targetStatus)) {
    throw new TransitionError(
      "Report",
      state.id,
      state.status,
      targetStatus,
      `Valid targets from ${state.status}: ${allowed.join(", ") || "none (terminal state)"}`,
    );
  }

  const actionName = resolveReportAction(state.status, targetStatus);
  const requiredRoles = ROLE_PERMISSIONS[actionName];
  if (requiredRoles && !requiredRoles.has(ctx.actorRole)) {
    throw new InsufficientRoleError([...requiredRoles], ctx.actorRole, actionName);
  }

  const sideEffects = validateReportConditions(state, targetStatus, ctx);

  return {
    newStatus: targetStatus,
    sideEffects,
    auditEntry: {
      entityType: "REPORT",
      entityId: state.id,
      actorId: ctx.actorId,
      fromStatus: state.status,
      toStatus: targetStatus,
      action: actionName,
      note: ctx.note,
    },
  };
}

function resolveReportAction(from: ReportStatusValue, to: ReportStatusValue): string {
  if (to === "IN_REVIEW" && from === "DRAFT") return "submitForReview";
  if (to === "IN_REVIEW" && from === "APPROVED") return "reopenReview";
  if (to === "APPROVED") return "approve";
  if (to === "DRAFT" && from === "IN_REVIEW") return "requestRevision";
  if (to === "DELIVERED") return "deliver";
  return "unknown";
}

function validateReportConditions(
  state: ReportState,
  targetStatus: ReportStatusValue,
  ctx: TransitionContext,
): SideEffect[] {
  const effects: SideEffect[] = [];

  switch (targetStatus) {
    case "IN_REVIEW": {
      if (!state.reviewerId) {
        throw new TransitionError(
          "Report", state.id, state.status, targetStatus,
          "A reviewer must be assigned before submitting for review.",
        );
      }
      if (state.reviewerId === state.generatedById) {
        throw new AssignmentError(
          "Report",
          "The reviewer cannot be the same person who generated the report.",
        );
      }

      // All included scan results must be APPROVED
      const { captured, needsReview, rejected } = state.includedResultStatuses;
      const nonApproved = captured + needsReview + rejected;
      if (nonApproved > 0) {
        throw new TransitionError(
          "Report", state.id, state.status, targetStatus,
          `${nonApproved} scan result(s) have not been approved yet. All results must be APPROVED before submitting report for review.`,
        );
      }
      break;
    }

    case "APPROVED": {
      // Only the assigned reviewer can approve
      if (ctx.actorId !== state.reviewerId) {
        throw new TransitionError(
          "Report", state.id, state.status, targetStatus,
          "Only the assigned reviewer can approve this report.",
        );
      }
      break;
    }

    case "DRAFT": {
      // Revision request — only the reviewer can send back
      if (state.status === "IN_REVIEW" && ctx.actorId !== state.reviewerId) {
        throw new TransitionError(
          "Report", state.id, state.status, targetStatus,
          "Only the assigned reviewer can request revisions.",
        );
      }
      if (state.status === "IN_REVIEW" && !ctx.note) {
        throw new TransitionError(
          "Report", state.id, state.status, targetStatus,
          "A revision note explaining what needs to change is required.",
        );
      }
      effects.push({ type: "set_field", field: "revisionNote", value: ctx.note });
      break;
    }

    case "DELIVERED": {
      effects.push({ type: "set_field", field: "deliveredAt", value: "NOW" });
      break;
    }
  }

  return effects;
}

export function availableReportTransitions(status: ReportStatusValue): ReportStatusValue[] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}
```

### Audit Log Builder (`packages/core/src/workflow/audit.ts`)

```typescript
import type { AuditEntry } from "./types";

/**
 * Build an audit log entry from a validated transition.
 * This is a pure function — the caller (server action or job) is responsible
 * for persisting the entry via prisma.auditLog.create().
 */
export function buildAuditEntry(entry: AuditEntry): {
  entityType: string;
  entityId: string;
  actorId: string | null;
  fromStatus: string | null;
  toStatus: string;
  action: string;
  note: string | null;
  metadata: Record<string, unknown> | null;
} {
  return {
    entityType: entry.entityType,
    entityId: entry.entityId,
    actorId: entry.actorId ?? null,
    fromStatus: entry.fromStatus ?? null,
    toStatus: entry.toStatus,
    action: entry.action,
    note: entry.note ?? null,
    metadata: entry.metadata ?? null,
  };
}
```

### Barrel Export (`packages/core/src/workflow/index.ts`)

```typescript
export {
  validateScanTransition,
  availableScanTransitions,
} from "./scan-machine";
export type { ScanStatus, ScanState } from "./scan-machine";

export {
  validateResultTransition,
  availableResultTransitions,
  shouldAutoFlagForReview,
  LOW_CONFIDENCE_THRESHOLD,
} from "./result-machine";
export type { ResultStatus, ResultState } from "./result-machine";

export {
  validateReportTransition,
  availableReportTransitions,
} from "./report-machine";
export type {
  ReportStatusValue,
  ReportState,
  ResultStatusCounts,
} from "./report-machine";

export { buildAuditEntry } from "./audit";

export { TransitionError, InsufficientRoleError, AssignmentError } from "./errors";

export type {
  TransitionContext,
  TransitionResult,
  SideEffect,
  AuditEntry,
} from "./types";
```

Then add to `packages/core/src/index.ts`:

```typescript
// ─── Workflow state machines ────────────────────────────────
export {
  validateScanTransition,
  availableScanTransitions,
  validateResultTransition,
  availableResultTransitions,
  shouldAutoFlagForReview,
  LOW_CONFIDENCE_THRESHOLD,
  validateReportTransition,
  availableReportTransitions,
  buildAuditEntry,
  TransitionError,
  InsufficientRoleError,
  AssignmentError,
} from "./workflow";
export type {
  ScanStatus,
  ScanState,
  ResultStatus,
  ResultState,
  ReportStatusValue,
  ReportState,
  ResultStatusCounts,
  TransitionContext,
  TransitionResult,
  SideEffect,
  AuditEntry,
} from "./workflow";
```

---

## E. Server Action Patterns

### Changes to Existing Actions

#### `apps/web/src/app/(dashboard)/actions/scans.ts`

**`createScan`** changes from "create in RUNNING" to "create in DRAFT":

```typescript
export async function createScan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // ... validation ...

  // Create scan in DRAFT, with ScanQuery records for each selected query
  const scan = await prisma.$transaction(async (tx) => {
    const s = await tx.scanRun.create({
      data: {
        clientId,
        status: "DRAFT",
        model: formData.get("model") as string || "manual",
        metadata: { queryClusterIds },
      },
    });

    // Create ScanQuery records for every active query in selected clusters
    const queries = await tx.query.findMany({
      where: { queryClusterId: { in: queryClusterIds }, isActive: true },
      select: { id: true },
    });

    if (queries.length > 0) {
      await tx.scanQuery.createMany({
        data: queries.map((q) => ({
          scanRunId: s.id,
          queryId: q.id,
        })),
      });
    }

    return s;
  });

  redirect(`/scans/${scan.id}`);
}
```

**`completeScan`** becomes a validated transition:

```typescript
export async function completeScan(id: string): Promise<void> {
  const { user } = await requireAuth();

  const scan = await prisma.scanRun.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          scanQueries: true,
          results: true,
        },
      },
      scanQueries: {
        select: { status: true },
      },
    },
  });

  if (!scan) throw new Error("Scan not found.");

  const pendingCount = scan.scanQueries.filter(
    (sq) => sq.status === "PENDING" || sq.status === "IN_PROGRESS"
  ).length;
  const failedCount = scan.scanQueries.filter(
    (sq) => sq.status === "FAILED"
  ).length;

  const state: ScanState = {
    id: scan.id,
    status: scan.status as ScanStatus,
    analystId: scan.analystId,
    scanQueryCount: scan._count.scanQueries,
    resultCount: scan._count.results,
    failedCount,
    maxFailures: scan.maxFailures,
    pendingQueryCount: pendingCount,
    terminalQueryCount: scan.scanQueries.length - pendingCount,
  };

  const result = validateScanTransition(state, "COMPLETE", {
    actorId: user.id,
    actorRole: user.role,
  });

  await prisma.$transaction([
    prisma.scanRun.update({
      where: { id },
      data: {
        status: "COMPLETE",
        completedAt: new Date(),
        resultCount: scan._count.results,
        failedCount,
      },
    }),
    prisma.auditLog.create({
      data: buildAuditEntry(result.auditEntry),
    }),
  ]);

  revalidatePath(`/scans/${id}`);
  redirect(`/scans/${id}`);
}
```

**`recordResult`** now sets result status and auto-flags:

```typescript
// After creating the ScanResult, determine initial status:
const initialStatus = shouldAutoFlagForReview(analysis.visibilityScore)
  ? "NEEDS_REVIEW"
  : "CAPTURED";

const scanResult = await tx.scanResult.create({
  data: {
    scanRunId,
    queryId,
    status: initialStatus,
    response,
    visibilityScore: analysis.visibilityScore,
    sentimentScore: analysis.sentimentScore,
    mentioned: analysis.clientMentioned,
    metadata: { ... },
  },
});

// Also update the ScanQuery status to SUCCEEDED
await tx.scanQuery.update({
  where: { scanRunId_queryId: { scanRunId, queryId } },
  data: { status: "SUCCEEDED" },
});
```

**`deleteScan`** should only work on DRAFT or CANCELLED scans:

```typescript
export async function deleteScan(id: string): Promise<void> {
  const scan = await prisma.scanRun.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!scan) throw new Error("Scan not found.");
  if (scan.status !== "DRAFT" && scan.status !== "CANCELLED") {
    throw new Error("Only DRAFT or CANCELLED scans can be deleted.");
  }
  await prisma.scanRun.delete({ where: { id } });
  redirect("/scans");
}
```

#### `apps/web/src/app/(dashboard)/actions/reports.ts`

**`generateReport`** now filters for APPROVED results only and creates ReportScan records:

```typescript
// Replace the direct scanRunIds metadata storage:
const scanResults = await prisma.scanResult.findMany({
  where: {
    scanRunId: { in: scanRunIds },
    status: "APPROVED",  // Only approved results feed into reports
  },
  // ... existing select ...
});

// In the transaction, create ReportScan join records:
for (const scanRunId of scanRunIds) {
  await tx.reportScan.create({
    data: { reportId: r.id, scanRunId },
  });
}
```

**`updateReportStatus`** becomes a validated transition:

```typescript
export async function updateReportStatus(
  id: string,
  targetStatus: string,
  note?: string,
): Promise<void> {
  const { user } = await requireAuth();

  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId: user.organizationId } },
    include: {
      reportScans: {
        include: {
          scanRun: {
            include: {
              results: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  if (!report) throw new Error("Report not found.");

  // Count result statuses across all included scans
  const allResults = report.reportScans.flatMap((rs) => rs.scanRun.results);
  const includedResultStatuses: ResultStatusCounts = {
    captured: allResults.filter((r) => r.status === "CAPTURED").length,
    needsReview: allResults.filter((r) => r.status === "NEEDS_REVIEW").length,
    approved: allResults.filter((r) => r.status === "APPROVED").length,
    rejected: allResults.filter((r) => r.status === "REJECTED").length,
  };

  const state: ReportState = {
    id: report.id,
    status: report.status as ReportStatusValue,
    generatedById: report.generatedById,
    reviewerId: report.reviewerId,
    includedResultStatuses,
  };

  const result = validateReportTransition(
    state,
    targetStatus as ReportStatusValue,
    { actorId: user.id, actorRole: user.role, note },
  );

  // Apply side effects
  const updateData: Record<string, unknown> = { status: result.newStatus };
  for (const effect of result.sideEffects) {
    if (effect.type === "set_field" && effect.field) {
      updateData[effect.field] = effect.value === "NOW" ? new Date() : effect.value;
    }
  }

  await prisma.$transaction([
    prisma.report.update({ where: { id }, data: updateData }),
    prisma.auditLog.create({ data: buildAuditEntry(result.auditEntry) }),
  ]);

  redirect(`/reports/${id}`);
}
```

### New Server Actions

#### `apps/web/src/app/(dashboard)/actions/scan-workflow.ts`

```typescript
"use server";

// --- Scan assignment and lifecycle actions ---

export async function assignScanAnalyst(scanId: string, analystId: string): Promise<void>;

export async function markScanReady(scanId: string): Promise<void>;

export async function startScan(scanId: string): Promise<void>;

export async function blockScan(scanId: string, reason: string): Promise<void>;

export async function unblockScan(scanId: string, note: string): Promise<void>;

export async function cancelScan(scanId: string): Promise<void>;

export async function rerunScan(scanId: string): Promise<void>;
// Creates a new ScanRun with parentScanRunId pointing to the original.
// Copies the ScanQuery records. Does NOT copy results.

export async function rerunQuery(scanId: string, queryId: string): Promise<void>;
// Resets the ScanQuery status to PENDING for retry.
// Only works when ScanQuery.attempts < ScanQuery.maxRetries.
```

#### `apps/web/src/app/(dashboard)/actions/result-workflow.ts`

```typescript
"use server";

// --- Result review actions ---

export async function approveResult(resultId: string): Promise<void>;

export async function rejectResult(resultId: string, reason: string): Promise<void>;

export async function flagResultForReview(resultId: string): Promise<void>;

export async function reopenResultReview(resultId: string): Promise<void>;

export async function recaptureResult(
  originalResultId: string,
  formData: FormData,
): Promise<void>;
// Creates a new ScanResult with replacesResultId pointing to the original.
// The original stays REJECTED. The new result enters CAPTURED.

export async function bulkApproveResults(resultIds: string[]): Promise<void>;
// Approve multiple results at once. Each is individually validated.
```

#### `apps/web/src/app/(dashboard)/actions/report-workflow.ts`

```typescript
"use server";

// --- Report review lifecycle ---

export async function assignReportReviewer(reportId: string, reviewerId: string): Promise<void>;

export async function submitReportForReview(reportId: string): Promise<void>;

export async function approveReport(reportId: string): Promise<void>;

export async function requestReportRevision(reportId: string, note: string): Promise<void>;

export async function deliverReport(reportId: string): Promise<void>;

export async function archiveReport(reportId: string): Promise<void>;
// Sets archivedAt timestamp. Does not change status.
```

### Auth Integration Point

The `requireAuth` function (replacing the current `getOrganizationId` stub) needs to return:

```typescript
interface AuthContext {
  user: {
    id: string;
    organizationId: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  };
}

export async function requireAuth(): Promise<AuthContext> {
  // Current stub evolves to real auth here.
  // For now, look up the first user in the first org.
}
```

All workflow actions call `requireAuth()` and pass the user into `TransitionContext`. This is the single integration point — when real auth lands, only this function changes.

---

## F. Example Flows

### Flow 1: Happy Path

```
1. Analyst creates a scan for client "Acme Corp"
   Action: createScan({ clientId, queryClusterIds: [c1, c2] })
   Result: ScanRun created in DRAFT status
           ScanQuery records created for each active query in clusters c1, c2

2. Analyst is assigned
   Action: assignScanAnalyst(scanId, analystId)
   Result: ScanRun.analystId set

3. Scan marked ready
   Action: markScanReady(scanId)
   Validation: analystId is set, scanQueries.count >= 1
   Result: ScanRun status -> READY_TO_RUN
   Audit: DRAFT -> READY_TO_RUN by user X

4. Scan started
   Action: startScan(scanId)
   Result: ScanRun status -> RUNNING, startedAt set
   Audit: READY_TO_RUN -> RUNNING by user X

5. Analyst records results for each query (manual flow)
   For each query in the scan:
     Action: recordResult({ scanRunId, queryId, response, citedDomains })
     Processing: analyzeResponse() runs heuristic scoring
     Result: ScanResult created in CAPTURED (or NEEDS_REVIEW if low confidence)
             ScanQuery status -> SUCCEEDED

6. Results reviewed
   For each NEEDS_REVIEW result:
     Action: approveResult(resultId) or rejectResult(resultId, reason)
     Validation: reviewer != scan analyst
     Result: ScanResult status -> APPROVED or REJECTED
     Audit: NEEDS_REVIEW -> APPROVED by reviewer Y

   For CAPTURED results (high confidence):
     Action: approveResult(resultId)
     Result: ScanResult status -> APPROVED

7. Scan completed
   Action: completeScan(scanId)
   Validation: all ScanQuery records in terminal state, failedCount <= maxFailures
   Result: ScanRun status -> COMPLETE, completedAt set
   Audit: RUNNING -> COMPLETE by user X

8. Report generated
   Action: generateReport({ clientId, title, scanRunIds: [scanId] })
   Validation: scans are COMPLETE, results are APPROVED
   Processing: composeReport() generates sections and recommendations
   Result: Report created in DRAFT status, ReportScan join records created

9. Reviewer assigned
   Action: assignReportReviewer(reportId, reviewerId)
   Validation: reviewerId != generatedById
   Result: Report.reviewerId set

10. Report submitted for review
    Action: submitReportForReview(reportId)
    Validation: reviewer assigned, all included results APPROVED
    Result: Report status -> IN_REVIEW
    Audit: DRAFT -> IN_REVIEW by user X

11. Report approved
    Action: approveReport(reportId)
    Validation: actor is the assigned reviewer
    Result: Report status -> APPROVED
    Audit: IN_REVIEW -> APPROVED by reviewer Y

12. Report delivered
    Action: deliverReport(reportId)
    Validation: ADMIN or OWNER role
    Result: Report status -> DELIVERED, deliveredAt set
    Audit: APPROVED -> DELIVERED by user Z
```

### Flow 2: Failure Path

```
1. Scan created and started as in happy path (steps 1-4 above)

2. Automated scan executes queries (future: via apps/jobs worker)
   For query Q1: LLM returns result -> ScanQuery Q1 status = SUCCEEDED
   For query Q2: LLM timeout -> ScanQuery Q2 status = FAILED, attempts = 1
   For query Q3: LLM returns result -> ScanQuery Q3 status = SUCCEEDED
   For query Q4: LLM error -> ScanQuery Q4 status = FAILED, attempts = 1

3. System detects failure rate exceeds threshold
   Scan has maxFailures = 1, but failedCount = 2
   Action: blockScan(scanId, "2 of 4 queries failed, exceeds tolerance of 1")
   Result: ScanRun status -> BLOCKED, blockedAt set, blockReason set
   Audit: RUNNING -> BLOCKED by system

4. Admin investigates and retries failed queries
   Action: rerunQuery(scanId, Q2)
   Validation: Q2.attempts (1) < Q2.maxRetries (2)
   Result: ScanQuery Q2 status reset to PENDING, attempts stays at 1

   Action: rerunQuery(scanId, Q4)
   Result: ScanQuery Q4 status reset to PENDING

5. Admin unblocks the scan
   Action: unblockScan(scanId, "Retrying failed queries Q2 and Q4")
   Result: ScanRun status -> RUNNING, blockedAt cleared
   Audit: BLOCKED -> RUNNING by admin

6. Retried queries execute
   Q2 retry succeeds -> SUCCEEDED, attempts = 2
   Q4 retry fails again -> FAILED, attempts = 2

7. With 1 failure (Q4) and maxFailures = 1, scan can now complete
   Action: completeScan(scanId)
   Validation: all queries terminal, failedCount (1) <= maxFailures (1)
   Result: ScanRun status -> COMPLETE
   Audit: RUNNING -> COMPLETE

8. Report generation proceeds with available results (Q1, Q2, Q3)
   Q4's absence is noted in the report metadata as a gap
```

### Flow 3: Rejection Path

```
1. Scan RUNNING, analyst records a result for query Q5
   Action: recordResult({ scanRunId, queryId: Q5, response: "..." })
   Processing: analyzeResponse() returns visibilityScore = 12 (below threshold of 20)
   Result: ScanResult SR1 created in NEEDS_REVIEW status (auto-flagged)
   Audit: (creation) CAPTURED -> NEEDS_REVIEW by system

2. Reviewer examines the result, finds the response was garbled
   Action: rejectResult(SR1, "LLM response is garbled/truncated, not usable")
   Validation: reviewer != scan analyst
   Result: ScanResult SR1 status -> REJECTED, reviewNote set
   Audit: NEEDS_REVIEW -> REJECTED by reviewer Y

3. Analyst re-captures the result
   Action: recaptureResult(SR1, formData)
   Processing:
     - Creates new ScanResult SR2 with replacesResultId = SR1
     - SR2 enters lifecycle independently as CAPTURED (or NEEDS_REVIEW)
     - SR1 stays REJECTED permanently
   Result: New ScanResult SR2 created
   Audit: (creation) new result SR2 replaces SR1

4. Reviewer approves the replacement
   Action: approveResult(SR2)
   Result: ScanResult SR2 status -> APPROVED
   Audit: CAPTURED -> APPROVED by reviewer Y

5. Report generation uses SR2 (APPROVED), ignores SR1 (REJECTED)
   The query for generateReport filters WHERE status = 'APPROVED'
   SR1 is excluded. SR2 is included.
   The replacement chain (SR2.replacesResultId -> SR1) is preserved for audit.
```

---

## G. Migration Strategy

### Enum Migration

This is the highest-risk part of the change. Prisma + PostgreSQL enum migrations require careful handling.

#### ScanRunStatus

Current values: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
New values: DRAFT, READY_TO_RUN, RUNNING, COMPLETE, BLOCKED, CANCELLED

Mapping:
- PENDING -> DRAFT (scans that haven't started)
- RUNNING -> RUNNING (no change)
- COMPLETED -> COMPLETE (rename)
- FAILED -> BLOCKED (failed scans become blockable rather than terminal)
- CANCELLED -> CANCELLED (no change)

Migration SQL (run inside a Prisma migration):

```sql
-- 1. Add new values to the enum
ALTER TYPE "ScanRunStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "ScanRunStatus" ADD VALUE IF NOT EXISTS 'READY_TO_RUN';
ALTER TYPE "ScanRunStatus" ADD VALUE IF NOT EXISTS 'COMPLETE';
ALTER TYPE "ScanRunStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- 2. Migrate existing data
UPDATE scan_runs SET status = 'DRAFT' WHERE status = 'PENDING';
UPDATE scan_runs SET status = 'COMPLETE' WHERE status = 'COMPLETED';
UPDATE scan_runs SET status = 'BLOCKED' WHERE status = 'FAILED';

-- 3. Remove old values (PostgreSQL requires recreating the enum for removal)
-- This must be done via Prisma's migration system or a manual ALTER TYPE approach.
-- Safest: use Prisma's built-in enum diffing by updating schema.prisma and running prisma migrate dev.
```

Important: PostgreSQL does not support removing enum values directly. The safest approach with Prisma is:

1. Add the new enum values first (migration 1).
2. Migrate all data to use only the new values (migration 2, data-only).
3. Update the Prisma schema to reflect only the new values (migration 3 -- Prisma will handle the column type change).

If this is too risky, an alternative is to create a brand-new enum (e.g., `ScanRunStatusV2`), add a new column, migrate data, drop the old column, and rename. This avoids in-place enum modification.

#### ReportStatus

Current values: DRAFT, GENERATING, REVIEW, PUBLISHED, ARCHIVED
New values: DRAFT, IN_REVIEW, APPROVED, DELIVERED

Mapping:
- DRAFT -> DRAFT
- GENERATING -> DRAFT (generation is synchronous, no reports should be stuck in GENERATING)
- REVIEW -> IN_REVIEW
- PUBLISHED -> DELIVERED (published reports are treated as delivered)
- ARCHIVED -> DELIVERED + set archivedAt (archived reports were delivered; archiving is now a flag)

```sql
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

UPDATE reports SET status = 'DRAFT' WHERE status = 'GENERATING';
UPDATE reports SET status = 'IN_REVIEW' WHERE status = 'REVIEW';
UPDATE reports SET status = 'DELIVERED' WHERE status = 'PUBLISHED';
UPDATE reports SET status = 'DELIVERED', "archivedAt" = "updatedAt" WHERE status = 'ARCHIVED';
```

#### ScanResultStatus (new enum)

This is additive -- no migration needed. The new `status` column on ScanResult defaults to `CAPTURED`. Existing results get backfilled:

```sql
-- All existing results were implicitly trusted. Mark them APPROVED.
UPDATE scan_results SET status = 'APPROVED' WHERE status IS NULL;
```

This backfill ensures existing reports remain valid (they expect all their results to be APPROVED).

### New Tables

`ScanQuery`, `ReportScan`, and `AuditLog` are additive. No existing data needs migration for these tables.

For existing scans, we should backfill `ScanQuery` records from the `metadata.queryClusterIds` JSON:

```sql
-- Pseudocode for backfill script (run as a one-time seed/migration script)
-- For each existing ScanRun:
--   1. Read metadata->queryClusterIds
--   2. Find all active queries in those clusters
--   3. Create ScanQuery records with status = SUCCEEDED (for completed scans)
--      or PENDING (for non-completed scans)
```

For existing reports, backfill `ReportScan` from `metadata.scanRunIds` JSON:

```sql
-- For each existing Report:
--   1. Read metadata->scanRunIds
--   2. Create ReportScan records for each scanRunId
```

### New Columns on Existing Tables

All new columns on existing models (`analystId`, `failedCount`, `maxFailures`, `blockedAt`, `blockReason`, `parentScanRunId` on ScanRun; `status`, `reviewedById`, `reviewedAt`, `reviewNote`, `replacesResultId` on ScanResult; `reviewerId`, `revisionNote`, `deliveredAt`, `archivedAt` on Report) are nullable or have defaults. No data loss.

### Migration Order

1. **Migration 1:** Add new enum values, add new columns (all nullable), add new tables (ScanQuery, ReportScan, AuditLog). This is a safe, additive-only migration.

2. **Migration 2 (data):** Backfill existing data -- map old enum values to new ones, backfill ScanQuery and ReportScan from JSON metadata, set existing ScanResult.status to APPROVED.

3. **Migration 3:** Remove old enum values. Update Prisma schema to reflect final enum definitions. Remove old enum values from Zod schemas in `packages/core/src/schemas.ts`.

4. **Migration 4:** Add NOT NULL constraint on `ScanResult.status` (after backfill confirms all rows have a value).

### Zod Schema Updates

`packages/core/src/schemas.ts` must be updated to mirror the new Prisma enums:

```typescript
export const ScanRunStatus = z.enum([
  "DRAFT",
  "READY_TO_RUN",
  "RUNNING",
  "COMPLETE",
  "BLOCKED",
  "CANCELLED",
]);

export const ScanResultStatus = z.enum([
  "CAPTURED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
]);

export const ReportStatus = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "DELIVERED",
]);

export const ScanQueryStatus = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "SUCCEEDED",
  "FAILED",
  "SKIPPED",
]);
```

### Downstream Code Impact

Files that reference the old enum values and must be updated:

| File | Change needed |
|------|--------------|
| `apps/web/src/app/(dashboard)/actions/scans.ts` | Update status values, use workflow functions |
| `apps/web/src/app/(dashboard)/actions/reports.ts` | Update status values, filter by APPROVED results |
| `apps/web/src/app/(dashboard)/actions/snapshots.ts` | Change `"COMPLETED"` to `"COMPLETE"` on line 36 |
| `packages/core/src/schemas.ts` | Update all enum definitions |
| `apps/jobs/src/index.ts` | Update TODO comments (PENDING -> DRAFT/READY_TO_RUN) |
| Any UI components referencing status values | Update display labels and status badges |

### Rollback Plan

If the migration encounters issues:

1. All migrations should be reversible. Prisma generates down migrations.
2. The old enum values can be re-added and data unmapped.
3. The new nullable columns and tables can be dropped without data loss to the original schema.
4. The application code changes are behind the new workflow functions. If code is reverted, the old action patterns still work with the old enum values.

---

## Implementation Priority

Recommended implementation order for the backend agent:

1. **Phase 1 -- Schema + Enums:** Prisma schema changes, migration scripts, Zod schema updates. Estimated: 1 session.

2. **Phase 2 -- Core workflow module:** `packages/core/src/workflow/` with all three state machines, error types, and audit builder. Unit tests for every transition rule. Estimated: 1 session.

3. **Phase 3 -- Server action refactor:** Update existing actions (`scans.ts`, `reports.ts`), create new workflow actions. Wire in `requireAuth` stub that returns user id + role. Estimated: 1-2 sessions.

4. **Phase 4 -- Data backfill:** Script to migrate existing data (ScanQuery backfill from metadata, ReportScan backfill, result status backfill). Estimated: 0.5 session.

5. **Phase 5 -- Jobs integration:** Update `apps/jobs/src/index.ts` to use ScanQuery for polling and the scan machine for transitions. Estimated: 1 session (when automation is prioritized).

Each phase is independently deployable and testable.
