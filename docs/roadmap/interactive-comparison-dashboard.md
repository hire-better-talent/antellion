# Roadmap: Interactive Comparison Dashboard

**Status:** Proposed
**Author:** Architect
**Date:** 2026-04-04
**Priority:** High (the shift from consulting deliverable to SaaS platform)
**Source:** Competitive intelligence from Opinly.ai

---

## Problem

TalentSignal's primary engagement surface is a static report. The VP TA receives a PDF or HTML export, reads it once, maybe shares it internally, and does not interact with the platform again until the next assessment. The report is a deliverable, not a product.

This creates three problems:

1. **No stickiness.** Once the report is delivered, there is no reason to log in. Usage drops to zero between assessments. Churn risk is high because the client does not build a habit around the product.
2. **No self-service exploration.** The VP TA cannot drill into specific queries, compare against a specific competitor, filter by time period, or focus on a specific decision stage. They get the analyst's narrative, not their own investigation. Questions like "how do we compare against Stripe specifically for engineering roles?" require a new assessment, not a filter change.
3. **No SaaS justification.** A static report justifies a one-time fee. An interactive dashboard that the VP TA opens weekly justifies a monthly subscription. The dashboard is the product; the report becomes the onboarding artifact.

Opinly.ai and similar competitive intelligence tools have demonstrated that the shift from deliverable to dashboard is what enables SaaS pricing in the visibility/brand intelligence space.

---

## Current State

### What exists

- **Scan comparison data** in `scan-comparison.ts`: per-competitor mention rates, visibility scores, sentiment scores, citation gap analysis (client-exclusive, gap, shared domains). All computed deterministically from scan results.
- **Journey analysis** in `decision-journey/`: per-stage earned visibility rates, competitor matrices, positioning narratives, remediation plans. Rich structured data already produced per report.
- **Report metadata** (JSON on `Report`): contains `journeyAnalysis`, `competitors`, `remediationPlan`, `visibilityBoundary`, `overallThemes`, `assessmentParameters`, per-segment data when applicable. This is the full analytical output, already structured.
- **AssessmentBaseline** with `baseline-comparison.ts`: longitudinal data comparing assessments over time. Produces `MetricChange` arrays with direction and significance.
- **Snapshot composer** (`snapshot-composer.ts`): lightweight visibility summary with metrics and competitor comparison.
- **Per-segment reporting** (spec complete): when implemented, provides per-focusArea breakdowns within a single assessment.

### What is missing

1. No client-facing login. All current access is operator/analyst-facing.
2. No interactive visualization components -- all data rendering is static HTML for print/export.
3. No drill-down capability from summary metrics to underlying queries/results.
4. No time-period filtering or competitor selection controls.
5. No real-time or near-real-time data updates (reports are generated once and read).

---

## Design

### 1. Dashboard architecture

The dashboard is a new authenticated surface for client users (VP TA, CHRO, etc.), distinct from the operator/analyst dashboard.

**Route structure:**
```
/dashboard/[clientId]/              -- Overview with key metrics
/dashboard/[clientId]/discovery     -- Discovery stage deep-dive
/dashboard/[clientId]/evaluation    -- Evaluation stage deep-dive
/dashboard/[clientId]/consideration -- Consideration stage deep-dive
/dashboard/[clientId]/commitment    -- Commitment stage deep-dive
/dashboard/[clientId]/competitors   -- Competitor comparison matrix
/dashboard/[clientId]/queries       -- Query-level drill-down
/dashboard/[clientId]/citations     -- Citation ecosystem view
/dashboard/[clientId]/trends        -- Longitudinal trend view (requires monitoring data)
```

**Data source:** The dashboard reads from the same `Report.metadata` and `AssessmentBaseline` data that powers the static report. It does NOT query raw scan results directly -- the analytical layer (journey analysis, comparison, confidence) has already been computed. The dashboard is a presentation layer over pre-computed data.

This is a critical architectural decision: the dashboard does not introduce a new analytical pipeline. It renders the same structured outputs that the report consumes, but with interactive controls instead of a static document.

### 2. Overview page

The overview page replaces the executive summary section of the report as the primary engagement surface.

