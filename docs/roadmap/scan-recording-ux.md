# Roadmap: Scan Recording UX Optimization

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** High (directly blocks operator throughput on every scan)

---

## The Problem

When recording scan results, the operator works through 100+ queries. The current flow is:

1. Scan detail page (`/scans/[id]`) shows all queries grouped by cluster.
2. Each unrecorded query has a "Record" link that navigates to a separate page (`/scans/[id]/record/[queryId]`).
3. After recording, the `recordResult` server action calls `redirect(/scans/${scanRunId})`, sending the operator back to the scan detail page.
4. As more results are recorded, completed result cards pile up at the top of each cluster. Each recorded result renders 6-8 lines of badges, citations, competitor mentions, and a truncated response. Unrecorded queries are single-line items.
5. The operator must scroll past all completed results to find the next unrecorded query.
6. This gets worse with every result -- by query #80, the page is dominated by completed cards and the next unrecorded query is buried.

**Quantified pain:** Each round-trip (click Record, wait for page load, paste response + sources, submit, wait for redirect, scroll to find next query) takes ~30-45 seconds. For a 48-query scan that is 25-35 minutes of recording. Roughly 40% of that time is navigation and scrolling, not actual data entry. For a 100+ query scan the scroll problem alone adds 10+ minutes.

**Root causes in current code:**

- `apps/web/src/app/(dashboard)/scans/[id]/page.tsx` renders every result in full regardless of status -- no collapsing, no anchoring.
- The record flow is a separate page (`/scans/[id]/record/[queryId]`) with a hard `redirect()` back, which triggers a full server-side page render with no scroll position preservation.
- There is no progress tracking visible to the operator -- the `WorkflowStatusBar` shows result count vs query count, but it is not prominent during recording and does not indicate which queries remain.

---

## Requirements

### R1: Auto-scroll to next unrecorded query

After recording a result and returning to the scan page, automatically scroll to the next unrecorded query in the list. The operator should never have to manually hunt for the next item.

### R2: Collapse completed results

Recorded results should be collapsed by default during an active recording session (scan status `RUNNING`). The collapsed state shows a single compact line: query text, mention badge, visibility score. Clicking expands to the full result card. This reclaims vertical space so unrecorded queries stay near the viewport.

When the scan is `COMPLETED`, results should be expanded by default (the operator is reviewing, not recording).

### R3: Inline recording

Instead of navigating to a separate page for each query, allow recording inline on the scan detail page. The "Record" button expands to reveal the `RecordResultForm` (response textarea, citation suggestions, sources field) directly under the query. Submit without page navigation. On success, the form collapses, the result appears as a compact summary, and the next unrecorded query's form auto-expands.

The separate `/scans/[id]/record/[queryId]` page route should remain functional as a fallback but is no longer the primary path.

### R4: Progress indicator

Show a prominent progress bar and counter ("12 of 48 recorded") at the top of the scan detail page. This should be visible at all scroll positions (sticky or in the page header area). The operator must always know how far along they are.

### R5: "Next unrecorded" floating button

A sticky/floating button that scrolls to the next unrecorded query, always visible regardless of scroll position. This serves as a quick escape when the operator scrolls away or loses their place.

### R6: Keyboard navigation

After submitting a result inline, pressing `N` (or `Enter` when no form is focused) should jump to the next unrecorded query and auto-expand its recording form. This enables a rapid paste-submit-next cycle without touching the mouse.

---

## Implementation Approach

### Phase 1: Quick wins (no architectural change)

**Scope:** Reduce scroll pain immediately with minimal code changes. All changes are in `apps/web`.

**1a. Anchor-based auto-scroll**

