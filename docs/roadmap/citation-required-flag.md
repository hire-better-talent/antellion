# Roadmap: Citation Required Flag

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** Medium (improves evidence quality and report defensibility)

---

## Problem

Some AI responses have no citations -- no URLs, no platform name references, no source attributions. These tend to be generic, synthesized filler that the AI produced from parametric memory rather than grounding in specific sources. The operator currently has to decide on their own whether to include these uncited results, with no systemic guidance or tracking.

This matters because:
1. Uncited results are less defensible in executive reports. A claim like "AI says your brand perception is strong" backed by a Glassdoor-cited response is credible. The same claim backed by a response with no attribution is speculative.
2. The QA pipeline has a `sourceCitationsPresent` check that warns when the citation rate falls below 50% of mentioned results. But this check fires at report generation time -- too late. The operator needs the signal during scan recording so they can flag weak results before they propagate into the report.
3. There is no way to filter or downweight uncited results during report composition. The `report-composer.ts` treats all APPROVED results equally.

---

## Requirements

### R1: Compute `hasCitations` during result recording

When a scan result is recorded (via the `recordResult` server action), after running `analyzeResponse` and `extractCitationsFromResponse`, compute a boolean `hasCitations` flag:

```typescript
const hasCitations = citations.length > 0;
```

Where `citations` is the array of `CitationSource` records created for this result (from user-entered domains) OR the `ExtractedCitation[]` from `extractCitationsFromResponse` run against the response text itself.

The flag should be `true` if EITHER:
- The operator provided at least one cited domain, OR
- `extractCitationsFromResponse(responseText)` found at least one citation (URL or known platform name)

This means even if the operator forgot to enter domains, the auto-extraction catches platform references in the response text. Conversely, if the operator entered domains but the response text contains no extractable references, `hasCitations` is still `true` because the operator attested to the sources.

### R2: Store the flag on `ScanResult`

Add a `hasCitations` field to the `ScanResult` Prisma model:

```prisma
model ScanResult {
  // ... existing fields ...
  hasCitations Boolean @default(false)
}
```

This is a computed, denormalized field. It could be derived by counting related `CitationSource` records, but a direct boolean is faster for filtering and avoids a join in every query that needs citation status. The tradeoff is that it must be kept in sync when citations are added/removed after initial recording. Since citations are currently only set at recording time and never modified, this is safe for now.

**Migration:** Add the column with `@default(false)`. Backfill existing results: `UPDATE scan_results SET has_citations = EXISTS (SELECT 1 FROM citation_sources WHERE scan_result_id = scan_results.id)`. This is a single query, safe on current data volume.

### R3: Show citation warning during scan recording

In the scan recording UI, after the operator submits a result, if `hasCitations` is `false`:

- Display a non-blocking warning: "No sources detected in this response. Results without citations are less defensible in the report."
- The warning should appear inline on the result card (not a toast or modal). It persists as a visual indicator on the result -- a small warning icon or muted text line.
- The operator can proceed without taking action. This is informational, not blocking.

Additionally, when displaying the expanded result card on the scan detail page, show a "No citations" badge alongside the existing mention/visibility badges when `hasCitations` is `false`.

### R4: Filtering by citation status

On the scan detail page, add a filter control that allows the operator to show:
- All results (default)
- Results with citations only
- Results without citations only

This uses the `hasCitations` field. The filter is client-side (no additional data fetch) since the scan detail page already loads all results.

### R5: QA check for citation coverage

Add a new QA check to `packages/core/src/qa/checks.ts`:

```typescript
export const sourceLowCitationCoverage: QACheckFn = (ctx) => {
  const total = ctx.scanResults.length;
  if (total === 0) return skipped("No results to check.");

  const withCitations = ctx.scanResults.filter(r => r.citations.length > 0).length;
  const rate = withCitations / total;

  if (rate < 0.5) {
    return warning(
      "source.low_citation_coverage",
      `Only ${pct(rate)} of all results have citations. ` +
      `Reports built on uncited results are less defensible.`,
    );
  }
  return pass("source.low_citation_coverage");
};
```

