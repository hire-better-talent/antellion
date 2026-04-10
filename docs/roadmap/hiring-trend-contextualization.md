# Roadmap: Hiring Trend Contextualization

**Status:** Proposed
**Author:** Architect
**Date:** 2026-04-04
**Priority:** Medium (powerful cold outreach differentiation, not core platform)
**Source:** Competitive intelligence from Opinly.ai

---

## Problem

TalentSignal's AI visibility data exists in a vacuum. When the report says "Competitor X has 75% mention rate for engineering roles," the VP TA wonders: "so what?" The data becomes vastly more compelling when juxtaposed with real hiring activity:

> "Stripe posted 47 engineering roles this quarter, but when candidates ask AI about top engineering employers, Stripe appears in only 2 of 8 queries. They are hiring aggressively into a visibility gap."

This contextualization turns abstract visibility metrics into concrete business intelligence. It answers the question every VP TA actually cares about: "are my competitors out-hiring me because they are more visible to candidates in AI?"

For cold outreach Snapshots, this is a unique differentiator. Nobody else combines AI visibility data with real-time hiring activity to identify mismatches. A DM that says "you posted 30 open roles but AI does not recommend you as an employer" is significantly more compelling than "your AI visibility score is low."

---

## Current State

### What exists

- **Snapshot scan mode** (`snapshot-queries.ts`, `snapshot-composer.ts`): produces a lightweight visibility summary for cold outreach. Already includes competitor comparison and gap identification.
- **Snapshot outreach guide** (`docs/snapshot-outreach-guide.md`): DM templates and outreach strategy for using snapshot data.
- **RoleProfile model**: stores role titles and categories per client. Could store hiring volume metadata.
- **Client and Competitor models**: store company identity and basic profile fields. No hiring activity data.
- **`Client.metadata` and `Competitor.metadata`** (JSON columns): extensible storage for profile enrichment data.

### What is missing

1. No external hiring data ingestion from any source.
2. No data model for storing job posting counts or hiring velocity.
3. No correlation logic between hiring activity and AI visibility.
4. No rendering of hiring context in reports or snapshots.

---

## Design

### 1. Data scope -- what to capture

Keep the data model simple. We do NOT need full job posting data (titles, descriptions, locations, salaries). We need three numbers per company per time period:

```typescript
interface HiringSignal {
  companyName: string;
  period: string;           // "2026-Q1", "2026-03", or "2026-W14"
  totalOpenRoles: number;   // total active job postings
  engineeringRoles?: number; // optional breakdown by function
  salesRoles?: number;
  otherRoles?: number;
  source: string;           // "theirstack" | "linkedin" | "careers_page" | "manual"
  capturedAt: string;       // ISO date
}
```

This is intentionally minimal. The value is in the juxtaposition with visibility data, not in the hiring data itself. We are not building a job board or hiring analytics tool.

### 2. Data sources (ranked by feasibility)

**Tier 1: Theirstack API (recommended starting point)**
- Theirstack aggregates job posting data from company career pages.
- API provides company-level job counts by category.
- Cost: usage-based pricing, typically $0.01-$0.05 per company lookup.
- Reliability: high for tech companies, medium for others.
- Integration effort: REST API call, JSON response parsing.

**Tier 2: LinkedIn public data**
- LinkedIn company pages show "N open jobs" as public information.
- No official API for this specific data point (LinkedIn API is restrictive).
- Can be captured via the operator during client/competitor research (manual entry).
- Integration effort: manual entry field on Client/Competitor profile.

**Tier 3: Manual entry by operator**
- The operator visits the company's careers page during assessment setup and enters the approximate job count.
- Zero API cost, zero integration effort.
- Accuracy: good enough for the comparative narrative ("~50 open roles" vs "~200 open roles").

**Recommended approach:** Start with Tier 3 (manual entry) to validate the value proposition. Add Tier 1 (Theirstack) when the feature proves valuable in outreach. Never build Tier 2 as a scraping pipeline.

### 3. Data storage

