# Snapshot Route Consolidation Plan

**Date:** 2026-04-06
**Status:** Implementation spec — ready for execution
**Problem:** Two snapshot routes produce different quality outputs from different data models. The better model is not the one being shared.

---

## Diagnosis

### The split

There are two snapshot rendering paths:

| | `/snapshots/[id]` (findings card) | `/snapshots/visibility/[clientId]` (old visibility page) |
|---|---|---|
| **Data source** | `ScanRun.metadata.snapshotSummary` (SnapshotSummary) | `fetchSnapshot()` -> `computeScanComparison()` -> `composeSnapshot()` (VisibilitySnapshot) |
| **Quality** | Rich: primaryHook, evidence, quotableText, competitor contrast, theme breakdown, DM template, gap queries | Thin: mention rate label, sentiment word, one competitor bar, 3 citation domains, 4-sentence summary |
| **Scan selection** | Exact ScanRun by ID, filtered to `queryDepth: "snapshot"` | Most recent COMPLETED scan for client, **any queryDepth** |
| **Input data** | 100 results from purpose-built snapshot scan with category-tagged queries | Generic scan results with no category context |
| **Org scoping** | `client: { organizationId }` on the ScanRun query | `getOrganizationId()` in `fetchSnapshot()` |

### Where each route is linked

- **List page** (`/snapshots/page.tsx`): Links to `/snapshots/${scan.id}` -- the good route.
- **Client detail page** (`/clients/[id]/page.tsx`): "View Snapshot" links to `/snapshots/visibility/${id}` -- the bad route. "Run snapshot" links to `/snapshots/new?clientId=${id}` which creates a scan and redirects to the good route.
- **Outreach guide** (`docs/snapshot-outreach-guide.md`): Describes a "10-query scan" product. The implementation runs 100 queries.

### The core problem

`fetchSnapshot()` is a legacy function from before the snapshot scan mode existed. It:

1. **Ignores `snapshotSummary`** — never reads the rich summary the worker already computed and stored in `ScanRun.metadata`.
2. **Is not snapshot-specific** — picks the most recent COMPLETED scan regardless of `queryDepth`, so it can grab a full assessment scan and present it through a snapshot template.
3. **Feeds `composeSnapshot()`** — a thin composer that produces `VisibilitySnapshot`, which has no hook, no evidence, no quotable text, no DM template, no theme breakdown, no competitor contrast detail. It was designed for a pre-snapshot-mode world.

The result: the route that the client detail page links to ("View Snapshot") shows a dramatically worse version of the data than the route that the snapshots list page links to.

---

## Decision: One canonical route

**`/snapshots/[id]` is the canonical snapshot route.** It renders `SnapshotSummary` from `ScanRun.metadata.snapshotSummary`. It is correct, rich, and already the primary rendering path from the snapshots list.

`/snapshots/visibility/[clientId]` will be removed.

---

## Implementation plan

### Phase 1: Fix the links (immediate)

**File:** `apps/web/src/app/(dashboard)/clients/[id]/page.tsx`

The "View Snapshot" button currently links to `/snapshots/visibility/${id}`. This needs to resolve to the correct snapshot scan for this client.

Two options:

**Option A (chosen): Link to the snapshots list, filtered or not.** Change the "View Snapshot" href to `/snapshots` (the list page). The list already shows all snapshots sorted by date, and clicking any card goes to `/snapshots/${scan.id}`. This is correct behavior because a client can have multiple snapshots and the operator should pick which one to view.

Why not "link to the latest snapshot scan for this client": This requires either a redirect route or a data fetch to find the most recent `ScanRun` with `queryDepth: "snapshot"` for this client. That is unnecessary complexity. The list page already does this work and shows all snapshots. If we later want a "latest snapshot for client X" shortcut, it can be added as a redirect route -- but the link from the client page should not bypass the list.

**Change:**
```
href={`/snapshots/visibility/${id}`}  -->  href="/snapshots"
```

Or, if the preference is to pre-filter to this client's snapshots, we could add a query param and filter the list page. But the simpler version is fine for now -- there are not enough snapshots per org to make filtering necessary.

### Phase 2: Add print/share capability to the canonical route

**Problem:** The old `/snapshots/visibility/[clientId]` route had one feature the new route lacks: print styling and a print button. This is the shareable artifact described in the outreach guide.

