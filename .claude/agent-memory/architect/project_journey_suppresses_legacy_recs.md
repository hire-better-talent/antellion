---
name: Journey analysis suppresses legacy recommendations in composeReport
description: When journeyAnalysis is present, composeReport returns empty recommendations array — stage recommendations live in metadata.remediationPlan only
type: project
---

As of 2026-03-31, `composeReport()` returns an empty `recommendations` array when `input.journeyAnalysis` is present.

**Why:** The legacy `generateRecommendations()` produced mention-rate-centric, aggregate-level recommendations that conflicted with the stage-aware recommendations stored in `Report.metadata.remediationPlan`. Both sets were being persisted (legacy as `Recommendation` DB records, stage-aware in metadata JSON), creating duplicate/contradictory guidance in reports.

**How to apply:** The frontend JourneyReportRenderer reads recommendations from `metadata.remediationPlan`. The legacy `Recommendation` records in the DB are only created when there is no journey data (pre-stage-classification scan data). If you add new recommendation sources, decide which path they belong to — don't put them in both.
