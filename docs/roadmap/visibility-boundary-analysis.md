# Roadmap: Visibility Boundary Analysis

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** High (highest-value Discovery finding, extends journey framework)

---

## Problem

The current assessment treats all Discovery queries as a flat pool. A client gets one mention rate across all Discovery queries, and that number tells the executive "you're visible 50% of the time." But this hides the most important structural question: *how specific does a candidate's query need to be before AI mentions this company?*

A client may be invisible for broad queries ("best sales jobs") but visible for niche queries ("best timeshare sales jobs"). The point where they first appear -- the **visibility boundary** -- reveals how discoverable they are to the broader talent market versus only to candidates who already know their niche.

This is the highest-value Discovery finding because it tells the client:

1. **How narrow their AI presence is.** A company that only appears at the niche level is invisible to the broad talent pool.
2. **What the talent pool looks like at each specificity level.** Broad queries capture massive candidate pools; niche queries capture small ones. A niche-only presence means the company is fishing in a pond, not an ocean.
3. **What it would take to expand visibility to the next level.** Moving from niche to industry visibility is a different remediation strategy than moving from industry to broad.

This analysis also creates the clearest competitive gap story: "Marriott appears at the industry level -- any candidate exploring hospitality sales encounters Marriott. HGV appears only at the niche level -- candidates must already know about timeshare/vacation ownership as a career path to discover HGV."

---

## Current state

### What exists

- **Discovery templates** in `query-intelligence.ts` use `{industry}`, `{role}`, and `{geography}` placeholders. They produce queries like "best {industry} companies to work for in {geography}" and "top companies for {role} in {geography}". These are all at roughly the same specificity level -- industry + geography or role + geography.
- **`DecisionStage`** is already on both the `Query` and `QueryCluster` Prisma models. Discovery queries are tagged `DISCOVERY`.
- **`QueryGenerationInput`** accepts `industry?: string` and `businessContext?: string`. The `businessContext` field is passed through the server action and schema but is unused by `generateRawQueries()` -- it never influences template expansion. The `natural-query-language.md` and `query-context-awareness.md` roadmap specs both identify this as a gap.
- **`Client` model** has `industry: String?` and `description: String? @db.Text`. No field exists for niche keywords or business model terms.
- **`JourneyAnalysis`** computes per-stage mention rates and competitive gaps. There is no sub-stage analysis within Discovery.

### What is missing

1. No concept of query specificity levels. All Discovery queries are treated identically.
2. No structured field for niche terms. The client's business model specifics (e.g., "timeshare," "vacation ownership") live nowhere unless the operator writes them into the free-text `description` or `businessContext` fields.
3. No mechanism to generate query variants at different specificity levels from the same template base.
4. No post-scan analysis that identifies where the visibility boundary falls.

---

## Design

### Specificity levels

Define four levels of query specificity for Discovery queries. Each level adds one dimension of constraint:

| Level | Structure | Example (HGV, Sales) | Candidate pool |
|---|---|---|---|
| **Broad** | Function only | "best sales jobs", "top companies hiring salespeople" | Massive -- every sales professional |
| **Industry** | Function + sector | "best hospitality sales jobs", "top sales jobs in travel" | Large -- sales professionals interested in the sector |
| **Niche** | Function + specific business model | "best timeshare sales jobs", "vacation ownership sales careers" | Small -- candidates who know the sub-segment exists |
| **Hyper-specific** | Niche + geography or other qualifier | "best timeshare sales jobs in Orlando", "vacation ownership sales remote" | Very small -- candidates who know the sub-segment and have a location preference |

The levels are ordered by candidate pool size. Moving from niche to industry visibility means moving from a small pond to a large one. The boundary tells the client where their reach currently stops.

### Client profile as input

The specificity levels derive from client context already partially captured on the `Client` and `QueryGenerationInput` types:

- **Function**: from `RoleProfile.title` (e.g., "Sales Representative")
- **Industry**: from `Client.industry` (e.g., "Hospitality")
- **Niche terms**: **new** -- not currently captured in a structured way
- **Geography**: from the geography passed at query generation time

The niche terms are the critical missing piece. These are the specific business model descriptors that distinguish a company's sub-segment from its broader industry. For HGV: "timeshare," "vacation ownership." For a legal tech startup: "contract lifecycle management," "CLM." For a defense contractor: "electronic warfare," "EW systems."

**Recommended approach:** Add a `nicheKeywords` field to the `Client` model. The operator provides these during client setup. This is the most reliable option -- the operator knows "timeshare" and "vacation ownership" better than any scraper or extraction heuristic would.

```prisma
model Client {
  // ... existing fields ...
  nicheKeywords  String?  // Comma-separated niche business model terms
}
```