**Key metrics panel (top):**
- Earned visibility rate (overall) with trend indicator (up/down/flat vs. previous assessment)
- Per-stage earned visibility as four metric cards (Discovery, Evaluation, Consideration, Commitment)
- Top competitor gap (pp) with competitor name
- Citation coverage rate

**Competitor comparison table (middle):**
- Sortable table: Competitor, Mention Rate, Avg Visibility, Avg Sentiment, Threat Level
- Click a competitor row to drill into the head-to-head comparison
- Data source: `report.metadata.competitors`

**Visibility boundary visualization (bottom):**
- Visual representation of query specificity vs. mention rate
- Shows where the client first appears (broad, industry, niche, branded)
- Data source: `report.metadata.visibilityBoundary`

### 3. Stage deep-dive pages

Each stage page shows:
- Stage-specific earned visibility rate and mention rate
- Queries in this stage, grouped by theme/cluster
- Per-query: mentioned (yes/no), visibility score, cited sources, competitor mentions
- Filterable by: query cluster, mentioned/not-mentioned, competitor present/absent
- Data source: journey analysis stage data from `report.metadata.journeyAnalysis`

### 4. Competitor comparison page

Interactive comparison matrix:
- Select 1-3 competitors to compare against the client
- Dimension selection: overall, by stage, by theme, by citation source
- Side-by-side metric comparison with visual bars
- "Where you win" / "Where you lose" summary
- Data source: `report.metadata.competitors` and per-stage competitor data

### 5. Query drill-down page

Full query-level exploration:
- Searchable, filterable table of all queries
- Columns: query text, stage, theme, mentioned, visibility score, sentiment, top competitor, citations
- Filters: stage, theme, mentioned/not-mentioned, visibility score range, has citations
- Click a query to see full AI response text and citation details
- Data source: this requires scan result data, not just report metadata. Either:
  - **Option A:** Include relevant scan result summaries in report metadata at generation time (increases metadata size but keeps dashboard reads fast).
  - **Option B:** Query `ScanResult` records on demand (requires the dashboard to have DB access beyond report metadata).
  - **Recommended: Option A for summary data, Option B for full response text.** The dashboard metadata includes query text, mention status, score, and citations. Full response text loads on demand.

### 6. Trend page (requires Continuous Monitoring)

Longitudinal view:
- Time-series chart of earned visibility rate across monitoring runs
- Per-stage trend lines
- Competitor trend comparison (how competitor visibility changes relative to client)
- Alert history timeline
- Data source: `AssessmentBaseline` records + monitoring run diffs

This page is only valuable once Continuous Monitoring (separate roadmap item) is implemented. Show a "monitoring not yet enabled" state until then.

### 7. Client authentication

The dashboard requires client users to authenticate. This introduces a new user role:

- **CLIENT_VIEWER**: can view their own client's dashboard. Cannot access operator tools, scan recording, report generation, or other clients.
- The `User.role` enum already supports OWNER/ADMIN/MEMBER/VIEWER. CLIENT_VIEWER could be a new enum value, or the existing VIEWER role could be scoped to specific clients via a join table.

**Recommended approach:** Add a `ClientAccess` join table (`userId`, `clientId`, `accessLevel`) that grants specific users access to specific client dashboards. This supports the common case where a VP TA at Acme should only see Acme's dashboard, not other clients.

**Authentication mechanism:** Use the same auth system planned for the operator app (referenced in CLAUDE.md priorities). The dashboard is a set of routes within the same Next.js app, gated by role and client access checks.

---

## Dependencies

- **Report metadata structure:** The dashboard reads from `Report.metadata`. The existing journey metadata output is already well-structured for this. No changes needed to the analytical pipeline.
- **Per-segment reporting (roadmap item):** When segments exist, each stage deep-dive page should support a segment filter. The dashboard design accommodates this by checking for `metadata.segments`.
- **Continuous monitoring (roadmap item):** The trend page depends on having multiple data points over time. Without monitoring, the trend page shows assessment-to-assessment comparison only.
- **Authentication (CLAUDE.md priority):** Client-facing access requires auth. This is already a listed priority.
- **No dependency on per-segment reporting for initial launch.** The dashboard works with single-segment data. Segment support is additive.

