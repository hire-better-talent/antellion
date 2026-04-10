# Report Traceability UI Design

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Frontend

---

## Table of Contents

1. [Context and Constraints](#1-context-and-constraints)
2. [Data Model Analysis](#2-data-model-analysis)
3. [Confidence Tier System](#3-confidence-tier-system)
4. [UI Wireframes (ASCII)](#4-ui-wireframes-ascii)
5. [Component Structure](#5-component-structure)
6. [Data Requirements](#6-data-requirements)
7. [Interaction Design](#7-interaction-design)
8. [Visual Treatment](#8-visual-treatment)
9. [Export Page Handling](#9-export-page-handling)
10. [Integration Notes](#10-integration-notes)

---

## 1. Context and Constraints

### What traceability means here

Every claim in a report is derived from `ScanResult` rows — raw LLM responses for a specific query, with visibility/sentiment scores and citation domains. The report composer (`composeReport()`) translates that data deterministically into narrative sections. The traceability system makes that derivation visible on demand.

The sections in `Report.metadata.sections` do not store references back to the scan results that produced them. The link is implicit:
- `Report.metadata.scanRunIds` → the scan runs used
- Each `ScanRun` has `results[]` → `ScanResult` rows
- Each `ScanResult.queryId` → a `Query` row with its text and `queryClusterId`
- Each section corresponds to a named part of the composed analysis

The UI must join across this chain to surface evidence. The section-level mapping (which results support which section) must be computed at fetch time, not stored in metadata.

### Section-to-evidence mapping

Report sections are generated from `ScanComparisonResult`. The mapping is:

| Report section heading | Underlying evidence |
|---|---|
| Assessment scope and methodology | All query texts, cluster names, scan run metadata |
| Visibility findings | All `ScanResult` rows — `mentioned`, `visibilityScore`, `response` |
| Competitor analysis | `ScanResult.metadata.competitorMentions` per result |
| Citation patterns | `CitationSource` rows joined from all results |
| All recommendations | All results (recommendations are threshold-driven from aggregate data) |

This means: every section can be backed by some or all results. The traceability UI surfaces the most relevant subset — the results that most directly support the specific claim being made.

### Constraints on this design

1. The `ReportSection` type (from `packages/core`) has no `queryIds` or `scanResultIds` field. Backlinks do not exist in stored metadata.
2. Evidence must be fetched lazily — the report page already loads report + recommendations; adding all scan results and citations at page load would be a large join.
3. The export page is print-optimized and server-rendered. It cannot use `useState` or `useEffect`. Evidence there goes in a static appendix.
4. The design must not add fields to `ReportSection` or change `report-composer.ts` — that is backend domain logic. The UI derives evidence from first principles using the scan run IDs stored in `Report.metadata.scanRunIds`.

---

## 2. Data Model Analysis

### Fields used by traceability

**From Report.metadata (already parsed):**
```ts
scanRunIds: string[]  // which scans fed this report
```

**From ScanRun (fetched lazily):**
```ts
id, model, queryCount, completedAt
metadata: { queryClusterIds: string[] }
```

**From ScanResult (fetched lazily on expand):**
```ts
id, queryId, response, visibilityScore, sentimentScore, mentioned, createdAt
metadata: { competitorMentions: CompetitorMentionData[] }
citations: CitationSource[]  // domain, url, title, sourceType
```

**From Query (joined via ScanResult.queryId):**
```ts
id, text, intent, queryClusterId
```

**From QueryCluster (joined via Query.queryClusterId):**
```ts
id, name, intent
```

### What is NOT available

- Which specific results contributed to which section — this is a computed/derived mapping
- Confidence scores per section — these must be derived from the underlying scores
- Any per-finding evidence links — the composer produces narrative, not structured evidence pointers

---

## 3. Confidence Tier System

Confidence is derived from the result data that underlies a finding, not stored as a field. Each section has a different derivation.

### Derivation per section type

**Visibility Findings section:**
- HIGH: `completedQueries >= 20` AND `clientMentionRate` is not borderline (>10pp from a tier boundary)
- MEDIUM: `completedQueries >= 10` OR `clientMentionRate` is within 10pp of a tier boundary
- LOW: `completedQueries < 10` OR scan completion < 80%

**Competitor Analysis section:**
- HIGH: competitor data present for all configured competitors, each with >= 5 results
- MEDIUM: some competitors have sparse data (< 5 results) or some competitors absent from results
- LOW: <= 1 competitor with results, or only 1-2 results per competitor

**Citation Patterns section:**
- HIGH: >= 3 distinct domains cited, gap/shared/exclusive classification has >= 2 citations per domain
- MEDIUM: some domains present but sparse (1-2 citations each)
- LOW: 0 or 1 total citations across all results

**Recommendations:**
- Confidence does not apply per-recommendation. Recommendations inherit the confidence of the sections they address. Display the lowest-confidence relevant section's tier.

### Confidence display rules

```
HIGH    → no asterisk, no caveat in dashboard view
MEDIUM  → badge displayed, tooltip: "Based on moderate evidence volume"
LOW     → badge displayed with warning styling, tooltip: "Limited evidence — findings directional only"
```

---

## 4. UI Wireframes (ASCII)

### 4A. Report detail page — section with traceability trigger

```
┌─────────────────────────────────────────────────────────────────────┐
│  Visibility findings                              [HIGH confidence] │
│─────────────────────────────────────────────────────────────────────│
│  Acme Corp holds a moderate position in AI-driven candidate         │
│  discovery, appearing in roughly two-thirds of the candidate        │
│  queries evaluated in this assessment...                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Assessment scope and methodology                            │  │
│  │  ...                                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│  [v] Evidence supporting this finding  ·  Based on 36 results      │
└─────────────────────────────────────────────────────────────────────┘
```

The trigger row sits inside the Card at the bottom, separated by a hairline. `[v]` is a chevron-right icon that rotates to chevron-down on expand. The count badge is plain text, not a colored Badge component — it should read like a footnote, not a status.

### 4B. Evidence panel — expanded state

```
┌─────────────────────────────────────────────────────────────────────┐
│  Visibility findings                              [HIGH confidence] │
│─────────────────────────────────────────────────────────────────────│
│  Acme Corp holds a moderate position...                             │
│  ...                                                                │
│                                                                     │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│  [^] Evidence supporting this finding  ·  Based on 36 results      │
│                                                                     │
│  ┌──────────────────────────────────────── EVIDENCE PANEL ───────┐ │
│  │ bg-gray-50, left-border: 2px solid brand-200                  │ │
│  │                                                                │ │
│  │  CONTRIBUTING QUERIES                                          │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │ Cluster: Engineering Talent Acquisition                  │  │ │
│  │  │                                                          │  │ │
│  │  │  • "What are the best tech companies to work for..."     │  │ │
│  │  │    Mentioned · Visibility 68 · Sentiment +0.4            │  │ │
│  │  │    Citations: glassdoor.com  linkedin.com                │  │ │
│  │  │    [View full response]                                  │  │ │
│  │  │                                                          │  │ │
│  │  │  • "Which companies offer the best engineering culture?" │  │ │
│  │  │    Not mentioned · Visibility 0 · Sentiment —            │  │ │
│  │  │    Citations: glassdoor.com  blind.com  levels.fyi       │  │ │
│  │  │    [View full response]                                  │  │ │
│  │  │                                                          │  │ │
│  │  │  [Show 6 more results in this cluster]                   │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  Cluster: Compensation Research                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │  • "What does Acme Corp pay software engineers?"         │  │ │
│  │  │    Mentioned · Visibility 45 · Sentiment +0.1            │  │ │
│  │  │    Citations: levels.fyi  glassdoor.com                  │  │ │
│  │  │    [View full response]                                  │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  View all results in scan →  (links to /scans/[scanId])       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 4C. Individual evidence card — full response modal

Clicking "View full response" opens an inline expansion on the row (not a modal). The row expands vertically:

```
  • "What are the best tech companies to work for in NYC for engineers?"
    Mentioned · Visibility 68 · Sentiment +0.4
    Citations: glassdoor.com  linkedin.com

    ┌─────────────────────────────────────────────────────────────┐
    │ RAW RESPONSE                              [Collapse]        │
    │ font-mono, text-xs, bg-white, border border-gray-200,       │
    │ rounded, p-3, max-h-64 overflow-y-auto                      │
    │                                                             │
    │ "When considering top tech employers in NYC for software     │
    │  engineers, several companies stand out. Acme Corp is       │
    │  recognized for its strong engineering culture and          │
    │  competitive compensation packages..."                       │
    │                                                             │
    │ [Show less]                                                 │
    └─────────────────────────────────────────────────────────────┘
```

### 4D. Confidence badge placement

```
Card header row (flex, items-center, justify-between):

  LEFT: section heading text (existing)
  RIGHT: [MEDIUM confidence]  ← new, sits to the left of any existing header actions

Confidence badge styles:
  HIGH    → no badge rendered (clean default)
  MEDIUM  → bg-yellow-50 text-yellow-700 border border-yellow-200  rounded px-2 py-0.5 text-xs
  LOW     → bg-red-50 text-red-700 border border-red-200  rounded px-2 py-0.5 text-xs
             + tooltip: "Based on limited evidence — treat findings as directional"
```

HIGH confidence deliberately renders no badge. Showing "HIGH confidence" on every section adds visual noise and implies the reader needs reassurance. Absence of a warning is the signal.

### 4E. Export page — evidence appendix

```
═══════════════════════════════════════════════════════════════

  APPENDIX A — EVIDENCE SUMMARY

  This section documents the underlying scan data behind each
  section of this report. For detailed LLM response text,
  refer to the Antellion platform.

  ─────────────────────────────────────────────────────────────

  Visibility Findings

  Evidence basis: 36 of 36 queries completed across 3 clusters

  Mention rate: 67% (24 of 36 responses mentioned Acme Corp)
  Avg visibility score: 52/100
  Avg sentiment: +0.3 (slightly positive)

  Query clusters:
    Engineering Talent Acquisition — 12 queries — 8 mentioned (67%)
    Compensation Research          —  8 queries — 6 mentioned (75%)
    Culture and DEI                — 16 queries — 10 mentioned (63%)

  ─────────────────────────────────────────────────────────────

  Competitor Analysis

  Evidence basis: 36 results, 3 competitors tracked

    Apex Cloud   — 28 mentions (78%) — gap: +11pp vs. Acme Corp
    NovaTech     — 24 mentions (67%) — gap: equal
    Brightworks  — 18 mentions (50%) — gap: -17pp vs. Acme Corp

  ─────────────────────────────────────────────────────────────

  Citation Patterns

  Citation gaps (domains cited for competitors but not client):
    glassdoor.com · blind.com · levels.fyi

  Shared sources:
    linkedin.com · techcrunch.com

  Client-exclusive:
    acme-careers.com

═══════════════════════════════════════════════════════════════
```

The export appendix is static — it renders from the data already fetched for the export page (the scan runs and their aggregated comparison) — no lazy loading needed.

---

## 5. Component Structure

All new components live in `apps/web/src/components/` and `apps/web/src/app/(dashboard)/reports/[id]/`. They follow the existing pattern: server components for data fetching, client components for interactive state only.

### 5.1 `EvidencePanel`

```ts
// apps/web/src/components/evidence-panel.tsx
// Client component — manages expanded/collapsed state and lazy data loading

"use client"

interface EvidencePanelProps {
  reportId: string
  sectionHeading: string          // used as the display label and for the fetch key
  sectionType: EvidenceSectionType  // enum — determines which results are surfaced
  scanRunIds: string[]            // from Report.metadata.scanRunIds
  resultCount: number             // pre-computed at page render for the badge
  confidenceTier: ConfidenceTier  // pre-computed at page render
}

type EvidenceSectionType =
  | "visibility"
  | "competitor"
  | "citation"
  | "scope"
  | "recommendation"

type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW"
```

**Behavior:**
- Renders the trigger row in collapsed state
- On click, fetches evidence data via a server action or `fetch()` to a route handler
- Renders `EvidenceResultGroup` components when expanded
- Manages per-result response expansion state

**Where it lives:** `apps/web/src/components/evidence-panel.tsx`

**Composed into:** `DashboardSectionCard` (see 5.3)

### 5.2 `EvidenceResultCard`

```ts
// apps/web/src/components/evidence-result-card.tsx
// Client component — manages expand/collapse of raw response text

"use client"

interface EvidenceResultCardProps {
  queryText: string
  queryIntent: string | null
  mentioned: boolean
  visibilityScore: number | null
  sentimentScore: number | null
  response: string
  citations: Array<{ domain: string; url: string; title: string | null }>
  scanResultId: string            // used to link back to scan detail page
  scanRunId: string               // used to link back to scan detail page
}
```

**Behavior:**
- Renders query text, scores row, citations as domain pills, truncated response
- "View full response" toggles inline raw response expansion
- Links to `/scans/[scanRunId]` for the full scan context

**Where it lives:** `apps/web/src/components/evidence-result-card.tsx`

### 5.3 `EvidenceResultGroup`

```ts
// apps/web/src/components/evidence-result-group.tsx
// Client component — renders a cluster of results with show-more

"use client"

interface EvidenceResultGroupProps {
  clusterName: string
  clusterIntent: string | null
  results: EvidenceResultCardProps[]
  initialVisible?: number         // default: 3
}
```

**Behavior:**
- Shows first `initialVisible` results (default 3)
- "Show N more" button reveals the rest inline
- If only 1-2 results, no show-more needed

### 5.4 `ConfidenceBadge`

```ts
// apps/web/src/components/confidence-badge.tsx
// Server component — pure display, no state

interface ConfidenceBadgeProps {
  tier: "HIGH" | "MEDIUM" | "LOW"
  tooltipText?: string           // optional override; defaults are defined internally
}
```

**Behavior:**
- HIGH: renders null (no badge)
- MEDIUM: renders yellow badge
- LOW: renders red badge with tooltip via `title` attribute (simple, no external dep)

**Where it lives:** `apps/web/src/components/confidence-badge.tsx`

### 5.5 `DashboardSectionCard`

```ts
// apps/web/src/app/(dashboard)/reports/[id]/dashboard-section-card.tsx
// Wraps the existing section display with evidence trigger
// Server component shell; EvidencePanel is the client island inside

interface DashboardSectionCardProps {
  section: ReportSection
  sectionType: EvidenceSectionType
  scanRunIds: string[]
  evidenceCount: number          // pre-computed: total ScanResult count for this section type
  confidenceTier: ConfidenceTier
}
```

This replaces the inline section rendering in `ReportDetailPage`. The existing `DashboardSubsectionView` and `DashboardTableView` components remain unchanged — they are used inside `DashboardSectionCard`.

### 5.6 Route handler for lazy evidence fetch

```ts
// apps/web/src/app/api/reports/[id]/evidence/route.ts
// GET handler — returns evidence data for a section type

// Query params:
//   sectionType: EvidenceSectionType
//   scanRunIds: string (comma-separated)

// Response shape:
interface EvidenceResponse {
  groups: Array<{
    clusterId: string
    clusterName: string
    clusterIntent: string | null
    results: Array<{
      id: string
      queryId: string
      queryText: string
      queryIntent: string | null
      mentioned: boolean
      visibilityScore: number | null
      sentimentScore: number | null
      response: string
      citations: Array<{ domain: string; url: string; title: string | null }>
      scanRunId: string
    }>
  }>
}
```

The route handler is a server-side boundary. It runs a Prisma query, applies the section-type filter logic, and returns JSON. This keeps data access out of the client component.

### 5.7 `computeEvidenceMetadata` (server utility)

```ts
// apps/web/src/lib/evidence-metadata.ts
// Pure function — computes confidence tier and result count for a section type
// Called at page-render time (server component) so the trigger row renders with
// correct badge and count without a round-trip.

interface EvidenceMetadata {
  confidenceTier: ConfidenceTier
  resultCount: number
}

function computeEvidenceMetadata(
  sectionType: EvidenceSectionType,
  comparison: ScanComparisonResult,
): EvidenceMetadata
```

This runs synchronously from the already-fetched `ScanComparisonResult` in the page. No extra DB query needed for the collapsed state.

### 5.8 Export appendix components (server-only)

```ts
// apps/web/src/app/reports/[id]/export/evidence-appendix.tsx
// Server component — static, no client state, print-compatible

interface EvidenceAppendixProps {
  scanRunIds: string[]
  comparison: ScanComparisonResult        // already computed for export page
  clusterBreakdown: QueryThemeBreakdown[] // from report metadata
  clientName: string
}
```

Sub-components within the appendix file (no separate files needed):
- `AppendixVisibilitySection` — query counts, mention rates, cluster breakdown table
- `AppendixCompetitorSection` — entity mention table with gap percentages
- `AppendixCitationSection` — three-column domain table (gaps / shared / exclusive)

---

## 6. Data Requirements

### 6.1 Report detail page — initial load (server component)

**Already fetched (no change):**
```prisma
Report {
  id, title, status, summary, generatedAt, createdAt, metadata
  client { id, name, domain }
  recommendations { * }
}
```

**Additional fetch needed for evidence trigger metadata:**
```prisma
// Fetch the scan runs and compute ScanComparisonResult
// This is needed to compute confidenceTier and resultCount without a full result load.
// The scan runs referenced in Report.metadata.scanRunIds.

ScanRun {
  id, queryCount, resultCount, status, completedAt, metadata
  // No results needed at this point — only aggregate counts
}
```

`computeEvidenceMetadata()` then derives the confidence tier and count from these aggregates. This is a small additional join — only metadata fields, not the full result set.

### 6.2 Evidence panel — lazy load (on expand click)

Triggered by `EvidencePanel` via the route handler at `/api/reports/[id]/evidence`.

```prisma
// Fetch all results for the scan run IDs in the report
ScanResult {
  id, queryId, response, visibilityScore, sentimentScore, mentioned, metadata
  citations { domain, url, title, sourceType }
  query {
    id, text, intent
    queryCluster { id, name, intent }
  }
}
```

**Filter by sectionType:**
- `visibility`: all results (every result contributes to visibility analysis)
- `competitor`: results where `metadata.competitorMentions` is non-empty
- `citation`: results where `citations.length > 0`
- `scope`: no results needed (uses only cluster/query text) — fetch only queries, not responses
- `recommendation`: same as visibility (recommendations derive from full result set)

**Response truncation:** `response` is truncated to 500 characters server-side before sending to the client. The "View full response" expansion shows the full text, fetched in a second call or embedded as a data attribute.

**Full response strategy:** Two options:
1. Always send full response (simple, slightly larger payload — acceptable given infrequency of expand)
2. Truncate to 500 chars in list, full text fetched separately on expand

Option 1 is recommended. Evidence panels are opened deliberately by analysts. The response text is one field. Pagination here would add complexity for no real performance benefit.

### 6.3 Export page — evidence appendix

The export page already fetches `report` with client. Add:
```prisma
ScanRun {
  queryCount, resultCount, status
  // For cluster breakdown:
  metadata  // contains queryClusterIds
}
QueryCluster {
  id, name, intent
  _count { results }  // for per-cluster counts
}
ScanResult {
  // Aggregate only — no raw responses needed for export
  mentioned, visibilityScore, sentimentScore
  citations { domain }
  query { queryClusterId }
}
```

The `ScanComparisonResult` for the export page should already be computed (or can be computed from these). The appendix derives all its numbers from the comparison object — no new logic needed.

---

## 7. Interaction Design

### 7.1 Discovery — how users know evidence is available

The trigger row is always visible as the bottom element inside every section card. It reads:

```
[>] Evidence supporting this finding  ·  Based on 36 results
```

The chevron icon and the underline-on-hover signal interactivity. The word "Evidence" is not greyed out — it is treated as a first-class action, not a footnote. However, it sits below the fold of the card content so the first thing executives see is the report content, not traceability affordances.

For analysts in REVIEW status, this is the primary verification workflow. For clients reading an exported PDF, evidence is only in the appendix — no interactive expand.

### 7.2 Interaction flow

```
Level 0 (always visible):
  Report section heading + ConfidenceBadge
  Section body text
  [collapsed evidence trigger]

Level 1 (click trigger):
  Evidence panel expands below the section body
  Shows: grouped by cluster, each result as a row
  Each row shows: query text, mention/score badges, citation domains
  [View full response] on each row

Level 2 (click "View full response"):
  Response text appears below that result row in a scrollable box
  Font: monospace, smaller
  Max height with scroll

Level 3 (link to scan):
  "View all results in scan →" links to /scans/[scanRunId]
  This opens the existing scan detail page in a new tab
  The scan detail page has the full record-by-record breakdown
```

**Navigation back from Level 1/2:** Click the trigger again to collapse. No back button needed — this is in-place expansion, not navigation.

**Multiple panels open simultaneously:** Allowed. Each section card manages its own `EvidencePanel` state independently. There is no accordion behavior — users may want to compare evidence across sections.

### 7.3 Loading state

The evidence panel shows a loading skeleton when the fetch is in flight:

```
[^] Evidence supporting this finding  ·  Based on 36 results

  ┌──────────────────────────────────────────────────────────────────┐
  │  Loading evidence...                                             │
  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (skeleton lines)      │
  └──────────────────────────────────────────────────────────────────┘
```

The skeleton is plain gray bars (`bg-gray-100 animate-pulse`). Three rows, mimicking a result card. No spinner.

### 7.4 Error state

If the evidence fetch fails:

```
[^] Evidence supporting this finding  ·  Based on 36 results

  ┌──────────────────────────────────────────────────────────────────┐
  │  Could not load evidence. Try again.                             │
  └──────────────────────────────────────────────────────────────────┘
```

Clicking "Try again" re-triggers the fetch. Error state uses `text-red-600`, inline, no full-page error boundaries.

### 7.5 Empty state

If a section has 0 contributing results (edge case for scope section, or reports generated before results existed):

```
[^] Evidence supporting this finding  ·  Based on 0 results

  No underlying scan results are linked to this report.
  Results may have been deleted or the report was created manually.
```

The trigger still renders but the panel shows this message. The `resultCount` badge shows `0 results` so the user knows before clicking.

### 7.6 Print and export behavior

The evidence panel does not appear in the print media. The CSS class `no-print` (already defined in the export page's `<style>` block) is applied to the trigger row and the expanded panel.

The static evidence appendix is added to the export page and is `print-only` — it does not render on screen. The screen view of the export page shows a banner:

```
[Evidence appendix included in print output — showing 3 sections]
```

This banner appears in the toolbar area (already `no-print`) to inform the operator.

---

## 8. Visual Treatment

### 8.1 Confidence badge

```
HIGH:   no badge rendered

MEDIUM: <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium
                      bg-yellow-50 text-yellow-700 border border-yellow-200">
          MEDIUM confidence
        </span>

LOW:    <span class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium
                      bg-red-50 text-red-700 border border-red-200"
              title="Based on limited evidence — treat findings as directional">
          LOW confidence
        </span>
```

These match the priority badge styles already used in the export page (`priorityBadgeClass` in `apps/web/src/app/reports/[id]/export/page.tsx`). Reusing those styles keeps the visual language consistent without new Tailwind classes.

### 8.2 Evidence panel container

```css
/* Panel container */
bg-gray-50
border-l-2 border-brand-200    /* left accent — distinguishes from section body */
mx-6 mb-4 mt-2                 /* inset from card edges */
rounded-r-md
px-4 py-4

/* Header row inside panel */
text-xs font-semibold uppercase tracking-wide text-gray-400
/* e.g., "CONTRIBUTING QUERIES" */
```

The `border-brand-200` left border uses the existing brand color system (already used in `scan-comparison.tsx` for client highlighting). This visually anchors the evidence panel as part of the platform, not external content.

### 8.3 Result card row

```css
/* Each result row */
flex items-start gap-3
py-3
border-b border-gray-100 last:border-0

/* Query text */
text-sm font-medium text-gray-900

/* Score row */
flex items-center gap-2 mt-1
/* Uses existing Badge component with success/warning/default variants */

/* Citation domain pills */
inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700
/* Matches existing citation style in scan-detail page */

/* "View full response" link */
text-xs text-brand-600 hover:text-brand-700 cursor-pointer mt-1
```

### 8.4 Raw LLM response display

```css
/* Response text block */
font-mono
text-xs
leading-relaxed
text-gray-700
bg-white
border border-gray-200
rounded
p-3
mt-2
max-h-64
overflow-y-auto
whitespace-pre-wrap
```

Monospace signals raw data. The gray text on white background in a bordered scroll container communicates "this is a source document, not analysis". `whitespace-pre-wrap` preserves any line breaks in the LLM response.

No syntax highlighting, no copy button in the first version. The response is trusted as-is.

### 8.5 Evidence trigger row

```css
/* Trigger row — bottom of card, above the card's bottom border */
border-t border-gray-100
px-6 py-3
flex items-center justify-between
cursor-pointer
hover:bg-gray-50
transition-colors duration-150

/* Left side */
flex items-center gap-2
text-sm text-gray-500
/* Chevron icon: h-4 w-4, rotates 90deg when open */

/* Right side (count) */
text-xs text-gray-400
```

The trigger row has `hover:bg-gray-50` to signal it is interactive. The full-row click target is intentional — the evidence panel is a primary workflow action for analysts.

### 8.6 Score badges within evidence cards

Use the existing `Badge` component from `@antellion/ui`:

```ts
// Mention status
<Badge variant={mentioned ? "success" : "default"}>
  {mentioned ? "Mentioned" : "Not mentioned"}
</Badge>

// Visibility score
<Badge variant={visibilityScore >= 50 ? "success" : visibilityScore > 0 ? "warning" : "default"}>
  Visibility: {visibilityScore}
</Badge>

// Sentiment score
<Badge variant={sentimentScore > 0 ? "success" : sentimentScore < 0 ? "danger" : "default"}>
  Sentiment: {sentimentScore > 0 ? "+" : ""}{sentimentScore}
</Badge>
```

These match exactly the badge patterns already used in `apps/web/src/app/(dashboard)/scans/[id]/page.tsx`. Consistency here is load-bearing — analysts work across both the scan page and the report page.

---

## 9. Export Page Handling

### 9.1 What changes in the export page

The export page (`apps/web/src/app/reports/[id]/export/page.tsx`) needs one addition: a static evidence appendix rendered after the footer, inside the `@media print` context.

The appendix is always generated if scan run IDs are available in the metadata. It is hidden on screen (class `print-only`).

On-screen, the toolbar shows a note:

```
[Back to report]        [Print / Export]        Evidence appendix: 3 sections
```

The "Evidence appendix: 3 sections" text appears in the no-print toolbar to inform the operator before printing.

### 9.2 What the export page fetches additionally

```ts
// In ReportExportPage server component
// After existing report fetch, add:

const scanRunIds = meta.scanRunIds

const appendixData = scanRunIds.length > 0
  ? await buildEvidenceAppendixData(scanRunIds, report.client.name)
  : null
```

`buildEvidenceAppendixData` is a new utility in `apps/web/src/lib/evidence-appendix.ts`:

```ts
interface EvidenceAppendixData {
  visibility: {
    totalQueries: number
    completedQueries: number
    mentionCount: number
    mentionRate: number
    avgVisibilityScore: number | null
    avgSentimentScore: number | null
    byCluster: Array<{
      clusterName: string
      queryCount: number
      mentionCount: number
      mentionRate: number
    }>
  }
  competitors: Array<{
    name: string
    mentionCount: number
    mentionRate: number
    gapVsClient: number   // percentage points difference (positive = competitor leads)
  }>
  citations: {
    gapDomains: string[]
    sharedDomains: string[]
    clientExclusiveDomains: string[]
  }
}
```

This function runs a single Prisma query joining scan results to clusters, aggregates the data server-side, and returns the typed structure. The `EvidenceAppendix` component renders it as static HTML.

### 9.3 Print layout for the appendix

```css
/* Appendix section — print only */
@media print {
  .evidence-appendix {
    page-break-before: always;
  }
}
```

The appendix always starts on a new page. It uses the same typography scale as the rest of the export document (text-sm, text-xs, font-semibold section headings matching existing subsection styles).

No raw LLM responses in the export — only aggregate statistics and domain lists. Raw responses are too long for print and are analyst-facing, not client-facing.

---

## 10. Integration Notes

### 10.1 What does NOT change

- `ReportSection`, `ReportSubsection`, `ReportTable` types in `packages/core`
- `report-composer.ts` — no new fields, no new metadata written
- `DashboardTableView`, `DashboardSubsectionView` — used unchanged inside `DashboardSectionCard`
- The `Card`, `CardHeader`, `CardBody`, `Badge` components in `@antellion/ui`
- The existing scan detail page (`/scans/[id]/page.tsx`)
- The `ScanComparison` component

### 10.2 File additions (summary)

```
apps/web/src/components/
  confidence-badge.tsx          — ConfidenceBadge (server component)
  evidence-panel.tsx            — EvidencePanel (client component)
  evidence-result-card.tsx      — EvidenceResultCard (client component)
  evidence-result-group.tsx     — EvidenceResultGroup (client component)

apps/web/src/app/(dashboard)/reports/[id]/
  dashboard-section-card.tsx    — DashboardSectionCard (server+client island)

apps/web/src/app/api/reports/[id]/evidence/
  route.ts                      — GET route handler (server)

apps/web/src/app/reports/[id]/export/
  evidence-appendix.tsx         — EvidenceAppendix (server component, print-only)

apps/web/src/lib/
  evidence-metadata.ts          — computeEvidenceMetadata (pure server util)
  evidence-appendix.ts          — buildEvidenceAppendixData (server DB util)
```

### 10.3 Modifications to existing files

```
apps/web/src/app/(dashboard)/reports/[id]/page.tsx
  - Replace inline section map with DashboardSectionCard
  - Fetch scan run metadata to compute evidenceCount + confidenceTier
  - Pass scanRunIds down to EvidencePanel via DashboardSectionCard

apps/web/src/app/reports/[id]/export/page.tsx
  - Fetch appendix data
  - Render EvidenceAppendix after footer
  - Add appendix section count to toolbar
```

### 10.4 Relationship to QA system design

The QA system (`docs/designs/report-qa-system-design.md`) will add `ReportQA`, `QACheckResult`, and `QAFlag` models. Those models reference individual findings and scan results. When the QA system is implemented, `EvidencePanel` can optionally show a `QACheckResult` summary inline — "This finding has 2 QA checks: PASS, PASS" — but this is out of scope here.

The confidence tier in this design is independent of QA status. QA checks verify correctness; confidence tier communicates evidence volume. Both are useful; neither substitutes for the other.

### 10.5 Relationship to analyst workflow design

The traceability UI is most valuable during the `IN_REVIEW` state (proposed analyst workflow). When an analyst is reviewing a report, they will use the evidence panels to verify that the narrative matches the underlying data. This design does not depend on the analyst workflow being implemented — it works with the current `REVIEW` status — but it complements it directly.

### 10.6 Demo readiness considerations

For demo scenarios where scan results may be sparse (fewer than 10 results), the LOW confidence badge will appear on most sections. This is accurate but may be visually noisy in a demo with thin seed data.

Mitigation: seed data should include enough results to produce MEDIUM confidence at minimum (>= 10 results, >= 2 clusters). The confidence tier logic should use realistic thresholds that reflect a minimal-viable scan, not a production scan.

The `resultCount` badge ("Based on N results") is honest. Do not seed fake result counts. If the demo scan has 12 results, show 12. The thresholds are calibrated so 12 results on a real scan is MEDIUM confidence, which is honest and credible.