This is distinct from the existing `sourceCitationsPresent` check, which only examines results where the client was mentioned. The new check examines ALL results regardless of mention status, because uncited non-mention results also weaken the assessment (if the AI did not cite sources, the "not mentioned" result may be unreliable too).

### R6: Report composer awareness (future-ready, not required for v1)

The report composer (`packages/core/src/report-composer.ts`) does not need to change in v1. However, the `hasCitations` flag enables a future enhancement: when composing the report, optionally filter to only APPROVED results with `hasCitations === true`. This would produce a higher-fidelity report at the cost of fewer data points.

For now, document this as a future option. Do not implement filtering in the composer. The QA check (R5) surfaces the coverage rate; the operator and report reviewer can decide whether to act on it.

---

## Implementation

### Schema change

Single migration: add `hasCitations Boolean @default(false)` to `ScanResult` in `packages/db/prisma/schema.prisma`.

Backfill script (runs once after migration):
```sql
UPDATE scan_results
SET has_citations = EXISTS (
  SELECT 1 FROM citation_sources
  WHERE citation_sources.scan_result_id = scan_results.id
);
```

### Core changes

1. **`packages/core/src/qa/checks.ts`:** Add the `sourceLowCitationCoverage` check function and register it in `ALL_CHECKS`.

2. **`packages/core/src/qa/types.ts`:** No change needed -- the `QACheckContext.scanResults` type already includes `citations: Array<{ domain: string | null }>`, which is sufficient.

3. **`packages/core/src/schemas.ts`:** Add `hasCitations: z.boolean().optional()` to `RecordScanResultSchema`. The field is set server-side, not by the operator, so it is optional in the input schema.

### Server action changes

In the `recordResult` server action (`apps/web`):
1. After creating `CitationSource` records and running `extractCitationsFromResponse`, compute `hasCitations`.
2. Set the field on the `ScanResult` create/update call.

### Frontend changes

1. **Scan detail page:** Add a "No citations" warning badge on result cards where `hasCitations === false`. Add the citation filter control.
2. **Record result flow:** After inline submission, if the newly created result has `hasCitations === false`, show the inline warning message.

### No changes to

- `scan-analysis.ts` -- the `analyzeResponse` function is not affected.
- `citation-extractor.ts` -- already works correctly; its output is used to compute the flag.
- `report-composer.ts` -- no v1 changes (R6 is future).
- `scan-comparison.ts` -- comparison logic does not use citation data.

### Estimated effort

- Schema migration + backfill: 0.5 day
- QA check: 0.5 day
- Server action change: 0.5 day
- Frontend (badge, filter, warning): 1 day
- Total: ~2.5 days

---

## Risks and Tradeoffs

1. **Denormalized field maintenance.** If a future feature allows adding/removing citations after recording, `hasCitations` must be updated. Mitigation: the field is cheap to recompute (`citations.length > 0`). Any future citation-editing code must include the recomputation. Add a comment on the field in the schema noting this constraint.

2. **False negatives from `extractCitationsFromResponse`.** The extractor uses regex and a known-platform dictionary. If the AI cites a source the extractor does not recognize (e.g., a niche industry platform), `hasCitations` could be `false` even though the response references a source. Mitigation: the operator can still manually enter domains, which sets `hasCitations = true`. The `KNOWN_PLATFORMS` dictionary grows over time. This is an acceptable accuracy floor.

3. **Warning fatigue.** If many results lack citations, the operator sees many warnings. Mitigation: the warning is a muted visual indicator, not a blocking modal. It is easy to ignore when the operator has already made a conscious decision to include uncited results.

---

## Interaction with Other Specs

- **citation-capture-improvement.md:** That spec improves how citations are entered and extracted. The `hasCitations` flag benefits directly -- better citation capture = more accurate `hasCitations` values. This spec and that spec are independent but synergistic. Order does not matter.
- **scan-recording-ux.md:** The inline recording flow (Phase 2 of that spec) is where the "no citations" warning will appear. The warning component should be designed to work in both the inline and page-based recording flows.
