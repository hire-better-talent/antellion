---
name: Per-segment reporting Phase 1
description: Phase 1 of per-segment reporting is implemented — backend grouping, per-segment analysis, cross-segment summary, and metadata storage. No renderer changes yet.
type: project
---

Phase 1 of per-segment reporting is complete as of 2026-04-01. Backends groups scans by `focusArea`, runs the full analysis pipeline per segment, and stores the result in `Report.metadata`.

**Why:** Enterprise clients hire across fundamentally different talent markets. Blending all scans into one analysis produces meaningless rates. The `focusArea` field was already being set on `ScanRun` — this work wires it through the report pipeline.

**How to apply:**
- Phase 2 (renderer changes) is deferred. The data is in `Report.metadata.segments` and `Report.metadata.crossSegmentSummary` but the `JourneyReportRenderer` does not yet render it per-segment.
- No schema changes were made. Everything is stored in the existing `Report.metadata` JSON column.
- Segments are only populated when 2+ distinct `focusArea` values exist in the selected scans. Single-segment reports are unchanged.
- `computeCrossSegmentSummary()` is in `packages/core/src/decision-journey/cross-segment-summary.ts` and is fully tested.
- Grouping normalizes focusArea case-insensitively so "Software Engineer" and "software engineer" merge into one segment.
- The generate report form now shows a `focusArea` badge on each scan checkbox so the operator can see segment composition before generating.