**Phase 1: Store in entity metadata (JSON).**

Add hiring signal data to `Client.metadata` and `Competitor.metadata`:

```typescript
// In Client.metadata or Competitor.metadata
{
  hiringSignals?: Array<{
    period: string;
    totalOpenRoles: number;
    roleBreakdown?: Record<string, number>;
    source: string;
    capturedAt: string;
  }>;
}
```

This avoids schema migration and leverages the existing extensible JSON columns. The array supports historical data points (one per capture period) for trend comparison.

**Phase 2 (deferred): First-class `HiringSignal` model.**

Only if we need queryable, indexable hiring data across all clients (e.g., for benchmarking or trend analysis). The JSON approach is sufficient for per-client contextualization.

### 4. Contextualization logic

New function in `packages/core`, likely `src/hiring-context.ts`:

```typescript
interface HiringContextInput {
  clientName: string;
  clientHiringSignal?: HiringSignal;
  clientVisibilityRate: number;
  competitors: Array<{
    name: string;
    hiringSignal?: HiringSignal;
    mentionRate: number;
  }>;
}

interface HiringContextOutput {
  // Client's own hiring-visibility mismatch
  clientMismatch?: {
    totalRoles: number;
    visibilityRate: number;
    narrative: string;
    // e.g., "Acme has 47 open engineering roles but appears in only 12% of AI discovery queries."
  };

  // Competitor hiring-visibility comparisons
  competitorMismatches: Array<{
    competitorName: string;
    totalRoles: number;
    mentionRate: number;
    hiringVsVisibilityRatio: number;
    narrative: string;
    // e.g., "Stripe posted 120 engineering roles and appears in 75% of AI queries.
    //         Acme posted 47 roles but appears in only 12%."
  }>;

  // Aggregated DM-ready finding
  dmFinding?: {
    headline: string;
    detail: string;
    // e.g., headline: "Hiring into a visibility gap"
    //        detail: "You have 47 open roles but AI recommends your competitors 4x more often."
  };
}
```

The narratives are deterministic templates, not LLM-generated. They follow the same pattern as `baseline-comparison.ts` narratives.

### 5. Integration points

**Snapshot outreach:** The `snapshot-composer.ts` output gains an optional `hiringContext` field. When hiring data is available for the prospect or their competitors, the snapshot includes the mismatch narrative. The outreach DM template in `snapshot-outreach-guide.md` gains a new variant:

> "[Name], [Company] posted [N] open roles this quarter, but when I asked ChatGPT to recommend [industry] employers, [Company] was not mentioned. Your competitors [Competitor1] and [Competitor2] were. This is a fixable gap."

**Full assessment reports:** The report executive summary gains an optional hiring context paragraph when data is available. This enriches the "so what" of visibility metrics with concrete hiring activity numbers.

**Interactive dashboard (separate roadmap item):** The overview page can show a "hiring activity vs. AI visibility" comparison widget when data is available.

### 6. Operator workflow for data capture

**Manual entry (Phase 1):**
- Add "Open Roles (approx.)" field to the Client edit form and Competitor edit form.
- The operator fills this in during client/competitor research (already part of assessment setup).
- Store as the most recent `hiringSignal` entry in entity metadata.
- Optional: add "Source" dropdown (Careers Page, LinkedIn, Theirstack, Other).

**API enrichment (Phase 2):**
- Add a "Fetch hiring data" button on the Client/Competitor profile page.
- On click, calls the Theirstack API (or configured provider) with the company name/domain.
- Displays the result for operator review before saving.
- The operator confirms or adjusts the number.
- Never auto-save API data without operator review -- accuracy matters for client-facing narratives.

---

## Dependencies

- **Snapshot composer** (`snapshot-composer.ts`): the primary consumer for cold outreach.
- **Report composer** (`report-composer.ts`): optional enrichment for full assessments.
- **Client/Competitor metadata**: storage location for Phase 1.
- **No dependency on Continuous Monitoring or Interactive Dashboard.** This feature stands alone as a data enrichment layer.

