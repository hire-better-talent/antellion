# Roadmap: Per-Segment Reporting

**Status:** Proposed
**Author:** Architect
**Date:** 2026-04-01
**Priority:** High (required for enterprise clients with multi-market hiring)

---

## Problem

Enterprise companies hire across fundamentally different talent markets. Home Depot hires Software Engineers (competing with Google, Meta), Retail Store Managers (competing with Walmart, Target), Supply Chain roles (competing with Amazon, FedEx), and Corporate functions (competing with every large employer). Each market has different AI visibility, different competitor dynamics, and different remediation paths.

The current report pipeline merges all selected scans into a single flat analysis. When an operator selects five scans covering five role types, the report produces one blended earned visibility rate, one set of competitor rankings, and one remediation plan. The result is meaningless: "Home Depot has 25% AI visibility" obscures the fact that retail visibility is 42% and tech visibility is 3%.

The operator already runs scans with different `focusArea` values (e.g., "Software Engineer", "Retail Store Manager"). The data exists to segment -- the pipeline just doesn't use it.

---

## Current state

### What exists

- **`ScanRun.focusArea`** (`String?`) captures the role category when the operator creates a scan. The UI exposes this field in the create-scan form. It is stored on the report as `assessmentParameters.focusArea`, but only the first scan's value is used.
- **`generateReport` action** fetches all selected scans, fetches their APPROVED results, and passes the full result set through one call to `computeJourneyAnalysis()` and one call to `buildJourneyMetadata()`. The output is stored as flat top-level keys in `Report.metadata`.
- **`computeJourneyAnalysis()`** takes a `StageComparisonInput` with a flat `results` array. It has no concept of segments. Its output (`JourneyAnalysis`) is a single analysis object.
- **`buildJourneyMetadata()`** takes a single `JourneyAnalysis` and produces a single `JourneyMetadataOutput`. It builds one competitor matrix, one remediation plan, one set of themes.
- **`JourneyReportRenderer`** reads `JourneyMetadata` from `report.metadata` and renders one linear report. There is no segment detection logic.
- **`Report.metadata`** is a `Json?` column. It currently stores: `scanRunIds`, `sections`, `coverPage`, `recommendations`, `confidence`, `journeyAnalysis`, `clientName`, `clientOverallRate`, `competitors`, `remediationPlan`, `visibilityBoundary`, `assessmentParameters`, `overallThemes`.
- **Competitor model** is scoped to `Client`, not to any role or segment concept. All scans for a client share the same competitor set.

### What is missing

1. No grouping logic in `generateReport` -- all results go through one analysis pass regardless of `focusArea`.
2. No per-segment storage in `Report.metadata`.
3. No cross-segment comparative summary.
4. No segment-aware rendering in `JourneyReportRenderer`.
5. The report generation form does not show `focusArea` on scan checkboxes, so the operator cannot see which scans map to which segment.

---

## Design

### 1. Data flow changes in `generateReport`

**Current:**
```
selectedScans → fetchAllResults → computeJourneyAnalysis(allResults) → buildJourneyMetadata(analysis) → storeInMetadata
```

**Proposed:**
```
selectedScans → groupByFocusArea → for each segment:
  fetchSegmentResults → computeJourneyAnalysis(segmentResults) → buildJourneyMetadata(segmentAnalysis)
→ computeCrossSegmentSummary(allSegmentAnalyses)
→ storeInMetadata (per-segment + cross-segment)
```

**Grouping rule:** Group `ScanRun` records by their `focusArea` value using case-insensitive, trimmed comparison. Scans with `null` or empty `focusArea` are grouped into a single unnamed segment with the label "General". If every scan in the selection has the same `focusArea` (or all are null), no segment array is created -- the report is a single-segment report, identical to today's behavior.

**Threshold for segmentation:** Segments are created only when the selected scans produce 2 or more distinct `focusArea` groups. This preserves backward compatibility: single-focus reports remain unchanged.

**Per-segment computation:** Each segment runs its own independent pipeline:
- `computeScanComparison()` on segment results only
- Per-theme breakdown from segment results only
- `computeJourneyAnalysis()` on segment results only
- `generateStageRecommendations()` from segment journey + segment comparison
- `detectVisibilityBoundary()` from segment discovery results only
- `buildJourneyMetadata()` from all segment outputs
- `computeFindingConfidence()` on segment results only

