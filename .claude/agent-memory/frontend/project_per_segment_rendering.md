---
name: Per-segment rendering (Phase 2)
description: Per-segment report rendering implemented; key decisions on co-location, renderFlatPath, and backward compat
type: project
---

Phase 2 of per-segment reporting was implemented on 2026-04-01.

**What was built:**

- `CrossSegmentSummaryBlock.tsx` — standalone component, renders the cross-segment overview table + narrative + common gaps. No dependency on JourneyReportRenderer.
- `SegmentHeader` + `SegmentContent` + `renderFlatPath` — all added INSIDE `JourneyReportRenderer.tsx` (not as separate files) to avoid a circular import (`SegmentContent` → `JourneyReportRenderer` → `SegmentContent`).
- `JourneyReportRenderer` now detects `meta.segments.length > 1 && meta.crossSegmentSummary` and routes to the multi-segment layout.

**Key design decisions:**

1. `SegmentContent` lives in the same file as `JourneyReportRenderer` — eliminates the circular import that would occur if it were a separate file importing `JourneyReportRenderer`.
2. The flat-path JSX was extracted into `renderFlatPath(meta, printMode, evidencePanel, summaryBlock, summary)` — a plain function (not a React component) that returns `JSX.Element`. This is safe since it contains no hooks.
3. `SegmentContent` calls `renderFlatPath` directly (forward reference, works because `renderFlatPath` is a function declaration, which is hoisted).
4. `segmentToMeta()` constructs a `JourneyMetadata`-shaped object from `SegmentData + clientName` — intentionally omits `segments` and `crossSegmentSummary` to prevent recursion.
5. When `hasSegments` is true, the overall `assessmentParameters` block renders at the top of the multi-segment layout. Each segment also shows its own `assessmentParameters` via `renderFlatPath`.

**Backward compat:**
- When `meta.segments` is absent or length <= 1, `JourneyReportRenderer` calls `renderFlatPath` directly — no behavior change from before.
- The existing flat-path JSX is untouched and still the canonical rendering path.

**Why:** to make demo-ready per-segment analysis visible on multi-segment reports for enterprise clients hiring across different talent markets.

**How to apply:** when touching `JourneyReportRenderer`, be aware that the flat-path logic is now in `renderFlatPath()` starting around line 1903. `SegmentContent` and `SegmentHeader` are internal components defined before it (around lines 1750-1893).