---

## Implementation Phases

### Phase 1: Manual capture and contextualization (2-3 days)

1. Add `openRoles` field to Client and Competitor edit forms (stored in entity metadata).
2. Build `computeHiringContext()` in `packages/core/src/hiring-context.ts`.
3. Integrate into `snapshot-composer.ts` -- include hiring context when data is available.
4. Update snapshot outreach templates with hiring context variants.

**Value:** Operators can manually enrich snapshots with hiring data for more compelling cold outreach DMs. Zero API cost, zero external dependencies.

### Phase 2: Theirstack API integration (2-3 days)

1. Add Theirstack API client in `packages/core/src/integrations/theirstack.ts`.
2. Add "Fetch hiring data" action on Client/Competitor profile pages.
3. Store API results in entity metadata with source attribution.
4. Auto-suggest hiring data fetch during assessment setup when `openRoles` is empty.

### Phase 3: Report integration (1-2 days)

1. Add optional hiring context section to report executive summary.
2. Include hiring-visibility mismatch in recommendation generation when data supports it.
3. Add hiring context to the interactive dashboard overview (when dashboard exists).

---

## Estimated Total Effort

5-8 days of development across all phases. Phase 1 alone (2-3 days) delivers the outreach differentiation value.

---

## Architecture Notes

**Where the logic lives:**

- **`packages/core/src/hiring-context.ts`**: all contextualization logic. Pure functions, no IO. Takes hiring signals and visibility data, returns structured narratives.
- **`packages/core/src/integrations/theirstack.ts`** (Phase 2): API client for Theirstack. Handles authentication, request formatting, response parsing. Returns `HiringSignal` objects.
- **`apps/web`**: form fields for manual entry, "Fetch hiring data" action, snapshot/report rendering updates.

**What does NOT change:**

- Scan execution pipeline -- hiring data is separate from AI visibility scanning.
- Query generation -- queries are not influenced by hiring data.
- `AssessmentBaseline` -- hiring signals are not part of the baseline comparison (they are context, not core metrics).

**Critical constraint: Do NOT build a job scraping pipeline.** The explicit requirement is to use existing APIs and services (Theirstack, manual entry), not to crawl career sites. Job data freshness and accuracy are someone else's problem. We consume their output.

---

## Risks and Tradeoffs

| Risk | Mitigation |
|------|-----------|
| Hiring data is stale or inaccurate | Manual entry captures "approximate" counts. Theirstack data has inherent lag. Both are acceptable for comparative narratives ("~50 roles" vs "~200 roles"). Exact numbers are not needed. |
| Theirstack API cost or availability changes | Phase 1 works with manual entry only. API integration is additive. The core value (contextualization logic) has zero external dependency. |
| Hiring data availability varies by company | The contextualization logic gracefully handles missing data: if no hiring signal exists, the section is omitted. Partial data (client has it, competitor does not) still produces useful narratives. |
| Feature scope creep toward job analytics | Keep the scope tight: job counts only, no descriptions/locations/salaries. We are contextualizing visibility data, not building a job intelligence product. |
| Data freshness expectations | Display "as of [capturedAt]" on all hiring data. The operator controls when to refresh. |

---

## Strategic Value

Hiring trend contextualization serves two purposes:

1. **Cold outreach differentiation.** The combination of "you are hiring X roles" + "AI does not recommend you" is a finding nobody else produces. It transforms the snapshot from "interesting AI data" into "you are spending money on hiring into a visibility gap." This is a compelling reason to take a meeting.

2. **Report credibility.** Grounding AI visibility metrics in real hiring activity makes the assessment feel more relevant to the VP TA's actual problems. "You have low AI visibility" is abstract. "You have 50 open roles and low AI visibility" connects to budget, hiring velocity, and cost-per-hire -- metrics the VP TA already tracks.

The technical investment is minimal (2-3 days for Phase 1) because the feature is primarily about data capture (a form field) and narrative generation (a pure function). The complexity lives in the external data source, which we deliberately outsource.
