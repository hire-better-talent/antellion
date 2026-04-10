---
name: Operator Action Plan UI
description: Internal-only Action Plan tab on report detail page — implemented 2026-04-05
type: project
---

Operator Action Plan tab implemented at `/reports/[id]/action-plan`.

**Why:** Founder needs a pre-meeting briefing document derived from report metadata. Zero new LLM calls, zero schema changes, pure transform in `@antellion/core`.

**Route:** `/apps/web/src/app/(dashboard)/reports/[id]/action-plan/page.tsx` — server component, org-scoped prisma fetch, calls `buildOperatorActionPlan()` from `@antellion/core`.

**Components:** `/apps/web/src/components/report/action-plan/` — `OperatorActionPlanView.tsx` (main), plus 7 section cards: ValidationItemsCard, TalkingPointsCard, PushbackCard, UpsellCard, RedFlagsCard, NextEngagementCard, ClientQuestionsCard.

**Security note baked into code:** `export const metadata = { robots: { index: false, follow: false } }` is belt-and-suspenders; real security is the org-scoped Prisma query `where: { id, client: { organizationId } }`.

**Visual chrome:** Fixed red banner at top (`z-50`), 2px red border, red-tinted background, CSS watermark on print via `.internal-watermark::before`.

**Tab navigation:** Added to `/reports/[id]/page.tsx` above the StatusPipeline — Report / QA Review / Action Plan (Internal). Action Plan tab has red dot and red text.

**Core module:** Backend agent built `packages/core/src/operator-action-plan/` with modular structure (build.ts, trigger-detection.ts, builders/, rules/, config.ts). Frontend imports `buildOperatorActionPlan` and `OperatorActionPlan` type from `@antellion/core`.

**How to apply:** When adding new sections or modifying the action plan, read the design doc at `/docs/designs/operator-action-plan.md` first. The trigger flags in `trigger-detection.ts` are the single source of truth for "which conditions fired" — all section builders consume them.
