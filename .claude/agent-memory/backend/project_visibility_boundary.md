---
name: Visibility boundary analysis — implementation
description: nicheKeywords on Client, specificity-tagged Discovery queries, boundary detection, and report metadata integration
type: project
---

Visibility boundary analysis is implemented end-to-end as of 2026-03-31.

**Why:** The founder needed the finding for a client meeting the next day. The boundary tells executives how narrow their AI presence is — visible only at "timeshare sales" level but not at "hospitality sales" or "sales jobs".

**What was built:**

- `Client.nicheKeywords` added to Prisma schema (String? @db.Text), migrated via db:push
- `CreateClientSchema` and `UpdateClientSchema` extended with `nicheKeywords: z.string().max(1000).optional()`
- `createClient` and `updateClient` actions pass `nicheKeywords` through to Prisma
- `ClientForm` has a new "Niche keywords" field with help text; edit page selects `nicheKeywords`
- `packages/core/src/visibility-boundary.ts` — pure functions:
  - `generateBoundaryQueries(input)` — 6 template families × 4 specificity levels, skips hyper_specific when no geography, generates one niche/hyper-specific variant per keyword
  - `detectVisibilityBoundary(input)` — groups results by "boundary:{level}" intent, computes per-level rates, finds first appears, builds competitor boundaries from metadata.competitorMentions, generates narrative
  - `parseBoundarySpecificity`, `hasSufficientBoundaryData`, `filterBoundaryResults` — helpers
- Core index exports all boundary types and functions
- `generateQueries` action: fetches client.nicheKeywords, generates boundary queries, creates a "Visibility Boundary — Discovery" cluster with intent="boundary:{specificity}" on each query
- `generateReport` action: fetches query.intent in scan result select, filters boundary results, calls `detectVisibilityBoundary` if `hasSufficientBoundaryData` passes, stores `visibilityBoundary` in Report.metadata
- `journey-types.ts` — `JourneyMetadata.visibilityBoundary` optional field added
- `JourneyReportRenderer.tsx` — `VisibilityBoundarySubsection` component renders boundary table and narrative when `meta.visibilityBoundary` is present
- `GenerateQueriesForm` — shows niche keyword hint when a client is selected (green note with keywords, or link to edit profile)

**How to apply:** When working on the report or query generation pipeline, boundary analysis participates in both without schema changes. The intent field "boundary:{level}" is the only coupling between generation and detection. Reports with no boundary-tagged results silently omit the section.
