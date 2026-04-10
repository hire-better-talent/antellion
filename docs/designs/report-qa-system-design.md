# Report QA System Design

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Quality

---

## Table of Contents

1. [Design Context](#1-design-context)
2. [QA Schema Design](#a-qa-schema-design)
3. [Checklist Structure](#b-checklist-structure)
4. [Core Domain Functions](#c-core-domain-functions)
5. [Zod Schemas](#d-zod-schemas)
6. [Server Actions](#e-server-actions)
7. [UI Requirements](#f-ui-requirements)
8. [Integration with Report Lifecycle](#g-integration-with-report-lifecycle)

---

## 1. Design Context

### What exists today

**Report composition** is deterministic. `composeReport()` in `packages/core/src/report-composer.ts` takes a `ReportInput` (client data + `ScanComparisonResult`) and produces a `ComposedReport` with sections, recommendations, summary, and cover page. The logic uses heuristic scoring from `scan-analysis.ts` and aggregation from `scan-comparison.ts`. No LLM is involved in report text generation today — all narrative is template-driven.

**Report storage** puts the full composed structure into `Report.metadata` as JSON (sections, coverPage, recommendations arrays), while recommendations are also persisted as `Recommendation` rows. The `Report.summary` field stores the executive summary text. This creates a dual-storage pattern: the metadata JSON and the summary field are the two places narrative text lives.

**Report lifecycle** currently has `ReportStatus`: DRAFT, GENERATING, REVIEW, PUBLISHED, ARCHIVED. The `generateReport` action creates reports directly in REVIEW status. `updateReportStatus` allows any-to-any transitions with no guard. There is no QA step, no checklist, no signoff.

**Analyst workflow design** (in `docs/designs/analyst-workflow-design.md`) proposes changing `ReportStatus` to: DRAFT, IN_REVIEW, APPROVED, DELIVERED. The QA system designed here must work with BOTH the current enum and the proposed enum. The design assumes the analyst workflow will land first, but includes fallback notes for the current schema.

**Scoring** is heuristic-only. `scoreVisibility()` produces 0-100 from keyword proximity. `scoreSentiment()` produces -1 to 1 from positive/negative word counts. `computeScanComparison()` aggregates these into `clientMentionRate`, `avgVisibilityScore`, `avgSentimentScore`, and entity-level mention stats. The `mentionTier()` function maps rates to "strong" (>=65%), "moderate" (>=40%), "limited" (>=20%), "minimal" (<20%).

**Key data flows to validate:**

1. `ScanResult.mentioned` (boolean) -> `ScanComparisonResult.clientMentionRate` (count of true / total)
2. `ScanResult.metadata.competitorMentions` (JSON array) -> `EntityMentionStats[]` (aggregated per competitor)
3. `CitationSource.domain` -> `CitationAnalysis.gapDomains` / `clientExclusiveDomains` / `sharedDomains`
4. `ScanComparisonResult` -> `ComposedReport.summary` (mention rate text, tier label, competitor gap)
5. `ScanComparisonResult` -> `ComposedReport.sections` (visibility narrative, competitor table, citation table)
6. `ScanComparisonResult` -> `GeneratedRecommendation[]` (conditional generation based on thresholds)

### What this design adds

A QA layer that sits between report generation and report approval. It provides automated validation of data completeness, evidence integrity, mathematical consistency, and narrative accuracy. It also provides a structured manual review workflow with flagging, signoff, and blocking gates.

### Relationship to analyst workflow design

The analyst workflow design covers the state machine for DRAFT -> IN_REVIEW -> APPROVED -> DELIVERED. This QA design covers WHAT gets checked during the IN_REVIEW state. The two designs are complementary:

- Analyst workflow: WHO can transition, WHEN they can, role guards, audit log
- QA system: WHAT must be verified before transitions succeed, HOW to track verification results

The QA system creates the data that the analyst workflow's IN_REVIEW -> APPROVED transition depends on. Specifically: a report cannot move to APPROVED unless its QA status is PASS or CONDITIONAL_PASS with all warnings acknowledged.

---

## A. QA Schema Design

### New Enums

```prisma
enum QAStatus {
  PENDING        // Checks have not been run yet
  RUNNING        // Automated checks are currently executing
  PASS           // All checks passed, no blocking or warning flags
  CONDITIONAL_PASS // No blocking flags, but warnings exist that need acknowledgment
  FAIL           // At least one blocking flag
}

enum QACheckSeverity {
  BLOCKING       // Must pass for report approval
  WARNING        // Reviewer must acknowledge, does not prevent approval
  INFO           // Logged, does not affect approval
}

enum QACheckOutcome {
  PASS
  FAIL
  WARNING        // Passed with caveats (e.g., "3 of 4 clusters have results" — not all, but enough)
  SKIPPED        // Check was not applicable (e.g., no competitors defined, so competitor checks skipped)
  ERROR          // Check could not execute (runtime error during check)
}

enum QAFlagSeverity {
  BLOCKING       // Prevents report approval until resolved
  WARNING        // Must be acknowledged before approval
  INFO           // Informational, no action required
}

enum QAFlagStatus {
  OPEN           // Flag has been raised
  ACKNOWLEDGED   // Reviewer has seen it and accepted the risk (warnings only)
  RESOLVED       // Issue has been fixed
  DISMISSED      // Flag was invalid or not applicable (with justification)
}

enum QACheckMode {
  AUTOMATED      // Run by the system
  MANUAL         // Completed by a reviewer
}
```

### New Models

```prisma
model ReportQA {
  id            String    @id @default(cuid())
  reportId      String    @unique
  status        QAStatus  @default(PENDING)
  runStartedAt  DateTime?
  runCompletedAt DateTime?
  signedOffById String?
  signedOffAt   DateTime?
  confidence    String?              // LOW, MEDIUM, HIGH — set by reviewer at signoff
  signoffNote   String?   @db.Text   // Reviewer's overall assessment
  version       Int       @default(1) // Incremented on each re-run to track check history
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  report      Report         @relation(fields: [reportId], references: [id], onDelete: Cascade)
  signedOffBy User?          @relation("QASignoff", fields: [signedOffById], references: [id], onDelete: SetNull)
  checks      QACheckResult[]
  flags       QAFlag[]

  @@index([reportId])
  @@index([status])
  @@map("report_qa")
}

model QACheckResult {
  id           String         @id @default(cuid())
  reportQAId   String
  checkKey     String                // e.g., "data.all_queries_have_results"
  category     String                // e.g., "DATA_COMPLETENESS"
  severity     QACheckSeverity
  mode         QACheckMode
  outcome      QACheckOutcome
  detail       String?        @db.Text // Human-readable explanation of result
  expected     String?        @db.Text // What was expected (e.g., "8 queries with results")
  actual       String?        @db.Text // What was found (e.g., "6 queries with results")
  completedById String?               // For manual checks: who completed it
  completedAt  DateTime?
  version      Int            @default(1) // Matches ReportQA.version
  createdAt    DateTime       @default(now())

  reportQA    ReportQA @relation(fields: [reportQAId], references: [id], onDelete: Cascade)
  completedBy User?    @relation("QACheckCompletedBy", fields: [completedById], references: [id], onDelete: SetNull)

  @@unique([reportQAId, checkKey, version])
  @@index([reportQAId])
  @@index([checkKey])
  @@index([outcome])
  @@map("qa_check_results")
}

model QAFlag {
  id            String         @id @default(cuid())
  reportQAId    String
  severity      QAFlagSeverity
  category      String                 // e.g., "CONSISTENCY"
  title         String
  description   String         @db.Text
  affectedSection String?              // Section heading where the issue appears
  checkKey      String?                // Reference to the automated check that raised it, if any
  status        QAFlagStatus   @default(OPEN)
  resolution    String?        @db.Text // Explanation of how it was resolved/dismissed
  raisedById    String?                // User who raised the flag (null for automated)
  resolvedById  String?                // User who resolved/acknowledged/dismissed
  resolvedAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  reportQA   ReportQA @relation(fields: [reportQAId], references: [id], onDelete: Cascade)
  raisedBy   User?    @relation("QAFlagRaised", fields: [raisedById], references: [id], onDelete: SetNull)
  resolvedBy User?    @relation("QAFlagResolved", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([reportQAId])
  @@index([status])
  @@index([severity])
  @@map("qa_flags")
}
```

### Updated User model (additional relations)

```prisma
model User {
  // ... existing fields ...

  qaSignoffs         ReportQA[]      @relation("QASignoff")
  qaChecksCompleted  QACheckResult[] @relation("QACheckCompletedBy")
  qaFlagsRaised      QAFlag[]        @relation("QAFlagRaised")
  qaFlagsResolved    QAFlag[]        @relation("QAFlagResolved")

  // ... existing relations ...
}
```

### Updated Report model (new relation)

```prisma
model Report {
  // ... existing fields ...

  qa ReportQA?

  // ... existing relations ...
}
```

### Design rationale

**ReportQA is 1:1 with Report** via the `@unique` on `reportId`. A report has exactly one QA record. Re-running checks increments `version` and creates new `QACheckResult` rows with the new version number. Old check results are preserved for audit trail.

**`checkKey` + `version` unique constraint** prevents duplicate check results within a single QA run but allows historical tracking across re-runs.

**`signedOffById` is separate from the Report's `reviewerId`** because QA signoff and report review are conceptually different actions that may be performed by the same person but should be trackable independently. In the analyst workflow, `Report.reviewerId` is the person assigned to review the report. `ReportQA.signedOffById` is the person who verified the QA checklist. These will often be the same user, but the data model supports separation.

**`confidence` is a string rather than an enum** because it's a reviewer-supplied assessment, not a computed value. Values are LOW, MEDIUM, HIGH. Storing as string keeps the schema flexible if we need to add a level later. The Zod schema enforces the valid values at the application layer.

**`expected`/`actual` on QACheckResult** enables side-by-side display in the UI: "Expected: mention rate 67% in summary. Found: mention rate 67% in summary." This makes it immediately clear what the check validated.

---

## B. Checklist Structure

### Category 1: DATA_COMPLETENESS

| # | Check Key | Description | Mode | Severity | Validation Logic | Fail Message |
|---|-----------|-------------|------|----------|------------------|--------------|
| 1 | `data.all_queries_have_results` | Every active query in the scan's query clusters has a ScanResult | AUTOMATED | BLOCKING | For each `scanRunId` in `Report.metadata.scanRunIds`: fetch all active `Query` rows from the scan's `queryClusterIds` (from `ScanRun.metadata`). Count queries with a matching `ScanResult` in that scan. Expected: count == total active queries. | `{missing} of {total} queries have no scan results. Missing queries: {list of query texts, max 5}.` |
| 2 | `data.no_pending_or_failed_scans` | All scan runs used by this report are in COMPLETED status | AUTOMATED | BLOCKING | For each `scanRunId` in `Report.metadata.scanRunIds`: check `ScanRun.status === "COMPLETED"`. (Under the analyst workflow design, this becomes `ScanRun.status === "COMPLETE"`.) | `Scan {scanRunId} is in {status} status. All scans must be COMPLETED.` |
| 3 | `data.all_clusters_have_results` | Every query cluster represented in the scan has at least one result | AUTOMATED | WARNING | Group `ScanResult` rows by `query.queryClusterId`. Check that every cluster ID from the scan's `metadata.queryClusterIds` has at least one result. | `Query cluster "{clusterName}" has no scan results. The report may be missing coverage for this intent theme.` |
| 4 | `data.result_count_matches_expected` | The number of scan results matches `ScanRun.queryCount` | AUTOMATED | WARNING | For each scan: `ScanRun.resultCount === ScanRun.queryCount`. Note: a partial match (>= 80%) downgrades to WARNING, below 80% is BLOCKING. | `Scan has {resultCount} results but expected {queryCount}. Completion rate: {pct}%.` |
| 5 | `data.report_has_sections` | The report's metadata contains at least the 3 core sections | AUTOMATED | BLOCKING | Parse `Report.metadata.sections`. Verify array length >= 3. Verify headings include "Visibility findings", "Competitor analysis", "Citation patterns". | `Report is missing required sections. Found: {headings}. Required: Visibility findings, Competitor analysis, Citation patterns.` |
| 6 | `data.report_has_summary` | The report has a non-empty executive summary | AUTOMATED | BLOCKING | `Report.summary !== null && Report.summary.trim().length > 50`. (50 chars is the minimum — a real summary will be hundreds of characters.) | `Report has no executive summary or summary is too short ({length} chars).` |

### Category 2: EVIDENCE_INTEGRITY

| # | Check Key | Description | Mode | Severity | Validation Logic | Fail Message |
|---|-----------|-------------|------|----------|------------------|--------------|
| 7 | `evidence.all_results_have_responses` | Every ScanResult has a non-empty `response` field | AUTOMATED | BLOCKING | For all ScanResult rows in the report's scans: `response.trim().length > 0`. | `{count} scan results have empty responses. Result IDs: {list, max 5}.` |
| 8 | `evidence.all_results_have_visibility_scores` | Every ScanResult has a `visibilityScore` | AUTOMATED | WARNING | For all ScanResult rows: `visibilityScore !== null`. | `{count} scan results are missing visibility scores. This may affect report accuracy.` |
| 9 | `evidence.all_results_have_sentiment_scores` | Every ScanResult has a `sentimentScore` | AUTOMATED | WARNING | For all ScanResult rows: `sentimentScore !== null`. | `{count} scan results are missing sentiment scores.` |
| 10 | `evidence.token_and_latency_recorded` | Automated scan results have tokenCount and latencyMs | AUTOMATED | INFO | For ScanResult rows where `metadata.source !== "manual"`: check `tokenCount !== null && latencyMs !== null`. | `{count} automated scan results are missing token count or latency data.` |
| 11 | `evidence.citations_parsed` | Every ScanResult with cited domains has at least one CitationSource row | AUTOMATED | WARNING | For ScanResult rows where the response text contains URL-like patterns or the metadata indicates citations were provided: check `citations.length > 0`. (Conservative: only flag if the response text contains "http" or "www" patterns but no CitationSource rows exist.) | `{count} scan results appear to reference sources but have no parsed citations.` |

### Category 3: SOURCE_VALIDITY

| # | Check Key | Description | Mode | Severity | Validation Logic | Fail Message |
|---|-----------|-------------|------|----------|------------------|--------------|
| 12 | `source.domains_classified` | Cited domains are classified (not all "Other source") | AUTOMATED | WARNING | Run `classifySourceType()` from `report-composer.ts` on each unique cited domain. Count how many return "Other source". If > 50% are "Other source", flag. | `{pct}% of cited domains are unclassified ("Other source"). Consider classifying: {list, max 5}.` |
| 13 | `source.no_duplicate_citations_per_result` | No ScanResult has duplicate CitationSource domains | AUTOMATED | WARNING | For each ScanResult: group `CitationSource.domain` values. Check for duplicates within the same result. | `{count} scan results have duplicate citation domains. Result IDs: {list, max 5}.` |
| 14 | `source.domain_classification_consistent` | The same domain is classified the same way across all results | AUTOMATED | INFO | For each unique domain across all citations: run `classifySourceType()`. Since this is a pure function of the domain string, it will always return the same result. This check is a guard against future changes where classification might become context-dependent (e.g., if we add per-client classification overrides). Today this always passes. | `Domain "{domain}" classified inconsistently: "{type1}" in {count1} results, "{type2}" in {count2} results.` |

### Category 4: CONSISTENCY

| # | Check Key | Description | Mode | Severity | Validation Logic | Fail Message |
|---|-----------|-------------|------|----------|------------------|--------------|
| 15 | `consistency.summary_mention_rate_matches` | The mention rate stated in the executive summary matches `ScanComparisonResult.clientMentionRate` | AUTOMATED | BLOCKING | Parse the summary text for percentage patterns (e.g., "67%"). Recompute `clientMentionRate` from the scan data. Verify the percentage in the summary matches `Math.round(clientMentionRate * 100)`. (The `pct()` helper uses `Math.round(clamped * 100)`, so the expected value is deterministic.) | `Summary states {summaryPct}% mention rate but computed rate is {computedPct}%.` |
| 16 | `consistency.competitor_names_match_client_setup` | Every competitor named in the report matches the client's competitor list | AUTOMATED | BLOCKING | Extract competitor names from `Report.metadata.sections` (specifically the competitor analysis section's table and body text). Compare against the client's `Competitor` records. Flag any name in the report that does not match a known competitor. Flag any defined competitor that is absent from the report. | `Report mentions "{name}" which is not in the client's competitor list.` OR `Competitor "{name}" is defined for this client but does not appear in the report.` |
| 17 | `consistency.no_phantom_competitors` | No competitor appears in the report that wasn't in the scan data | AUTOMATED | BLOCKING | Extract competitor names from report sections. Compare against `ScanComparisonResult.entityMentions` (non-client entries). Every competitor name in the report must appear in entityMentions. | `Report references competitor "{name}" but no scan data exists for this competitor.` |
| 18 | `consistency.section_tone_alignment` | Visibility section description does not contradict the mention tier | AUTOMATED | WARNING | Compute `mentionTier(clientMentionRate)`. Scan the visibility section body for tier keywords ("strong", "moderate", "limited", "minimal"). Verify the tier keyword used matches the computed tier. (The `composeVisibilitySection` function uses `mentionTier()` directly, so this check catches post-composition edits that break alignment.) | `Visibility section uses "{foundTier}" language but computed mention tier is "{computedTier}" (rate: {rate}).` |
| 19 | `consistency.recommendation_priorities_align` | Recommendation priorities match severity of findings | AUTOMATED | WARNING | If `clientMentionRate < 0.3`, there should be at least one CRITICAL or HIGH recommendation. If `clientMentionRate >= 0.65` and all competitors trail, there should be no CRITICAL recommendations related to visibility. Check: if any citation gap recommendation exists and `gapDomains.length > 3`, the citation gap rec should be HIGH, not MEDIUM. | `Recommendation priorities may not align with findings: {specific mismatch description}.` |

### Category 5: NARRATIVE_ACCURACY

| # | Check Key | Description | Mode | Severity | Validation Logic | Fail Message |
|---|-----------|-------------|------|----------|------------------|--------------|
| 20 | `narrative.percentage_claims_match_data` | Every percentage in the report matches computed data | AUTOMATED | BLOCKING | Regex scan all report sections and summary for patterns like `\d+%`. For each, determine its context: (a) if near the client name, compare against `pct(clientMentionRate)`; (b) if near a competitor name, compare against `pct(that competitor's mentionRate)`; (c) if in a citation context, compare against citation counts. Flag any percentage that cannot be traced back to computed data. Tolerance: exact match only (the `pct()` helper rounds, so there should be no rounding differences). | `Report states "{context}: {claimedPct}%" but computed value is {computedPct}%.` |
| 21 | `narrative.comparative_claims_directionally_correct` | "higher than", "lower than", "ahead of", "leads" claims are directionally correct | AUTOMATED | BLOCKING | Scan report text for comparative phrases: "ahead of {CompetitorName}", "{CompetitorName} leads", "more visible than", "gap vs.". For each, verify the direction matches the data. E.g., if the text says "Apex Cloud leads by 16 percentage points", verify `apexMentionRate > clientMentionRate` and `Math.round((apexRate - clientRate) * 100) === 16`. | `Comparative claim "{claim}" is directionally incorrect. Data shows {actual relationship}.` |
| 22 | `narrative.score_tier_interpretation_correct` | Score interpretations match the scoring tiers | AUTOMATED | WARNING | Find any mention of "strong visibility" / "moderate visibility" / "limited visibility" / "minimal visibility" in the report. Verify it matches `mentionTier(clientMentionRate)`. Similarly, check sentiment descriptions ("positive", "neutral", "negative") against `sentimentWord(avgSentimentScore)`. | `Report says "{description}" but data indicates {computedTier} tier (rate: {rate}).` |
| 23 | `narrative.mention_count_matches` | Stated mention counts (e.g., "mentioned in 4 responses") match data | AUTOMATED | BLOCKING | Parse the report for patterns like "in {N} responses" or "mentioned {N} times" or "{N} of {M}". Compare against the `EntityMentionStats` for the relevant entity. | `Report states "{N} mentions" but computed mention count is {actual}.` |
| 24 | `narrative.executive_summary_reviewed` | Analyst has reviewed the executive summary for accuracy and tone | MANUAL | BLOCKING | Reviewer confirms: (a) the summary accurately represents findings, (b) tone is appropriate for executive audience, (c) no misleading claims, (d) recommendation preview matches actual recommendations. | `Executive summary has not been reviewed by a human analyst.` |

### Category 6: COMPETITIVE_LOGIC

| # | Check Key | Description | Mode | Severity | Validation Logic | Fail Message |
|---|-----------|-------------|------|----------|------------------|--------------|
| 25 | `competitive.all_competitors_in_analysis` | Every competitor defined for the client appears in the competitor analysis section | AUTOMATED | BLOCKING | Fetch client's `Competitor` records. Check that each competitor name appears in the "Competitor analysis" section's body or table. | `Competitor "{name}" is defined for this client but is missing from the competitor analysis section.` |
| 26 | `competitive.mention_rates_from_same_data` | Competitor mention rates are computed from the same scan data | AUTOMATED | BLOCKING | Recompute `computeScanComparison()` from the raw scan results. Compare each entity's `mentionRate` in the recomputed result against the values in the report's competitor table. Tolerance: exact match (both use the same deterministic computation). | `Competitor "{name}" mention rate in report ({reportRate}) does not match recomputed rate ({computedRate}).` |
| 27 | `competitive.gap_calculations_correct` | Gap percentages (e.g., "+16pp") in the competitor table are mathematically correct | AUTOMATED | BLOCKING | For each row in the competitor analysis table: parse the gap column value. Recompute: `Math.round((competitorMentionRate - clientMentionRate) * 100)`. Verify match. | `Gap for "{name}" is stated as {reported}pp but computed gap is {computed}pp.` |
| 28 | `competitive.no_phantom_competitors_in_report` | Report does not mention companies that are not defined competitors or the client | AUTOMATED | WARNING | Scan all report sections for company-like names (capitalized multi-word phrases). Compare against the set of {clientName, ...competitorNames}. Flag any name that appears to be a company reference but is not in the known set. (This is heuristic and may produce false positives, hence WARNING not BLOCKING.) | `Report may reference unknown company "{name}" in section "{section}". Verify this is not a phantom competitor.` |
| 29 | `competitive.report_content_reviewed` | Analyst has reviewed report sections for factual accuracy | MANUAL | BLOCKING | Reviewer confirms: (a) competitor analysis accurately represents the data, (b) citation gaps are correct, (c) recommendations are actionable and defensible. | `Report content has not been verified by a human reviewer.` |

### Summary table

| Severity | Count | Categories |
|----------|-------|------------|
| BLOCKING (automated) | 14 | All 6 categories |
| WARNING (automated) | 11 | All 6 categories |
| INFO (automated) | 2 | EVIDENCE_INTEGRITY, SOURCE_VALIDITY |
| BLOCKING (manual) | 2 | NARRATIVE_ACCURACY, COMPETITIVE_LOGIC |
| **Total** | **29** | |

### Minimum quality threshold

- **PASS**: All BLOCKING checks pass. All WARNING checks pass. Zero open flags.
- **CONDITIONAL_PASS**: All BLOCKING checks pass. Some WARNING checks have non-PASS outcomes, but all warning-level `QAFlag` entries are in ACKNOWLEDGED status. Zero open BLOCKING flags.
- **FAIL**: Any BLOCKING check has outcome FAIL, or any BLOCKING flag is in OPEN status.

A report CAN be approved with `CONDITIONAL_PASS` status. It CANNOT be approved with `FAIL` status.

---

## C. Core Domain Functions

### File structure

```
packages/core/src/qa/
  checks.ts          -- Individual check implementations
  runner.ts          -- Orchestrator that runs all automated checks
  status.ts          -- QA status computation
  validation.ts      -- Checklist completeness validation
  types.ts           -- Shared QA types
  index.ts           -- Barrel export
```

### Types (`packages/core/src/qa/types.ts`)

```typescript
// ─── Enums (mirrors Prisma — keeps core free of @prisma/client) ─

export type QAStatus = "PENDING" | "RUNNING" | "PASS" | "CONDITIONAL_PASS" | "FAIL";
export type QACheckSeverity = "BLOCKING" | "WARNING" | "INFO";
export type QACheckOutcome = "PASS" | "FAIL" | "WARNING" | "SKIPPED" | "ERROR";
export type QAFlagSeverity = "BLOCKING" | "WARNING" | "INFO";
export type QAFlagStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
export type QACheckMode = "AUTOMATED" | "MANUAL";
export type QAConfidence = "LOW" | "MEDIUM" | "HIGH";

// ─── Check definition ─

export interface QACheckDefinition {
  key: string;               // e.g., "data.all_queries_have_results"
  category: string;          // e.g., "DATA_COMPLETENESS"
  severity: QACheckSeverity;
  mode: QACheckMode;
  description: string;       // Human-readable description of what this check validates
}

// ─── Check result ─

export interface QACheckResultData {
  checkKey: string;
  category: string;
  severity: QACheckSeverity;
  mode: QACheckMode;
  outcome: QACheckOutcome;
  detail: string | null;
  expected: string | null;
  actual: string | null;
}

// ─── Flag ─

export interface QAFlagData {
  severity: QAFlagSeverity;
  category: string;
  title: string;
  description: string;
  affectedSection: string | null;
  checkKey: string | null;
}

// ─── Check context ─

/**
 * All data needed to run automated QA checks against a report.
 * The caller (server action) is responsible for fetching this from the database
 * and passing it in. The QA module never touches Prisma directly.
 */
export interface QACheckContext {
  report: {
    id: string;
    summary: string | null;
    metadata: {
      scanRunIds: string[];
      sections: ReportSectionForQA[];
      coverPage: unknown;
      recommendations: ReportRecommendationForQA[];
    };
  };
  client: {
    name: string;
    domain: string;
    competitors: { name: string; domain: string }[];
  };
  scanRuns: {
    id: string;
    status: string;
    queryCount: number;
    resultCount: number;
    metadata: { queryClusterIds?: string[] } | null;
  }[];
  scanResults: {
    id: string;
    scanRunId: string;
    queryId: string;
    response: string;
    visibilityScore: number | null;
    sentimentScore: number | null;
    mentioned: boolean;
    tokenCount: number | null;
    latencyMs: number | null;
    metadata: unknown;
    citations: { domain: string | null; url: string }[];
  }[];
  queries: {
    id: string;
    queryClusterId: string;
    text: string;
  }[];
  queryClusters: {
    id: string;
    name: string;
  }[];
  recommendations: {
    category: string;
    priority: string;
    title: string;
  }[];
}

/** Minimal section shape needed for QA checks. */
export interface ReportSectionForQA {
  heading: string;
  body: string;
  subsections?: {
    heading: string;
    body?: string;
    table?: {
      headers: string[];
      rows: (string | number | null)[][];
    };
    items?: string[];
  }[];
}

/** Minimal recommendation shape from metadata. */
export interface ReportRecommendationForQA {
  category: string;
  priority: string;
  title: string;
  description: string;
}

// ─── Orchestrator output ─

export interface AutomatedCheckResults {
  checks: QACheckResultData[];
  flags: QAFlagData[];
  /** Computed from checks and flags. */
  status: QAStatus;
}
```

### Individual checks (`packages/core/src/qa/checks.ts`)

Each check function takes a `QACheckContext` and returns one or more `QACheckResultData` and optionally `QAFlagData` entries.

```typescript
import type {
  QACheckContext,
  QACheckResultData,
  QAFlagData,
} from "./types";
import { computeScanComparison } from "../scan-comparison";
import { mentionTier, sentimentWord, classifySourceType } from "../report-composer";

type CheckFn = (ctx: QACheckContext) => {
  results: QACheckResultData[];
  flags: QAFlagData[];
};

// ─── DATA_COMPLETENESS ─────────────────────────────────────

export const checkAllQueriesHaveResults: CheckFn = (ctx) => {
  const results: QACheckResultData[] = [];
  const flags: QAFlagData[] = [];

  for (const scan of ctx.scanRuns) {
    const clusterIds = scan.metadata?.queryClusterIds ?? [];
    const activeQueries = ctx.queries.filter(
      (q) => clusterIds.includes(q.queryClusterId),
    );
    const scanResults = ctx.scanResults.filter(
      (r) => r.scanRunId === scan.id,
    );
    const queriesWithResults = new Set(scanResults.map((r) => r.queryId));
    const missing = activeQueries.filter(
      (q) => !queriesWithResults.has(q.id),
    );

    if (missing.length === 0) {
      results.push({
        checkKey: "data.all_queries_have_results",
        category: "DATA_COMPLETENESS",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "PASS",
        detail: `All ${activeQueries.length} queries in scan ${scan.id} have results.`,
        expected: `${activeQueries.length} queries with results`,
        actual: `${activeQueries.length} queries with results`,
      });
    } else {
      const missingTexts = missing
        .slice(0, 5)
        .map((q) => q.text)
        .join("; ");
      results.push({
        checkKey: "data.all_queries_have_results",
        category: "DATA_COMPLETENESS",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "FAIL",
        detail: `${missing.length} of ${activeQueries.length} queries have no scan results. Missing: ${missingTexts}${missing.length > 5 ? "..." : ""}`,
        expected: `${activeQueries.length} queries with results`,
        actual: `${activeQueries.length - missing.length} queries with results`,
      });
      flags.push({
        severity: "BLOCKING",
        category: "DATA_COMPLETENESS",
        title: `Missing results for ${missing.length} queries`,
        description: `Scan ${scan.id} is missing results for ${missing.length} queries. The report may contain incomplete data.`,
        affectedSection: null,
        checkKey: "data.all_queries_have_results",
      });
    }
  }

  return { results, flags };
};

export const checkNoPendingOrFailedScans: CheckFn = (ctx) => {
  const results: QACheckResultData[] = [];
  const flags: QAFlagData[] = [];
  const validStatuses = ["COMPLETED", "COMPLETE"]; // Support both current and proposed enum

  for (const scan of ctx.scanRuns) {
    if (validStatuses.includes(scan.status)) {
      results.push({
        checkKey: "data.no_pending_or_failed_scans",
        category: "DATA_COMPLETENESS",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "PASS",
        detail: `Scan ${scan.id} is in ${scan.status} status.`,
        expected: "COMPLETED",
        actual: scan.status,
      });
    } else {
      results.push({
        checkKey: "data.no_pending_or_failed_scans",
        category: "DATA_COMPLETENESS",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "FAIL",
        detail: `Scan ${scan.id} is in ${scan.status} status. All scans must be COMPLETED.`,
        expected: "COMPLETED",
        actual: scan.status,
      });
      flags.push({
        severity: "BLOCKING",
        category: "DATA_COMPLETENESS",
        title: `Scan ${scan.id} is not complete`,
        description: `Scan is in ${scan.status} status. Reports should only be generated from completed scans.`,
        affectedSection: null,
        checkKey: "data.no_pending_or_failed_scans",
      });
    }
  }

  return { results, flags };
};

export const checkAllClustersHaveResults: CheckFn = (ctx) => {
  // ... Groups results by cluster, verifies each cluster has >= 1 result.
  // Returns WARNING outcome for missing clusters.
  // Pattern matches the two checks above.
};

export const checkResultCountMatchesExpected: CheckFn = (ctx) => {
  // ... Compares ScanRun.resultCount to ScanRun.queryCount.
  // >= 80% -> WARNING, < 80% -> FAIL (severity overridden to BLOCKING).
  // Pattern matches the two checks above.
};

export const checkReportHasSections: CheckFn = (ctx) => {
  const sections = ctx.report.metadata.sections;
  const requiredHeadings = [
    "Visibility findings",
    "Competitor analysis",
    "Citation patterns",
  ];

  const foundHeadings = sections.map((s) => s.heading);
  const missing = requiredHeadings.filter((h) => !foundHeadings.includes(h));

  if (missing.length === 0 && sections.length >= 3) {
    return {
      results: [{
        checkKey: "data.report_has_sections",
        category: "DATA_COMPLETENESS",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "PASS",
        detail: `Report has all ${requiredHeadings.length} required sections plus ${sections.length - requiredHeadings.length} additional sections.`,
        expected: requiredHeadings.join(", "),
        actual: foundHeadings.join(", "),
      }],
      flags: [],
    };
  }

  return {
    results: [{
      checkKey: "data.report_has_sections",
      category: "DATA_COMPLETENESS",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "FAIL",
      detail: `Report is missing required sections: ${missing.join(", ")}. Found: ${foundHeadings.join(", ")}.`,
      expected: requiredHeadings.join(", "),
      actual: foundHeadings.join(", "),
    }],
    flags: [{
      severity: "BLOCKING",
      category: "DATA_COMPLETENESS",
      title: `Missing required report sections`,
      description: `The report is missing: ${missing.join(", ")}. This indicates a report composition failure.`,
      affectedSection: null,
      checkKey: "data.report_has_sections",
    }],
  };
};

export const checkReportHasSummary: CheckFn = (ctx) => {
  const summary = ctx.report.summary;
  if (summary && summary.trim().length > 50) {
    return {
      results: [{
        checkKey: "data.report_has_summary",
        category: "DATA_COMPLETENESS",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "PASS",
        detail: `Executive summary is ${summary.trim().length} characters.`,
        expected: "> 50 characters",
        actual: `${summary.trim().length} characters`,
      }],
      flags: [],
    };
  }

  return {
    results: [{
      checkKey: "data.report_has_summary",
      category: "DATA_COMPLETENESS",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "FAIL",
      detail: `Report has no executive summary or summary is too short (${summary?.trim().length ?? 0} chars).`,
      expected: "> 50 characters",
      actual: `${summary?.trim().length ?? 0} characters`,
    }],
    flags: [{
      severity: "BLOCKING",
      category: "DATA_COMPLETENESS",
      title: "Missing or empty executive summary",
      description: "The report has no executive summary. This is a critical component for executive buyers.",
      affectedSection: "Executive Summary",
      checkKey: "data.report_has_summary",
    }],
  };
};

// ─── CONSISTENCY ────────────────────────────────────────────

export const checkSummaryMentionRateMatches: CheckFn = (ctx) => {
  const summary = ctx.report.summary ?? "";

  // Recompute comparison from raw scan data
  const comparisonInput = ctx.scanResults.map((r) => ({
    mentioned: r.mentioned,
    visibilityScore: r.visibilityScore,
    sentimentScore: r.sentimentScore,
    metadata: r.metadata,
    citations: r.citations,
  }));
  const totalQueries = ctx.scanRuns.reduce((sum, s) => sum + s.queryCount, 0);
  const recomputed = computeScanComparison(
    ctx.client.name,
    comparisonInput,
    totalQueries,
  );

  const expectedPct = Math.round(recomputed.clientMentionRate * 100);

  // Find percentage mentions in summary near client context
  const pctMatches = [...summary.matchAll(/(\d+)%/g)];

  // The first percentage in the summary should be the mention rate
  // (based on how composeSummary works: it leads with "{tier} visibility...({N}% mention rate)")
  const firstPct = pctMatches.length > 0 ? parseInt(pctMatches[0][1], 10) : null;

  if (firstPct === expectedPct) {
    return {
      results: [{
        checkKey: "consistency.summary_mention_rate_matches",
        category: "CONSISTENCY",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "PASS",
        detail: `Summary mention rate (${firstPct}%) matches computed rate (${expectedPct}%).`,
        expected: `${expectedPct}%`,
        actual: `${firstPct}%`,
      }],
      flags: [],
    };
  }

  if (firstPct === null) {
    return {
      results: [{
        checkKey: "consistency.summary_mention_rate_matches",
        category: "CONSISTENCY",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "WARNING",
        detail: "Could not find a percentage in the executive summary to verify.",
        expected: `${expectedPct}%`,
        actual: "No percentage found",
      }],
      flags: [],
    };
  }

  return {
    results: [{
      checkKey: "consistency.summary_mention_rate_matches",
      category: "CONSISTENCY",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "FAIL",
      detail: `Summary states ${firstPct}% mention rate but computed rate is ${expectedPct}%.`,
      expected: `${expectedPct}%`,
      actual: `${firstPct}%`,
    }],
    flags: [{
      severity: "BLOCKING",
      category: "CONSISTENCY",
      title: "Mention rate mismatch in executive summary",
      description: `The executive summary claims a ${firstPct}% mention rate but the recomputed rate from scan data is ${expectedPct}%. This is a critical discrepancy that undermines report credibility.`,
      affectedSection: "Executive Summary",
      checkKey: "consistency.summary_mention_rate_matches",
    }],
  };
};

// ─── COMPETITIVE_LOGIC ──────────────────────────────────────

export const checkGapCalculationsCorrect: CheckFn = (ctx) => {
  const results: QACheckResultData[] = [];
  const flags: QAFlagData[] = [];

  // Recompute comparison
  const comparisonInput = ctx.scanResults.map((r) => ({
    mentioned: r.mentioned,
    visibilityScore: r.visibilityScore,
    sentimentScore: r.sentimentScore,
    metadata: r.metadata,
    citations: r.citations,
  }));
  const totalQueries = ctx.scanRuns.reduce((sum, s) => sum + s.queryCount, 0);
  const recomputed = computeScanComparison(
    ctx.client.name,
    comparisonInput,
    totalQueries,
  );

  // Find the competitor analysis table in sections
  const compSection = ctx.report.metadata.sections.find(
    (s) => s.heading === "Competitor analysis",
  );
  const compTable = compSection?.subsections?.find(
    (s) => s.heading === "Competitive visibility comparison",
  )?.table;

  if (!compTable) {
    results.push({
      checkKey: "competitive.gap_calculations_correct",
      category: "COMPETITIVE_LOGIC",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "SKIPPED",
      detail: "No competitor comparison table found in report.",
      expected: null,
      actual: null,
    });
    return { results, flags };
  }

  const clientRate = recomputed.clientMentionRate;
  const gapColIndex = compTable.headers.indexOf("Gap vs. Client");

  if (gapColIndex === -1) {
    results.push({
      checkKey: "competitive.gap_calculations_correct",
      category: "COMPETITIVE_LOGIC",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "SKIPPED",
      detail: "Competitor table has no 'Gap vs. Client' column.",
      expected: null,
      actual: null,
    });
    return { results, flags };
  }

  let allCorrect = true;
  const mismatches: string[] = [];

  for (const row of compTable.rows) {
    const name = String(row[0] ?? "");
    if (name.includes("(client)")) continue; // Skip client row

    const gapStr = String(row[gapColIndex] ?? "");
    const reportedGap = parseGap(gapStr);
    if (reportedGap === null) continue;

    // Find this competitor's mention rate in recomputed data
    const entity = recomputed.entityMentions.find(
      (e) => !e.isClient && name.includes(e.name),
    );
    if (!entity) continue;

    const computedGap = Math.round((entity.mentionRate - clientRate) * 100);

    if (reportedGap !== computedGap) {
      allCorrect = false;
      mismatches.push(
        `${entity.name}: reported ${reportedGap}pp, computed ${computedGap}pp`,
      );
    }
  }

  if (allCorrect) {
    results.push({
      checkKey: "competitive.gap_calculations_correct",
      category: "COMPETITIVE_LOGIC",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "PASS",
      detail: "All gap calculations in competitor table are mathematically correct.",
      expected: "All gaps match computed values",
      actual: "All gaps match",
    });
  } else {
    results.push({
      checkKey: "competitive.gap_calculations_correct",
      category: "COMPETITIVE_LOGIC",
      severity: "BLOCKING",
      mode: "AUTOMATED",
      outcome: "FAIL",
      detail: `Gap calculation mismatches: ${mismatches.join("; ")}`,
      expected: "All gaps match computed values",
      actual: mismatches.join("; "),
    });
    flags.push({
      severity: "BLOCKING",
      category: "COMPETITIVE_LOGIC",
      title: "Incorrect gap calculations in competitor table",
      description: `The following gap values do not match recomputed data: ${mismatches.join("; ")}. This is a mathematical error that must be corrected.`,
      affectedSection: "Competitor analysis",
      checkKey: "competitive.gap_calculations_correct",
    });
  }

  return { results, flags };
};

/** Parse "+16pp" / "-5pp" / "0pp" into a number. Returns null for "—" or unparseable. */
function parseGap(s: string): number | null {
  const match = s.match(/^([+-]?\d+)pp$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

// ─── Remaining checks follow the same pattern. ─────────────
//
// Each is a named export function with signature CheckFn.
// The runner (below) calls all of them and aggregates results.
//
// Not shown in full to avoid repetition, but each check:
// 1. Extracts the relevant data from QACheckContext
// 2. Performs the validation described in the checklist table
// 3. Returns { results: [...], flags: [...] }
//
// The remaining check functions are:
//
// EVIDENCE_INTEGRITY:
//   checkAllResultsHaveResponses
//   checkAllResultsHaveVisibilityScores
//   checkAllResultsHaveSentimentScores
//   checkTokenAndLatencyRecorded
//   checkCitationsParsed
//
// SOURCE_VALIDITY:
//   checkDomainsClassified
//   checkNoDuplicateCitationsPerResult
//   checkDomainClassificationConsistent
//
// CONSISTENCY:
//   checkCompetitorNamesMatchClientSetup
//   checkNoPhantomCompetitors
//   checkSectionToneAlignment
//   checkRecommendationPrioritiesAlign
//
// NARRATIVE_ACCURACY:
//   checkPercentageClaimsMatchData
//   checkComparativeClaimsDirectionallyCorrect
//   checkScoreTierInterpretationCorrect
//   checkMentionCountMatches
//
// COMPETITIVE_LOGIC:
//   checkAllCompetitorsInAnalysis
//   checkMentionRatesFromSameData
//   checkNoPhantomCompetitorsInReport

/** Registry of all automated checks. */
export const AUTOMATED_CHECKS: CheckFn[] = [
  checkAllQueriesHaveResults,
  checkNoPendingOrFailedScans,
  checkAllClustersHaveResults,
  checkResultCountMatchesExpected,
  checkReportHasSections,
  checkReportHasSummary,
  // ... all remaining automated checks listed above
  checkSummaryMentionRateMatches,
  checkGapCalculationsCorrect,
];

/** Registry of manual check definitions (for UI rendering). */
export const MANUAL_CHECK_DEFINITIONS: QACheckDefinition[] = [
  {
    key: "narrative.executive_summary_reviewed",
    category: "NARRATIVE_ACCURACY",
    severity: "BLOCKING",
    mode: "MANUAL",
    description: "Analyst has reviewed the executive summary for accuracy and tone.",
  },
  {
    key: "competitive.report_content_reviewed",
    category: "COMPETITIVE_LOGIC",
    severity: "BLOCKING",
    mode: "MANUAL",
    description: "Analyst has reviewed report sections for factual accuracy.",
  },
];
```

### Runner (`packages/core/src/qa/runner.ts`)

```typescript
import type { QACheckContext, AutomatedCheckResults, QACheckResultData, QAFlagData } from "./types";
import { AUTOMATED_CHECKS } from "./checks";
import { computeQAStatus } from "./status";

/**
 * Runs all automated QA checks against a report's data.
 *
 * This function is pure — it takes data in, returns results out.
 * The caller is responsible for persisting results to the database.
 *
 * @param ctx All data needed for QA checks, pre-fetched from the database.
 * @returns Check results, flags, and computed overall status.
 */
export function runAutomatedChecks(ctx: QACheckContext): AutomatedCheckResults {
  const allResults: QACheckResultData[] = [];
  const allFlags: QAFlagData[] = [];

  for (const check of AUTOMATED_CHECKS) {
    try {
      const { results, flags } = check(ctx);
      allResults.push(...results);
      allFlags.push(...flags);
    } catch (error) {
      // If a check throws, record it as an ERROR outcome rather than crashing the entire run.
      // This ensures one broken check doesn't prevent all others from running.
      allResults.push({
        checkKey: "unknown", // Will be overwritten if we can determine the check key
        category: "SYSTEM",
        severity: "BLOCKING",
        mode: "AUTOMATED",
        outcome: "ERROR",
        detail: `Check threw an error: ${error instanceof Error ? error.message : String(error)}`,
        expected: null,
        actual: null,
      });
    }
  }

  const status = computeQAStatus(allResults, allFlags);

  return { checks: allResults, flags: allFlags, status };
}
```

### Status computation (`packages/core/src/qa/status.ts`)

```typescript
import type { QACheckResultData, QAFlagData, QAStatus, QAFlagStatus } from "./types";

/**
 * Determines overall QA status from check results and flags.
 *
 * Rules:
 * 1. If ANY blocking check has outcome FAIL or ERROR -> FAIL
 * 2. If ANY flag with severity BLOCKING has status OPEN -> FAIL
 * 3. If all blocking checks pass but there are WARNING-outcome checks
 *    or WARNING-severity flags that are not yet ACKNOWLEDGED -> CONDITIONAL_PASS
 * 4. If all checks pass and no open flags -> PASS
 *
 * Manual checks that haven't been completed yet count as FAIL (they have no result row).
 */
export function computeQAStatus(
  checks: QACheckResultData[],
  flags: QAFlagData[],
  openFlagStatuses?: { severity: string; status: QAFlagStatus }[],
): QAStatus {
  // Check for blocking failures
  const hasBlockingFailure = checks.some(
    (c) => c.severity === "BLOCKING" && (c.outcome === "FAIL" || c.outcome === "ERROR"),
  );

  if (hasBlockingFailure) return "FAIL";

  // Check for open blocking flags
  const hasOpenBlockingFlag = openFlagStatuses?.some(
    (f) => f.severity === "BLOCKING" && f.status === "OPEN",
  );

  if (hasOpenBlockingFlag) return "FAIL";

  // Check for warnings that need acknowledgment
  const hasWarningChecks = checks.some(
    (c) => c.severity === "WARNING" && c.outcome !== "PASS" && c.outcome !== "SKIPPED",
  );

  const hasUnacknowledgedWarningFlags = openFlagStatuses?.some(
    (f) => f.severity === "WARNING" && f.status === "OPEN",
  );

  if (hasWarningChecks || hasUnacknowledgedWarningFlags) return "CONDITIONAL_PASS";

  return "PASS";
}

/**
 * Computes the full QA status including manual check completeness.
 *
 * This is the function used at the approval gate. It checks:
 * 1. All automated checks have been run (checks array is not empty)
 * 2. All manual checks have been completed
 * 3. The status computed from checks + flags
 */
export function computeApprovalReadiness(
  automatedChecks: QACheckResultData[],
  manualChecks: QACheckResultData[],
  flags: { severity: string; status: QAFlagStatus }[],
  requiredManualCheckKeys: string[],
): {
  qaStatus: QAStatus;
  canApprove: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  // Verify automated checks have been run
  if (automatedChecks.length === 0) {
    blockers.push("Automated QA checks have not been run.");
  }

  // Verify all required manual checks are complete
  const completedManualKeys = new Set(
    manualChecks
      .filter((c) => c.outcome === "PASS")
      .map((c) => c.checkKey),
  );

  for (const key of requiredManualCheckKeys) {
    if (!completedManualKeys.has(key)) {
      blockers.push(`Manual check "${key}" has not been completed.`);
    }
  }

  // Compute status from all checks combined
  const allChecks = [...automatedChecks, ...manualChecks];
  const qaStatus = computeQAStatus(allChecks, [], flags);

  // Can approve if status is PASS or CONDITIONAL_PASS and no blockers
  const canApprove =
    blockers.length === 0 &&
    (qaStatus === "PASS" || qaStatus === "CONDITIONAL_PASS");

  if (qaStatus === "FAIL") {
    blockers.push("QA status is FAIL — blocking issues must be resolved.");
  }

  return { qaStatus, canApprove, blockers };
}
```

### Checklist completeness (`packages/core/src/qa/validation.ts`)

```typescript
import type { QACheckResultData, QAFlagStatus } from "./types";
import { MANUAL_CHECK_DEFINITIONS } from "./checks";

/**
 * Validates that all required checks have been addressed before a report can be approved.
 *
 * Returns a list of incomplete items. Empty list means the checklist is complete.
 */
export function validateChecklistComplete(
  automatedCheckResults: QACheckResultData[],
  manualCheckResults: QACheckResultData[],
  openFlags: { id: string; severity: string; status: QAFlagStatus }[],
): string[] {
  const incomplete: string[] = [];

  // 1. Automated checks must have been run
  if (automatedCheckResults.length === 0) {
    incomplete.push("Automated QA checks have not been run.");
  }

  // 2. All manual checks must be completed
  const completedManualKeys = new Set(manualCheckResults.map((c) => c.checkKey));
  for (const def of MANUAL_CHECK_DEFINITIONS) {
    if (!completedManualKeys.has(def.key)) {
      incomplete.push(`Manual check not completed: ${def.description}`);
    }
  }

  // 3. All blocking flags must be resolved
  const openBlockingFlags = openFlags.filter(
    (f) => f.severity === "BLOCKING" && f.status === "OPEN",
  );
  for (const flag of openBlockingFlags) {
    incomplete.push(`Blocking flag #${flag.id} is still open.`);
  }

  // 4. All warning flags must be acknowledged or resolved
  const openWarningFlags = openFlags.filter(
    (f) => f.severity === "WARNING" && f.status === "OPEN",
  );
  for (const flag of openWarningFlags) {
    incomplete.push(`Warning flag #${flag.id} has not been acknowledged.`);
  }

  return incomplete;
}
```

### Barrel export (`packages/core/src/qa/index.ts`)

```typescript
export { runAutomatedChecks } from "./runner";
export { computeQAStatus, computeApprovalReadiness } from "./status";
export { validateChecklistComplete } from "./validation";
export { AUTOMATED_CHECKS, MANUAL_CHECK_DEFINITIONS } from "./checks";
export type {
  QAStatus,
  QACheckSeverity,
  QACheckOutcome,
  QAFlagSeverity,
  QAFlagStatus,
  QACheckMode,
  QAConfidence,
  QACheckDefinition,
  QACheckResultData,
  QAFlagData,
  QACheckContext,
  AutomatedCheckResults,
  ReportSectionForQA,
  ReportRecommendationForQA,
} from "./types";
```

Then `packages/core/src/index.ts` adds:

```typescript
// ─── QA ────────────────────────────────────────────────────
export {
  runAutomatedChecks,
  computeQAStatus,
  computeApprovalReadiness,
  validateChecklistComplete,
  AUTOMATED_CHECKS,
  MANUAL_CHECK_DEFINITIONS,
} from "./qa";
export type {
  QAStatus,
  QACheckSeverity,
  QACheckOutcome,
  QAFlagSeverity,
  QAFlagStatus,
  QACheckMode,
  QAConfidence,
  QACheckDefinition,
  QACheckResultData,
  QAFlagData,
  QACheckContext,
  AutomatedCheckResults,
} from "./qa";
```

---

## D. Zod Schemas

Add to `packages/core/src/schemas.ts`:

```typescript
// ─── QA Enums ──────────────────────────────────────────────

export const QAStatus = z.enum([
  "PENDING",
  "RUNNING",
  "PASS",
  "CONDITIONAL_PASS",
  "FAIL",
]);
export type QAStatusEnum = z.infer<typeof QAStatus>;

export const QACheckSeverity = z.enum(["BLOCKING", "WARNING", "INFO"]);
export type QACheckSeverityEnum = z.infer<typeof QACheckSeverity>;

export const QACheckOutcome = z.enum([
  "PASS",
  "FAIL",
  "WARNING",
  "SKIPPED",
  "ERROR",
]);
export type QACheckOutcomeEnum = z.infer<typeof QACheckOutcome>;

export const QAFlagSeverity = z.enum(["BLOCKING", "WARNING", "INFO"]);
export type QAFlagSeverityEnum = z.infer<typeof QAFlagSeverity>;

export const QAFlagStatus = z.enum([
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
]);
export type QAFlagStatusEnum = z.infer<typeof QAFlagStatus>;

export const QAConfidence = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type QAConfidenceEnum = z.infer<typeof QAConfidence>;

// ─── QA Workflow Schemas ───────────────────────────────────

/** Trigger automated QA checks for a report. */
export const RunQAChecksSchema = z.object({
  reportId: cuid,
});
export type RunQAChecksInput = z.infer<typeof RunQAChecksSchema>;

/** Complete a manual QA check. */
export const CompleteManualCheckSchema = z.object({
  reportQAId: cuid,
  checkKey: z.string().min(1).max(100),
  outcome: QACheckOutcome,
  detail: z.string().max(2000).optional(),
  completedById: cuid,
});
export type CompleteManualCheckInput = z.infer<typeof CompleteManualCheckSchema>;

/** Raise a QA flag (manual or from automated check). */
export const CreateQAFlagSchema = z.object({
  reportQAId: cuid,
  severity: QAFlagSeverity,
  category: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  affectedSection: z.string().max(255).optional(),
  checkKey: z.string().max(100).optional(),
  raisedById: cuid.optional(),
});
export type CreateQAFlagInput = z.infer<typeof CreateQAFlagSchema>;

/** Resolve, acknowledge, or dismiss a QA flag. */
export const ResolveQAFlagSchema = z.object({
  flagId: cuid,
  status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]),
  resolution: z
    .string()
    .min(1, "A resolution note is required")
    .max(5000),
  resolvedById: cuid,
});
export type ResolveQAFlagInput = z.infer<typeof ResolveQAFlagSchema>;

/** Sign off on QA for a report. */
export const SignoffQASchema = z.object({
  reportQAId: cuid,
  signedOffById: cuid,
  confidence: QAConfidence,
  note: z.string().max(5000).optional(),
});
export type SignoffQAInput = z.infer<typeof SignoffQASchema>;
```

### Schema design rationale

**`ResolveQAFlagSchema` requires a `resolution` note for ALL resolution types**, including ACKNOWLEDGED. This is intentional for a $10K+ report: every acknowledgment of a warning should have a written justification. "I acknowledge this warning because..." creates an audit trail.

**`CompleteManualCheckSchema` uses `QACheckOutcome`**, which includes PASS, FAIL, WARNING, SKIPPED, ERROR. A manual check can FAIL (reviewer identifies an issue) or PASS (reviewer confirms). This creates a flag automatically if the outcome is FAIL.

**`SignoffQASchema` is separate from flag resolution**. Signoff is the final step: the reviewer has reviewed all checks and flags, and is now putting their name on the QA record. The `confidence` field is required because it forces the reviewer to make an explicit judgment about the overall quality level.

---

## E. Server Actions

### New actions file: `apps/web/src/app/(dashboard)/actions/qa.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@antellion/db";
import {
  validate,
  RunQAChecksSchema,
  CompleteManualCheckSchema,
  CreateQAFlagSchema,
  ResolveQAFlagSchema,
  SignoffQASchema,
  runAutomatedChecks,
  computeApprovalReadiness,
  MANUAL_CHECK_DEFINITIONS,
} from "@antellion/core";
import type { QACheckContext, QACheckResultData } from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { getOrganizationId } from "@/lib/auth";
```

#### `runReportQA(reportId: string): Promise<ActionState>`

1. Validate `reportId` with `RunQAChecksSchema`.
2. Verify report exists and belongs to the current organization (org scoping via `client.organizationId`).
3. Verify report is in REVIEW or IN_REVIEW status (not DRAFT, not already PUBLISHED/DELIVERED).
4. Fetch all data needed for `QACheckContext`:
   - Report (summary, metadata)
   - Client (name, domain, competitors)
   - ScanRuns (from `metadata.scanRunIds`)
   - ScanResults (from those scans, with citations)
   - Queries (from scan cluster IDs)
   - QueryClusters
   - Recommendations
5. Upsert `ReportQA` record (create if not exists, update if re-running):
   - If re-running: increment `version`, set status to RUNNING, clear signoff fields.
6. Call `runAutomatedChecks(ctx)`.
7. In a transaction:
   - Delete old `QACheckResult` rows for this QA record with the old version (or keep them; version field distinguishes).
   - Create new `QACheckResult` rows from the results.
   - Create `QAFlag` rows from the flags (only for NEW flags not already present from a previous run).
   - Update `ReportQA.status` from the computed status.
   - Set `runCompletedAt`.
8. `revalidatePath` for the report QA page.

#### `completeManualCheck(formData: FormData): Promise<ActionState>`

1. Validate with `CompleteManualCheckSchema`.
2. Verify the `reportQAId` exists and belongs to a report in the current org.
3. Verify the `checkKey` is a valid manual check key (exists in `MANUAL_CHECK_DEFINITIONS`).
4. Create or update `QACheckResult` row:
   - `checkKey`, `category` from definition, `severity` from definition, `mode: "MANUAL"`, `outcome` from input, `completedById`, `completedAt: now()`, `version` matching current `ReportQA.version`.
5. If outcome is FAIL: auto-create a `QAFlag` with severity BLOCKING, referencing this check.
6. Recompute `ReportQA.status` using `computeApprovalReadiness()`.
7. `revalidatePath`.

#### `createQAFlag(formData: FormData): Promise<ActionState>`

1. Validate with `CreateQAFlagSchema`.
2. Verify `reportQAId` belongs to a report in the current org.
3. Create `QAFlag` row.
4. Recompute `ReportQA.status`.
5. `revalidatePath`.

#### `resolveQAFlag(formData: FormData): Promise<ActionState>`

1. Validate with `ResolveQAFlagSchema`.
2. Verify flag exists and belongs to a report in the current org.
3. Verify flag is currently OPEN (cannot re-resolve).
4. Update `QAFlag`: set `status`, `resolution`, `resolvedById`, `resolvedAt: now()`.
5. Recompute `ReportQA.status`.
6. `revalidatePath`.

#### `signoffQA(formData: FormData): Promise<ActionState>`

1. Validate with `SignoffQASchema`.
2. Verify the QA record exists and belongs to a report in the current org.
3. Run `computeApprovalReadiness()` to verify all checks are addressed.
4. If there are blockers: return error with the blocker list.
5. If ready: update `ReportQA`: set `signedOffById`, `signedOffAt: now()`, `confidence`, `signoffNote`.
6. `revalidatePath`.

### Changes to existing actions

#### `apps/web/src/app/(dashboard)/actions/reports.ts`

**`generateReport`**: After creating the report, also create a `ReportQA` record in `PENDING` status within the same transaction. This ensures every report has a QA record from birth.

```typescript
// Inside the transaction, after creating the report:
await tx.reportQA.create({
  data: {
    reportId: r.id,
    status: "PENDING",
  },
});
```

**`updateReportStatus`**: Add a guard for the REVIEW -> PUBLISHED transition (or IN_REVIEW -> APPROVED under the analyst workflow). Before allowing the transition:

```typescript
if (targetStatus === "PUBLISHED" || targetStatus === "APPROVED") {
  const qa = await prisma.reportQA.findUnique({
    where: { reportId: id },
    include: {
      flags: { where: { status: "OPEN" } },
    },
  });

  if (!qa) throw new Error("QA record not found. Run QA checks first.");
  if (qa.status === "FAIL") throw new Error("Cannot approve: QA status is FAIL.");
  if (qa.status === "PENDING") throw new Error("Cannot approve: QA checks have not been run.");
  if (!qa.signedOffById) throw new Error("Cannot approve: QA has not been signed off.");
  if (qa.flags.some((f) => f.severity === "BLOCKING")) {
    throw new Error("Cannot approve: there are open blocking flags.");
  }
}
```

---

## F. UI Requirements for the Review Experience

### QA Tab on Report Detail Page

Location: `apps/web/src/app/(dashboard)/reports/[id]/qa/page.tsx` (new route, or embedded as a tab within the existing report detail page).

#### Layout

```
+------------------------------------------------------------------+
| Report: AI Employer Visibility Assessment - Meridian Tech         |
| Status: IN_REVIEW  |  QA: CONDITIONAL_PASS  |  [Run QA Checks]   |
+------------------------------------------------------------------+
|                                                                    |
| QA Summary                                                         |
| ┌────────────────────────────────────────────────────────────────┐ |
| │ Status: CONDITIONAL_PASS    Checks: 25/27 pass, 2 warnings    │ |
| │ Flags: 0 blocking, 2 warning (1 acknowledged, 1 open)         │ |
| │ Signed off: Not yet                                             │ |
| └────────────────────────────────────────────────────────────────┘ |
|                                                                    |
| ┌─ Data Completeness ──────────────────────────────────────────┐  |
| │ [PASS] All queries have results               (6/6 queries)  │  |
| │ [PASS] No pending or failed scans             (1/1 complete)  │  |
| │ [WARN] All clusters have results    "Hiring" cluster: 0 res  │  |
| │ [PASS] Result count matches expected           (6/8 = 75%)    │  |
| │ [PASS] Report has sections                     (4 sections)   │  |
| │ [PASS] Report has summary                      (847 chars)    │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                    |
| ┌─ Evidence Integrity ──────────────────────────────────────────┐ |
| │ [PASS] All results have responses                              │ |
| │ [PASS] All results have visibility scores                      │ |
| │ [WARN] All results have sentiment scores      (1 missing)     │ |
| │ [INFO] Token and latency recorded              (all manual)    │ |
| │ [PASS] Citations parsed                                        │ |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                    |
| ... (remaining categories) ...                                     |
|                                                                    |
| ┌─ Manual Checks ──────────────────────────────────────────────┐  |
| │ [ ] Executive summary reviewed             [Complete Check]    │  |
| │ [ ] Report content reviewed                [Complete Check]    │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                    |
| ┌─ Flags (2) ──────────────────────────────────────────────────┐  |
| │ [WARNING] [ACKNOWLEDGED] Missing cluster results               │  |
| │   "Hiring" cluster has 0 results. Ack: "Intentionally           │  |
| │   excluded — no hiring process queries in scope."               │  |
| │                                                                  │  |
| │ [WARNING] [OPEN] 1 result missing sentiment score              │  |
| │   [Acknowledge] [Resolve] [Dismiss]                             │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                    |
| ┌─ Signoff ────────────────────────────────────────────────────┐  |
| │ Confidence: [LOW] [MEDIUM] [HIGH]                               │  |
| │ Note: ________________________________________________          │  |
| │ [Sign Off]                                                      │  |
| └──────────────────────────────────────────────────────────────┘  |
+------------------------------------------------------------------+
```

#### Interactions

1. **Run QA Checks button**: Calls `runReportQA`. Disabled if QA is already RUNNING. Shows a spinner while running. After completion, page refreshes to show results.

2. **Check result display**: Each check shows:
   - Outcome badge: green check (PASS), red X (FAIL), yellow triangle (WARNING), gray skip (SKIPPED), red exclamation (ERROR)
   - Check description
   - Expected vs actual in muted text
   - Detail text on expansion (click to expand)

3. **Manual check completion**: Each manual check has a "Complete Check" button that opens a small form:
   - Outcome dropdown: PASS / FAIL
   - Detail text area (required for FAIL, optional for PASS)
   - Submit button

4. **Flag management**: Each flag shows:
   - Severity badge (red BLOCKING, yellow WARNING, gray INFO)
   - Status badge (OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED)
   - Title and description
   - Affected section (if set)
   - Resolution actions (buttons):
     - ACKNOWLEDGE (warning flags only): opens a form with required justification text
     - RESOLVE: opens a form with required resolution description
     - DISMISS: opens a form with required dismissal justification
   - For BLOCKING flags: only RESOLVE is available (cannot acknowledge or dismiss a blocking issue)

5. **Add flag button**: Opens a form to manually create a flag:
   - Severity dropdown
   - Category dropdown (matching the 6 QA categories)
   - Title
   - Description
   - Affected section (optional, dropdown of section headings)

6. **Signoff form**: Available only when:
   - All automated checks have been run
   - All manual checks are completed
   - All blocking flags are resolved
   - All warning flags are acknowledged or resolved
   - Confidence selector (LOW / MEDIUM / HIGH)
   - Note text area
   - Sign Off button

7. **Side-by-side data verification**: For consistency and narrative checks, the detail view should show:
   - Left column: what the report says (quoted text from the section)
   - Right column: what the data shows (recomputed value)
   - This helps the reviewer quickly verify claims without switching between the report view and the QA view.

### Report Detail Page Changes

The existing report detail page at `apps/web/src/app/(dashboard)/reports/[id]/page.tsx` needs:

1. **QA status badge** next to the report status badge. Shows the QA status (PENDING, RUNNING, PASS, CONDITIONAL_PASS, FAIL) with appropriate color coding.

2. **QA link**: "View QA" link/button that navigates to the QA sub-page.

3. **Publish button guard**: The "Publish" button (or "Approve" under the analyst workflow) should be disabled if:
   - QA status is FAIL or PENDING
   - QA has not been signed off
   - There are open blocking flags

   Display a tooltip explaining why the button is disabled.

### Report List Page Changes

The reports list page should show QA status alongside report status, so reviewers can quickly see which reports need QA attention. Add a QA status column/badge to the report list table.

---

## G. Integration with Report Lifecycle

### Lifecycle: Current Schema (DRAFT -> GENERATING -> REVIEW -> PUBLISHED -> ARCHIVED)

```
DRAFT  ──────────>  GENERATING  ──────────>  REVIEW  ──────────>  PUBLISHED
                                                |                      |
                                    [QA record created]          [Only if QA
                                    [QA status: PENDING]          PASS or
                                                |               CONDITIONAL_PASS
                                    [Run automated checks]       and signed off]
                                    [QA status: PASS/COND/FAIL]
                                                |
                                    [Complete manual checks]
                                    [Resolve/acknowledge flags]
                                    [Signoff QA]
                                                |
                                    [Approve -> PUBLISHED]
```

In practice today, `generateReport` creates reports directly in REVIEW status, skipping DRAFT and GENERATING. So the QA record is created at the same time as the report, in the `generateReport` transaction.

### Lifecycle: Analyst Workflow Schema (DRAFT -> IN_REVIEW -> APPROVED -> DELIVERED)

```
DRAFT  ──────────>  IN_REVIEW  ──────────>  APPROVED  ──────────>  DELIVERED
  |                     |                       |
  |            [QA record created or           [Only if QA
  |             already exists from DRAFT]      PASS or
  |                     |                     CONDITIONAL_PASS
  |            [Run automated checks]          and signed off]
  |            [QA status: PASS/COND/FAIL]
  |                     |
  |            [Complete manual checks]
  |            [Resolve/acknowledge flags]
  |            [Signoff QA]
  |                     |
  |            [Approve -> APPROVED]
  |
  [QA can optionally be run during DRAFT
   for early feedback, but signoff is
   blocked until IN_REVIEW]
```

### When are automated checks run?

1. **Automatically on DRAFT -> IN_REVIEW transition** (or on report creation if created directly in REVIEW). The `submitForReview` action (or `generateReport` under current schema) triggers `runReportQA` after persisting the report.

2. **Manually re-runnable** at any time while the report is in IN_REVIEW status. The reviewer can click "Run QA Checks" to re-run after fixing issues. Each re-run increments the `ReportQA.version` and creates a fresh set of `QACheckResult` rows.

3. **NOT automatically re-run on data changes**. If scan results are edited or re-captured (per the analyst workflow), QA does not auto-invalidate. The reviewer must manually re-run. This is intentional: auto-invalidation would create confusing UX where QA status flickers. The explicit re-run keeps the reviewer in control.

### What triggers manual review?

Manual review is always required. The two manual checks (`narrative.executive_summary_reviewed` and `competitive.report_content_reviewed`) are BLOCKING, meaning the report cannot be approved without a human analyst confirming they've read the content.

### How does QA status affect DRAFT -> IN_REVIEW?

QA does NOT block the DRAFT -> IN_REVIEW transition. A report can enter review with QA status PENDING. The QA checks run during or after the transition.

However: the IN_REVIEW -> APPROVED transition IS blocked by QA. This is the gate.

### Can a report be approved with warnings?

Yes. A report with QA status `CONDITIONAL_PASS` can be approved, provided:
1. All BLOCKING checks pass.
2. All warning-level QA flags have been acknowledged (status = ACKNOWLEDGED, with a justification note).
3. All manual checks are completed with PASS outcome.
4. The reviewer has signed off with a confidence rating.

### What happens if QA finds issues after a report was already in review?

The report stays in IN_REVIEW status. The issues are recorded as QA flags. The reviewer works through them:
- For blocking issues: the report cannot be approved until the issue is resolved. Resolution may require regenerating the report (if the data is wrong) or fixing the underlying scan data.
- For warnings: the reviewer can acknowledge them with justification and proceed.

If the underlying data changes (e.g., a scan result is re-captured), the reviewer should re-run QA checks. The system does not auto-invalidate QA status, but the reviewer can see the `runCompletedAt` timestamp and compare it to data modification timestamps to judge whether a re-run is needed.

### Can a report go BACK from IN_REVIEW to DRAFT?

Under the analyst workflow design: yes (revision requested). When a report goes back to DRAFT:
- The QA record is preserved but its status resets to PENDING.
- Signoff is cleared (signedOffById, signedOffAt set to null).
- Existing check results and flags are preserved for reference (they have a version number).
- When the report returns to IN_REVIEW, QA checks must be re-run (new version).

### Sequence diagram: happy path

```
Analyst                  System                  Reviewer
  |                        |                        |
  |-- generateReport() --->|                        |
  |                        |-- create Report        |
  |                        |-- create ReportQA      |
  |                        |   (PENDING)            |
  |                        |-- runAutomatedChecks() |
  |                        |-- store results/flags  |
  |                        |-- update QA status     |
  |                        |                        |
  |                        |<-------- review -------|
  |                        |                        |
  |                        |-- completeManualCheck  |
  |                        |   (summary reviewed)   |
  |                        |                        |
  |                        |-- completeManualCheck  |
  |                        |   (content reviewed)   |
  |                        |                        |
  |                        |-- resolveQAFlag        |
  |                        |   (acknowledge warning)|
  |                        |                        |
  |                        |-- signoffQA            |
  |                        |   (HIGH confidence)    |
  |                        |                        |
  |                        |-- updateReportStatus   |
  |                        |   (PUBLISHED/APPROVED) |
  |                        |-- [gate check: QA OK]  |
  |                        |-- transition succeeds  |
  |                        |                        |
```

### Sequence diagram: failure path

```
Analyst                  System                  Reviewer
  |                        |                        |
  |-- generateReport() --->|                        |
  |                        |-- create Report        |
  |                        |-- create ReportQA      |
  |                        |-- runAutomatedChecks() |
  |                        |-- QA status: FAIL      |
  |                        |   (blocking: mention   |
  |                        |    rate mismatch)      |
  |                        |                        |
  |                        |<-------- review -------|
  |                        |                        |
  |                        |   (sees FAIL status,   |
  |                        |    blocking flag)      |
  |                        |                        |
  |                        |-- tries to approve --->|
  |                        |-- REJECTED: QA FAIL    |
  |                        |                        |
  |<---- fix data ---------|                        |
  |                        |                        |
  |-- re-run QA ---------->|                        |
  |                        |-- runAutomatedChecks() |
  |                        |-- QA status: PASS      |
  |                        |                        |
  |                        |-- complete manual      |
  |                        |   checks               |
  |                        |-- signoff QA           |
  |                        |-- approve succeeds     |
  |                        |                        |
```

---

## Implementation Notes

### Implementation order

1. **Schema first**: Add the Prisma models. Run migration.
2. **Core domain logic**: Implement `packages/core/src/qa/` — types, checks, runner, status, validation. This is pure TypeScript with no database dependency.
3. **Unit tests**: Write tests for every automated check against synthetic `QACheckContext` data. This is the most important test layer. The existing `report-composer.test.ts` provides a good pattern — use `makeComparison()` style helpers to build test contexts.
4. **Server actions**: Implement `apps/web/src/app/(dashboard)/actions/qa.ts`. Add the QA gate to `updateReportStatus`.
5. **UI**: Build the QA tab. This can be incremental — start with a read-only checklist view, then add flag management, then signoff.

### Critical design decision: recomputation vs. snapshot

The automated checks RECOMPUTE `computeScanComparison()` from raw scan results and compare the output against what's in the report. This is the safest approach: it catches any drift between stored report content and actual data. The alternative — trusting the stored metadata and only checking for structural completeness — would miss the most dangerous class of bug: correct structure with wrong numbers.

The cost is that `runAutomatedChecks` requires the full scan result set. For a report with 50 queries and 3 competitors, this is ~150 ScanResult rows — small enough that performance is not a concern.

### Risk: metadata JSON parsing

The report's sections, recommendations, and cover page are stored as `Report.metadata` JSON. The QA checks parse this JSON to extract tables, percentages, and competitor names. If the JSON structure changes (e.g., the `report-composer.ts` output format evolves), the QA checks will break.

Mitigation: The `QACheckContext.report.metadata` type is explicit about the expected shape. Type the metadata parsing in one place (the server action that builds the `QACheckContext`), not in individual checks. If the shape changes, there's one place to update.

### Risk: regex-based narrative checks

Checks like `narrative.percentage_claims_match_data` and `narrative.comparative_claims_directionally_correct` use regex to parse natural language. These are inherently brittle. Mitigations:
1. The report text is template-generated (not LLM-generated), so the patterns are predictable.
2. If a regex can't find the expected pattern, the check returns SKIPPED (not FAIL).
3. When/if report text becomes LLM-generated, these checks need to be rewritten to use structured data comparison instead of text parsing.

### Test coverage requirements

The QA module itself needs the highest test coverage in the codebase. Recommended test structure:

```
packages/core/src/__tests__/qa/
  checks/
    data-completeness.test.ts
    evidence-integrity.test.ts
    source-validity.test.ts
    consistency.test.ts
    narrative-accuracy.test.ts
    competitive-logic.test.ts
  runner.test.ts
  status.test.ts
  validation.test.ts
```

Each check test should cover:
- Happy path (all data valid, check passes)
- Failure case (specific defect, check catches it)
- Edge case (missing data, null values, empty arrays)
- SKIPPED case (check is not applicable given the data)

The `status.test.ts` should cover all combinations of blocking/warning/info outcomes that produce PASS, CONDITIONAL_PASS, and FAIL.
