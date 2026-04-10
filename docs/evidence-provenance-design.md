# Evidence Provenance System -- Architectural Design

**Author:** Architect
**Date:** 2026-03-26
**Status:** DESIGN -- no code changes

---

## Table of Contents

1. [Diagnosis of Current State](#1-diagnosis-of-current-state)
2. [Data Model Design](#2-data-model-design)
3. [Evidence Chain Architecture](#3-evidence-chain-architecture)
4. [Immutability Design](#4-immutability-design)
5. [Versioning Strategy](#5-versioning-strategy)
6. [Storage Considerations](#6-storage-considerations)
7. [Data Flow Diagram](#7-data-flow-diagram)
8. [Migration Strategy](#8-migration-strategy)
9. [Risks and Tradeoffs](#9-risks-and-tradeoffs)
10. [Implementation Plan](#10-implementation-plan)

---

## 1. Diagnosis of Current State

### What exists

The current schema (`packages/db/prisma/schema.prisma`) has a functional scan pipeline but no evidence provenance:

**ScanRun** captures execution metadata (status, model name, timestamps) but stores `model` as a bare string with no version, provider, or parameter information. The `metadata` field is untyped `Json?`.

**ScanResult** stores the LLM response as `response: String @db.Text` alongside computed scores (`visibilityScore`, `sentimentScore`, `relevanceScore`), but there is:
- No record of what prompt was sent
- No record of the LLM provider or model version
- No record of temperature or other generation parameters
- No separation between the raw LLM output and the parsed/scored result
- No immutability control -- results can be freely mutated
- No `updatedAt` -- so we cannot even detect post-hoc edits
- No analyst notes or confidence scores

**Report** links to scans via `metadata.scanRunIds` -- a loose JSON array inside an untyped `Json?` column. This means:
- No database-level referential integrity between reports and scan runs
- No link between specific report claims and specific scan results
- No ability to query "which reports used this scan result" without JSON parsing
- Reports can be freely mutated in any status

**CitationSource** captures URLs and domains but has no link back to the raw response text that contained them. Citations are created in `apps/web/src/app/(dashboard)/actions/scans.ts` as part of `recordResult`, derived from user-entered domains, not extracted from the LLM response itself.

**Report composition** (`packages/core/src/report-composer.ts`) takes a `ScanComparisonResult` as input -- an aggregated statistical summary -- and produces report sections. The report never references individual scan results. When the report says "mentioned in 45% of queries," there is no pointer back to which specific queries produced that number.

### Specific code-level gaps

1. `apps/web/src/app/(dashboard)/actions/scans.ts:recordResult` -- creates a `ScanResult` with `response` (the LLM text) but does not capture what prompt was used, what model/version generated it, or generation parameters.

2. `apps/web/src/app/(dashboard)/actions/reports.ts:generateReport` -- stores `scanRunIds` as JSON inside `metadata` (line 135-139). No join table, no FK constraints.

3. `packages/core/src/report-composer.ts:composeReport` -- takes aggregated `ScanComparisonResult`, not individual results. The composed report sections cannot trace back to specific evidence.

4. `packages/core/src/scan-analysis.ts:analyzeResponse` -- produces scores from raw text using heuristics. The analysis output is stored flattened into `ScanResult` fields and `metadata.competitorMentions`. No separation between raw evidence and derived analysis.

5. No model in the schema represents the concept of "a specific piece of evidence backing a specific claim."

---

## 2. Data Model Design

### Design principles

- Evidence is a first-class entity, not metadata buried in JSON
- Raw LLM output is stored separately from parsed/scored analysis
- Report-to-evidence linking is a proper relational join, not JSON
- Immutability is enforced through status + application-level guards, not database triggers (Prisma does not support triggers, and we want logic in `packages/core`)
- New models extend the existing schema; existing models get additive columns only
- All new models are org-scoped or reachable through org-scoped parents

### Full Prisma schema additions

```prisma
// ─── New Enums ──────────────────────────────────────────────

enum LLMProvider {
  OPENAI
  ANTHROPIC
  GOOGLE
  MANUAL
}

enum EvidenceStatus {
  DRAFT        // Just captured, not yet reviewed
  APPROVED     // Reviewed and accepted -- becomes immutable
  SUPERSEDED   // Replaced by a newer version -- still immutable, still readable
  REJECTED     // Reviewed and discarded -- still immutable for audit trail
}

// ─── Scan execution context ─────────────────────────────────
// Captures the full provenance of a single LLM interaction.
// One per query-per-model-execution. This is the atomic unit of evidence.

model ScanEvidence {
  id             String          @id @default(cuid())
  scanResultId   String
  version        Int             @default(1)

  // ── Provenance: what was asked ──
  promptText     String          @db.Text
  promptVersion  String?                       // e.g. "visibility-probe-v2"

  // ── Provenance: who answered ──
  provider       LLMProvider
  modelName      String                        // e.g. "gpt-4o-2024-08-06"
  modelVersion   String?                       // provider-specific version string
  temperature    Float?
  topP           Float?
  maxTokens      Int?
  systemPrompt   String?         @db.Text      // if a system prompt was used
  parameters     Json?                         // catch-all for other gen params

  // ── Raw output ──
  rawResponse    String          @db.Text      // exact bytes from the LLM, unmodified
  rawTokenCount  Int?                          // tokens in the raw response
  promptTokens   Int?                          // tokens in the prompt
  latencyMs      Int?

  // ── Execution timestamp ──
  executedAt     DateTime                      // when the LLM call completed

  // ── Review state ──
  status         EvidenceStatus  @default(DRAFT)
  approvedAt     DateTime?
  approvedById   String?

  // ── Analyst overlay ──
  analystNotes   String?         @db.Text
  confidenceScore Float?                       // 0.0-1.0, system-assigned
  analystConfidence Float?                     // 0.0-1.0, human-assigned

  // ── Timestamps ──
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  // ── Relations ──
  scanResult     ScanResult      @relation(fields: [scanResultId], references: [id], onDelete: Cascade)
  approvedBy     User?           @relation("EvidenceApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)
  reportLinks    ReportEvidence[]

  @@unique([scanResultId, version])
  @@index([scanResultId])
  @@index([status])
  @@index([provider, modelName])
  @@map("scan_evidence")
}

// ─── Report-to-Evidence join ────────────────────────────────
// Links a specific section/claim in a report to the evidence that supports it.
// This is the provenance chain: report claim -> evidence -> raw LLM output.

model ReportEvidence {
  id              String   @id @default(cuid())
  reportId        String
  scanEvidenceId  String

  // ── Traceability ──
  sectionHeading  String?                     // which report section this supports
  claimText       String?  @db.Text           // the specific claim being backed
  evidenceRole    String?                     // e.g. "primary", "supporting", "counter"
  sortOrder       Int      @default(0)

  createdAt       DateTime @default(now())

  // ── Relations ──
  report          Report        @relation(fields: [reportId], references: [id], onDelete: Cascade)
  scanEvidence    ScanEvidence  @relation(fields: [scanEvidenceId], references: [id], onDelete: Restrict)

  @@unique([reportId, scanEvidenceId, sectionHeading])
  @@index([reportId])
  @@index([scanEvidenceId])
  @@map("report_evidence")
}

// ─── Report-ScanRun join (replaces metadata.scanRunIds) ──────

model ReportScanRun {
  id         String   @id @default(cuid())
  reportId   String
  scanRunId  String
  createdAt  DateTime @default(now())

  report     Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  scanRun    ScanRun  @relation(fields: [scanRunId], references: [id], onDelete: Restrict)

  @@unique([reportId, scanRunId])
  @@index([reportId])
  @@index([scanRunId])
  @@map("report_scan_runs")
}
```

### Modifications to existing models

```prisma
// ─── ScanRun: add structured LLM config ─────────────────────

model ScanRun {
  // ... existing fields unchanged ...

  // ADD these fields:
  provider       LLMProvider?                  // which provider was used for this run
  modelVersion   String?                       // specific model version string
  temperature    Float?                        // default temperature for this run
  scanConfig     Json?                         // full configuration snapshot

  // ADD this relation:
  reportScanRuns ReportScanRun[]

  // existing relations unchanged
}

// ─── ScanResult: add evidence relation ──────────────────────

model ScanResult {
  // ... existing fields unchanged ...

  // ADD this relation:
  evidence       ScanEvidence[]

  // existing relations unchanged
}

// ─── Report: add evidence relations, remove JSON scan refs ──

model Report {
  // ... existing fields unchanged ...

  // ADD these relations:
  evidenceLinks   ReportEvidence[]
  reportScanRuns  ReportScanRun[]

  // NOTE: metadata field STAYS for backward compatibility.
  // New reports stop writing scanRunIds into metadata.
  // Old reports can be lazily migrated.
}

// ─── User: add evidence approval relation ───────────────────

model User {
  // ... existing fields unchanged ...

  // ADD this relation:
  approvedEvidence ScanEvidence[] @relation("EvidenceApprovedBy")
}
```

### Design decisions explained

**Why `ScanEvidence` is a separate model, not columns on `ScanResult`:**
`ScanResult` already serves as the "scored/analyzed result" with computed fields like `visibilityScore`, `sentimentScore`, `mentioned`. These are derived values. The evidence layer captures the raw input/output of the LLM interaction. Keeping them separate means:
- Raw evidence is immutable even if we recompute scores
- A single `ScanResult` can have multiple evidence versions (reruns)
- Storage can be optimized differently (evidence is large, results are small)
- The analysis pipeline (`scan-analysis.ts`) continues to write to `ScanResult` without touching evidence

**Why `version` on `ScanEvidence` instead of a separate version table:**
Versioning is per-result: when you rerun a specific query against a specific model, you get version N+1 of the evidence for that scan result. The `@@unique([scanResultId, version])` constraint enforces this. This is simpler than a version chain table and sufficient for our use case (we expect 1-3 versions per result, not hundreds).

**Why `ReportEvidence` is a join table with `sectionHeading` and `claimText`:**
A report has multiple sections (visibility findings, competitor analysis, citation patterns, etc.). Each section makes specific claims backed by specific evidence. The join table captures which evidence supports which claim. This enables the export page to render "Supporting evidence" per section without post-hoc inference.

**Why `ReportScanRun` replaces `metadata.scanRunIds`:**
The current pattern of storing scan run IDs as JSON inside `metadata` (line 135 of `reports.ts`) provides no referential integrity, no indexing, and no reverse lookup. The join table makes the relationship queryable from both directions: "which scans does this report use?" and "which reports reference this scan?" The `onDelete: Restrict` on `scanRunId` prevents deleting a scan that is referenced by a report.

**Why `onDelete: Restrict` on `ReportEvidence.scanEvidence` and `ReportScanRun.scanRun`:**
Once evidence is linked to a report, deleting it would break provenance. Restrict prevents this. If a scan needs to be removed, the report links must be explicitly cleaned up first.

**Why `LLMProvider` is an enum, not a free string:**
We control which providers we integrate with. An enum makes queries efficient, prevents typos, and documents the supported set. Adding a new provider is a schema migration, but that is the correct forcing function -- adding a provider requires code changes anyway.

**Why no separate `EvidenceAuditLog` table:**
We considered an append-only audit log for every status change. Decided against it for now because:
- The status transitions are simple (DRAFT -> APPROVED, DRAFT -> REJECTED, APPROVED -> SUPERSEDED)
- `approvedAt` + `approvedById` captures the most important transition
- `updatedAt` on `ScanEvidence` captures when the last change happened
- A full audit log can be added later with no schema conflict

---

## 3. Evidence Chain Architecture

### The full provenance chain

```
Report Section Claim
  |
  |  (ReportEvidence join)
  |  - sectionHeading: "Visibility findings"
  |  - claimText: "Acme appears in 45% of evaluated queries"
  |  - evidenceRole: "primary"
  v
ScanEvidence (version=1, status=APPROVED)
  |
  |  - promptText: "You are a senior candidate evaluating..."
  |  - provider: OPENAI
  |  - modelName: "gpt-4o-2024-08-06"
  |  - temperature: 0.7
  |  - rawResponse: "When looking for companies in..."
  |  - executedAt: 2026-03-15T10:23:00Z
  |  - confidenceScore: 0.85
  |
  v
ScanResult (computed/derived)
  |  - visibilityScore: 65
  |  - sentimentScore: 0.3
  |  - mentioned: true
  |  - response: <same text as rawResponse for v1>
  |  - metadata: { competitorMentions: [...] }
  |
  v
Query (the question asked)
  |  - text: "best companies for senior engineers in fintech"
  |  - intent: "employer comparison"
  |
  v
QueryCluster -> RoleProfile -> Client -> Organization
```

### How a report section traces to evidence

When the report says: "Acme Corp appears in roughly two-thirds of evaluated candidate queries (45% mention rate across 30 scenarios)"

The chain is:
1. `Report` -> `ReportEvidence[]` where `sectionHeading = "Visibility findings"`
2. Each `ReportEvidence` -> `ScanEvidence` -> `ScanResult` with `mentioned = true/false`
3. The 45% is computable: count `mentioned=true` / total results across linked evidence
4. Each evidence record has the exact prompt, model, raw response, and timestamp

This means an executive who questions the 45% number can be shown:
- The 30 specific queries asked
- The exact LLM response to each query
- The model and parameters used
- Whether each response mentioned the client
- When each probe was executed

### Reconstruction capability

The `composeReport` function in `packages/core/src/report-composer.ts` currently takes a `ScanComparisonResult` -- an aggregated statistical object. To support evidence linking, the composition pipeline will need to:

1. Receive individual scan results (not just aggregates)
2. Tag each report section with the result IDs that support its claims
3. Emit `ReportEvidence` records alongside the report

The `composeReport` function signature will evolve from:

```typescript
function composeReport(input: ReportInput): ComposedReport
```

to:

```typescript
interface ComposedReportWithEvidence extends ComposedReport {
  evidenceLinks: {
    sectionHeading: string;
    claimText: string;
    scanEvidenceId: string;
    evidenceRole: string;
  }[];
}

function composeReport(input: ReportInputWithEvidence): ComposedReportWithEvidence
```

The `ReportInputWithEvidence` type adds per-result evidence IDs alongside the existing statistical aggregation. This is an additive change -- old callers can omit evidence IDs and get the current behavior.

---

## 4. Immutability Design

### Status machine

```
         create
           |
           v
        ┌──────┐
        │ DRAFT │
        └──┬───┘
           │
     ┌─────┴─────┐
     │            │
     v            v
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │
└──────┬───┘  └──────────┘
       │         (terminal)
       v
┌────────────┐
│ SUPERSEDED │
└────────────┘
   (terminal)
```

### Transition rules

| From | To | Condition | Effect |
|------|-----|-----------|--------|
| DRAFT | APPROVED | User with ADMIN+ role approves | Sets `approvedAt`, `approvedById`. Evidence becomes immutable. |
| DRAFT | REJECTED | User with ADMIN+ role rejects | Evidence becomes immutable. Stays in DB for audit trail. |
| APPROVED | SUPERSEDED | New version of evidence is approved for same scanResult | Old version auto-transitions. Still immutable. |
| APPROVED | DRAFT | **Not allowed** | Cannot un-approve evidence. |
| REJECTED | * | **Not allowed** | Terminal state. |
| SUPERSEDED | * | **Not allowed** | Terminal state. |

### What "immutable" means in practice

Once a `ScanEvidence` record reaches APPROVED, REJECTED, or SUPERSEDED:
- `rawResponse`, `promptText`, `provider`, `modelName`, `temperature`, `parameters`, `executedAt` cannot be modified
- `analystNotes` and `analystConfidence` CAN be modified (these are overlays, not evidence)
- `status` can only transition forward per the machine above

### Enforcement approach

Application-level enforcement in `packages/core`, not database triggers. Specifically:

```typescript
// packages/core/src/evidence.ts (new file)

const IMMUTABLE_STATUSES = ['APPROVED', 'REJECTED', 'SUPERSEDED'] as const;

const IMMUTABLE_FIELDS = [
  'promptText', 'promptVersion', 'provider', 'modelName', 'modelVersion',
  'temperature', 'topP', 'maxTokens', 'systemPrompt', 'parameters',
  'rawResponse', 'rawTokenCount', 'promptTokens', 'latencyMs', 'executedAt',
] as const;

export function validateEvidenceTransition(
  currentStatus: EvidenceStatus,
  targetStatus: EvidenceStatus,
): { valid: boolean; reason?: string }

export function validateEvidenceUpdate(
  currentStatus: EvidenceStatus,
  fieldsBeingUpdated: string[],
): { valid: boolean; reason?: string }
```

All evidence mutations go through these validators. The `recordResult` server action and future automated scan worker both call this logic. This keeps the invariant in `packages/core` where it belongs, not in multiple action files.

### Corrections when evidence is wrong

If approved evidence is found to be incorrect (e.g., the wrong prompt was sent, or the response was corrupted):

1. The evidence stays in APPROVED status -- it represents what actually happened
2. A new `ScanEvidence` record is created for the same `scanResultId` with `version = N+1`
3. The new evidence is reviewed and approved
4. The old evidence auto-transitions to SUPERSEDED
5. Reports that linked to the old evidence can be regenerated with the new evidence

This preserves the audit trail: "we originally captured X, then discovered the issue, and the corrected evidence is Y."

---

## 5. Versioning Strategy

### When scans are rerun

A rerun creates a new `ScanRun` with new `ScanResult` records and new `ScanEvidence`. The old scan run and its evidence are untouched. This is the simplest and most correct approach because:

- Different scan runs may use different models, temperatures, or prompt versions
- A "rerun" is not a correction of the old run -- it is a new observation at a different point in time
- Reports pin to specific scan runs via `ReportScanRun`, so old reports keep their evidence

### Evidence versioning within a scan result

When a single `ScanResult` needs its evidence corrected (not a full rerun):

```
ScanResult (id: "sr_abc")
  |
  +-- ScanEvidence (version: 1, status: SUPERSEDED)
  |     rawResponse: "original response..."
  |     executedAt: 2026-03-15
  |
  +-- ScanEvidence (version: 2, status: APPROVED)
        rawResponse: "corrected response..."
        executedAt: 2026-03-20
```

The `@@unique([scanResultId, version])` constraint ensures version numbers are unique per result. New versions are created by incrementing the max version:

```typescript
// packages/core/src/evidence.ts
export function nextEvidenceVersion(
  existingVersions: { version: number }[]
): number {
  return Math.max(0, ...existingVersions.map(e => e.version)) + 1;
}
```

### How reports reference specific versions

`ReportEvidence` links to `ScanEvidence` by ID, which is version-specific. When a report is generated, it links to the current APPROVED version. If evidence is later superseded, the report still points to the version it was built with.

To regenerate a report with updated evidence, the system:
1. Finds all SUPERSEDED evidence linked to the report
2. Resolves the current APPROVED version for each
3. Regenerates the report with the updated evidence set
4. Creates a new report (or new report version -- see below)

### Report versioning

Reports do not need evidence-style versioning yet. The current `ReportStatus` enum (DRAFT -> REVIEW -> PUBLISHED -> ARCHIVED) is sufficient. A regenerated report creates a new `Report` record. The old report remains for audit purposes.

If report versioning becomes necessary later, the pattern is identical: add a `version` column and a `parentReportId` self-relation. But this adds complexity with no immediate product value.

---

## 6. Storage Considerations

### Size estimates

| Data | Typical size | Volume per scan run | Storage approach |
|------|-------------|---------------------|-----------------|
| Prompt text | 200-500 bytes | 1 per result | Inline `@db.Text` on `ScanEvidence` |
| Raw LLM response | 1-5 KB | 1 per result | Inline `@db.Text` on `ScanEvidence` |
| System prompt | 100-300 bytes | shared across results | Inline `@db.Text` on `ScanEvidence` |
| Generation parameters | 50-200 bytes | 1 per result | `Json` on `ScanEvidence` |
| Analyst notes | 0-2 KB | rare | Inline `@db.Text` on `ScanEvidence` |

For a typical scan run of 30 queries:
- Evidence storage: ~30 results * ~6 KB = ~180 KB per scan run
- Over 100 scan runs: ~18 MB

This is trivially small for Postgres. There is no need for external blob storage at current scale.

### What is indexed vs. stored

**Indexed** (for filtering and queries):
- `scanResultId` -- look up evidence for a result
- `status` -- filter by approval state
- `provider, modelName` -- filter by model
- `scanEvidence.scanResultId + version` -- unique constraint

**Stored but not indexed** (large text, accessed by PK lookup):
- `promptText` -- only read when viewing evidence detail
- `rawResponse` -- only read when viewing evidence detail
- `systemPrompt` -- only read when viewing evidence detail
- `analystNotes` -- only read when viewing evidence detail

### Should raw responses go in a separate table?

**No, not yet.** The argument for separation is that large `Text` columns slow down `SELECT *` queries. But:

1. We never `SELECT *` on `ScanEvidence` -- Prisma queries use `select:` to pick specific fields
2. The raw response is typically 1-5 KB, not 1 MB
3. Postgres TOAST already stores large text values out-of-line transparently
4. Adding a separate `RawResponse` table doubles the join complexity for the most common query pattern (show evidence with raw response)

If raw responses grow beyond 50 KB (e.g., we start storing full conversation threads), we can extract to a `ScanEvidenceBlob` table with no schema change to the main evidence model -- just a new relation.

### The `ScanResult.response` field

Currently, `ScanResult.response` stores the LLM response text. After this change:
- `ScanResult.response` remains as-is for backward compatibility and fast access in the comparison/analysis pipeline
- `ScanEvidence.rawResponse` stores the same text as provenance evidence
- For manual results (current workflow), both are populated from the same input
- For automated results (future), the raw response is captured at the LLM call site, and the `ScanResult.response` may be a processed/trimmed version

This is intentional duplication. The analysis pipeline (`scan-analysis.ts`, `scan-comparison.ts`) reads `ScanResult.response` for scoring. The provenance system reads `ScanEvidence.rawResponse` for audit. They serve different purposes and may diverge as the system matures.

---

## 7. Data Flow Diagram

### Flow 1: Manual scan execution (current workflow, extended)

```
User enters LLM response in record-result form
  |
  v
[apps/web] actions/scans.ts:recordResult
  |
  |  1. Validate input via ManualScanResultSchema
  |  2. Run analyzeResponse() from packages/core
  |  3. Create ScanResult (scores, mentioned, metadata)
  |  4. Create CitationSource[] (from cited domains)
  |  5. NEW: Create ScanEvidence (version=1, status=DRAFT)
  |     - promptText: from Query.text (the question asked)
  |     - provider: MANUAL
  |     - modelName: from ScanRun.model or form input
  |     - rawResponse: the full response text
  |     - executedAt: now()
  |     - confidenceScore: computed from analysis certainty
  |
  v
ScanResult + ScanEvidence stored in DB
```

### Flow 2: Automated scan execution (future, via apps/jobs)

```
Job worker polls for PENDING ScanRuns
  |
  v
[apps/jobs] scan-worker.ts
  |
  |  For each Query in the ScanRun:
  |    1. Build prompt via visibilityProbe() from packages/prompts
  |    2. Call LLM provider API
  |    3. Capture full response + metadata
  |    4. Create ScanEvidence (version=1, status=DRAFT)
  |       - promptText: exact prompt sent
  |       - provider: from ScanRun config
  |       - modelName: from API response headers
  |       - modelVersion: from API response
  |       - temperature, topP, maxTokens: from request
  |       - rawResponse: full API response body
  |       - promptTokens, rawTokenCount: from API usage data
  |       - latencyMs: measured
  |       - executedAt: timestamp of API response
  |    5. Run analyzeResponse()
  |    6. Create ScanResult (derived scores)
  |    7. Create CitationSource[]
  |
  v
ScanResult + ScanEvidence stored in DB
```

### Flow 3: Evidence approval

```
Analyst reviews scan results in dashboard
  |
  v
[apps/web] actions/evidence.ts:approveEvidence (new)
  |
  |  1. Validate user has ADMIN+ role
  |  2. Validate evidence is in DRAFT status
  |  3. Call validateEvidenceTransition() from packages/core
  |  4. Update ScanEvidence: status=APPROVED, approvedAt=now(), approvedById=user.id
  |
  v
ScanEvidence now immutable
```

### Flow 4: Report generation with evidence linking

```
User selects scan runs and triggers report generation
  |
  v
[apps/web] actions/reports.ts:generateReport (modified)
  |
  |  1. Validate input
  |  2. Fetch client, scan results, AND evidence for selected scan runs
  |  3. Verify all linked evidence is APPROVED (or allow DRAFT with warning)
  |  4. Compute ScanComparisonResult (existing logic)
  |  5. Call composeReport() with evidence IDs attached to inputs
  |  6. Transaction:
  |     a. Create Report
  |     b. Create Recommendation[]
  |     c. NEW: Create ReportScanRun[] (replaces metadata.scanRunIds)
  |     d. NEW: Create ReportEvidence[] (per section, linking claims to evidence)
  |
  v
Report + ReportEvidence stored in DB
```

### Flow 5: Report export with provenance

```
User exports report to HTML/PDF
  |
  v
[apps/web] reports/[id]/export/page.tsx (modified)
  |
  |  1. Fetch report with evidenceLinks -> scanEvidence -> scanResult -> query
  |  2. For each section, group linked evidence
  |  3. Render report sections with optional "Supporting evidence" expandables
  |     - Shows: query text, model used, response excerpt, execution date
  |  4. Render provenance footer: "Based on N scan results from [models] on [dates]"
  |
  v
HTML page with embedded evidence chain
```

---

## 8. Migration Strategy

### Phase 1: Schema migration (additive only)

1. Add `ScanEvidence`, `ReportEvidence`, `ReportScanRun` models
2. Add new fields to `ScanRun` (`provider`, `modelVersion`, `temperature`, `scanConfig`)
3. Add new relations to `ScanResult`, `Report`, `User`
4. Run `prisma migrate dev`

This is purely additive. No existing columns are removed or renamed. No existing data is modified.

### Phase 2: Backfill existing data

A one-time migration script creates `ScanEvidence` records for existing `ScanResult` rows:

```typescript
// scripts/backfill-evidence.ts
for each ScanResult:
  create ScanEvidence {
    scanResultId: result.id,
    version: 1,
    promptText: result.query.text,           // best available proxy
    provider: MANUAL,                         // existing results are all manual
    modelName: result.scanRun.model ?? "unknown",
    rawResponse: result.response,
    executedAt: result.createdAt,
    status: APPROVED,                         // grandfather existing data
    approvedAt: now(),
    confidenceScore: null,
  }
```

And creates `ReportScanRun` records from existing `Report.metadata.scanRunIds`:

```typescript
// scripts/backfill-report-scan-runs.ts
for each Report where metadata.scanRunIds exists:
  for each scanRunId in metadata.scanRunIds:
    create ReportScanRun { reportId, scanRunId }
```

### Phase 3: Update write paths

1. Modify `recordResult` in `apps/web/src/app/(dashboard)/actions/scans.ts` to create `ScanEvidence` alongside `ScanResult`
2. Modify `generateReport` in `apps/web/src/app/(dashboard)/actions/reports.ts` to create `ReportScanRun` and `ReportEvidence` records instead of `metadata.scanRunIds`
3. Add new `packages/core/src/evidence.ts` module with validation logic

### Phase 4: Update read paths

1. Modify report detail page to show evidence links
2. Modify report export page to include provenance information
3. Add evidence review UI (approve/reject)

### What NOT to do during migration

- Do NOT remove `ScanResult.response` -- it serves the analysis pipeline
- Do NOT remove `Report.metadata` -- it stores sections, coverPage, and other composed content
- Do NOT remove `ScanRun.model` -- it serves the current manual workflow
- Do NOT rename any existing columns -- this would break running queries

---

## 9. Risks and Tradeoffs

### Risk: Evidence storage growth

**Severity:** Low
**Detail:** At current scale (manual entry, 30 queries per scan), evidence storage is trivial. If automated scanning reaches 100 scans/day * 50 queries * 5 KB, that is 25 MB/day or ~9 GB/year. Postgres handles this easily. If we add multi-model scanning (same query to 3 models), multiply by 3.
**Mitigation:** Monitor evidence table size. Extract `rawResponse` to blob storage only if we exceed 100 GB.

### Risk: Immutability enforcement is application-level only

**Severity:** Medium
**Detail:** Prisma does not support database-level row immutability (no `BEFORE UPDATE` triggers, no `POLICY` support through Prisma). A direct SQL connection could bypass immutability checks.
**Mitigation:** All database access goes through the Prisma client, which goes through our application code. Add a database-level check constraint or trigger as a defense-in-depth measure outside of Prisma if needed for SOC2/compliance. For now, application-level enforcement with tests is sufficient.

### Risk: Report composition refactor

**Severity:** Medium
**Detail:** `composeReport` currently takes aggregated `ScanComparisonResult` data. Adding evidence linking requires passing individual result IDs through the composition pipeline. This touches a large, well-tested function.
**Mitigation:** Make the change additive. `ReportInput` gets an optional `evidenceMap?: Map<string, string[]>` that maps section headings to evidence IDs. The composition function returns evidence links alongside the existing output. Old callers that do not provide the map get current behavior.

### Risk: Backward compatibility with existing reports

**Severity:** Low
**Detail:** Existing reports have `metadata.scanRunIds` but no `ReportScanRun` or `ReportEvidence` records. The report detail and export pages must handle both patterns.
**Mitigation:** The backfill script creates `ReportScanRun` records from existing metadata. `ReportEvidence` links will be empty for old reports -- the UI shows "Evidence provenance not available for reports generated before [date]."

### Risk: Evidence approval bottleneck

**Severity:** Low (for now)
**Detail:** If every scan result requires manual approval before it can be used in a report, this creates a workflow bottleneck for automated scanning.
**Mitigation:** Allow report generation from DRAFT evidence with a warning. Auto-approve evidence from automated scans where the pipeline is deterministic. The `DRAFT -> APPROVED` transition can be batched (approve all results in a scan run).

### Tradeoff: Denormalized response text

**Decision:** `ScanResult.response` and `ScanEvidence.rawResponse` store the same text.
**Cost:** ~2x storage for response text per result.
**Benefit:** The analysis pipeline (`scan-comparison.ts`, `scan-analysis.ts`) continues to read `ScanResult.response` without joining to the evidence table. The evidence table can be optimized independently (e.g., compressed, archived). If `ScanResult.response` is ever trimmed or transformed for display, `rawResponse` preserves the original.

### Tradeoff: No full audit log

**Decision:** Status transitions are tracked via `status`, `approvedAt`, `approvedById`, and `updatedAt` -- not a separate append-only log.
**Cost:** We cannot answer "who changed what, when" for every field edit on evidence.
**Benefit:** Simpler schema, fewer writes. The most important transition (DRAFT -> APPROVED) is fully tracked. If a full audit log is needed for compliance, it can be added as a separate `EvidenceAuditLog` table without modifying the evidence model.

### Tradeoff: `onDelete: Restrict` on evidence references

**Decision:** `ReportEvidence.scanEvidence` uses `onDelete: Restrict`, preventing deletion of evidence that is linked to a report.
**Cost:** Cleanup requires explicit unlinking before deletion.
**Benefit:** Prevents silent data loss. A report that claims "45% mention rate" must always be able to show the evidence. If evidence needs to be removed, the report must be regenerated first.

---

## 10. Implementation Plan

### Recommended phasing

**Phase 1 -- Schema + Backfill (1-2 days)**
- Add Prisma models
- Write and run backfill scripts
- Add `EvidenceStatus` and `LLMProvider` enums to `packages/core/src/schemas.ts`
- Add `packages/core/src/evidence.ts` with transition validation

**Phase 2 -- Write path (2-3 days)**
- Update `recordResult` to create `ScanEvidence`
- Update `generateReport` to create `ReportScanRun`
- Add bulk evidence approval action

**Phase 3 -- Evidence linking in reports (2-3 days)**
- Extend `composeReport` to accept and emit evidence links
- Create `ReportEvidence` records during report generation
- Add evidence link data to report metadata for export

**Phase 4 -- UI (2-3 days)**
- Evidence review UI (approve/reject per scan run)
- Report detail page shows evidence links per section
- Report export includes provenance information

**Phase 5 -- Automation readiness (future)**
- Automated scan worker captures full evidence
- Auto-approval pipeline for deterministic scans
- Multi-model evidence comparison

### Files that will be created or modified

**New files:**
- `packages/core/src/evidence.ts` -- evidence status machine, validation, transition logic
- `packages/core/src/__tests__/evidence.test.ts` -- tests for evidence logic
- `apps/web/src/app/(dashboard)/actions/evidence.ts` -- evidence approval/rejection actions
- `scripts/backfill-evidence.ts` -- one-time migration script

**Modified files:**
- `packages/db/prisma/schema.prisma` -- new models, modified relations
- `packages/core/src/schemas.ts` -- new Zod schemas for evidence operations
- `packages/core/src/index.ts` -- export new evidence module
- `packages/core/src/report-composer.ts` -- accept and emit evidence links
- `apps/web/src/app/(dashboard)/actions/scans.ts` -- create evidence alongside results
- `apps/web/src/app/(dashboard)/actions/reports.ts` -- create ReportScanRun and ReportEvidence
- `apps/web/src/app/(dashboard)/reports/[id]/page.tsx` -- show evidence links
- `apps/web/src/app/reports/[id]/export/page.tsx` -- render provenance in export

**Files that should NOT be modified:**
- `packages/core/src/scan-analysis.ts` -- analysis logic is independent of evidence
- `packages/core/src/scan-comparison.ts` -- comparison logic consumes ScanResult, not evidence
- `packages/core/src/snapshot-composer.ts` -- snapshots are ephemeral, no evidence needed
- `packages/prompts/src/*` -- prompt templates are unchanged; evidence captures their output