---

## Implementation Phases

### Phase 1: Read-only overview dashboard (3-4 days)

1. Build the overview page reading from existing `Report.metadata`.
2. Competitor comparison table with sorting.
3. Stage metric cards.
4. No auth -- accessible via a shareable link with a token (similar to report export link pattern).
5. No drill-down yet.

**Value:** Replaces the static report as the primary presentation surface. Can be shown in demos. The shareable link approach bypasses the auth dependency.

### Phase 2: Stage deep-dives and competitor comparison (3-4 days)

1. Per-stage pages with query-level data.
2. Interactive competitor comparison page.
3. Filter and sort controls.
4. Include query summary data in report metadata at generation time.

### Phase 3: Client authentication and access control (2-3 days)

1. Add CLIENT_VIEWER role or `ClientAccess` join table.
2. Auth-gated dashboard routes.
3. Client user invitation flow (operator sends invite link).

### Phase 4: Query drill-down and trend page (3-4 days)

1. Full query explorer with search and filters.
2. On-demand response text loading.
3. Trend page (functional once monitoring data exists).
4. Alert history integration.

---

## Estimated Total Effort

11-15 days of development across all phases. Phase 1 alone is demoable and shippable as a "live report view" that significantly improves client engagement.

---

## Architecture Notes

**Where the logic lives:**

- **No new analytical logic in `packages/core`.** The dashboard consumes pre-computed data from report metadata. The analytical pipeline is unchanged.
- **Dashboard components in `apps/web`.** New route group under `/dashboard/[clientId]/`. Uses the same Next.js App Router patterns as the existing operator dashboard.
- **Shared visualization components in `packages/ui`.** Metric cards, comparison tables, trend charts can be generic enough for reuse. Start in `apps/web` and promote to `packages/ui` when patterns stabilize.
- **Data access patterns:** Dashboard pages are server components that fetch `Report` records (most recent PUBLISHED report for the client). No direct scan result queries except for the query drill-down (Phase 4).

**What does NOT change:**

- Report generation pipeline -- same outputs, consumed differently.
- Scan execution -- no changes.
- `packages/core` domain logic -- no changes.
- Report export -- the static export continues to work alongside the dashboard.

**Key constraint:** The dashboard must not introduce its own analytical pipeline or duplicate computation from `packages/core`. It is a read-only presentation layer. If a dashboard feature requires new computation, that computation belongs in `packages/core` and should be pre-computed at report generation time, not computed on page load.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|------|-----------|
| Report metadata may not contain enough granularity for drill-downs | Audit current metadata structure against dashboard requirements in Phase 1. Extend metadata at report generation time if needed -- this is a backward-compatible addition. |
| Auth dependency blocks client access | Phase 1 uses shareable token links (same pattern as report export). Auth is a Phase 3 concern. |
| Dashboard diverges from report content | The dashboard reads the same metadata. If they diverge, it means metadata was changed without updating the dashboard renderer -- standard regression testing catches this. |
| Client users expect real-time data | Set expectations: dashboard reflects the most recent assessment/monitoring run, not live AI queries. Freshness depends on monitoring frequency. |
| Visualization library dependency | Avoid heavy charting libraries. Start with HTML/CSS-based metric cards and tables (consistent with the existing minimal-dependency approach). Add a lightweight chart library (e.g., recharts, already common in Next.js) only for the trend page in Phase 4. |

---

## Strategic Value

The dashboard is the product pivot from consulting to SaaS:

- **Without dashboard:** Client receives a PDF. Engagement is episodic. Value perception decays between assessments. Pricing model: per-assessment fee.
- **With dashboard:** Client logs in weekly to check visibility metrics. Engagement is continuous. Value perception is reinforced by every login. Pricing model: monthly subscription with dashboard access.

The dashboard also creates natural upsell paths:
- "Want to see your trend over time? Enable continuous monitoring."
- "Want per-segment breakdowns? Upgrade to enterprise assessment."
- "Want to compare against 5 more competitors? Add them to your profile."

The technical investment is moderate because the dashboard is a presentation layer over existing data -- no new analytical pipeline required.