Why not extract from `description`? The description is free-text and may or may not contain the right terms. Making niche terms explicit creates a clean, predictable input to the generation pipeline. The field is optional -- clients without niche keywords simply get three specificity levels (broad, industry, hyper-specific) instead of four.

Why not a `String[]` / JSON array? A comma-separated `String?` is simpler for the initial implementation, avoids JSON column handling in forms, and can be split at runtime. Upgrade to a proper array later if needed.

### Query generation

For each Discovery template theme, generate variants at each specificity level. The generation pipeline in `generateRawQueries()` already expands templates using a `vars` record. This feature adds a `specificity` dimension.

**New template set structure:**

For a base Discovery intent like "employer ranking," generate four variants:

```
Broad:           "best companies for sales professionals"
Industry:        "best companies for sales in hospitality"
Niche:           "best companies for timeshare sales"
Hyper-specific:  "best companies for timeshare sales in Orlando"
```

This is not 4x the entire template set. Only Discovery templates get specificity variants. Consideration, Evaluation, and Commitment templates already name the company and are unaffected.

**Implementation approach:**

Add a `specificity` field to `GeneratedQuery`:

```typescript
export type SpecificityLevel = "broad" | "industry" | "niche" | "hyper_specific";

export interface GeneratedQuery {
  text: string;
  intent: string;
  theme: QueryTheme;
  stage: DecisionStage;
  priority: number;
  specificity?: SpecificityLevel;  // Only set on Discovery queries
}
```

The `specificity` field is optional because it only applies to Discovery queries. Non-Discovery queries leave it undefined.

**Template expansion strategy:**

Rather than creating 4x copies of every Discovery template, define a small set of *specificity-aware* Discovery templates that use a `{specificity_prefix}` pattern:

```typescript
const SPECIFICITY_TEMPLATES: Array<{
  broad: string;
  industry: string;
  niche: string;
  hyperSpecific: string;
  intent: string;
  theme: QueryTheme;
}> = [
  {
    broad:         "best companies for {role}",
    industry:      "best {industry} companies for {role}",
    niche:         "best companies for {niche} {role}",
    hyperSpecific: "best companies for {niche} {role} in {geography}",
    intent: "Employer ranking at varying specificity",
    theme: "reputation",
  },
  {
    broad:         "top companies hiring {role}",
    industry:      "top {industry} companies hiring {role}",
    niche:         "top companies hiring for {niche} {role}",
    hyperSpecific: "top companies hiring for {niche} {role} in {geography}",
    intent: "Hiring-focused employer discovery at varying specificity",
    theme: "reputation",
  },
  // ... 6-10 template families, covering reputation, compensation, culture themes
];
```

Each family expands into 4 queries (3 if no `nicheKeywords`, 3 if no `geography`). With 8 template families, this produces 24-32 specificity-tagged Discovery queries -- a manageable addition to the existing ~23 Discovery templates.

**Interaction with existing Discovery templates:** The existing Discovery templates remain. They are roughly at the "industry" specificity level already (they use `{industry}` and `{geography}`). The new specificity templates add the broad, niche, and hyper-specific variants that the existing set lacks. Tag existing Discovery templates with `specificity: "industry"` so they participate in boundary detection.

### Schema impact

**Prisma changes:**

1. Add `nicheKeywords: String?` to `Client`.
2. Optionally add `specificity` to `Query` model as a nullable enum. However, the lighter approach is to store specificity only on the `GeneratedQuery` type and compute it at analysis time from query text + client context. The Query model already stores `stage: DecisionStage?` which is the coarser dimension; specificity is a finer-grained sub-classification within Discovery.

**Recommended:** Do not add a `specificity` column to the Prisma `Query` model in Phase 1. Instead, tag specificity at generation time and carry it through as query metadata. If boundary analysis proves valuable and we want to filter/sort queries by specificity in the UI, add the column in a follow-up migration. This avoids a schema migration for an experimental feature.

How to carry specificity without a schema column: store it in the query's `intent` field (which already contains descriptive text) using a suffix convention like `"(broad)"`, or add it to the `QueryCluster.description`. The cleanest option is to compute specificity at analysis time: given the client's niche keywords, industry, and geography, classify each Discovery query by which terms it contains. This is deterministic and does not require stored state.

### Boundary detection

After scanning, compute the visibility boundary per client and per competitor. This is a post-scan analysis function in `packages/core`, alongside `computeJourneyAnalysis()`.

```typescript
// packages/core/src/decision-journey/boundary-analysis.ts

export interface VisibilityBoundary {
  /** The most general specificity level at which the entity first appears. */
  firstAppearsAt: SpecificityLevel | "never";
  /** Fraction of queries at the boundary level where the entity is mentioned (0-1). */
  consistencyAtBoundary: number;
  /** Total queries scanned at each specificity level. */
  queriesPerLevel: Record<SpecificityLevel, number>;
  /** Mention rate at each specificity level. */
  mentionRatePerLevel: Record<SpecificityLevel, number>;
}

export interface BoundaryAnalysis {
  client: VisibilityBoundary;
  competitors: Array<{
    name: string;
    boundary: VisibilityBoundary;
  }>;
  /** Human-readable gap summary. */
  boundaryGap: string | null;
}
```

