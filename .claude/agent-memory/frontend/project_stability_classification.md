---
name: Stability Classification Display (Phase 5)
description: Multi-run stability classification UI implemented in the report renderer (2026-04-02)
type: project
---

Phase 5 stability classification display was implemented on 2026-04-02.

**What was built:**

- `StabilityBadge.tsx` — new component file with two exports:
  - `StabilityBadge` — inline pill badge (STABLE_PRESENCE=green, VOLATILE_PRESENCE=amber, STABLE_ABSENCE=red, UNVALIDATED=renders nothing)
  - `StabilityCount` — labeled count for the distribution row (e.g. "12 Stable presence")
- `journey-types.ts` — added `multiRunAnalysis` optional field to `JourneyMetadata` with full inline type (mirrors `MultiRunAnalysis` from `@antellion/core` without importing it)
- `JourneyReportRenderer.tsx` — three additions:
  1. `AssessmentConfidenceCard` component (internal) — renders after `AssessmentParametersBlock`, before `ExecutiveDecisionPage`. Only renders when `effectiveScanRunCount >= 2` and `validatedQueryCount > 0`. Shows validated count, distribution counts, and threshold interpretation text.
  2. `StageStabilityRow` component (internal) — compact "Stability: X stable / Y volatile / Z absent" row. Injected just before each `SectionCloseOut` for Discovery, Evaluation (merges EVALUATION + CONSIDERATION counts), and Commitment sections.
  3. Stability-aware context block in `remediationSection` — appears before `EffortImpactMatrix` when volatile or absent counts exist; explains what each stability state means for action urgency.

**Backward compatibility:**
- All additions are gated on `multiRunAnalysis` being present and `effectiveScanRunCount >= 2`. Reports from before Phase 5 (single-run, no `multiRunAnalysis` key) render exactly as before.
- `StageStabilityRow` also guards on `hasValidatedData` (sum of stable/volatile/absent > 0) so a report with `multiRunAnalysis` but all-UNVALIDATED still shows nothing.

**Why:** Phase 3 stored `multiRunAnalysis` in `Report.metadata` but it was never surfaced in the UI. Phase 5 closes that gap, making cross-validation data visible to clients in the report.

**How to apply:** When touching the report renderer, note that `getStageSummary()` is a local helper function inside `renderFlatPath`. The `MultiRunAnalysis` type alias is defined at module scope inside the renderer file (derived from `JourneyMetadata`), not imported from core.