**Action:** Add a print-optimized view to `/snapshots/[id]`. This is not a second route. It is a print stylesheet and a "Print / Share" button on the existing findings card page.

**Files to change:**
- `apps/web/src/app/(dashboard)/snapshots/[id]/page.tsx` — Add `<style>` block with `@media print` rules (can be adapted directly from the old visibility page's print styles). Add a "Print" button in the header action area, using the same `PrintButton` client component from the old route.
- Move `apps/web/src/app/(dashboard)/snapshots/visibility/[clientId]/print-button.tsx` to a shared location (e.g., `apps/web/src/components/print-button.tsx`) since it is a generic `window.print()` wrapper.

The print view should:
- Hide navigation, "All snapshots" link, collapsible section toggles
- Show the hero finding, supporting evidence, competitor contrast, and DM template in a clean single-column layout
- Include the "Prepared by Antellion" footer and confidentiality note
- Use `@page { size: letter; margin: 16mm; }` for consistent output

This is NOT a redesign of the findings card. It is adding `@media print` rules and a button. The existing card layout is already well-structured for this.

### Phase 3: Delete the old route and its data pipeline

**Files to delete:**
- `apps/web/src/app/(dashboard)/snapshots/visibility/[clientId]/page.tsx`
- `apps/web/src/app/(dashboard)/snapshots/visibility/[clientId]/print-button.tsx` (after moving to shared location)
- The entire `apps/web/src/app/(dashboard)/snapshots/visibility/` directory

**Files to modify:**
- `apps/web/src/app/(dashboard)/actions/snapshots.ts` — Remove the `fetchSnapshot()` function and its `SnapshotResult` type export.
- `packages/core/src/index.ts` — Remove the `composeSnapshot` export and the `VisibilitySnapshot`, `SnapshotCompetitor`, `SnapshotCitationGap`, `SnapshotMetrics`, `SnapshotInput` type exports from `snapshot-composer.ts`.

**File to deprecate (do not delete yet):**
- `packages/core/src/snapshot-composer.ts` — Mark as `@deprecated` with a comment pointing to `snapshot-summary.ts`. The test file `packages/core/src/__tests__/snapshot-composer.test.ts` has 30+ tests. These tests verify deterministic behavior of helper functions (`mentionTier`, `sentimentWord`, `classifySourceType`, `gapActionFor`) that are imported from `report-composer.ts` and used elsewhere. The `composeSnapshot` function itself and its types should be removed, but the test coverage of the imported helpers has value if those helpers are still used in report composition.

**Cleanup decision:** If `classifySourceType`, `gapActionFor`, `mentionTier`, and `sentimentWord` are only consumed by `composeSnapshot` and `snapshot-composer.test.ts`, they can be removed from the export surface. If they are consumed by the report composer or other code, they stay. Check before deleting.

### Phase 4: Update the outreach guide

**File:** `docs/snapshot-outreach-guide.md`

The guide repeatedly describes the snapshot as a "10-query scan." The implementation runs 100 queries across 4 categories (65 discovery, 15 competitor contrast, 10 reputation, 10 citation source). The guide needs to reflect reality.

**Specific changes:**

1. **Section 1 positioning ("one sentence"):** Change "produced from real candidate-intent queries" to reference the 100-query methodology. The exact framing: "produced from 100 candidate-intent queries across 4 analysis categories -- not a generic template."

2. **"On a call" framing:** Change "We ran your company through 10 candidate-intent AI queries" to "We ran your company through 100 candidate-intent AI queries." The number is now a strength, not a liability. 100 queries sounds like serious analysis.

3. **Template 3 (CPO/CHRO):** Change "I ran [Company] through 10 candidate-intent AI queries" to "I ran [Company] through 100 candidate-intent AI queries across 4 analysis categories."

4. **Verbal CTA:** Change "what we can see from a 10-query scan" to "what we can see from a 100-query snapshot scan." Change "The full Assessment runs 30 to 50 queries" to "The full Assessment runs 200+ queries across 6 candidate intent themes with longitudinal tracking." (The Assessment scope should clearly exceed the snapshot scope. If 200+ is not accurate, use the actual number.)

5. **Day 7 follow-up:** Change "The Snapshot only covers your top competitor across 10 queries" to "The Snapshot covers [N] competitors across 100 queries."

6. **Section 3 "What the Snapshot reveals":** Update the "Queries Evaluated" row. The snapshot now evaluates 100 queries, not 10. The "3 citation gap domains" framing is still correct (the findings card shows top gaps).

7. **Section 3 "What the Snapshot withholds":** The "per-theme breakdown" is now partially included in the snapshot (theme breakdown is in the SnapshotSummary and rendered in the findings card as a collapsible section). Revise this row to reflect that the Assessment provides deeper theme analysis with longitudinal comparison, not that themes are entirely withheld.

**Do not change:**
- The overall sales strategy and objection handling are sound and not affected by the query count.
- "1-page analysis" framing in the positioning section. The print view should produce a focused document even if the screen view has collapsible sections. The print stylesheet controls what appears on paper.
- The CTA design and follow-up sequence structure.

---

## What happens to `composeSnapshot()` and `fetchSnapshot()`

| Function | Verdict | Reason |
|---|---|---|
| `fetchSnapshot()` | **Delete** | Only consumer is the old visibility route. It ignores `snapshotSummary`, picks wrong scans, produces weaker output. No path to rehabilitation. |
| `composeSnapshot()` | **Delete** | Produces `VisibilitySnapshot` which is a strict subset of `SnapshotSummary`. No consumer remains after `fetchSnapshot()` is removed. |
| `VisibilitySnapshot` type | **Delete** | Dead type after above removals. |
| `SnapshotSummary` type | **Keep** | This is the canonical output. Already used by the findings card, the scan worker, and the list page. |
| `computeSnapshotSummary()` | **Keep** | This is the canonical computation. Called by the scan worker on completion. Pure, tested, correct. |

---

## Execution order

1. Move `print-button.tsx` to shared components
2. Add print styles and print button to `/snapshots/[id]/page.tsx`
3. Update client detail page link from `/snapshots/visibility/${id}` to `/snapshots`
4. Delete `/snapshots/visibility/` directory
5. Remove `fetchSnapshot()` and `SnapshotResult` from `actions/snapshots.ts`
6. Remove `composeSnapshot` export from `packages/core/src/index.ts`
7. Delete or deprecate `packages/core/src/snapshot-composer.ts` (check helper usage first)
8. Update `docs/snapshot-outreach-guide.md` with corrected query counts
9. Run typecheck to confirm no broken imports
10. Run tests to confirm nothing depends on removed exports

Steps 1-3 can ship as one commit (fix the links, add print capability). Steps 4-7 can ship as a second commit (remove dead code). Step 8 is a separate content-only commit. This ordering means the old route is never broken -- it is simply never linked to, then removed.

---

## Risks and edge cases

**Bookmarked URLs:** If anyone has bookmarked `/snapshots/visibility/[clientId]`, those links will 404 after deletion. Mitigation: Before deleting the route, add a temporary redirect page at that path that looks up the most recent snapshot scan for the client and redirects to `/snapshots/${scanId}`. This adds one file and can be removed after 30 days. Whether this is worth doing depends on whether anyone outside the dev team has ever seen these URLs. If not, skip it.

**Old scans without `snapshotSummary`:** Any ScanRun created before the snapshot scan mode (before `computeSnapshotSummary` was wired into the worker) will have no `snapshotSummary` in metadata. The findings card already handles this case (lines 540-567: "Summary is being computed" state). The `recompute-snapshot.ts` script exists to backfill these if needed.

**Print quality:** The findings card has collapsible sections that default to collapsed. The print stylesheet needs to force them open or selectively show content. This is a CSS-only problem, not an architectural one. The `CollapsibleSection` component should accept a `className` that the print stylesheet can target.

**Assessment upsell in print view:** The old visibility page had an explicit upsell sentence in the summary. The new findings card does not have this. Consider adding a print-only footer block with the Assessment bridge language from the outreach guide. This is a content decision, not an architecture decision.

---

## Out of scope

- Redesigning the findings card layout (it is good as-is)
- Adding PDF export (print-to-PDF from the browser is sufficient for now)
- Changing how `computeSnapshotSummary` works
- Adding a `/snapshots/[id]/share` public route (future feature, not needed now)
- Changing the snapshot scan creation flow