The existing top-level analysis (today's flat output) is also computed, using all results across all segments. This becomes the "overall" analysis and ensures backward compatibility for renderers that do not understand segments.

### 2. Report metadata structure

The metadata shape extends the current structure with two new optional keys:

```typescript
// Report.metadata (JSON column)
{
  // ── Existing keys (preserved, always populated) ──
  scanRunIds: string[];
  journeyAnalysis: { ... };       // overall / blended analysis
  clientName: string;
  clientOverallRate: number;
  competitors: [...];
  remediationPlan: { ... };
  visibilityBoundary?: { ... };
  assessmentParameters: { ... };  // uses first scan's params (current behavior)
  overallThemes?: { ... };
  sections: [...];
  coverPage: { ... };
  recommendations: [...];
  confidence: { ... };

  // ── NEW: per-segment data (present only when 2+ segments exist) ──
  segments?: Array<{
    name: string;               // "Software Engineer", "Retail Store Manager"
    scanRunIds: string[];       // which scans belong to this segment
    journeyAnalysis: { ... };   // same shape as top-level journeyAnalysis
    clientOverallRate: number;  // segment-specific overall mention rate
    competitors: [...];         // same shape as top-level competitors
    remediationPlan: { ... };   // same shape as top-level remediationPlan
    visibilityBoundary?: { ... };
    overallThemes?: { ... };
    assessmentParameters: {     // segment-specific params
      aiModel: string;
      queryDepth: string;
      focusArea: string;
      queryCount: number;
      scanCount: number;
      assessmentDate: string;
    };
    confidence: { ... };
  }>;

  // ── NEW: cross-segment comparative summary ──
  crossSegmentSummary?: {
    segmentCount: number;
    strongestSegment: {
      name: string;
      earnedVisibilityRate: number;
      earnedVisibilityTier: string;
    };
    weakestSegment: {
      name: string;
      earnedVisibilityRate: number;
      earnedVisibilityTier: string;
    };
    // Platforms that are citation gaps across ALL segments
    commonGaps: string[];
    // Per-segment unique gaps (platforms that are gaps in this segment but not others)
    segmentSpecificGaps: Array<{
      segment: string;
      gaps: string[];
    }>;
    // One-sentence narrative for the executive summary
    summaryNarrative: string;
  };
}
```

**Key design decisions:**

1. **Each segment entry uses the same shape as the top-level journey data.** This means `JourneyMetadataOutput` (from `journey-metadata-builder.ts`) is reused directly. No new types needed for segment content -- only the wrapper array and `crossSegmentSummary` are new types.

2. **Top-level keys are always populated** with the blended/overall analysis. This ensures backward compatibility: any renderer that does not understand `segments` still renders a valid (though blended) report.

3. **`segments` and `crossSegmentSummary` are optional.** Null/absent means single-segment report.

### 3. Cross-segment summary computation

New function in `packages/core`, likely `src/decision-journey/cross-segment-summary.ts`:

```typescript
interface SegmentSummaryInput {
  name: string;
  earnedVisibilityRate: number;
  earnedVisibilityTier: string;
  gapDomains: string[];        // all gap domains across all stages
  overallPositioning: string;
}

interface CrossSegmentSummary {
  segmentCount: number;
  strongestSegment: { name: string; earnedVisibilityRate: number; earnedVisibilityTier: string };
  weakestSegment: { name: string; earnedVisibilityRate: number; earnedVisibilityTier: string };
  commonGaps: string[];
  segmentSpecificGaps: Array<{ segment: string; gaps: string[] }>;
  summaryNarrative: string;
}

function computeCrossSegmentSummary(
  clientName: string,
  segments: SegmentSummaryInput[],
): CrossSegmentSummary;
```

The `summaryNarrative` is a deterministic template-driven sentence, not LLM-generated:
- `"[Client] has strong AI visibility for [strongest] hiring ([rate] earned discovery) but is nearly invisible for [weakest] talent ([rate] earned discovery)."`
- Handles edge cases: all segments similar, only 2 segments, etc.

### 4. Renderer changes

**Detection logic in `JourneyReportRenderer`:**

```typescript
const hasSegments = meta.segments && meta.segments.length > 1;
```

**When `hasSegments` is true:**

1. **Cross-segment executive summary** renders at the top, before any per-segment content. Shows `crossSegmentSummary.summaryNarrative`, a segment comparison table (segment name, earned visibility rate, tier, critical gap stage), and common platform gaps.

2. **Per-segment sections** render sequentially, each as a self-contained report section with a segment header. Each segment contains the full journey report structure: Executive Decision Page, Discovery Visibility, Competitive Evaluation, Candidate Commitment, Citation Ecosystem, Recommended Actions. The existing rendering logic for a single analysis can be extracted into a `SegmentReportSection` component and called once per segment.

3. **The print/export layout** uses page breaks between segments and starts the cross-segment summary on page 1 (after the cover page).

**When `hasSegments` is false:** Current behavior unchanged.

**Component extraction:** The bulk of `JourneyReportRenderer` (currently ~2300 lines) already computes its sections from `meta.journeyAnalysis`, `meta.competitors`, and `meta.remediationPlan`. Extract this into a `JourneySegmentContent` component that takes those three inputs. The outer `JourneyReportRenderer` either calls it once (single segment) or loops over `meta.segments` calling it once per segment.

### 5. Frontend type changes

Add to `journey-types.ts`:

```typescript
export interface SegmentData {
  name: string;
  scanRunIds: string[];
  journeyAnalysis: JourneyMetadata["journeyAnalysis"];
  clientOverallRate: number;
  competitors: JourneyCompetitorData[];
  remediationPlan: JourneyMetadata["remediationPlan"];
  visibilityBoundary?: JourneyMetadata["visibilityBoundary"];
  overallThemes?: JourneyMetadata["overallThemes"];
  assessmentParameters?: JourneyMetadata["assessmentParameters"];
  confidence?: unknown;
}

export interface CrossSegmentSummary {
  segmentCount: number;
  strongestSegment: { name: string; earnedVisibilityRate: number; earnedVisibilityTier: string };
  weakestSegment: { name: string; earnedVisibilityRate: number; earnedVisibilityTier: string };
  commonGaps: string[];
  segmentSpecificGaps: Array<{ segment: string; gaps: string[] }>;
  summaryNarrative: string;
}

// Extend JourneyMetadata
export interface JourneyMetadata {
  // ... existing fields ...
  segments?: SegmentData[];
  crossSegmentSummary?: CrossSegmentSummary;
}
```

### 6. Executive summary changes

The `composeReport()` function (which produces the `summary` text stored on the Report record) needs a multi-segment path:

- **Single segment:** Current behavior. Summary leads with earned visibility rate.
- **Multi-segment:** Summary leads with the cross-segment narrative, then lists each segment's earned visibility tier in one sentence each. The full per-segment detail lives in metadata, not in the summary text.

### 7. Per-segment competitor sets

**Decision: Use the client's full competitor set for all segments.** Different competitors will naturally surface in different segments based on scan result data. The competitor matrix already computes per-competitor rates from scan metadata -- when a competitor is mentioned 0 times in a segment's queries, it simply shows 0% and is sorted to the bottom.

**Why not per-segment competitor configuration:**
- The `Competitor` model is scoped to `Client`. Adding segment-scoping would require a join table (SegmentCompetitor) or a nullable segment FK on Competitor -- both add schema complexity.
- The operator already controls which competitors matter per segment implicitly through query design. If retail queries never mention Google, Google's mention rate in the retail segment is 0%, which correctly tells the executive that Google is not a retail competitor.
- Per-segment competitors can be added later (Phase 3) if clients explicitly request it, without breaking the metadata structure.

**What does change:** The per-segment competitor matrix will naturally filter to only show competitors with non-zero mention rates in that segment's data. The renderer should sort competitors by segment-specific threat level, not overall threat level.

### 8. Query generation implications

No changes needed. The operator already generates queries per role category by running query generation multiple times with different job category inputs. Each scan run gets its `focusArea` set at creation time. The grouping happens at report generation, not at scan creation.

### 9. Report generation form changes

The form needs to show `focusArea` on each scan checkbox so the operator can see how scans will be grouped. This is a minor UI change:

- Fetch `focusArea` in the scan query on the generate page (currently not selected)
- Display it as a badge or label next to each scan option: `"March 31, 2026 -- Software Engineer -- 24/30 queries answered"`
- Optionally: group scan checkboxes by `focusArea` in the form UI to make segment composition visible before generation

### 10. Schema implications

**No Prisma schema changes required.** Everything is handled through:
- Existing `ScanRun.focusArea` field (already populated by the scan form)
- Existing `Report.metadata` JSON column (extended with optional `segments` and `crossSegmentSummary` keys)

This is a deliberate choice. Adding a first-class `Segment` or `AssessmentSegment` model would create coupling between segments and scan runs that constrains future flexibility. The `focusArea` string is the segment key -- simple, flexible, and already populated.

**When to reconsider:** If we need segment-specific competitor sets, segment-specific content assets, or segment-level access control, that's the trigger to introduce a first-class `AssessmentSegment` model. Per the existing enterprise scaling decision, this threshold has not been reached.

---

## Implementation phases

### Phase 1: Per-segment analysis and storage

**Scope:** Backend only. No renderer changes yet.

1. Add grouping logic in `generateReport`: group scans by `focusArea`, run per-segment pipeline, store `segments` array in metadata.
2. Extract the per-segment pipeline from the current inline code in `generateReport` into a reusable function (e.g., `computeSegmentAnalysis()` in `packages/core`). This function takes a segment's results, client context, and competitors, and returns the full `JourneyMetadataOutput` + confidence data for that segment. The current inline code in `generateReport` is a direct extraction target.
3. Compute `crossSegmentSummary` from the per-segment outputs.
4. Continue populating top-level keys with blended analysis for backward compatibility.
5. Update the generate form to display `focusArea` on scan checkboxes.

**Validation:** Generate a multi-segment report, inspect `Report.metadata` in the database to confirm segments are populated correctly.

### Phase 2: Per-segment rendering

**Scope:** Frontend renderer changes.

1. Extract the core rendering logic from `JourneyReportRenderer` into a `JourneySegmentContent` component.
2. Add segment detection logic to `JourneyReportRenderer`.
3. Build `CrossSegmentSummary` component for the comparative header.
4. Loop over segments, rendering `JourneySegmentContent` for each with segment-specific headers.
5. Update `journey-types.ts` with `SegmentData` and `CrossSegmentSummary` types.
6. Handle print mode: page breaks between segments, cross-segment summary on first page.

**Validation:** Generate a multi-segment report and verify the rendered output shows per-segment sections with independent analyses.

### Phase 3: Per-segment competitor sets (deferred)

Only build if clients explicitly request segment-specific competitor configuration. Design would likely be:
- Add `segmentHint` field to `Competitor` model (nullable string matching `focusArea` values)
- Filter competitors per segment during report generation
- Fall back to full competitor set when `segmentHint` is null

---

## Risks and tradeoffs

1. **Report generation time increases linearly with segment count.** Each segment runs the full analysis pipeline. For 5 segments, that is 5x the computation. Mitigation: the pipeline is CPU-bound (no LLM calls), so 5x is still under 2 seconds. Monitor if this becomes an issue.

2. **Metadata size growth.** Each segment adds a full `JourneyMetadataOutput` to the JSON column. For 5 segments with 4 stages each, this is roughly 5x the current metadata size. Postgres JSON columns handle this comfortably, but monitor column size if reports grow to 10+ segments.

3. **Blended top-level analysis may confuse operators.** The overall blended analysis (for backward compat) will still show in any renderer that does not understand segments. This is acceptable: the blended numbers are correct, just less useful than per-segment numbers.

4. **`focusArea` is free text.** "Software Engineer" and "Software Engineering" would create two segments. Mitigation: normalize in the grouping logic (case-insensitive, trimmed). Long-term: consider a constrained set of segment labels per client.

5. **Renderer extraction is the largest risk.** `JourneyReportRenderer` is ~2300 lines. Extracting `JourneySegmentContent` is a significant refactor. Mitigation: Phase 1 (backend) ships independently and is validated without renderer changes. Phase 2 can be approached incrementally by first extracting the component with no behavior change, then adding the segment loop.

---

## What this does NOT cover

- **Per-segment query generation.** The operator already handles this manually by running query generation multiple times. Automating "generate queries for all segments in one pass" is a separate feature.
- **Segment-scoped content assets.** Content assets are per-client today. Per-segment content asset mapping would be a schema change (FK from ContentAsset to a segment concept).
- **Time-series segment tracking.** Comparing segment visibility across assessments over time. Requires a separate "assessment history" feature.
- **Segment auto-detection from query content.** The system relies on operator-assigned `focusArea` values. Inferring segments from query text or cluster names is a possible future enhancement.