**Detection algorithm:**

1. Group all Discovery scan results by specificity level.
2. For each level (broad -> industry -> niche -> hyper_specific), compute the client's mention rate.
3. The first level where mention rate exceeds a threshold (e.g., > 0 or > 0.25) is the boundary.
4. Repeat for each competitor using competitor mention extraction from `metadata.competitorMentions`.
5. Compute the gap: if the top competitor's boundary is at a broader level than the client's, that is the boundary gap.

**Threshold choice:** Use > 0 (any mention) for the initial implementation. "First appears at" means "first level where AI mentions you at all." Consistency is a separate metric that captures whether the appearance is reliable. A stricter threshold (e.g., > 0.25) can be used for a "reliably appears at" variant.

**Confidence:** Boundary detection on 2-3 queries per level is preliminary. The analysis should include query counts per level and flag when any level has fewer than 3 queries. The existing `computeStageConfidence()` pattern in `stage-confidence.ts` provides the model for this.

### Report section

A new subsection within the Decision Journey section (Section 2 of the report blueprint). It appears after the journey summary table and funnel narrative, and before the per-stage deep dives. It answers the question: "Within Discovery, how narrow is our visibility?"

**Section title:** "Visibility Boundary Analysis"

**Structure:**

1. **Opening sentence:** Frame the insight.
   > "Not all Discovery queries are equal. A candidate searching 'best sales jobs' represents a far larger talent pool than one searching 'best timeshare sales jobs in Orlando.' The following analysis identifies the level of query specificity where [Client] first becomes visible to candidates."

2. **Boundary table:**

   | Specificity Level | Example Query | Client Appears? | Mention Rate | Top Competitor | Top Competitor Appears? |
   |---|---|---|---|---|---|
   | Broad | "best companies for sales professionals" | No | 0% | Marriott | Yes (67%) |
   | Industry | "best hospitality companies for sales" | No | 0% | Marriott | Yes (75%) |
   | Niche | "best companies for timeshare sales" | Yes | 50% | Marriott | Yes (50%) |
   | Hyper-specific | "best companies for timeshare sales in Orlando" | Yes | 100% | Marriott | No (0%) |

3. **Boundary narrative (1 paragraph):**
   > "HGV's visibility begins at the niche level. Candidates must already know about timeshare or vacation ownership as a career path to discover HGV through AI. Marriott appears at the industry level -- any candidate exploring hospitality sales encounters Marriott before HGV. This means HGV is competing for a sub-segment of the talent pool while Marriott captures the full pipeline."

4. **Talent pool framing (1 sentence):**
   > "Broad sales queries represent the largest candidate pool. HGV's absence at this level means the company is invisible to the majority of candidates who begin their AI-assisted job search without a specific sub-industry in mind."

5. **Recommendation tie-in (1-2 sentences):**
   > "To expand beyond niche visibility, HGV needs presence on the platforms AI cites for industry-level hospitality sales queries. The Citation Ecosystem section identifies these platforms."

**Tone:** Follow the report blueprint's voice guidelines. State findings directly. Quantify consequences. Frame every gap as fixable.

### Integration with existing systems

**Query intelligence pipeline (`query-intelligence.ts`):**
- Add niche keywords to `QueryGenerationInput` as `nicheKeywords?: string[]`.
- Add a new expansion pass in `generateRawQueries()` or a parallel function `generateSpecificityQueries()` that produces the specificity-tagged Discovery variants.
- Tag each generated query with its specificity level.
- The dedup logic operates on the full expanded set. Queries at different specificity levels will have different wording and should survive dedup naturally.

**Journey analysis (`decision-journey/`):**
- Boundary analysis is a new module: `decision-journey/boundary-analysis.ts`.
- It consumes `StageComparisonInput` (same as `computeJourneyAnalysis`), filtered to Discovery results only, plus a specificity classifier function.
- Export `computeBoundaryAnalysis()` from the decision-journey barrel.

**Report composer:**
- The report composer calls `computeBoundaryAnalysis()` after `computeJourneyAnalysis()`.
- If boundary data is available (at least 2 specificity levels have scanned queries), include the Visibility Boundary Analysis subsection.
- If not enough data, omit the section silently -- do not include a "no data" placeholder.

**Scan workflow:**
- No changes to the scan execution pipeline. Specificity-tagged queries are scanned identically to any other query. The scan does not need to know about specificity.

