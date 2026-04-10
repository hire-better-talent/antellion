---
name: Per-segment reporting spec written
description: Spec at docs/roadmap/per-segment-reporting.md designs multi-segment report generation using focusArea grouping without schema changes
type: project
---

Per-segment reporting spec was written (2026-04-01) to address enterprise multi-market hiring (e.g., Home Depot hiring across tech, retail, supply chain). Key decisions:

- Group scans by `ScanRun.focusArea` at report generation time -- no new Prisma model
- Each segment runs the full analysis pipeline independently (computeJourneyAnalysis, buildJourneyMetadata, etc.)
- Metadata extends with optional `segments` array and `crossSegmentSummary` -- top-level keys preserved for backward compat
- Renderer extracts core logic into `JourneySegmentContent` component, loops per segment
- Per-segment competitor sets deferred (Phase 3) -- use full client competitor set, natural filtering via mention rates
- No schema changes -- stays within the existing enterprise scaling approach (project_enterprise_scaling_approach.md)

**Why:** The enterprise scaling memory explicitly named "segment-level reporting" as the trigger for introducing an AssessmentSegment model. This spec deliberately avoids that trigger by keeping segments as a derived grouping from focusArea, not a first-class entity.

**How to apply:** When implementing, the biggest extraction risk is `JourneyReportRenderer` (~2300 lines). Phase 1 (backend) ships independently. Phase 2 (renderer) should start with a no-behavior-change component extraction before adding the segment loop.
