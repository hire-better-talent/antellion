# Operations Dashboard Design

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Architect

---

## Table of Contents

1. [Design Context](#1-design-context)
2. [Data Model](#a-data-model)
3. [Dashboard Structure](#b-dashboard-structure)
4. [Metrics Design](#c-metrics-design)
5. [Alert System](#d-alert-system)
6. [Workflow Integration](#e-workflow-integration)

---

## 1. Design Context

### What this is

Internal operational tooling for the team running Antellion audits. It answers: "What is the current state of all our work across all clients, who is doing what, what is stuck, and what is late?"

This is NOT a customer-facing feature. It is a back-office view layered on top of the same data that powers the analyst workflow and QA system. It should require zero new domain logic — it is purely read-side aggregation over existing entities.

### What exists today

**Dashboard** (`apps/web/src/app/(dashboard)/page.tsx`) shows four summary cards (client count, active scan count, query count, report count) and a merged recent-activity feed of scans and reports, sorted by `createdAt`. This is useful for a single operator but does not support multi-client workload management.

**Scans list** (`apps/web/src/app/(dashboard)/scans/page.tsx`) shows all scans with progress (resultCount/queryCount), mention rate, and average visibility. No filtering by status, analyst, or client. No indication of how long a scan has been running or whether it is stalled.

**Reports list** (`apps/web/src/app/(dashboard)/reports/page.tsx`) shows all reports with status, recommendation count, and creation date. No filtering by status, reviewer, or QA state. No time-in-phase tracking.

**Auth** is a stub (`apps/web/src/lib/auth.ts`) that returns the first organization. There is no concept of "current user" for assignment tracking. The `User` model exists with roles (OWNER, ADMIN, MEMBER, VIEWER) but is never resolved from a session.

**Jobs worker** (`apps/jobs/src/index.ts`) is a skeleton. No polling, no scheduled tasks, no alert infrastructure.

### What the planned designs add

The **analyst workflow design** adds:
- `ScanRun.analystId` — who is assigned to run the scan
- `ScanRun.blockedAt`, `blockReason` — when/why a scan is stuck
- `ScanQuery` join table — per-query execution tracking (PENDING, IN_PROGRESS, SUCCEEDED, FAILED, SKIPPED)
- `ScanResult.status` (CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED) — result review lifecycle
- `ScanResult.reviewedById`, `reviewedAt` — who reviewed and when
- `Report.reviewerId` — who is assigned to review the report
- `Report.deliveredAt` — when the report was delivered
- `ReportScan` join table — explicit scan-to-report relationship
- `AuditLog` — timestamped record of every state transition

The **QA system design** adds:
- `ReportQA` — per-report QA record with status (PENDING, RUNNING, PASS, CONDITIONAL_PASS, FAIL)
- `ReportQA.signedOffById`, `signedOffAt` — QA signoff tracking
- `QACheckResult` — individual check outcomes
- `QAFlag` — issues raised during QA with status (OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED)

Together, these designs provide the raw state and timestamps needed for operational dashboards. The operations layer reads this data but never writes to workflow state.

### Key design principle

**Derive, do not duplicate.** Every metric in this design is computed from existing timestamps and status fields on existing (or planned) models. We add exactly two things: a lightweight `Engagement` concept to group work per-client-audit, and an `SLADeadline` field to track when deliverables are due. Everything else is a read-time computation.

---

## A. Data Model

### New schema additions

These are the ONLY new models and fields this design introduces. Everything else is derived at query time from the analyst workflow and QA system data.

```prisma
// ─── Engagement ──────────────────────────────────────────────
// Groups a set of scans and a report into a single "audit engagement"
// for a client. This is the unit of work from an operational perspective.

model Engagement {
  id             String            @id @default(cuid())
  clientId       String
  title          String                              // e.g., "Q1 2026 Audit"
  status         EngagementStatus  @default(SETUP)
  ownerId        String?                             // Lead analyst or project owner
  slaDeadline    DateTime?                           // When the deliverable is due
  startedAt      DateTime?
  completedAt    DateTime?
  notes          String?           @db.Text
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  client         Client            @relation(fields: [clientId], references: [id])
  owner          User?             @relation("EngagementOwner", fields: [ownerId], references: [id], onDelete: SetNull)
  scanRuns       ScanRun[]
  reports        Report[]

  @@index([clientId])
  @@index([status])
  @@index([ownerId])
  @@index([slaDeadline])
  @@map("engagements")
}

enum EngagementStatus {
  SETUP           // Scans being configured
  SCANNING        // At least one scan is RUNNING or READY_TO_RUN
  REVIEW          // Scans complete, results/report under review
  QA              // Report generated, in QA
  READY           // QA passed, report approved, ready for delivery
  DELIVERED       // Report delivered to client
  ON_HOLD         // Paused for external reasons
}
```

**Modified existing models** (additions only):

```prisma
model ScanRun {
  // ... existing + analyst workflow fields ...
  engagementId  String?

  engagement    Engagement? @relation(fields: [engagementId], references: [id], onDelete: SetNull)

  @@index([engagementId])
}

model Report {
  // ... existing + analyst workflow fields ...
  engagementId  String?

  engagement    Engagement? @relation(fields: [engagementId], references: [id], onDelete: SetNull)

  @@index([engagementId])
}

model User {
  // ... existing + analyst workflow + QA relations ...
  ownedEngagements  Engagement[] @relation("EngagementOwner")
}

model Client {
  // ... existing relations ...
  engagements  Engagement[]
}
```

### What is NOT new — what is derived at read time

| Data point | Source | Computation |
|-----------|--------|-------------|
| Engagement phase | `EngagementStatus` enum | Stored, updated on key transitions (see section E) |
| Time in current phase | `Engagement.updatedAt` | `now() - updatedAt` (updatedAt tracks last status change) |
| Scan duration | `ScanRun.startedAt`, `ScanRun.completedAt` | `completedAt - startedAt` (null if still running) |
| Scan staleness | `ScanRun.startedAt` or last `AuditLog` entry for the scan | `now() - max(startedAt, lastAuditLogTimestamp)` |
| Per-query progress | `ScanQuery.status` counts | `GROUP BY status WHERE scanRunId = ?` |
| Block reason and duration | `ScanRun.blockedAt`, `blockReason` | `now() - blockedAt`, `blockReason` text |
| Results needing review | `ScanResult.status = 'NEEDS_REVIEW'` | `COUNT WHERE status = 'NEEDS_REVIEW'` |
| Report time-to-deliver | `Report.createdAt`, `Report.deliveredAt` | `deliveredAt - createdAt` |
| Report time in review | `AuditLog` entries for the report | Diff between IN_REVIEW entry and APPROVED entry timestamps |
| QA status | `ReportQA.status` | Direct read |
| QA open flags | `QAFlag WHERE status = 'OPEN'` | Count query |
| Rework rate (results) | `ScanResult WHERE replacesResultId IS NOT NULL` | `COUNT(replacements) / COUNT(all results)` |
| Rework rate (reports) | `AuditLog WHERE entityType = 'REPORT' AND action = 'requestRevision'` | Count of revision requests per report |
| Error rate (queries) | `ScanQuery WHERE status = 'FAILED'` | `COUNT(failed) / COUNT(total)` per scan |
| Analyst workload | `ScanRun WHERE analystId = ? AND status IN (DRAFT, READY_TO_RUN, RUNNING, BLOCKED)` | Count of active assignments |
| Reviewer workload | `ScanResult WHERE reviewedById IS NULL AND status = 'NEEDS_REVIEW'` + `Report WHERE reviewerId = ? AND status = 'IN_REVIEW'` | Count of pending review items |
| Overdue engagements | `Engagement WHERE slaDeadline < now() AND status NOT IN (DELIVERED)` | Filter query |

### Design rationale

**Why Engagement exists.** Without it, there is no way to group "this set of scans and this report are all part of the same audit for Client X." Today, reports reference scans via `ReportScan` join rows, but that linkage is created at report generation time. Before a report exists, there is nothing connecting the scans being run for a particular client audit. Engagement provides that grouping from the start.

**Why Engagement status is stored rather than derived.** Deriving engagement status from the union of scan/report states is possible but fragile. It requires loading all child entities to determine the phase. With 10+ concurrent engagements, each with multiple scans, this becomes a costly read pattern for a dashboard that loads on every page view. Storing the status and updating it reactively (see section E) is simpler and faster.

**Why SLA deadline is on Engagement, not Report.** The SLA is for the entire deliverable cycle, not just the report. A late scan makes the report late. Tracking the deadline at the engagement level captures this.

**Why no separate OperationalMetric or MetricSnapshot table.** The data volumes here are small (tens of engagements, hundreds of scans, thousands of results). Computing metrics at read time from indexed status columns and timestamps is fast enough. A metrics table would be premature optimization that creates synchronization problems.

---

## B. Dashboard Structure

### Route layout

```
apps/web/src/app/(dashboard)/ops/                     -- Operations root
  page.tsx                                             -- Pipeline overview
  engagements/
    page.tsx                                           -- All engagements list
    [id]/
      page.tsx                                         -- Single engagement detail
  workload/
    page.tsx                                           -- Per-analyst workload view
  metrics/
    page.tsx                                           -- Historical metrics and rates
```

All ops routes are scoped to the current organization via `getOrganizationId()`. When auth is real, these routes will be restricted to ADMIN and OWNER roles.

### View 1: Pipeline Overview (`/ops`)

The primary operational dashboard. Shows the state of all active work at a glance.

#### Content

**Pipeline funnel** — count of engagements in each phase:

```
┌──────────────────────────────────────────────────────────┐
│  SETUP: 2  │  SCANNING: 3  │  REVIEW: 1  │  QA: 2  │  READY: 1  │  DELIVERED: 8  │
│            │               │             │          │            │                │
│  ███       │  █████        │  ██         │  ████    │  ██        │  ████████████  │
└──────────────────────────────────────────────────────────┘
```

Query:
```sql
SELECT status, COUNT(*) as count
FROM engagements
WHERE client_id IN (SELECT id FROM clients WHERE organization_id = ?)
  AND status != 'DELIVERED'  -- active only by default, toggle to include delivered
GROUP BY status
ORDER BY CASE status
  WHEN 'SETUP' THEN 1
  WHEN 'SCANNING' THEN 2
  WHEN 'REVIEW' THEN 3
  WHEN 'QA' THEN 4
  WHEN 'READY' THEN 5
  WHEN 'ON_HOLD' THEN 6
  WHEN 'DELIVERED' THEN 7
END
```

**Attention items** — things that need action NOW, sorted by urgency:

1. **Overdue engagements**: `WHERE slaDeadline < now() AND status NOT IN ('DELIVERED')`
2. **Blocked scans**: `ScanRun WHERE status = 'BLOCKED'` joined to engagement
3. **Stale scans** (no progress in 4+ hours): scans in RUNNING where the most recent `AuditLog` entry or `ScanQuery.updatedAt` is > 4 hours ago
4. **Results awaiting review**: `ScanResult WHERE status = 'NEEDS_REVIEW'` count, grouped by scan/engagement
5. **QA failures**: `ReportQA WHERE status = 'FAIL'` joined to engagement
6. **Approved reports not yet delivered**: `Engagement WHERE status = 'READY'` with age > 24 hours

Query for attention items (single query with UNION ALL):
```sql
-- Overdue
SELECT 'overdue' as alert_type, e.id as engagement_id, e.title,
       c.name as client_name, e.sla_deadline, NULL as detail
FROM engagements e
JOIN clients c ON e.client_id = c.id
WHERE c.organization_id = ?
  AND e.sla_deadline < now()
  AND e.status NOT IN ('DELIVERED')

UNION ALL

-- Blocked scans
SELECT 'blocked_scan', e.id, e.title,
       c.name, sr.blocked_at, sr.block_reason
FROM scan_runs sr
JOIN engagements e ON sr.engagement_id = e.id
JOIN clients c ON e.client_id = c.id
WHERE c.organization_id = ?
  AND sr.status = 'BLOCKED'

UNION ALL

-- QA failures
SELECT 'qa_fail', e.id, e.title,
       c.name, rqa.run_completed_at, NULL
FROM report_qa rqa
JOIN reports r ON rqa.report_id = r.id
JOIN engagements e ON r.engagement_id = e.id
JOIN clients c ON e.client_id = c.id
WHERE c.organization_id = ?
  AND rqa.status = 'FAIL'

ORDER BY alert_type, engagement_id
```

**Recent activity** — last 20 `AuditLog` entries across all entities, showing who did what and when. This replaces the current dashboard's manual activity merge of scans and reports.

Query:
```sql
SELECT al.*, u.name as actor_name
FROM audit_logs al
LEFT JOIN users u ON al.actor_id = u.id
WHERE u.organization_id = ?
ORDER BY al.created_at DESC
LIMIT 20
```

### View 2: Engagements List (`/ops/engagements`)

A filterable table of all engagements.

#### Columns

| Column | Source |
|--------|--------|
| Client | `engagement.client.name` |
| Title | `engagement.title` |
| Phase | `engagement.status` badge |
| Owner | `engagement.owner.name` |
| SLA deadline | `engagement.slaDeadline` with overdue highlighting |
| Scans | Count of associated `ScanRun` records |
| Scan progress | `SUM(resultCount) / SUM(queryCount)` across engagement's scans |
| Report status | Status of the engagement's report(s), or "No report" |
| QA status | `ReportQA.status` for the engagement's report, or "N/A" |
| Days active | `now() - engagement.startedAt` |
| Time in phase | `now() - engagement.updatedAt` |

#### Filters

- Status (multi-select: SETUP, SCANNING, REVIEW, QA, READY, ON_HOLD, DELIVERED)
- Owner (dropdown of users)
- Client (dropdown)
- Overdue only (toggle)
- Date range (started after / before)

#### Query

```typescript
const engagements = await prisma.engagement.findMany({
  where: {
    client: { organizationId },
    ...(statusFilter ? { status: { in: statusFilter } } : {}),
    ...(ownerFilter ? { ownerId: ownerFilter } : {}),
    ...(clientFilter ? { clientId: clientFilter } : {}),
    ...(overdueOnly ? { slaDeadline: { lt: new Date() }, status: { not: 'DELIVERED' } } : {}),
  },
  include: {
    client: { select: { name: true } },
    owner: { select: { name: true } },
    scanRuns: {
      select: {
        id: true,
        status: true,
        queryCount: true,
        resultCount: true,
      },
    },
    reports: {
      select: {
        id: true,
        status: true,
        qa: { select: { status: true } },
      },
    },
  },
  orderBy: [
    { slaDeadline: 'asc' },  // Soonest deadline first
    { createdAt: 'desc' },
  ],
});
```

### View 3: Engagement Detail (`/ops/engagements/[id]`)

Deep-dive into a single engagement. Shows everything the operator needs to know about one client audit.

#### Sections

**Header**: Client name, engagement title, phase badge, owner name, SLA deadline (with countdown if approaching), days active.

**Scans panel** — table of all scans in this engagement:

| Column | Source |
|--------|--------|
| Status | `ScanRun.status` badge |
| Analyst | `ScanRun.analyst.name` |
| Progress | Progress bar: `resultCount / queryCount` |
| Query status breakdown | `ScanQuery` counts by status (e.g., "8 succeeded, 1 failed, 1 pending") |
| Results needing review | `ScanResult WHERE status = 'NEEDS_REVIEW' AND scanRunId = ?` count |
| Duration | `completedAt - startedAt` or `now() - startedAt` if still running |
| Block info | If BLOCKED: `blockReason`, duration since `blockedAt` |

Query:
```typescript
const scans = await prisma.scanRun.findMany({
  where: { engagementId: engagement.id },
  include: {
    analyst: { select: { name: true } },
    scanQueries: { select: { status: true } },
    results: {
      where: { status: 'NEEDS_REVIEW' },
      select: { id: true },
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

**Results review panel** — all results across engagement scans that need attention:

| Column | Source |
|--------|--------|
| Query text | `ScanResult.query.text` |
| Scan | Which scan run this result belongs to |
| Status | `ScanResult.status` badge |
| Visibility score | `ScanResult.visibilityScore` |
| Reviewer | `ScanResult.reviewedBy.name` or "Unassigned" |
| Age | `now() - ScanResult.createdAt` |

Filtered to `status IN ('NEEDS_REVIEW', 'CAPTURED')` by default. Toggle to show all.

**Report panel** — the engagement's report(s):
- Report title, status, reviewer name
- QA status badge (from `ReportQA.status`)
- QA summary: X/29 checks pass, Y flags open, signoff status
- Link to report detail and QA tab

**Timeline** — `AuditLog` entries for all entities in this engagement:

```typescript
const auditEntries = await prisma.auditLog.findMany({
  where: {
    OR: [
      { entityType: 'SCAN_RUN', entityId: { in: scanIds } },
      { entityType: 'SCAN_RESULT', entityId: { in: resultIds } },
      { entityType: 'REPORT', entityId: { in: reportIds } },
    ],
  },
  include: { actor: { select: { name: true } } },
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

### View 4: Workload (`/ops/workload`)

Shows per-person work distribution. Helps prevent overload and identify idle capacity.

#### Layout

One row per user (ADMIN and MEMBER roles only). Columns:

| Column | Source |
|--------|--------|
| Name | `User.name` |
| Role | `User.role` |
| Active scans (analyst) | `ScanRun WHERE analystId = user.id AND status IN ('DRAFT','READY_TO_RUN','RUNNING','BLOCKED')` count |
| Results to review | `ScanResult WHERE status = 'NEEDS_REVIEW'` on scans where user is NOT the analyst (enforce reviewer separation) |
| Reports to review | `Report WHERE reviewerId = user.id AND status = 'IN_REVIEW'` count |
| QA to sign off | `ReportQA WHERE signedOffById IS NULL` on reports where user is the reviewer |
| Engagements owned | `Engagement WHERE ownerId = user.id AND status NOT IN ('DELIVERED')` count |
| Overdue items | Count of any of the above where the parent engagement's `slaDeadline < now()` |

#### Query

```typescript
const users = await prisma.user.findMany({
  where: {
    organizationId,
    role: { in: ['ADMIN', 'MEMBER', 'OWNER'] },
  },
  select: {
    id: true,
    name: true,
    role: true,
    analystScanRuns: {
      where: { status: { in: ['DRAFT', 'READY_TO_RUN', 'RUNNING', 'BLOCKED'] } },
      select: { id: true },
    },
    reviewedReports: {
      where: { status: 'IN_REVIEW' },
      select: { id: true },
    },
    ownedEngagements: {
      where: { status: { notIn: ['DELIVERED'] } },
      select: { id: true, slaDeadline: true },
    },
  },
});

// Results-to-review requires a separate query because the constraint
// is "results on scans where this user is NOT the analyst":
const reviewableResults = await prisma.scanResult.groupBy({
  by: ['scanRunId'],
  where: {
    status: 'NEEDS_REVIEW',
    scanRun: {
      client: { organizationId },
      analystId: { not: userId },  // Cannot review your own work
    },
  },
  _count: true,
});
```

### View 5: Metrics (`/ops/metrics`)

Historical operational performance. Updated on page load, not real-time.

This view computes metrics from completed work. See section C for full metric definitions.

#### Layout

**Summary cards** (top row):
- Average scan duration (last 30 days)
- Average report cycle time (created to delivered, last 30 days)
- Query failure rate (last 30 days)
- Result rework rate (last 30 days)

**Trend tables** (below):
- Scans completed per week (last 8 weeks)
- Reports delivered per week (last 8 weeks)
- Average time per phase per week

No charts in V1. Tables only. Charts can come later if needed.

---

## C. Metrics Design

### Metric 1: Scan Duration

- **Definition**: Time from scan start to completion
- **Source fields**: `ScanRun.startedAt`, `ScanRun.completedAt`
- **Computation**: `completedAt - startedAt` in hours
- **Storage**: Derived at read time. NOT stored.
- **Query**:
  ```typescript
  const scans = await prisma.scanRun.findMany({
    where: {
      client: { organizationId },
      status: 'COMPLETE',  // analyst workflow enum
      completedAt: { not: null },
      startedAt: { not: null },
      ...(dateRange ? { completedAt: { gte: dateRange.from, lte: dateRange.to } } : {}),
    },
    select: { startedAt: true, completedAt: true },
  });
  const durations = scans.map(s => s.completedAt!.getTime() - s.startedAt!.getTime());
  const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  ```
- **Display**: "Avg: 4.2 hours" with min/max range

### Metric 2: Report Cycle Time

- **Definition**: Time from report creation to delivery
- **Source fields**: `Report.createdAt`, `Report.deliveredAt`
- **Computation**: `deliveredAt - createdAt` in business days or calendar days
- **Storage**: Derived at read time.
- **Query**:
  ```typescript
  const reports = await prisma.report.findMany({
    where: {
      client: { organizationId },
      status: 'DELIVERED',
      deliveredAt: { not: null },
      ...(dateRange ? { deliveredAt: { gte: dateRange.from, lte: dateRange.to } } : {}),
    },
    select: { createdAt: true, deliveredAt: true },
  });
  ```
- **Display**: "Avg: 3.4 days" with min/max

### Metric 3: Time Per Phase (Report)

- **Definition**: How long a report spends in each status
- **Source**: `AuditLog` entries for the report entity
- **Computation**: For each consecutive pair of audit log entries for a report, the time spent is `nextEntry.createdAt - currentEntry.createdAt`. Aggregated across all reports in the time window.
- **Storage**: Derived at read time from AuditLog.
- **Query**:
  ```typescript
  const reportLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'REPORT',
      entityId: { in: reportIds },
    },
    orderBy: [{ entityId: 'asc' }, { createdAt: 'asc' }],
    select: { entityId: true, fromStatus: true, toStatus: true, createdAt: true },
  });
  // Group by entityId, compute diffs between consecutive entries
  ```
- **Display**: Table with rows for DRAFT, IN_REVIEW, APPROVED phases, columns for avg/min/max duration

### Metric 4: Query Failure Rate

- **Definition**: Percentage of scan queries that end in FAILED status
- **Source fields**: `ScanQuery.status`
- **Computation**: `COUNT(status = 'FAILED') / COUNT(*)` per scan, then averaged
- **Storage**: Derived at read time.
- **Query**:
  ```typescript
  const queryStats = await prisma.scanQuery.groupBy({
    by: ['status'],
    where: {
      scanRun: {
        client: { organizationId },
        status: 'COMPLETE',
        completedAt: dateRange ? { gte: dateRange.from } : undefined,
      },
    },
    _count: true,
  });
  ```
- **Display**: "2.3% failure rate (14 of 612 queries)"

### Metric 5: Result Rework Rate

- **Definition**: Percentage of scan results that were rejected and re-captured
- **Source fields**: `ScanResult.replacesResultId`
- **Computation**: `COUNT(WHERE replacesResultId IS NOT NULL) / COUNT(*)` across results in completed scans
- **Storage**: Derived at read time.
- **Query**:
  ```typescript
  const totalResults = await prisma.scanResult.count({
    where: {
      scanRun: { client: { organizationId }, status: 'COMPLETE' },
    },
  });
  const replacements = await prisma.scanResult.count({
    where: {
      scanRun: { client: { organizationId }, status: 'COMPLETE' },
      replacesResultId: { not: null },
    },
  });
  const reworkRate = totalResults > 0 ? replacements / totalResults : 0;
  ```
- **Display**: "5.1% rework rate (8 of 157 results re-captured)"

### Metric 6: Report Revision Rate

- **Definition**: How often reports get sent back from IN_REVIEW to DRAFT
- **Source**: `AuditLog WHERE entityType = 'REPORT' AND action = 'requestRevision'`
- **Computation**: Count of revision requests divided by count of reports that reached IN_REVIEW
- **Storage**: Derived at read time from AuditLog.
- **Query**:
  ```typescript
  const revisionCount = await prisma.auditLog.count({
    where: {
      entityType: 'REPORT',
      action: 'requestRevision',
      createdAt: dateRange ? { gte: dateRange.from } : undefined,
    },
  });
  const reviewedCount = await prisma.auditLog.count({
    where: {
      entityType: 'REPORT',
      action: 'submitForReview',
      createdAt: dateRange ? { gte: dateRange.from } : undefined,
    },
  });
  ```
- **Display**: "28% revision rate (5 of 18 reviews required revision)"

### Metric 7: QA Pass Rate

- **Definition**: Percentage of QA runs that pass on first attempt (version = 1)
- **Source fields**: `ReportQA.status`, `ReportQA.version`
- **Computation**: Count of reports where `ReportQA.version = 1 AND status IN ('PASS', 'CONDITIONAL_PASS')` divided by total reports with QA runs
- **Storage**: Derived at read time.
- **Display**: "71% first-pass QA rate"

### Summary: What is stored vs. derived

| | Stored | Derived |
|---|--------|---------|
| Engagement phase | Yes (EngagementStatus) | |
| SLA deadline | Yes (Engagement.slaDeadline) | |
| Scan duration | | Yes (startedAt/completedAt diff) |
| Report cycle time | | Yes (createdAt/deliveredAt diff) |
| Time per phase | | Yes (AuditLog entry diffs) |
| Query failure rate | | Yes (ScanQuery status counts) |
| Result rework rate | | Yes (replacesResultId count) |
| Report revision rate | | Yes (AuditLog action counts) |
| QA pass rate | | Yes (ReportQA status + version) |
| Analyst workload | | Yes (active assignment counts) |
| Attention items | | Yes (status + timestamp filters) |

---

## D. Alert System

### Architecture

Alerts run on a **polling cron job** inside `apps/jobs`. No real-time infrastructure. No WebSocket push. No external alert service.

The cron job runs every 30 minutes during business hours (configurable). It queries for alert conditions, compares against the last known state, and writes new alerts. Delivery is to the ops dashboard (database-backed alert feed) with optional webhook for Slack/email in the future.

### Alert model

```prisma
model OpsAlert {
  id             String         @id @default(cuid())
  organizationId String
  engagementId   String?
  alertType      OpsAlertType
  severity       OpsAlertSeverity @default(WARNING)
  title          String
  detail         String?        @db.Text
  entityType     String?                    // 'ScanRun', 'Report', 'Engagement'
  entityId       String?                    // ID of the affected entity
  acknowledgedById String?
  acknowledgedAt DateTime?
  resolvedAt     DateTime?
  createdAt      DateTime       @default(now())

  organization   Organization   @relation(fields: [organizationId], references: [id])
  engagement     Engagement?    @relation(fields: [engagementId], references: [id], onDelete: SetNull)
  acknowledgedBy User?          @relation("AlertAcknowledgedBy", fields: [acknowledgedById], references: [id], onDelete: SetNull)

  @@index([organizationId, createdAt])
  @@index([alertType])
  @@index([resolvedAt])
  @@map("ops_alerts")
}

enum OpsAlertType {
  SCAN_STUCK             // No progress for N hours
  SCAN_BLOCKED           // Scan entered BLOCKED state
  RESULTS_AWAITING_REVIEW // Completed scan has unreviewed results for > N hours
  QA_FAILURE             // QA run resulted in FAIL status
  SLA_APPROACHING        // Engagement deadline within 48 hours
  SLA_BREACHED           // Engagement deadline passed
  REPORT_STALE_IN_REVIEW // Report in IN_REVIEW for > N days
}

enum OpsAlertSeverity {
  INFO
  WARNING
  CRITICAL
}
```

Updated relations:
```prisma
model Organization {
  // ... existing ...
  opsAlerts  OpsAlert[]
}

model User {
  // ... existing ...
  acknowledgedAlerts  OpsAlert[] @relation("AlertAcknowledgedBy")
}

model Engagement {
  // ... existing ...
  alerts  OpsAlert[]
}
```

### Alert definitions

| Alert Type | Condition | Severity | Polling Query | Dedup |
|-----------|-----------|----------|--------------|-------|
| `SCAN_STUCK` | `ScanRun.status = 'RUNNING'` AND no `ScanQuery.updatedAt` in last 4 hours | WARNING (8h: CRITICAL) | `SELECT sr.id FROM scan_runs sr WHERE sr.status = 'RUNNING' AND NOT EXISTS (SELECT 1 FROM scan_queries sq WHERE sq.scan_run_id = sr.id AND sq.updated_at > now() - interval '4 hours')` | One alert per scan per 24h window |
| `SCAN_BLOCKED` | `ScanRun.status = 'BLOCKED'` | WARNING | Triggered reactively when scan transitions to BLOCKED (via AuditLog check), not polling | One per block event |
| `RESULTS_AWAITING_REVIEW` | `ScanRun.status = 'COMPLETE'` AND `ScanResult WHERE status = 'NEEDS_REVIEW' AND createdAt < now() - 8h` | WARNING | `SELECT sr.scan_run_id, COUNT(*) FROM scan_results sr WHERE sr.status = 'NEEDS_REVIEW' AND sr.created_at < now() - interval '8 hours' GROUP BY sr.scan_run_id` | One alert per scan, updated with count |
| `QA_FAILURE` | `ReportQA.status = 'FAIL'` AND `runCompletedAt` in last polling window | WARNING | `SELECT rqa.* FROM report_qa rqa WHERE rqa.status = 'FAIL' AND rqa.run_completed_at > now() - interval '30 minutes'` | One per QA run |
| `SLA_APPROACHING` | `Engagement.slaDeadline` within 48 hours AND status not DELIVERED | WARNING | `SELECT * FROM engagements WHERE sla_deadline BETWEEN now() AND now() + interval '48 hours' AND status != 'DELIVERED'` | One per engagement, 48h before deadline |
| `SLA_BREACHED` | `Engagement.slaDeadline < now()` AND status not DELIVERED | CRITICAL | `SELECT * FROM engagements WHERE sla_deadline < now() AND status != 'DELIVERED'` | One per engagement, once deadline passes |
| `REPORT_STALE_IN_REVIEW` | Report in IN_REVIEW for > 3 days (from AuditLog timestamp of the IN_REVIEW transition) | WARNING | `SELECT r.id FROM reports r JOIN audit_logs al ON al.entity_id = r.id AND al.entity_type = 'REPORT' AND al.to_status = 'IN_REVIEW' AND al.created_at < now() - interval '3 days' WHERE r.status = 'IN_REVIEW'` | One per report while in review |

### Deduplication

Before creating an alert, the cron job checks:
```typescript
const existing = await prisma.opsAlert.findFirst({
  where: {
    alertType,
    entityId,
    resolvedAt: null,  // still open
  },
});
if (existing) {
  // Update detail/severity if escalation threshold met, but don't create duplicate
  return;
}
```

### Auto-resolution

Alerts auto-resolve when their condition clears. The same cron job that creates alerts also resolves stale ones:

```typescript
// Auto-resolve SCAN_STUCK alerts where the scan has progressed or completed
const stuckAlerts = await prisma.opsAlert.findMany({
  where: { alertType: 'SCAN_STUCK', resolvedAt: null },
});
for (const alert of stuckAlerts) {
  const scan = await prisma.scanRun.findUnique({
    where: { id: alert.entityId! },
    select: { status: true },
  });
  if (!scan || scan.status !== 'RUNNING') {
    await prisma.opsAlert.update({
      where: { id: alert.id },
      data: { resolvedAt: new Date() },
    });
  }
}
```

### Cron implementation in apps/jobs

```typescript
// apps/jobs/src/ops-alerts.ts

import { prisma } from "@antellion/db";

export async function runAlertChecks(): Promise<void> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });

  for (const org of orgs) {
    await checkStuckScans(org.id);
    await checkResultsAwaitingReview(org.id);
    await checkQAFailures(org.id);
    await checkSLADeadlines(org.id);
    await checkStaleReviews(org.id);
    await autoResolveAlerts(org.id);
  }
}

// Called from apps/jobs/src/index.ts on a 30-minute interval
```

The jobs worker (`apps/jobs/src/index.ts`) adds a `setInterval` or uses a lightweight cron library (e.g., `node-cron`, single dependency) to run `runAlertChecks` every 30 minutes.

### Dashboard integration

The `/ops` page shows an alert banner at the top if there are unresolved CRITICAL alerts. The engagement detail page shows alerts relevant to that engagement. Each alert has an "Acknowledge" action that sets `acknowledgedById` and `acknowledgedAt` without resolving it (acknowledgment = "I saw this and am working on it").

```typescript
// Alert feed query for the ops dashboard
const alerts = await prisma.opsAlert.findMany({
  where: {
    organizationId,
    resolvedAt: null,
  },
  include: {
    engagement: { select: { title: true, client: { select: { name: true } } } },
    acknowledgedBy: { select: { name: true } },
  },
  orderBy: [
    { severity: 'desc' },  // CRITICAL first
    { createdAt: 'desc' },
  ],
  take: 50,
});
```

### Future: Webhook delivery

When webhook delivery is needed, the alert creation path becomes:

```typescript
const alert = await prisma.opsAlert.create({ data: { ... } });
// Fire-and-forget webhook
if (org.slackWebhookUrl) {
  fetch(org.slackWebhookUrl, {
    method: 'POST',
    body: JSON.stringify({ text: `[${alert.severity}] ${alert.title}: ${alert.detail}` }),
  }).catch(() => {}); // Don't block on delivery failure
}
```

This requires adding `slackWebhookUrl` to Organization, which is a trivial migration when needed. Not included now because it would be unused.

---

## E. Workflow Integration

### How engagement status stays in sync

Engagement status updates are triggered reactively by the same server actions that transition scans and reports. This avoids a separate sync job and keeps status consistent in real-time.

**The rule**: Every server action that changes `ScanRun.status` or `Report.status` also checks whether the parent engagement's status should update.

The logic lives in `packages/core` as a pure function:

```typescript
// packages/core/src/ops/engagement-status.ts

export type EngagementStatusValue =
  | 'SETUP' | 'SCANNING' | 'REVIEW' | 'QA' | 'READY' | 'DELIVERED' | 'ON_HOLD';

export interface EngagementState {
  currentStatus: EngagementStatusValue;
  scanStatuses: string[];       // All ScanRun.status values in this engagement
  reportStatuses: string[];     // All Report.status values
  qaStatuses: string[];         // All ReportQA.status values
  hasReport: boolean;
}

/**
 * Given the current state of an engagement's children, compute what the
 * engagement status should be. Returns null if no change is needed.
 *
 * This function NEVER transitions TO or FROM ON_HOLD. ON_HOLD is always
 * a manual action. If the engagement is ON_HOLD, this returns null
 * (no automatic status change).
 */
export function computeEngagementStatus(
  state: EngagementState,
): EngagementStatusValue | null {
  // ON_HOLD is sticky — only manual action changes it
  if (state.currentStatus === 'ON_HOLD') return null;

  // DELIVERED is terminal
  if (state.currentStatus === 'DELIVERED') return null;

  // If any report is DELIVERED, engagement is DELIVERED
  if (state.reportStatuses.includes('DELIVERED')) {
    return state.currentStatus === 'DELIVERED' ? null : 'DELIVERED';
  }

  // If any report is APPROVED and QA is PASS or CONDITIONAL_PASS, engagement is READY
  if (
    state.reportStatuses.includes('APPROVED') &&
    state.qaStatuses.some(s => s === 'PASS' || s === 'CONDITIONAL_PASS')
  ) {
    return state.currentStatus === 'READY' ? null : 'READY';
  }

  // If a report exists and is in IN_REVIEW with QA running or completed, engagement is QA
  if (
    state.hasReport &&
    state.reportStatuses.includes('IN_REVIEW') &&
    state.qaStatuses.some(s => s !== 'PENDING')
  ) {
    return state.currentStatus === 'QA' ? null : 'QA';
  }

  // If all scans are COMPLETE (or no scans are RUNNING/BLOCKED), engagement is REVIEW
  const activeScans = state.scanStatuses.filter(
    s => s === 'RUNNING' || s === 'BLOCKED' || s === 'READY_TO_RUN',
  );
  const completedScans = state.scanStatuses.filter(
    s => s === 'COMPLETE',
  );
  if (completedScans.length > 0 && activeScans.length === 0) {
    // All scans done, but no report in review yet
    if (!state.hasReport || state.reportStatuses.every(s => s === 'DRAFT')) {
      return state.currentStatus === 'REVIEW' ? null : 'REVIEW';
    }
  }

  // If any scan is RUNNING, READY_TO_RUN, or BLOCKED, engagement is SCANNING
  if (activeScans.length > 0) {
    return state.currentStatus === 'SCANNING' ? null : 'SCANNING';
  }

  // Default: SETUP (scans exist but none have started)
  if (state.scanStatuses.length === 0 || state.scanStatuses.every(s => s === 'DRAFT')) {
    return state.currentStatus === 'SETUP' ? null : 'SETUP';
  }

  return null; // No change
}
```

### Integration point in server actions

The server action pattern becomes:

```typescript
// After any scan or report status transition:
async function maybeUpdateEngagement(
  tx: PrismaTransactionClient,
  engagementId: string | null,
): Promise<void> {
  if (!engagementId) return;

  const engagement = await tx.engagement.findUnique({
    where: { id: engagementId },
    include: {
      scanRuns: { select: { status: true } },
      reports: {
        select: {
          status: true,
          qa: { select: { status: true } },
        },
      },
    },
  });
  if (!engagement) return;

  const newStatus = computeEngagementStatus({
    currentStatus: engagement.status as EngagementStatusValue,
    scanStatuses: engagement.scanRuns.map(s => s.status),
    reportStatuses: engagement.reports.map(r => r.status),
    qaStatuses: engagement.reports.map(r => r.qa?.status).filter(Boolean) as string[],
    hasReport: engagement.reports.length > 0,
  });

  if (newStatus) {
    await tx.engagement.update({
      where: { id: engagementId },
      data: { status: newStatus },
    });
  }
}
```

This function is called inside the `$transaction` block of every scan and report transition action. It adds one additional query (the engagement with children) but only when an engagement is linked.

### Where ops reads DO NOT couple to workflow writes

The ops layer is read-only. It never:
- Blocks a workflow transition
- Adds preconditions to scan/report state changes
- Writes to workflow models (ScanRun, ScanResult, Report, ReportQA)
- Introduces new required fields on workflow models

The only write-side coupling is:
1. `ScanRun.engagementId` and `Report.engagementId` — nullable FK, set when creating the entity
2. `Engagement.status` — updated reactively by `computeEngagementStatus`
3. `OpsAlert` — written by the cron job, never read by workflow code

This means the analyst workflow and QA system can be implemented, tested, and deployed independently of the ops layer. The ops layer is purely additive.

### Integration with auth

The ops routes require auth but do not introduce new auth concepts. Access control:
- `/ops/*` routes: OWNER and ADMIN only (checked in route middleware or layout)
- Alert acknowledgment: any OWNER/ADMIN
- Engagement creation and assignment: OWNER/ADMIN

Until real auth exists, the ops pages work the same as the rest of the dashboard — the auth stub returns the first org. When real auth lands, ops routes get a role check in the layout:

```typescript
// apps/web/src/app/(dashboard)/ops/layout.tsx
export default async function OpsLayout({ children }) {
  const { user } = await requireAuth();
  if (!['OWNER', 'ADMIN'].includes(user.role)) {
    redirect('/');
  }
  return <>{children}</>;
}
```

---

## F. Migration Strategy

### Implementation order

1. **Engagement model** — Add to schema, migrate. No code changes needed yet; engagements are nullable FKs.
2. **OpsAlert model** — Add to schema, migrate. No code changes needed yet.
3. **`computeEngagementStatus`** — Pure function in `packages/core/src/ops/`. Unit-testable with no database.
4. **Ops dashboard pages** — `/ops`, `/ops/engagements`, `/ops/engagements/[id]`, `/ops/workload`, `/ops/metrics`. Read-only queries against existing data. Can be built incrementally.
5. **Engagement status sync** — Wire `maybeUpdateEngagement` into scan and report server actions. Depends on analyst workflow design being implemented first (since it changes the transition actions).
6. **Alert cron** — Implement in `apps/jobs`. Depends on the engagement model and alert model existing.

### Dependencies on other designs

| This design needs | From | Status |
|------------------|------|--------|
| `ScanRun.analystId`, `ScanRun.blockedAt`, `blockReason` | Analyst workflow | Design-only |
| `ScanQuery` model | Analyst workflow | Design-only |
| `ScanResult.status`, `reviewedById` | Analyst workflow | Design-only |
| `Report.reviewerId`, `deliveredAt` | Analyst workflow | Design-only |
| `AuditLog` model | Analyst workflow | Design-only |
| `ReportQA`, `QACheckResult`, `QAFlag` | QA system | Design-only |

**Critical path**: The analyst workflow design must land before the ops layer can show meaningful workload or phase tracking. However, the Engagement model and basic pipeline view can be built immediately using current schema fields (ScanRunStatus, ReportStatus).

### What can ship before the analyst workflow

A minimal V0 of `/ops` that works with today's schema:

- Engagement model with `slaDeadline` (useful immediately for tracking client commitments)
- Pipeline funnel using current ScanRunStatus (PENDING/RUNNING/COMPLETED/FAILED) and ReportStatus (DRAFT/REVIEW/PUBLISHED)
- Engagement list with manual status tracking
- SLA deadline tracking and overdue highlighting
- No workload view (no analyst assignment yet)
- No alert cron (not enough state to detect issues)

This V0 provides immediate value for tracking "which client audits are we doing, when are they due, and what phase are they in" without waiting for the full analyst workflow.

---

## G. Open Questions

1. **Multi-org isolation**: The current auth stub returns one org. When multi-org lands, all ops queries must include `organizationId` scoping. The design already includes this in all queries, but the alert cron iterates over all orgs — this needs rate-limiting thought if org count grows.

2. **Historical metrics retention**: Should we ever snapshot metrics, or is read-time derivation sufficient forever? At current scale (tens of engagements), derivation is fine. At hundreds, we may want weekly metric snapshots. Decision: defer until we see performance problems.

3. **Engagement lifecycle automation**: Should engagement creation be automatic when a scan is created for a client that has no active engagement? Or always manual? Recommendation: manual for now, with a "Create engagement" action on the scan creation page that pre-links. Automation adds complexity for little value at current volume.

4. **Alert thresholds**: The 4-hour stuck threshold, 8-hour review threshold, and 3-day stale review threshold are guesses. These should be configurable per-organization, stored as JSON in an `Organization.opsConfig` field, with sensible defaults. Not worth a separate config model at this scale.
