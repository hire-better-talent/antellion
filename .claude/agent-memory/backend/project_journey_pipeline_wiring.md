---
name: Journey pipeline wiring
description: generateReport now computes journey analysis and stores JourneyMetadata in Report.metadata, activating the JourneyReportRenderer
type: project
---

The `generateReport` server action in `apps/web/src/app/(dashboard)/actions/reports.ts` now:

1. Fetches `query.stage` and `query.queryCluster.stage` from scan results.
2. Classifies any untagged queries at runtime via `classifyQueryStage()`.
3. Calls `computeJourneyAnalysis()` when at least one result has a stage.
4. Builds per-competitor stage rates from `metadata.competitorMentions`.
5. Calls `generateStageRecommendations()` with the comparison data.
6. Calls `buildJourneyMetadata()` to produce the full `JourneyMetadataOutput` shape.
7. Spreads `journeyAnalysis`, `clientName`, `clientOverallRate`, `competitors`, and `remediationPlan` into `Report.metadata`.

**Why:** The frontend `JourneyReportRenderer` activates when `metadata.journeyAnalysis` is present (detected by `extractJourneyMetadata()`). Previously this key was never written, so the renderer never activated.

**How to apply:** If journey data is missing on a report, re-generate it — existing reports without journey data will use the legacy flat renderer. The legacy `composeReport()` output stays in metadata alongside the journey data as a backward-compatible fallback.

The `buildJourneyMetadata()` function lives in `packages/core/src/decision-journey/journey-metadata-builder.ts`. It transforms core domain types into the plain JSON shape the frontend expects, generating deterministic per-stage narrative prose.

Stage classification priority order: `query.stage` → `queryCluster.stage` → runtime `classifyQueryStage()`. If no result has a stage after all three fallbacks, journey analysis is skipped and `journeyAnalysis` is absent from metadata.
