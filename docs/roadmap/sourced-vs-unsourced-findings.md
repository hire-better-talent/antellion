# Roadmap: Sourced vs Unsourced Findings

**Status:** Proposed
**Author:** Architect
**Date:** 2026-04-01
**Priority:** Medium (affects report credibility and executive trust)

---

## Problem

The report treats all scan results equally regardless of whether the AI response cited external sources or produced unsourced claims from parametric memory. A finding like "47% mention rate" may be built on a mix of well-sourced responses (Glassdoor, LinkedIn, Indeed cited inline) and zero-citation responses where the AI asserted employer attributes with no backing. The reader cannot tell the difference.

This matters for three reasons:

1. **Executive credibility.** A report section that says "AI positions Acme as a top-tier employer" is meaningfully different depending on whether 80% or 20% of the underlying responses cited real sources. Executives reviewing the report have no way to assess this.

2. **Confidence scoring is informative but invisible in narrative.** The confidence system already computes `citationCoverage` as a factor (20% weight at finding level via `FINDING_WEIGHT_CITATION_COVERAGE` in `confidence/scoring.ts`). The `scoreFindingCitationCoverage` function computes the fraction of results with citations. But this factor is buried inside a composite score -- the report narrative never exposes the sourced/unsourced split directly.

3. **Stage-level signal quality varies.** Discovery queries (where the company is not named) tend to produce fewer citations than Consideration queries (where the AI can look up specific company pages). A stage with 80% unsourced results needs different narrative framing than one with 80% sourced results. The current `StageVisibility` type carries `citedDomains` and `gapDomains` but does not expose the per-result sourced proportion.

The `citation-required-flag.md` spec adds a `hasCitations` boolean per result and a QA check for low citation coverage. This spec builds on that foundation by flowing the sourced/unsourced distinction into stage analysis and report output.

---

## Requirements

### R1: Per-result sourced flag

Each scan result should carry a `sourced` classification. A result is **sourced** if it has at least one citation (`CitationSource` record) OR `extractCitationsFromResponse` finds at least one citation in the response text.

This is the same logic as the `hasCitations` flag from `citation-required-flag.md`. If that spec ships first, reuse the field directly. If this ships first, compute it inline during stage analysis from `citationCount > 0`.

No new schema field beyond what `citation-required-flag.md` already proposes.

### R2: Sourced proportion per stage

Extend the stage analysis output to include the fraction of results that are sourced. Add to `StageVisibility` in `decision-journey/types.ts`:

```typescript
/** Fraction of results in this stage backed by at least one citation (0-1). */
sourcedRate: number;
```

Computed in the stage analysis as `resultsWithCitations / totalResults` for that stage. This is the same computation that `scoreFindingCitationCoverage` already performs, but exposed as a first-class stage metric rather than buried inside a confidence factor.

### R3: Sourced proportion in report input

Pass `sourcedRate` per stage through to `JourneyAnalysisInput` in `report-composer.ts` so the narrative generator can reference it. Add to the stage entries:

```typescript
sourcedRate?: number;
```

Optional to avoid breaking existing callers. When absent, the composer omits source-quality language (backward-compatible).

### R4: Adjust report narrative based on sourced proportion

The report composer should adjust language in two places:

**Stage narrative.** When describing a stage's findings, qualify claims based on source backing:

| sourcedRate | Language adjustment |
|---|---|
| >= 0.7 | No qualifier needed. Findings are well-sourced. |
| 0.4 - 0.69 | Add qualifier: "Based on a mix of sourced and unsourced AI responses, ..." |
| < 0.4 | Add qualifier: "Most AI responses at this stage did not cite external sources. While directionally informative, ..." |

This is analogous to the existing `hedgePhrase` pattern but keyed on source quality rather than confidence tier.

**Executive summary.** When the overall sourced rate (across all stages) falls below 0.5, add a methodology note: "Note: fewer than half of AI responses in this assessment cited external sources. Findings are directionally useful but should be validated against primary data."

### R5: Aggregate sourced rate in report metadata

Add an overall sourced rate to the report metadata so downstream consumers (export, dashboard) can surface it:

```typescript
/** Fraction of all assessed results backed by at least one citation (0-1). */
overallSourcedRate?: number;
```

This lives on `ComposedReport` or alongside `ReportConfidence`. It is a single number computed from `resultsWithCitations / totalResults` across all stages.

