---
name: Cover Page and Executive Summary Card
description: P3a cover page and P3a-ii executive summary card implemented; CoverPage.tsx already existed, ExecutiveSummaryCard.tsx created new; both wired into JourneyReportRenderer as first two items
type: project
---

CoverPage component already existed at `apps/web/src/components/report/CoverPage.tsx` with print/screen modes, assessmentParameters, domain, industry, confidentiality line — no rewrite needed.

ExecutiveSummaryCard created at `apps/web/src/components/report/ExecutiveSummaryCard.tsx`:
- Exactly 3 blocks: Situation, Key Findings (3 numbered), Top Recommendation
- Accepts optional `executiveSummaryProse` prop (LLM-generated) for situation + topRecommendation text
- Falls back to template-driven derivation when prose absent
- Print-safe: `break-inside-avoid`, border-only (no background)

LLM integration:
- Prompt template: `packages/prompts/src/executive-summary.ts` — exports `executiveSummaryPrompt()`
- LLM utility: `apps/web/src/lib/llm.ts` — exports `generateProse()` using `@anthropic-ai/sdk`
- `@anthropic-ai/sdk` added to `apps/web` dependencies
- `@antellion/prompts` added to `apps/web` dependencies
- LLM call in `generateReport()` action after `buildJourneyMetadata()`, stored as `metadata.executiveSummaryProse`
- Graceful fallback: try/catch, validation of parsed JSON, minimum length check

`JourneyMetadata` in `journey-types.ts` extended with:
```ts
executiveSummaryProse?: { situation: string; topRecommendation: string };
```

Renderer wiring:
- `JourneyReportRenderer` imports CoverPage + ExecutiveSummaryCard
- Props added: `clientDomain?: string | null`, `clientIndustry?: string | null`
- `renderFlatPath()` signature updated to accept domain/industry
- Both components render first (before AssessmentParametersBlock, ExecutiveDecisionPage)
- Export page: legacy `CoverPageView` now skipped for journey-format reports (renderer renders its own)
- Dashboard detail page: `client.industry` added to Prisma select

**Why:** Export page previously had its own CoverPageView for legacy format only; journey-format had no cover page. Now renderer owns it.
**How to apply:** When adding new props to JourneyReportRendererProps, thread them through renderFlatPath() signature too.
