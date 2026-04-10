# Evidence Provenance System Design

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Architect
**Supersedes:** `docs/evidence-provenance-design.md` (initial sketch)
**Depends on:** Analyst Workflow, QA System, Confidence Scoring, Operations Dashboard, Report Traceability (content + UI)

---

## Table of Contents

1. [Design Decision: Option A vs Option B](#1-design-decision-option-a-vs-option-b)
2. [Integration Map with Existing Designs](#2-integration-map-with-existing-designs)
3. [Prisma Schema](#3-prisma-schema)
4. [Immutability Design](#4-immutability-design)
5. [TypeScript Types](#5-typescript-types)
6. [Zod Validation Schemas](#6-zod-validation-schemas)
7. [Data Flow: Scan to Evidence to Report](#7-data-flow-scan-to-evidence-to-report)
8. [Migration Plan](#8-migration-plan)
9. [Risks and Tradeoffs](#9-risks-and-tradeoffs)

---

## 1. Design Decision: Option A vs Option B

### The question

The earlier evidence provenance sketch produced two options:

- **Option A (JSON-in-metadata):** Embed evidence provenance fields inside `ScanResult.metadata` as a typed JSON blob. Zero schema migration, single swap point.
- **Option B (First-class table):** Separate `ScanEvidence` model with proper columns, indexes, and FK integrity.

### Recommendation: Option B -- First-class `ScanEvidence` table

This is not close. Six designed systems now depend on evidence data, and each one needs to query, filter, join, or aggregate evidence attributes in ways that JSON-in-metadata cannot support efficiently or safely.

### The case against Option A

**1. The QA system needs indexed queries on evidence fields.**

The QA system design (`report-qa-system-design.md`) defines 29 checks. Five of them directly inspect evidence quality:

- `evidence.all_results_have_responses` -- queries for non-empty `response` fields
- `evidence.all_results_have_visibility_scores` -- queries for non-null `visibilityScore`
- `evidence.token_and_latency_recorded` -- queries for `tokenCount` and `latencyMs` presence
- `evidence.citations_parsed` -- cross-references response text patterns with `CitationSource` rows

Today these checks operate on `ScanResult` fields directly. But the QA system also needs to validate that evidence has been approved before a report can proceed. The `QACheckContext` type (lines 377-427 of `report-qa-system-design.md`) includes `scanResults` with their scores and metadata. With Option A, every QA check that touches evidence provenance would need to parse a JSON blob, validate its shape at runtime, and handle missing/malformed fields. With Option B, the check context can include typed `ScanEvidence` rows joined via FK.

More critically, the QA system's `evidence.all_results_approved` check (required for report submission per the analyst workflow's `DRAFT -> IN_REVIEW` transition) needs to query: "Are all evidence records for the results in this report in APPROVED status?" With Option A, this requires deserializing every result's metadata JSON, extracting a status field, and checking it in application code. With Option B, this is a single indexed Prisma query: `ScanEvidence.findMany({ where: { status: { not: 'APPROVED' }, scanResultId: { in: resultIds } } })`.

**2. The operations dashboard needs to aggregate evidence metrics.**

The operations dashboard design (`operations-dashboard-design.md`) derives all metrics from indexed status fields and timestamps on existing models. The "derived at read time" table (lines 148-166) includes:

- Results needing review: `ScanResult WHERE status = 'NEEDS_REVIEW'`
- Rework rate: `ScanResult WHERE replacesResultId IS NOT NULL`
- Error rate: `ScanQuery WHERE status = 'FAILED'`

With evidence as a first-class model, the dashboard adds:

- Evidence awaiting approval: `ScanEvidence WHERE status = 'DRAFT'`
- Evidence approval rate: `COUNT(APPROVED) / COUNT(*)` per engagement
- Evidence age: `now() - executedAt` for stale evidence detection

With Option A, every one of these would require loading every `ScanResult` row, parsing `metadata` JSON, extracting evidence fields, and computing aggregates in application code. This violates the dashboard's core principle: "Derive, do not duplicate... computed from existing timestamps and status fields on existing (or planned) models."

**3. The traceability UI needs relational joins to evidence.**

The traceability UI design (`report-traceability-ui-design.md`) defines a lazy-loading evidence panel that fetches evidence grouped by query cluster. The route handler at `/api/reports/[id]/evidence` returns `EvidenceResponse` (lines 438-457) with per-result data including query text, scores, response text, and citations.

With Option B, this join is straightforward: `Report -> ReportEvidence -> ScanEvidence -> ScanResult -> Query -> QueryCluster`. With Option A, the join stops at `ScanResult` and the evidence provenance fields (prompt, model, temperature, raw response, execution timestamp) must be extracted from JSON at the application level for every result in the response payload.

The traceability content design (`report-traceability-design.md`) specifies four evidence levels (Level 0-3). Level 3 -- the "prove it" layer -- requires displaying the exact AI response text, the model and parameters used, and the execution timestamp for individual queries. These are the core fields of `ScanEvidence`. Making them first-class columns means the Level 3 data fetch is a single indexed query, not a JSON parse-and-validate exercise.

**4. The confidence scoring system needs evidence factors as typed inputs.**

The confidence scoring design (`confidence-scoring-design.md`) defines `ResultConfidence` with four factors:

- Response Quality (weight 0.25): depends on `response.length`
- Mention Clarity (weight 0.25): depends on `response`, `mentioned`, `clientName`
- Score Extremity (weight 0.15): depends on `visibilityScore`, `sentimentScore`
- Citation Presence (weight 0.35): depends on `citations[]`

The composite LLM+heuristic score (Section 4) additionally depends on: `llmMentionConfirmed`, `llmVisibilityScore`, `llmSentimentScore`, `llmConfidence`. These are future LLM validation outputs that naturally belong on the evidence record, not in untyped metadata JSON.

The confidence scoring system also needs `executedAt` for the Stale Data Penalty (Rule 5): evidence older than 90 days gets a 15% penalty, older than 180 days gets 30%. This requires an indexed timestamp column, not a JSON field.

**5. The analyst workflow's `ScanResultStatus` must coordinate with evidence status.**

The analyst workflow design (`analyst-workflow-design.md`) defines `ScanResultStatus`: CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED. The relationship between `ScanResult.status` and `ScanEvidence.status` must be clear and enforceable. With Option B, both are database-level enums with proper FK relationships. With Option A, the evidence status lives in a JSON blob that the workflow state machine cannot enforce at the database level.

The analyst workflow's `result-machine.ts` includes `shouldAutoFlagForReview()` which triggers on low visibility scores. The evidence provenance system adds a parallel trigger: evidence with no prompt text or unknown provider should also flag for review. This cross-cutting concern is cleanly expressible as a Prisma `where` clause on `ScanEvidence` columns, but ugly to express as a JSON path query.

**6. JSON-in-metadata creates a second class of data that resists refactoring.**

The current codebase already has a `metadata: Json?` debt pattern:
- `ScanRun.metadata` stores `queryClusterIds` as JSON (being replaced by `ScanQuery` join table per analyst workflow design)
- `Report.metadata` stores `scanRunIds`, `sections`, `coverPage`, `recommendations` as JSON (partially being replaced by `ReportScan` join table per analyst workflow design)
- `ScanResult.metadata` stores `competitorMentions` as JSON

Every one of these JSON fields has created downstream problems: no referential integrity, no indexed queries, no type safety at the database boundary, and JSON parsing scattered across action files. Option A would add the most important data in the system -- the evidence that justifies $10K+ enterprise reports -- to this same anti-pattern.

### Cost of Option B

- One additional table (`ScanEvidence`) with ~15 columns
- One join table (`ReportEvidence`) with ~6 columns
- One join table (`ReportScanRun`) with ~3 columns -- though the analyst workflow design already proposes this as `ReportScan`
- One Prisma migration
- Moderate backfill script for existing `ScanResult` rows
- Intentional duplication of `response` text between `ScanResult.response` and `ScanEvidence.rawResponse`

This cost is modest and the duplication is deliberate: `ScanResult.response` serves the fast-path analysis pipeline; `ScanEvidence.rawResponse` serves the immutable provenance chain. They may diverge as automated scanning introduces response processing.

### Decision

**Option B. First-class `ScanEvidence` table.** The six downstream systems make this the only defensible choice for a product that sells evidence to skeptical enterprise buyers.

---

## 2. Integration Map with Existing Designs

This section documents exactly how the evidence provenance system connects to each of the six existing designs. No redesign of those systems is proposed -- only integration points.

### 2A. Analyst Workflow Integration

**Source:** `docs/designs/analyst-workflow-design.md`

**Status alignment:**

The analyst workflow defines `ScanResultStatus` (CAPTURED, NEEDS_REVIEW, APPROVED, REJECTED). The evidence provenance system defines `EvidenceStatus` (DRAFT, APPROVED, SUPERSEDED, REJECTED). These are related but deliberately separate:

| `ScanResult.status` | Meaning | `ScanEvidence.status` | Meaning |
|---|---|---|---|
| CAPTURED | Result recorded, scores computed | DRAFT | Evidence captured, not yet verified |
| NEEDS_REVIEW | Flagged for human review | DRAFT | Evidence still in draft while under review |
| APPROVED | Human confirmed quality | APPROVED | Evidence locked, immutable |
| REJECTED | Human rejected quality | REJECTED | Evidence discarded (immutable for audit) |

**Coordination rules:**

1. When a `ScanResult` is created (enters CAPTURED), a `ScanEvidence` record is created simultaneously in DRAFT status. This happens in the same transaction.
2. When a `ScanResult` transitions to APPROVED (via `result-machine.ts:validateResultTransition`), the associated `ScanEvidence` must also transition to APPROVED. The result approval action should approve both in a single transaction.
3. When a `ScanResult` is REJECTED, the associated `ScanEvidence` transitions to REJECTED.
4. A `ScanResult` cannot transition to APPROVED if its current evidence version is not in DRAFT status (i.e., there must be evidence to approve).
5. `shouldAutoFlagForReview()` (line 930 of analyst workflow design) triggers on low visibility scores. Evidence with `provider = 'MANUAL'` and no `promptText` should also trigger review.

**Assignment rules:**

The analyst workflow's reviewer-cannot-be-analyst rule (line 895 of analyst workflow design) applies to evidence approval as well. `ScanEvidence.approvedById` must differ from `ScanRun.analystId`.

**Audit log:**

The analyst workflow's `AuditLog` model (lines 403-421) tracks state transitions with `entityType`, `entityId`, `fromStatus`, `toStatus`, `action`. Evidence status transitions should log to the same `AuditLog` using `entityType = 'SCAN_EVIDENCE'` (requires adding `SCAN_EVIDENCE` to the `AuditEntityType` enum).

### 2B. QA System Integration

**Source:** `docs/designs/report-qa-system-design.md`

**New QA checks enabled by evidence provenance:**

| Check Key | Category | Severity | Validation Logic |
|---|---|---|---|
| `evidence.all_results_approved` | EVIDENCE_INTEGRITY | BLOCKING | For all `ScanResult` rows included in the report: verify `ScanEvidence` exists with `status = 'APPROVED'` and `version` is the latest for that result. |
| `evidence.prompt_captured` | EVIDENCE_INTEGRITY | WARNING | For all `ScanEvidence` rows: `promptText` is non-empty. Manual results may have only the query text as prompt. |
| `evidence.model_recorded` | EVIDENCE_INTEGRITY | INFO | For all `ScanEvidence` rows: `modelName` is not null and not `'unknown'`. |
| `evidence.execution_timestamp_present` | EVIDENCE_INTEGRITY | WARNING | For all `ScanEvidence` rows: `executedAt` is non-null. |
| `evidence.confidence_above_threshold` | EVIDENCE_INTEGRITY | WARNING | For all `ScanEvidence` rows: `confidenceScore >= 0.5` (MEDIUM threshold from confidence scoring design). Results below this should have been flagged for review. |

**QACheckContext extension:**

The `QACheckContext` type (lines 377-427 of QA design) currently includes `scanResults[]`. Evidence provenance adds:

```typescript
// Addition to QACheckContext
evidence: {
  id: string;
  scanResultId: string;
  version: number;
  status: string;          // EvidenceStatus
  provider: string;        // LLMProvider
  modelName: string;
  promptText: string;
  executedAt: Date;
  confidenceScore: number | null;
  analystConfidence: number | null;
}[];
```

This is fetched by the server action that builds the QA context. The QA check functions in `packages/core/src/qa/checks.ts` receive this data without touching Prisma.

**Interaction with QA gating:**

The QA system requires all BLOCKING checks to pass before a report can move from IN_REVIEW to APPROVED. The new `evidence.all_results_approved` check is BLOCKING, which means: a report cannot be approved if any of its evidence records are still in DRAFT status. This is the enforcement point for the immutability guarantee -- evidence is locked before the report can be delivered.

### 2C. Confidence Scoring Integration

**Source:** `docs/confidence-scoring-design.md`

**Where confidence scores are stored:**

`ScanEvidence.confidenceScore` (system-assigned, 0.0-1.0) stores the `ResultConfidence` computed by the formula in Section 1 of the confidence scoring design. `ScanEvidence.analystConfidence` (human-assigned, 0.0-1.0) stores the analyst's override.

**Computation timing:**

The confidence score is computed when the `ScanEvidence` record is created, using the four factors (Response Quality, Mention Clarity, Score Extremity, Citation Presence) from the confidence scoring design. It is stored on the evidence record, not recomputed on every read.

**Finding-level confidence** (Section 2 of confidence scoring design) is computed at report composition time from the collection of result-level confidence scores. It is not stored on any evidence record -- it is a derived aggregate.

**LLM validation fields (future):**

When LLM validation is enabled (Section 4 of confidence scoring design), the composite score depends on `llmMentionConfirmed`, `llmVisibilityScore`, `llmSentimentScore`, `llmConfidence`. These are stored in `ScanEvidence.parameters` (JSON catch-all) until they warrant first-class columns. The confidence scoring function reads them from there.

### 2D. Operations Dashboard Integration

**Source:** `docs/designs/operations-dashboard-design.md`

**New derived metrics:**

| Metric | Source | Computation |
|---|---|---|
| Evidence awaiting approval | `ScanEvidence WHERE status = 'DRAFT'` | Count, grouped by engagement |
| Evidence approval rate | `ScanEvidence` grouped by status | `COUNT(APPROVED) / COUNT(*)` per engagement |
| Average evidence confidence | `ScanEvidence.confidenceScore` | `AVG(confidenceScore) WHERE status = 'APPROVED'` per scan run |
| Stale evidence | `ScanEvidence.executedAt` | `WHERE executedAt < now() - interval '90 days' AND status = 'DRAFT'` |

These follow the dashboard's design principle: "derive, do not duplicate." All are simple indexed queries on `ScanEvidence` columns.

**Attention items extension:**

The ops dashboard's "Attention items" section (lines 234-276 of ops design) adds:
- Evidence awaiting approval for > 48 hours: `ScanEvidence WHERE status = 'DRAFT' AND createdAt < now() - interval '48 hours'`
- Low-confidence evidence in approved scans: `ScanEvidence WHERE confidenceScore < 0.5 AND scanResult.scanRun.status = 'COMPLETE'`

### 2E. Report Traceability UI Integration

**Source:** `docs/designs/report-traceability-ui-design.md`

**Evidence panel data source:**

The traceability UI's `EvidenceResponse` type (lines 438-457 of UI design) returns per-result data grouped by cluster. Evidence provenance enriches this with:

```typescript
// Extension to EvidenceResponse.groups[].results[]
evidence: {
  provider: string;
  modelName: string;
  executedAt: string;     // ISO 8601
  confidenceScore: number | null;
  promptText: string;     // the exact question asked (may differ from Query.text)
}
```

This data powers the Level 3 "prove it" layer: the actual prompt sent, the model that answered, when it was executed, and the system's confidence in the result.

**Route handler modification:**

The evidence route handler at `/api/reports/[id]/evidence` (lines 429-459 of UI design) joins through `ReportEvidence` to `ScanEvidence` instead of inferring evidence from `Report.metadata.scanRunIds`. This replaces the implicit chain (Report -> metadata.scanRunIds -> ScanRun -> ScanResult) with an explicit chain (Report -> ReportEvidence -> ScanEvidence -> ScanResult -> Query).

**Export appendix enrichment:**

The export evidence appendix (lines 244-296 of UI design) adds a provenance footer per section:

```
Evidence collected: March 15-18, 2026
Model: GPT-4o (2024-08-06), Temperature 0.7
Queries evaluated: 48 of 52
Average evidence confidence: 0.82 (HIGH)
```

These values come from `ScanEvidence` columns aggregated across the report's evidence links.

### 2F. Report Traceability Content Integration

**Source:** `docs/designs/report-traceability-design.md`

**Level 3 data availability:**

The content design specifies that Level 3 (raw audit trail) shows "the actual AI response text, full citation URLs, and scan execution metadata (model, date, token count, latency)." All of these are first-class columns on `ScanEvidence`:

| Level 3 Data Point | Source Column |
|---|---|
| AI response text | `ScanEvidence.rawResponse` |
| Model used | `ScanEvidence.modelName` |
| Execution date | `ScanEvidence.executedAt` |
| Token count | `ScanEvidence.rawTokenCount` |
| Latency | `ScanEvidence.latencyMs` |
| Prompt text | `ScanEvidence.promptText` |
| Temperature | `ScanEvidence.temperature` |

**Confidence tier integration:**

The traceability content design defines per-section confidence tiers (HIGH/MEDIUM/LOW) derived from result data. With the confidence scoring system, these tiers are computed from `ScanEvidence.confidenceScore` values aggregated per section, replacing the heuristic derivation rules in the traceability UI design (lines 107-131).

---

## 3. Prisma Schema

### New Enums

```prisma
enum LLMProvider {
  OPENAI
  ANTHROPIC
  GOOGLE
  MANUAL           // Human-entered response (current manual workflow)
}

enum EvidenceStatus {
  DRAFT            // Captured, not yet reviewed
  APPROVED         // Reviewed and accepted -- immutable
  SUPERSEDED       // Replaced by newer version -- immutable, readable
  REJECTED         // Discarded -- immutable for audit trail
}
```

### Extended Enum

```prisma
// Add to existing AuditEntityType (from analyst workflow design)
enum AuditEntityType {
  SCAN_RUN
  SCAN_RESULT
  REPORT
  SCAN_EVIDENCE    // NEW
}
```

### New Model: ScanEvidence

```prisma
model ScanEvidence {
  id              String          @id @default(cuid())
  scanResultId    String
  version         Int             @default(1)

  // ── Provenance: what was asked ──
  promptText      String          @db.Text
  promptVersion   String?                       // e.g., "visibility-probe-v2"

  // ── Provenance: who answered ──
  provider        LLMProvider
  modelName       String                        // e.g., "gpt-4o-2024-08-06"
  modelVersion    String?                       // provider-specific version
  temperature     Float?
  topP            Float?
  maxTokens       Int?
  systemPrompt    String?         @db.Text
  parameters      Json?                         // catch-all for other gen params

  // ── Raw output ──
  rawResponse     String          @db.Text      // exact bytes from LLM, unmodified
  rawTokenCount   Int?
  promptTokens    Int?
  latencyMs       Int?

  // ── Execution ──
  executedAt      DateTime                      // when the LLM call completed

  // ── Review state ──
  status          EvidenceStatus  @default(DRAFT)
  approvedAt      DateTime?
  approvedById    String?

  // ── Analyst overlay ──
  analystNotes    String?         @db.Text
  confidenceScore Float?                        // 0.0-1.0, system-computed (ResultConfidence)
  analystConfidence Float?                      // 0.0-1.0, human-assigned override

  // ── Extracted structured data ──
  extractedSources Json?                        // array of { domain, url } extracted from response

  // ── Timestamps ──
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // ── Relations ──
  scanResult      ScanResult      @relation(fields: [scanResultId], references: [id], onDelete: Cascade)
  approvedBy      User?           @relation("EvidenceApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)
  reportLinks     ReportEvidence[]

  @@unique([scanResultId, version])
  @@index([scanResultId])
  @@index([status])
  @@index([provider, modelName])
  @@index([executedAt])
  @@map("scan_evidence")
}
```

### New Model: ReportEvidence

```prisma
model ReportEvidence {
  id              String    @id @default(cuid())
  reportId        String
  scanEvidenceId  String

  // ── Traceability ──
  sectionHeading  String?                     // which report section this supports
  claimText       String?   @db.Text          // the specific claim being backed
  evidenceRole    String?                     // "primary", "supporting", "counter"
  sortOrder       Int       @default(0)

  createdAt       DateTime  @default(now())

  // ── Relations ──
  report          Report        @relation(fields: [reportId], references: [id], onDelete: Cascade)
  scanEvidence    ScanEvidence  @relation(fields: [scanEvidenceId], references: [id], onDelete: Restrict)

  @@unique([reportId, scanEvidenceId, sectionHeading])
  @@index([reportId])
  @@index([scanEvidenceId])
  @@map("report_evidence")
}
```

### Modifications to Existing Models

**ScanRun -- add structured LLM config:**

```prisma
model ScanRun {
  // ... existing fields per analyst workflow design ...

  // ADD these fields (run-level defaults, individual evidence may override):
  provider        LLMProvider?
  modelVersion    String?
  temperature     Float?
  scanConfig      Json?                       // full configuration snapshot

  // ADD this relation (analyst workflow already adds ReportScan):
  // reportScanRuns relation is covered by ReportScan from analyst workflow

  // existing relations unchanged
}
```

Note: The analyst workflow design already proposes a `ReportScan` join table (lines 384-397) which replaces `metadata.scanRunIds`. The evidence provenance system does NOT introduce a separate `ReportScanRun` model. We use the analyst workflow's `ReportScan` model. The initial sketch (`docs/evidence-provenance-design.md`) proposed `ReportScanRun` but this is a redundant duplicate of `ReportScan`. Using one join table avoids confusion.

**ScanResult -- add evidence relation:**

```prisma
model ScanResult {
  // ... existing fields per analyst workflow design ...

  // ADD this relation:
  evidence        ScanEvidence[]

  // existing relations unchanged
}
```

**Report -- add evidence relation:**

```prisma
model Report {
  // ... existing fields per analyst workflow design ...

  // ADD this relation:
  evidenceLinks   ReportEvidence[]

  // NOTE: ReportScan relation already added by analyst workflow design.
  // Report.metadata field stays for sections/coverPage/recommendations.
  // scanRunIds in metadata becomes redundant once ReportScan is populated.
}
```

**User -- add evidence approval relation:**

```prisma
model User {
  // ... existing fields per analyst workflow + QA designs ...

  // ADD this relation:
  approvedEvidence ScanEvidence[] @relation("EvidenceApprovedBy")
}
```

### Design Rationale

**Why `ScanEvidence` is separate from `ScanResult`, not new columns on `ScanResult`:**

`ScanResult` is the "scored/analyzed result" with derived fields (`visibilityScore`, `sentimentScore`, `mentioned`). These are computed by `analyzeResponse()` and may be recomputed. Evidence is the raw input/output of the LLM interaction. Keeping them separate means:
- Raw evidence is immutable even if scores are recomputed
- A single `ScanResult` can have multiple evidence versions (reruns of the same query)
- The analysis pipeline (`scan-analysis.ts`, `scan-comparison.ts`) continues to read `ScanResult` without touching the evidence table
- Storage and access patterns are optimized independently

**Why `extractedSources` on `ScanEvidence` rather than relying only on `CitationSource`:**

`CitationSource` rows are created from user-entered domains in the current manual workflow. For automated scanning, we want to also capture sources extracted programmatically from the raw LLM response. `extractedSources` is a JSON array of `{ domain, url }` pairs that can be compared against `CitationSource` rows during QA. This enables the QA check `evidence.citations_parsed` to verify that all response-mentioned sources have been properly captured as `CitationSource` records.

**Why `onDelete: Restrict` on `ReportEvidence.scanEvidence`:**

Once evidence is linked to a report, deleting it breaks provenance. A report claiming "45% mention rate" must always be able to show the evidence. If evidence must be removed, report links must be cleaned up first. This is the same rationale as the initial sketch.

**Why no separate evidence audit log:**

The analyst workflow's `AuditLog` model (with `entityType = 'SCAN_EVIDENCE'`) handles evidence state transitions. No dedicated `EvidenceAuditLog` table is needed. Adding `SCAN_EVIDENCE` to `AuditEntityType` is minimal.

**Why confidence scores are on `ScanEvidence`, not `ScanResult`:**

The confidence scoring design computes confidence from evidence quality signals (response length, citation presence, mention clarity). These are properties of the evidence, not the derived scores. Storing confidence on evidence also means that when evidence is superseded, the old confidence is preserved alongside the old evidence, and new confidence is computed for the new version.

---

## 4. Immutability Design

### Field-Level Immutability Rules

Once a `ScanEvidence` record reaches APPROVED, REJECTED, or SUPERSEDED status, the following rules apply:

**Immutable fields (cannot be modified after status leaves DRAFT):**

| Field | Reason |
|---|---|
| `promptText` | What was asked is a historical fact |
| `promptVersion` | Version of the prompt template used |
| `provider` | Who answered is a historical fact |
| `modelName` | Model identity is provenance |
| `modelVersion` | Model version is provenance |
| `temperature` | Generation parameter is provenance |
| `topP` | Generation parameter is provenance |
| `maxTokens` | Generation parameter is provenance |
| `systemPrompt` | System instructions are provenance |
| `parameters` | Generation parameters are provenance |
| `rawResponse` | The actual output is the core evidence |
| `rawTokenCount` | Usage metric is a historical fact |
| `promptTokens` | Usage metric is a historical fact |
| `latencyMs` | Performance metric is a historical fact |
| `executedAt` | When it happened is a historical fact |
| `extractedSources` | Extracted at capture time, part of the evidence record |

**Mutable fields (can be modified in any status):**

| Field | Reason |
|---|---|
| `analystNotes` | Human commentary is an overlay, not evidence |
| `analystConfidence` | Human confidence override is an overlay |
| `status` | Only via valid transitions (forward-only) |
| `approvedAt` | Set on approval transition |
| `approvedById` | Set on approval transition |

**Derived field (set at creation, re-settable in DRAFT only):**

| Field | Reason |
|---|---|
| `confidenceScore` | System-computed confidence; recalculated if analysis is rerun while in DRAFT |

### Status Machine

```
     create
       |
       v
    ┌───────┐
    │ DRAFT │
    └───┬───┘
        |
  ┌─────┴──────┐
  |             |
  v             v
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │
└──────┬───┘  └──────────┘
       |         (terminal)
       v
┌────────────┐
│ SUPERSEDED │
└────────────┘
   (terminal)
```

**Transition rules:**

| From | To | Condition | Side Effects |
|---|---|---|---|
| (new) | DRAFT | ScanResult exists, provider and rawResponse provided | Set `confidenceScore` from computation |
| DRAFT | APPROVED | Actor has ADMIN/MEMBER role, actor is not the scan analyst | Set `approvedAt`, `approvedById`. Evidence becomes immutable. |
| DRAFT | REJECTED | Actor has ADMIN/MEMBER role, note is required | Evidence becomes immutable. |
| APPROVED | SUPERSEDED | New version approved for same scanResult | Automatic transition. Old evidence stays immutable. |
| APPROVED | DRAFT | **NOT ALLOWED** | Cannot un-approve evidence. |
| REJECTED | * | **NOT ALLOWED** | Terminal state. |
| SUPERSEDED | * | **NOT ALLOWED** | Terminal state. |

### Enforcement

Application-level enforcement in `packages/core/src/evidence/`. All evidence mutations route through:

```typescript
// packages/core/src/evidence/immutability.ts

const IMMUTABLE_STATUSES = ['APPROVED', 'REJECTED', 'SUPERSEDED'] as const;

const IMMUTABLE_FIELDS = [
  'promptText', 'promptVersion', 'provider', 'modelName', 'modelVersion',
  'temperature', 'topP', 'maxTokens', 'systemPrompt', 'parameters',
  'rawResponse', 'rawTokenCount', 'promptTokens', 'latencyMs', 'executedAt',
  'extractedSources',
] as const;

const ALWAYS_MUTABLE_FIELDS = [
  'analystNotes', 'analystConfidence',
] as const;

export function validateEvidenceUpdate(
  currentStatus: EvidenceStatus,
  fieldsBeingUpdated: string[],
): { valid: boolean; reason?: string } {
  if (!IMMUTABLE_STATUSES.includes(currentStatus as any)) {
    return { valid: true }; // DRAFT allows all edits
  }

  const immutableViolations = fieldsBeingUpdated.filter(
    f => (IMMUTABLE_FIELDS as readonly string[]).includes(f)
  );

  if (immutableViolations.length > 0) {
    return {
      valid: false,
      reason: `Cannot modify ${immutableViolations.join(', ')} on ${currentStatus} evidence.`,
    };
  }

  return { valid: true };
}
```

### Corrections When Evidence Is Wrong

When approved evidence is found to be incorrect:

1. The existing evidence stays in APPROVED status (it represents what actually happened)
2. A new `ScanEvidence` record is created for the same `scanResultId` with `version = N+1`
3. The new evidence enters DRAFT status for review
4. When the new evidence is approved, the old evidence auto-transitions to SUPERSEDED
5. Reports linked to the old evidence retain their links (they were built with that evidence)
6. Report regeneration can update links to point to the new evidence version

---

## 5. TypeScript Types

All types live in `packages/core/src/evidence/types.ts`. These mirror the Prisma enums and models, keeping core free of `@prisma/client`.

```typescript
// packages/core/src/evidence/types.ts

// ── Enums (mirror Prisma) ──

export type LLMProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'MANUAL';
export type EvidenceStatus = 'DRAFT' | 'APPROVED' | 'SUPERSEDED' | 'REJECTED';

// ── Evidence record ──

export interface ScanEvidenceRecord {
  id: string;
  scanResultId: string;
  version: number;

  // Provenance: what was asked
  promptText: string;
  promptVersion: string | null;

  // Provenance: who answered
  provider: LLMProvider;
  modelName: string;
  modelVersion: string | null;
  temperature: number | null;
  topP: number | null;
  maxTokens: number | null;
  systemPrompt: string | null;
  parameters: Record<string, unknown> | null;

  // Raw output
  rawResponse: string;
  rawTokenCount: number | null;
  promptTokens: number | null;
  latencyMs: number | null;

  // Execution
  executedAt: Date;

  // Review state
  status: EvidenceStatus;
  approvedAt: Date | null;
  approvedById: string | null;

  // Analyst overlay
  analystNotes: string | null;
  confidenceScore: number | null;
  analystConfidence: number | null;

  // Extracted data
  extractedSources: { domain: string; url: string }[] | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ── Report evidence link ──

export interface ReportEvidenceLink {
  id: string;
  reportId: string;
  scanEvidenceId: string;
  sectionHeading: string | null;
  claimText: string | null;
  evidenceRole: string | null;
  sortOrder: number;
  createdAt: Date;
}

// ── Evidence creation input ──

export interface CreateEvidenceInput {
  scanResultId: string;
  promptText: string;
  promptVersion?: string;
  provider: LLMProvider;
  modelName: string;
  modelVersion?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
  parameters?: Record<string, unknown>;
  rawResponse: string;
  rawTokenCount?: number;
  promptTokens?: number;
  latencyMs?: number;
  executedAt: Date;
  extractedSources?: { domain: string; url: string }[];
}

// ── Evidence transition context ──

export interface EvidenceTransitionContext {
  actorId: string;
  actorRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  scanAnalystId: string | null;  // analyst who owns the parent scan
  note?: string;
}

// ── Evidence transition result ──

export interface EvidenceTransitionResult {
  newStatus: EvidenceStatus;
  sideEffects: Array<{
    type: 'set_field';
    field: string;
    value: unknown;
  }>;
  auditEntry: {
    entityType: 'SCAN_EVIDENCE';
    entityId: string;
    actorId: string;
    fromStatus: string;
    toStatus: string;
    action: string;
    note?: string;
  };
}

// ── Report evidence creation input ──

export interface CreateReportEvidenceInput {
  reportId: string;
  scanEvidenceId: string;
  sectionHeading?: string;
  claimText?: string;
  evidenceRole?: string;
  sortOrder?: number;
}
```

---

## 6. Zod Validation Schemas

These live in `packages/core/src/evidence/schemas.ts` and are re-exported from `packages/core/src/schemas.ts`.

```typescript
// packages/core/src/evidence/schemas.ts

import { z } from 'zod';

// ── Enums ──

export const LLMProvider = z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'MANUAL']);
export type LLMProvider = z.infer<typeof LLMProvider>;

export const EvidenceStatus = z.enum(['DRAFT', 'APPROVED', 'SUPERSEDED', 'REJECTED']);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

// ── Primitives ──

const cuid = z.string().cuid();
const confidenceScore = z.number().min(0).max(1);

// ── Create evidence ──

export const CreateScanEvidenceSchema = z.object({
  scanResultId: cuid,
  promptText: z.string().min(1),
  promptVersion: z.string().max(100).optional(),
  provider: LLMProvider,
  modelName: z.string().min(1).max(200),
  modelVersion: z.string().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).optional(),
  systemPrompt: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  rawResponse: z.string().min(1),
  rawTokenCount: z.number().int().min(0).optional(),
  promptTokens: z.number().int().min(0).optional(),
  latencyMs: z.number().int().min(0).optional(),
  executedAt: z.coerce.date(),
  extractedSources: z.array(z.object({
    domain: z.string(),
    url: z.string(),
  })).optional(),
});
export type CreateScanEvidenceInput = z.infer<typeof CreateScanEvidenceSchema>;

// ── Update evidence (mutable fields only) ──

export const UpdateScanEvidenceSchema = z.object({
  analystNotes: z.string().optional(),
  analystConfidence: confidenceScore.optional(),
});
export type UpdateScanEvidenceInput = z.infer<typeof UpdateScanEvidenceSchema>;

// ── Approve/reject evidence ──

export const TransitionEvidenceSchema = z.object({
  evidenceId: cuid,
  targetStatus: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().optional(),
});
export type TransitionEvidenceInput = z.infer<typeof TransitionEvidenceSchema>;

// ── Bulk approve (all evidence in a scan run) ──

export const BulkApproveEvidenceSchema = z.object({
  scanRunId: cuid,
  note: z.string().optional(),
});
export type BulkApproveEvidenceInput = z.infer<typeof BulkApproveEvidenceSchema>;

// ── Create report evidence link ──

export const CreateReportEvidenceSchema = z.object({
  reportId: cuid,
  scanEvidenceId: cuid,
  sectionHeading: z.string().max(255).optional(),
  claimText: z.string().optional(),
  evidenceRole: z.enum(['primary', 'supporting', 'counter']).optional(),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateReportEvidenceInput = z.infer<typeof CreateReportEvidenceSchema>;
```

---

## 7. Data Flow: Scan to Evidence to Report

### Flow 1: Manual Scan Result Entry (current workflow, extended)

```
User enters response text + cited domains in scan result form
  |
  v
[apps/web] actions/scans.ts:recordResult
  |
  |  1. Validate input (ManualScanResultSchema)
  |  2. Fetch client context (name, domain, competitors)
  |  3. Run analyzeResponse() -> ResponseAnalysis
  |  4. Compute ResultConfidence from confidence scoring system
  |  5. Transaction:
  |     a. Create ScanResult (scores, mentioned, metadata)
  |     b. Create CitationSource[] (from cited domains)
  |     c. Create ScanEvidence (version=1, status=DRAFT):
  |        - promptText: Query.text
  |        - provider: MANUAL
  |        - modelName: ScanRun.model or "manual"
  |        - rawResponse: user-entered response text
  |        - executedAt: now()
  |        - confidenceScore: computed ResultConfidence
  |     d. Update ScanRun.resultCount
  |     e. If shouldAutoFlagForReview(): update ScanResult.status -> NEEDS_REVIEW
  |
  v
ScanResult + ScanEvidence + CitationSource stored
```

### Flow 2: Automated Scan Execution (future, apps/jobs)

```
Job worker picks up RUNNING ScanRun, iterates ScanQuery rows
  |
  v
[apps/jobs] scan-worker.ts
  |
  |  For each ScanQuery (status=PENDING):
  |    1. Set ScanQuery.status -> IN_PROGRESS
  |    2. Build prompt from Query.text via packages/prompts
  |    3. Call LLM provider API
  |    4. Capture response + API metadata (tokens, latency, model version)
  |    5. Run analyzeResponse()
  |    6. Compute ResultConfidence
  |    7. Transaction:
  |       a. Create ScanResult
  |       b. Create CitationSource[]
  |       c. Create ScanEvidence (version=1, status=DRAFT):
  |          - promptText: exact rendered prompt
  |          - provider: from ScanRun.provider
  |          - modelName: from API response
  |          - modelVersion: from API response
  |          - temperature, topP, maxTokens: from request config
  |          - systemPrompt: if used
  |          - rawResponse: full API response body
  |          - rawTokenCount, promptTokens: from API usage
  |          - latencyMs: measured
  |          - executedAt: API response timestamp
  |          - extractedSources: parsed from response
  |          - confidenceScore: computed ResultConfidence
  |       d. Set ScanQuery.status -> SUCCEEDED
  |       e. Update ScanRun.resultCount
  |
  v
ScanResult + ScanEvidence stored for each query
```

### Flow 3: Evidence Review and Approval

```
Analyst reviews results in scan detail view
  |
  v
[apps/web] actions/evidence.ts:approveEvidence
  |
  |  1. Validate: actor has ADMIN/MEMBER role
  |  2. Validate: actor is not the scan analyst
  |  3. Validate: evidence is in DRAFT status
  |  4. Call validateEvidenceTransition() from packages/core
  |  5. Transaction:
  |     a. Update ScanEvidence: status=APPROVED, approvedAt, approvedById
  |     b. Update ScanResult: status=APPROVED, reviewedById, reviewedAt
  |     c. Create AuditLog entry (entityType=SCAN_EVIDENCE)
  |     d. Create AuditLog entry (entityType=SCAN_RESULT)
  |
  v
Evidence and result both approved atomically

OR: Bulk approval

[apps/web] actions/evidence.ts:bulkApproveEvidence
  |
  |  1. Validate input (BulkApproveEvidenceSchema)
  |  2. Fetch all ScanEvidence WHERE scanResult.scanRunId = ? AND status = 'DRAFT'
  |  3. For each: validate transition, verify actor is not analyst
  |  4. Transaction:
  |     a. Update all ScanEvidence rows to APPROVED
  |     b. Update all ScanResult rows to APPROVED
  |     c. Create AuditLog entries
  |
  v
All evidence in scan run approved in one action
```

### Flow 4: Report Generation with Evidence Linking

```
User selects completed scans and triggers report generation
  |
  v
[apps/web] actions/reports.ts:generateReport (modified)
  |
  |  1. Validate input (GenerateReportSchema)
  |  2. Fetch client context
  |  3. Fetch scan results with APPROVED evidence (latest version)
  |  4. Warn (do not block) if any evidence is still DRAFT
  |  5. Compute ScanComparisonResult (existing logic, unchanged)
  |  6. Compute queryThemeBreakdown (existing logic, unchanged)
  |  7. Call composeReport() -- existing signature, no change to composer
  |  8. Build evidence links: map each result to its section
  |  9. Transaction:
  |     a. Create Report (sections in metadata, summary in field)
  |     b. Create Recommendation[]
  |     c. Create ReportScan[] (replaces metadata.scanRunIds)
  |     d. Create ReportEvidence[]:
  |        - For "Visibility findings": link all result evidence
  |        - For "Competitor analysis": link evidence with competitor mentions
  |        - For "Citation patterns": link evidence with citations
  |        - For "Assessment scope": link all evidence (methodology section)
  |
  v
Report + ReportEvidence + ReportScan stored
```

### Section-to-Evidence Mapping Logic

The `generateReport` action builds `ReportEvidence` records by categorizing each result's evidence:

```typescript
// packages/core/src/evidence/section-mapping.ts

export function mapEvidenceToSections(
  evidenceIds: Array<{ evidenceId: string; scanResultId: string }>,
  results: Array<{
    id: string;
    mentioned: boolean;
    metadata: unknown;
    citations: Array<{ domain: string | null }>;
  }>,
): CreateReportEvidenceInput[] {
  const links: CreateReportEvidenceInput[] = [];

  for (const { evidenceId, scanResultId } of evidenceIds) {
    const result = results.find(r => r.id === scanResultId);
    if (!result) continue;

    // Every result supports Visibility findings (all results contribute to mention rate)
    links.push({
      reportId: '', // filled by caller
      scanEvidenceId: evidenceId,
      sectionHeading: 'Visibility findings',
      evidenceRole: 'primary',
    });

    // Every result supports Assessment scope (methodology)
    links.push({
      reportId: '',
      scanEvidenceId: evidenceId,
      sectionHeading: 'Assessment scope and methodology',
      evidenceRole: 'supporting',
    });

    // Results with competitor mentions support Competitor analysis
    const compMentions = extractCompetitorMentions(result.metadata);
    if (compMentions.length > 0) {
      links.push({
        reportId: '',
        scanEvidenceId: evidenceId,
        sectionHeading: 'Competitor analysis',
        evidenceRole: 'primary',
      });
    }

    // Results with citations support Citation patterns
    if (result.citations.length > 0) {
      links.push({
        reportId: '',
        scanEvidenceId: evidenceId,
        sectionHeading: 'Citation patterns',
        evidenceRole: 'primary',
      });
    }
  }

  return links;
}
```

This logic is deterministic and testable. It runs in `packages/core`, not in a server action.

---

## 8. Migration Plan

### Phase 1: Schema Migration (Additive Only)

**What changes:**
1. Add `LLMProvider` and `EvidenceStatus` enums
2. Add `SCAN_EVIDENCE` to `AuditEntityType` enum
3. Add `ScanEvidence` model
4. Add `ReportEvidence` model
5. Add `provider`, `modelVersion`, `temperature`, `scanConfig` fields to `ScanRun`
6. Add `evidence` relation to `ScanResult`
7. Add `evidenceLinks` relation to `Report`
8. Add `approvedEvidence` relation to `User`
9. Run `prisma migrate dev`

**What does NOT change:**
- No existing columns removed or renamed
- No existing data modified
- `ScanResult.response` stays (serves analysis pipeline)
- `Report.metadata` stays (serves sections/coverPage/recommendations)
- `ScanRun.model` stays (serves current manual workflow)

**Migration safety:** This is purely additive. No destructive operations. The migration is backward-compatible -- the application continues to function identically after migration, before any code changes.

### Phase 2: Backfill Existing Data

```typescript
// scripts/backfill-evidence.ts

// For each existing ScanResult:
// Create a ScanEvidence record with best-available data

for each ScanResult {
  ScanEvidence.create({
    scanResultId: result.id,
    version: 1,
    promptText: result.query.text,          // best proxy for manual results
    provider: 'MANUAL',
    modelName: result.scanRun.model ?? 'unknown',
    rawResponse: result.response,
    executedAt: result.createdAt,
    status: 'APPROVED',                     // grandfather existing data
    approvedAt: new Date(),                 // backfill timestamp
    confidenceScore: null,                  // can be computed in a later pass
  });
}

// For each existing Report with metadata.scanRunIds:
// Create ReportScan records (analyst workflow join table)

for each Report where metadata.scanRunIds exists {
  for each scanRunId in metadata.scanRunIds {
    ReportScan.create({ reportId, scanRunId });
  }
}
```

**Backfill is idempotent:** Uses `@@unique([scanResultId, version])` as the dedup key. Safe to rerun.

**Confidence backfill:** A separate pass can compute `confidenceScore` for backfilled evidence using the confidence scoring system. This is optional -- backfilled records with `confidenceScore: null` are valid and display as "Confidence: N/A" in the UI.

### Phase 3: Update Write Paths

1. Modify `recordResult` in `actions/scans.ts` to create `ScanEvidence` alongside `ScanResult`
2. Modify `generateReport` in `actions/reports.ts` to:
   - Create `ReportScan` records (replaces `metadata.scanRunIds`)
   - Create `ReportEvidence` records via `mapEvidenceToSections()`
3. Create `actions/evidence.ts` with `approveEvidence`, `rejectEvidence`, `bulkApproveEvidence`
4. Create `packages/core/src/evidence/` module with immutability validation, transition logic, section mapping

### Phase 4: Update Read Paths

1. Report detail page: fetch `evidenceLinks` with joined `ScanEvidence` data
2. Report export page: include provenance metadata in appendix
3. Evidence panel (traceability UI): fetch via `ReportEvidence -> ScanEvidence` chain
4. Scan detail page: show evidence status alongside result status

### What Not to Do During Migration

- Do NOT remove `ScanResult.response` -- the analysis pipeline reads it
- Do NOT remove `Report.metadata` -- it stores sections, coverPage, recommendations
- Do NOT remove `ScanRun.model` -- it serves the current manual workflow
- Do NOT make `ScanEvidence` required for `ScanResult` creation -- the backfill populates existing data, but there may be a brief window where new results exist without evidence if the migration script runs before the write path is updated
- Do NOT attempt to create `ReportEvidence` for existing reports -- they have no section-to-evidence mapping and the UI handles "Evidence provenance not available for reports generated before [date]"

---

## 9. Risks and Tradeoffs

### Risk: Dual status machines (ScanResult + ScanEvidence)

**Severity:** Medium
**Detail:** `ScanResult.status` (CAPTURED/NEEDS_REVIEW/APPROVED/REJECTED) and `ScanEvidence.status` (DRAFT/APPROVED/SUPERSEDED/REJECTED) must stay synchronized. If they diverge, the system has a result marked APPROVED but with DRAFT evidence, or vice versa.
**Mitigation:** Always approve/reject result and evidence in the same transaction. The `approveEvidence` action updates both atomically. The QA check `evidence.all_results_approved` catches any divergence before report delivery.
**Future option:** If the dual-status pattern creates persistent bugs, collapse to a single status on `ScanEvidence` and make `ScanResult` derive its status from its evidence. This is a simplification, not a new model.

### Risk: Evidence storage growth

**Severity:** Low
**Detail:** At current scale (manual, 30 queries/scan), evidence is ~180 KB per scan run. At automated scale (100 scans/day, 50 queries, 5 KB each), that is ~25 MB/day or ~9 GB/year. Postgres handles this easily.
**Mitigation:** Monitor evidence table size. `rawResponse` and `promptText` are TOASTed by Postgres automatically. If we exceed 100 GB, extract to blob storage.

### Risk: Immutability enforcement is application-level only

**Severity:** Medium
**Detail:** Prisma does not support database-level row immutability. A direct SQL connection could bypass immutability checks.
**Mitigation:** All database access routes through Prisma, which routes through our application code. Add row-level security or trigger as defense-in-depth for SOC2/compliance when needed. For now, application-level enforcement with tests is sufficient.

### Risk: `composeReport` does not emit evidence links natively

**Severity:** Low
**Detail:** `composeReport()` takes aggregated `ScanComparisonResult`, not individual results with evidence IDs. The evidence-to-section mapping is done post-composition by `mapEvidenceToSections()`, not during composition.
**Mitigation:** This is intentional. The composer should remain deterministic and free of evidence concerns. The mapping function is a separate, testable unit. If the composer needs to embed evidence references in section text (e.g., "Based on 36 results [view evidence]"), this is a future enhancement to the composed output format, not a change to the evidence model.

### Risk: Backward compatibility with evidence-less reports

**Severity:** Low
**Detail:** Reports generated before the evidence system will have `ReportScan` records (from backfill) but no `ReportEvidence` links.
**Mitigation:** The traceability UI checks for `evidenceLinks.length > 0` before showing the evidence panel. For legacy reports, it falls back to the current behavior: inferring evidence from `Report.metadata.scanRunIds -> ScanRun -> ScanResult`. A note in the UI: "Detailed evidence provenance is available for reports generated after [migration date]."

### Tradeoff: Denormalized response text

**Decision:** `ScanResult.response` and `ScanEvidence.rawResponse` store the same text.
**Cost:** ~2x storage for response text.
**Benefit:** The analysis pipeline (`scan-comparison.ts`, `scan-analysis.ts`) reads `ScanResult.response` without joining to the evidence table. The evidence table can be optimized independently. If `ScanResult.response` is ever trimmed or processed, `rawResponse` preserves the original.

### Tradeoff: `extractedSources` as JSON rather than a normalized table

**Decision:** Sources extracted from the raw response are stored as a JSON array on `ScanEvidence`, not as rows in a separate table.
**Cost:** No indexed queries on individual extracted sources.
**Benefit:** Simpler schema. Extracted sources are only compared against `CitationSource` rows during QA, never queried independently. If independent querying becomes needed, they can be normalized into a table later without breaking the evidence model.

### Tradeoff: Evidence versioning within a result vs. new result for reruns

**Decision:** A rerun of the same query within the same scan creates a new evidence version (`version = N+1`) on the same `ScanResult`. A full scan rerun creates a new `ScanRun` with new `ScanResult` and new `ScanEvidence`.
**Cost:** The version concept adds complexity to the "latest evidence" query pattern.
**Benefit:** Preserves the audit trail for within-scan corrections while keeping scan reruns as independent entities. Reports pin to specific evidence versions via `ReportEvidence.scanEvidenceId`.

---

## Appendix: File Plan

### New files

```
packages/core/src/evidence/
  types.ts           -- TypeScript types (Section 5)
  schemas.ts         -- Zod validation schemas (Section 6)
  immutability.ts    -- Immutability validation (Section 4)
  transitions.ts     -- Evidence status machine
  section-mapping.ts -- Map evidence to report sections (Section 7)
  confidence.ts      -- ResultConfidence computation (from confidence scoring design)
  index.ts           -- Barrel export

apps/web/src/app/(dashboard)/actions/evidence.ts -- approve/reject/bulk actions
scripts/backfill-evidence.ts                      -- one-time migration
```

### Modified files

```
packages/db/prisma/schema.prisma         -- new models, modified relations
packages/core/src/schemas.ts             -- re-export evidence schemas
packages/core/src/index.ts               -- export evidence module
apps/web/src/app/(dashboard)/actions/scans.ts    -- create evidence alongside results
apps/web/src/app/(dashboard)/actions/reports.ts  -- create ReportScan + ReportEvidence
```

### Files that should NOT be modified

```
packages/core/src/scan-analysis.ts       -- analysis is independent of evidence
packages/core/src/scan-comparison.ts     -- comparison consumes ScanResult, not evidence
packages/core/src/report-composer.ts     -- composer takes aggregates, not evidence
packages/prompts/src/*                   -- prompt templates are unchanged
```
