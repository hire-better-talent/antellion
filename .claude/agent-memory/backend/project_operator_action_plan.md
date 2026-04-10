---
name: Operator Action Plan — Phase 1 Complete
description: Core module for internal operator briefing built from Report.metadata; pure transform, no LLM, no DB writes
type: project
---

Phase 1 of the Operator Action Plan is complete in `packages/core/src/operator-action-plan/`.

**Why:** Internal briefing for operator (Jordan) before client delivery. Surfaces existing Report.metadata as validation checklist, talking points, pushback prep, upsell hooks, red flags, and discovery questions.

**Key design decisions:**
- `build.ts` is the public entry point (not `builder.ts`) — `index.ts` re-exports from `./build`
- `detectTriggerFlags()` runs once; all 7 section builders consume the same `TriggerFlags` object
- MAX_CLIENT_QUESTIONS (3) cap applied in orchestrator (`build.ts`), NOT in the rule function itself
- `computeCompellingScore` is log-scaled: `log(sampleSize) / log(50)` — sampleSize=1 → score=0, sampleSize=50 → normalized=1.0
- Price constants live only in `config.ts` — rule tables reference constants by name

**ReportMetadata type** in `types.ts` mirrors what `generateReport()` in `actions/reports.ts` writes to `Report.metadata`. All fields optional for backward compat.

**How to apply:** When building the UI tab (`/reports/[id]/action-plan/page.tsx`), import `buildOperatorActionPlan` from `@talentsignal/core` and pass `{ reportId, clientName, metadata: report.metadata as ReportMetadata }`. The org-scoping check lives in the route, not in the transform.