- In the scan detail page, add `id={query.id}` to each query's container `<div>`.
- Change the `recordResult` server action redirect from `redirect(/scans/${scanRunId})` to `redirect(/scans/${scanRunId}#${nextQueryId})`, where `nextQueryId` is the ID of the next unrecorded query in the cluster ordering. This requires querying for the next unrecorded query before redirecting -- add a small helper that takes `scanRunId` and `queryId` and returns the next query ID without a result.
- Add a client-side scroll-into-view effect that fires on mount when a hash is present, using `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- **Tradeoff:** The anchor approach still does a full page navigation. It is a stopgap, not the final solution. But it is a 30-minute fix that immediately eliminates the scroll-hunting problem.

**1b. Collapse completed results**

- Wrap each recorded result's detail section (badges, citations, response, evidence) in a `<details>` element. When the scan is `RUNNING`, render them closed by default. When `COMPLETED`, render open.
- The summary line (visible when collapsed) shows: query text, mentioned/not-mentioned badge, visibility score badge. This is a single line per recorded result vs the current 6-8 lines.
- This is pure server-rendered HTML. No client components needed.
- **Implementation note:** The `<details>` element is semantically correct here and avoids adding client-side state management. It also works without JavaScript.

**1c. Progress counter**

- At the top of the results section (below the comparison panel, above the first cluster), render a progress bar: `{recordedCount} of {totalCount} recorded` with a percentage-width bar.
- Use the existing `pendingCount` and `allQueries.length` values already computed in the page component. No new data fetching.

**Estimated scope:** ~0.5 day frontend work. No core changes, no schema changes.

### Phase 2: Inline recording

**Scope:** Eliminate the page-per-query navigation entirely. This is the biggest UX improvement.

**2a. Inline form expansion**

- Convert each unrecorded query row into a client component (`InlineRecordableQuery` or similar) that toggles between a compact "Record" button and the full `RecordResultForm`.
- The `RecordResultForm` already accepts `action`, `scanRunId`, `queryId`, `queryText`, and `cancelHref` as props. For inline use, `cancelHref` is not needed -- "Cancel" collapses the form instead of navigating.
- Add an `onSuccess` callback prop to `RecordResultForm`. When the server action succeeds (no errors returned), the parent component calls `onSuccess` to collapse the form and trigger the next-query behavior.

**2b. Server action adjustment**

- The `recordResult` server action currently ends with `redirect()`. For inline use, it must return a success state instead of redirecting. Two options:
  - **Option A (recommended):** Split into two code paths. If the form submission includes a hidden `inline=true` field, return `{ success: true }` instead of calling `redirect()`. The `revalidatePath` call stays so the page data refreshes.
  - **Option B:** Remove the redirect entirely and handle navigation in the client. This is cleaner long-term but changes behavior for any remaining users of the separate record page.
- Go with Option A for now. The separate record page continues to work with its redirect. Inline forms get a success response.

**2c. Auto-advance to next query**

- After a successful inline submission, the parent component should:
  1. Collapse the just-completed form and render the result as a compact summary.
  2. Find the next unrecorded query in DOM order.
  3. Scroll to it and auto-expand its recording form.
- This creates a smooth flow: paste response, submit, the form auto-collapses and the next query auto-opens.

**2d. Component boundary**

- The scan detail page remains a server component for the initial data load.
- The per-cluster query list becomes a client component that manages expand/collapse state.
- `RecordResultForm` is already a client component -- no change needed there.
- The cluster-level client component receives the initial query list and results map as props from the server component. After an inline submission, `revalidatePath` refreshes the server data and React reconciles the updated state.

**Estimated scope:** ~2 days frontend work. ~0.5 day server action adjustment.

### Phase 3: Polish

**Scope:** Keyboard shortcuts and floating navigation. Only worth doing after Phase 2 is validated.

**3a. Floating "Next unrecorded" button**

- A `fixed` position button in the bottom-right corner of the viewport (similar to a scroll-to-top button).
- Visible only when the scan is `RUNNING` and unrecorded queries remain.
- On click, scrolls to the next unrecorded query and expands its form.
- Disappears when all queries are recorded.

**3b. Keyboard shortcuts**

- Register a `keydown` listener on the scan detail page (client component).
- `N` key: scroll to next unrecorded query and expand form (same as floating button).
- `Escape`: collapse the currently expanded form.
- Only active when no textarea/input is focused (avoid capturing typing).
- Show a small keyboard shortcut hint near the progress bar: "Press N for next query".

**3c. Optimistic UI**

- After submitting an inline form, immediately render the compact result summary with a "Saving..." indicator, before the server action completes.
- If the server action fails, revert to the form state with the error message.
- This eliminates the perceived delay between submit and seeing the result.

**Estimated scope:** ~1.5 days frontend work.

---

## Architecture Notes

**What stays in `packages/core`:**
- No core changes needed for any phase. The `RecordResultForm` already imports `extractCitationsFromResponse` from core. The analysis logic in the server action is untouched.

**What changes in `apps/web`:**
- Phase 1: Minimal -- add IDs, adjust redirect, add `<details>` wrappers, add progress bar.
- Phase 2: New client component wrapping the per-cluster query list. Small adjustment to `recordResult` server action (conditional redirect).  `RecordResultForm` gets an `onSuccess` prop and a `mode: 'inline' | 'page'` prop.
- Phase 3: Keyboard listener, floating button, optimistic state.

**The separate record page (`/scans/[id]/record/[queryId]`) is NOT removed.** It remains as a deep-linkable fallback. Some operators may prefer the focused single-query view. It costs nothing to keep.

**No Prisma schema changes.** No new models, no migrations.

**No new dependencies.** All behavior is achievable with standard React patterns and native DOM APIs (`scrollIntoView`, `<details>`, `IntersectionObserver` for the floating button visibility).

---

## Risks and Tradeoffs

| Risk | Mitigation |
|------|-----------|
| Phase 2 client component adds JS weight to scan detail page | The form is already a client component. The new wrapper is lightweight state management, not a heavy component. Keep the cluster header and static content as server-rendered children. |
| `revalidatePath` after inline submit causes a full RSC re-render | This is the intended Next.js pattern. The client component preserves local state (which form is expanded) across server re-renders because it is keyed by query ID. Test this explicitly. |
| Keyboard shortcuts conflict with browser/OS shortcuts | Only bind `N` and `Escape`, both safe. Only active when no input is focused. |
| Collapsed results hide information the operator might want to review | The collapsed summary line includes the three most important signals (query text, mention, score). One click expands the full detail. When scan is `COMPLETED`, results are expanded by default. |

---

## Testing Strategy

- **Phase 1:** Manual QA. Verify anchor scrolling works after redirect. Verify `<details>` default state matches scan status. Verify progress counter math.
- **Phase 2:** Component test for the inline expand/collapse flow. Integration test that `recordResult` with `inline=true` returns success instead of redirecting. Manual QA for the auto-advance behavior across cluster boundaries.
- **Phase 3:** Component test for keyboard shortcut registration/unregistration. Manual QA for optimistic UI rollback on error.

---

## Success Criteria

- An operator can record a 48-query scan without ever manually scrolling to find the next query.
- Recording time for a 48-query scan drops from ~30 minutes to ~18 minutes (eliminating navigation and scroll overhead).
- The scan detail page remains fast to load -- no regression in initial page render time.
