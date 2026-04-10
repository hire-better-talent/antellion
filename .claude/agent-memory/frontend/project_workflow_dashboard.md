---
name: Workflow Dashboard UI
description: Workflow status dashboard, StatusPipeline, WorkflowStatusBar, and ResultReviewActions components implemented
type: project
---

Implemented a minimal workflow dashboard across the app (completed 2026-03-26).

**New components:**
- `apps/web/src/components/StatusPipeline.tsx` — horizontal step indicator, `compact` and `full` variants, pure Tailwind
- `apps/web/src/components/WorkflowStatusBar.tsx` — client component showing current status + next-action buttons for scan/result/report entities
- `apps/web/src/components/ResultReviewActions.tsx` — inline approve/flag/reject buttons for ScanResult rows on the scan detail page

**Updated pages:**
- `apps/web/src/app/(dashboard)/page.tsx` — added workflow status counts (scan/report/result breakdowns via `groupBy`) and an "Items needing attention" list (NEEDS_REVIEW results, RUNNING scans, REVIEW reports)
- `apps/web/src/app/(dashboard)/scans/[id]/page.tsx` — added StatusPipeline + WorkflowStatusBar at top; result rows now show ScanResultStatus badge + inline ResultReviewActions; `status` field added to result select
- `apps/web/src/app/(dashboard)/reports/[id]/page.tsx` — added StatusPipeline + WorkflowStatusBar; removed duplicate Publish/Archive buttons from header (WorkflowStatusBar handles those actions now)

**Why:** Operators needed to see at a glance what phase everything is in and what requires action, without navigating into each entity.

**How to apply:** When adding new workflow-driven pages, use StatusPipeline (above the status bar) + WorkflowStatusBar (below it) as the canonical pattern. ResultReviewActions is the model for inline action buttons on table/list rows.