---

## Implementation

### Phase 1: Stage-level sourced rate (core only)

**Where:** `packages/core/src/decision-journey/`

1. Add `sourcedRate: number` to `StageVisibility` in `types.ts`.
2. In the stage analysis computation (wherever `StageVisibility` is constructed), compute `sourcedRate` from the existing `citationCount` on each result: `results.filter(r => r.citationCount > 0).length / results.length`.
3. This is a pure addition to an existing data structure. No breaking changes.

**Where:** `packages/core/src/report-composer.ts`

4. Add `sourcedRate?: number` to the stage entries in `JourneyAnalysisInput`.
5. Add `overallSourcedRate?: number` to `ComposedReport`.
6. Compute `overallSourcedRate` from the input stages when available.

**Estimated effort:** 0.5 day.

### Phase 2: Narrative adjustment

**Where:** `packages/core/src/report-composer.ts`

1. Add a `sourceQualityPhrase(sourcedRate: number): string` helper alongside the existing `hedgePhrase`. Returns empty string for high-sourced findings, qualifying language for mixed or low-sourced findings per R4.
2. Apply `sourceQualityPhrase` in the journey stage narrative sections. The qualifier prepends to the stage body text, same pattern as `hedgePhrase`.
3. When `overallSourcedRate < 0.5`, append the methodology note to the executive summary.

**Estimated effort:** 0.5 day.

### Phase 3: Frontend surfacing (optional, not required for v1)

Surface `sourcedRate` per stage in the report UI:
- Small badge or annotation on each stage card: "84% sourced" or "32% sourced (low)".
- Tooltip explaining what "sourced" means in this context.

Surface `overallSourcedRate` in the report header alongside the confidence score.

**Estimated effort:** 0.5 day.

### What does NOT change

- **Prisma schema.** No migration. `sourcedRate` is computed at analysis time from existing `CitationSource` counts (already loaded via `citations` on `ScanResultData`).
- **Confidence scoring.** The existing `citationCoverage` factor in `confidence/scoring.ts` remains unchanged. `sourcedRate` is a parallel, user-facing metric, not a replacement for the confidence factor. They use the same underlying data but serve different purposes (confidence = internal scoring; sourcedRate = report narrative quality signal).
- **`scan-analysis.ts`** and **`citation-extractor.ts`.** No changes. These already produce the data this spec consumes.
- **QA checks.** The `sourceLowCitationCoverage` check from `citation-required-flag.md` already covers the detection side. This spec covers the reporting side.

---

## Risks and Tradeoffs

1. **Redundancy with confidence citationCoverage factor.** Both `sourcedRate` and `citationCoverage` measure "what fraction of results have citations." The difference is audience: `citationCoverage` feeds the composite confidence score (internal); `sourcedRate` feeds report language (client-facing). Merging them would couple internal scoring logic to client-facing narrative, which is worse than the minor duplication.

2. **Narrative clutter.** Adding source-quality qualifiers alongside confidence hedges risks verbose report prose. Mitigation: `sourceQualityPhrase` and `hedgePhrase` should not both fire on the same sentence. When confidence tier is LOW (which already captures citation weakness via the 20% weight), skip the source-quality qualifier. Only add source-quality language when confidence is MEDIUM or HIGH but sourced rate is low -- the case where the composite score hides the citation gap.

3. **Dependency on `citation-required-flag.md`.** This spec reuses the same per-result citation signal. If that spec has not shipped, the `sourcedRate` computation uses `citationCount > 0` from existing data, which already works. The specs are synergistic but not sequentially dependent.

---

## Interaction with Other Specs

- **citation-required-flag.md:** Provides the per-result `hasCitations` flag. This spec consumes the same signal at the aggregate level. Independent implementation order.
- **citation-capture-improvement.md:** Better citation capture (Phase 2 auto-extraction) increases accuracy of the sourced/unsourced classification. Ships independently.
- **per-segment-reporting.md:** When per-segment reports land, `sourcedRate` should be computed per segment per stage, not just per stage globally. The computation is identical; the grouping key changes. No additional design work needed.
- **template-rebalance.md:** Rebalancing toward more Evaluation queries may change the overall sourced rate (Evaluation queries tend to have fewer citations than Consideration queries). The methodology note (R4) handles this gracefully -- it fires when the rate is low, regardless of cause.