**Client setup UI:**
- Add a "Niche keywords" field to the client create/edit form. Label: "What specific terms describe your business model?" Placeholder: "e.g., timeshare, vacation ownership, fractional ownership". Help text: "Comma-separated terms that distinguish your business from the broader industry."

---

## Implementation phases

### Phase 1: Client profile and query generation

**Scope:** ~2-3 days. No dependencies on other roadmap specs.

1. Add `nicheKeywords: String?` to `Client` in `schema.prisma`. Run migration.
2. Add niche keywords field to client create/edit form in the web app.
3. Add `nicheKeywords?: string[]` to `QueryGenerationInput`.
4. Parse `Client.nicheKeywords` (comma-separated string) into `string[]` in the server action that calls query generation.
5. Create 6-10 specificity-aware Discovery template families in `query-intelligence.ts`.
6. Add `specificity?: SpecificityLevel` to `GeneratedQuery`.
7. Expand specificity templates during generation, tagging each with its level.
8. Retroactively tag existing Discovery templates with their appropriate specificity level (mostly "industry").

**Output:** Query generation produces Discovery queries at multiple specificity levels, each tagged. The tags flow through to the scan but are not persisted in the database.

### Phase 2: Boundary detection

**Scope:** ~2 days. Depends on Phase 1.

1. Create `packages/core/src/decision-journey/boundary-analysis.ts` with `computeBoundaryAnalysis()`.
2. Implement specificity classification: given a query text and the client's niche keywords / industry / geography, determine which specificity level it represents. This is a deterministic function, not an LLM call.
3. Compute per-level mention rates for client and competitors.
4. Compute boundary, consistency, and gap.
5. Export from the decision-journey barrel.
6. Add unit tests covering the classification and boundary detection logic.

**Output:** The core package can compute a `BoundaryAnalysis` from scan results.

### Phase 3: Report integration

**Scope:** ~2 days. Depends on Phase 2.

1. Call `computeBoundaryAnalysis()` in the report composer, after journey analysis.
2. Add the Visibility Boundary Analysis subsection to the report output.
3. Generate the boundary table, narrative, and recommendation tie-in.
4. Conditional inclusion: only when at least 2 specificity levels have scan data.
5. Update report rendering (HTML export) to display the new section.

**Output:** Reports include the visibility boundary finding when data supports it.

---

## Tradeoffs and risks

**Query volume increase.** Specificity variants add 24-32 Discovery queries per assessment. With the current template set producing ~100 queries total, this is a ~25-30% increase. Each query requires an LLM scan call. If scan costs are a concern, specificity queries could be flagged as optional/lower-priority and excluded from budget-constrained scans.

**Niche keyword quality.** The boundary analysis is only as good as the niche terms the operator provides. Bad niche terms produce meaningless specificity queries. Mitigation: provide examples in the form UI, validate that niche terms are not identical to the industry field, and consider surfacing LLM-suggested niche terms in a future iteration.

**Specificity classification accuracy.** Classifying existing queries by specificity after the fact (Phase 2) requires a heuristic that checks for the presence of niche keywords, industry terms, and geography in the query text. This is imperfect -- a query like "best hospitality companies for sales in Orlando" contains both industry and geography and could be classified as "industry" or "hyper-specific" depending on whether niche terms are absent or simply not used. The classification function needs clear precedence rules.

**No schema column for specificity.** The decision to not store specificity on the Prisma `Query` model means the classification is recomputed at analysis time. If the client's niche keywords change between query generation and report generation, the classification may shift. This is acceptable for the initial implementation -- niche keywords rarely change -- but should be revisited if it causes confusion.

**Interaction with other roadmap specs.** The `query-context-awareness.md` spec proposes using `businessContext` to influence template selection. The `natural-query-language.md` spec proposes using `businessContext` as a `{context}` template variable. This spec proposes a dedicated `nicheKeywords` field instead of overloading `businessContext`. These are complementary, not conflicting: `businessContext` remains a free-text field for general context, while `nicheKeywords` is a structured field for specificity analysis. The query generation pipeline should use both -- `businessContext` for general template enrichment, `nicheKeywords` for specificity variant generation.

---

## Future extensions

- **LLM-suggested niche keywords.** After scraping a client's careers page or homepage, suggest niche terms to the operator for confirmation. Reduces operator burden without removing human judgment.
- **Boundary tracking over time.** As the client implements remediation, re-scan at each specificity level and show whether the boundary has shifted. "Six months ago, you appeared only at the niche level. After publishing on Built In, you now appear at the industry level." This is the clearest before/after metric for remediation ROI.
- **Specificity-aware recommendations.** Instead of generic "improve Discovery presence," recommendations can target specific levels: "To move from niche to industry visibility, establish presence on [platforms cited at the industry level]."
- **Specificity as a Prisma column.** If the UI needs to filter/sort queries by specificity, add `specificity: SpecificityLevel?` to the `Query` model in a follow-up migration.
