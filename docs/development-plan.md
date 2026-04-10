# Antellion Development Plan

**Status:** Active
**Date:** April 2, 2026
**Author:** Architect
**Scope:** 7 priorities from synthesized assessment evaluation

---

## Overview

This plan translates the synthesized assessment findings into concrete implementation work. Each priority is grounded in the current codebase state, references specific files and functions, and sequences work to avoid blocking dependencies.

The operator (founder) is the sole reviewer. Claude Code is the primary development resource. Work is structured into single-session tasks where possible, with explicit handoff points where founder input is required.

---

## Priority 1: Fix Query Scoring and Dedup

### A. Scope

Two distinct workstreams in a single file:

**1a. Intent-aware dedup (specced in `docs/roadmap/query-dedup-improvement.md`)**

All changes in `packages/core/src/query-intelligence.ts`:
- Replace `deduplicateQueries()` (lines 1789-1832) with a three-pass pipeline
- Add `DedupResult<T>` return type with `surviving` and `removed` arrays
- Add `DedupMode` type (`conservative` | `standard` | `aggressive`)
- Add intent-level dedup pass (pass 3): groups by stage+theme+company, deduplicates within groups by intent tag
- Add normalized structural comparison for `aggressive` mode
- Extend generic constraint on `deduplicateQueries` to include optional `stage`, `theme`, `intent` fields
- Add optional `removedQueries` field to `QueryIntelligenceResult`
- Move dedup call in `generateQueryIntelligence()` (line 1944) to AFTER stage assignment (line 1962-1970) -- currently stage assignment is a safety net that runs after dedup, but intent-level dedup needs stage information

**1b. Scoring reweight (NOT yet specced -- defined here)**

Modify `scoreQuery()` (lines 1920-1932) in `packages/core/src/query-intelligence.ts`:

Current scoring logic:
```
base = THEME_CONFIG[theme].basePriority  (5-8)
+1 if query contains company name
+1 if query contains role title
clamp to [1, 10]
```

This overweights branded queries (Consideration/Commitment) because they always contain the company name (+1) and often the role (+1), giving them scores of 8-10. Discovery queries that lack the company name score 5-8. This inverts the assessment's value signal: Discovery/Evaluation queries (earned visibility) are the highest-value data but score lowest.

**New scoring design:**

```typescript
function scoreQuery(query: GeneratedQuery, input: QueryGenerationInput): number {
  const config = THEME_CONFIG[query.theme];
  let score = config.basePriority;

  // Stage weighting -- earned visibility queries are highest value
  const stageWeight: Record<DecisionStage, number> = {
    DISCOVERY: 2,    // Highest value: are you on the list?
    EVALUATION: 2,   // High value: do you win comparisons?
    CONSIDERATION: 0, // Neutral: prompted, company already named
    COMMITMENT: 1,    // Moderate: useful but company-prompted
  };
  score += stageWeight[query.stage] ?? 0;

  // Role relevance (keep existing)
  const lower = query.text.toLowerCase();
  if (lower.includes(input.roleTitle.toLowerCase())) score += 1;

  // REMOVE the company-name bonus -- it systematically inflates
  // Consideration/Commitment scores and adds no signal

  return Math.min(10, Math.max(1, score));
}
```

Impact on existing priorities:
- Discovery queries: base 6-8, +2 stage = 8-10
- Evaluation queries: base 7, +2 stage = 9-10
- Consideration queries: base 5-8, +0 stage = 5-8
- Commitment queries: base 5-6, +1 stage = 6-7

This correctly prioritizes earned-visibility queries. Existing persisted priority scores are not changed -- they live on `Query.priority` in the database. The new scoring only applies to newly generated query sets.

### B. Dependencies

None. Both workstreams are self-contained within `packages/core/src/query-intelligence.ts`.

### C. Effort Estimate

- 1b (scoring reweight): 0.5 developer-days
- 1a (intent-aware dedup): 2 developer-days (includes three-pass logic, mode configuration, return type change, orchestrator reorder, tests)
- Total: 2.5 developer-days

### D. Implementation Sequence

1. Implement scoring reweight in `scoreQuery()` -- smallest change, immediate impact
2. Add `DedupMode` type and `DedupResult<T>` interface
3. Implement pass 1 (exact normalized match) as a Set-based O(1) pass before the existing Jaccard loop
4. Refactor existing Jaccard pass (pass 2) to populate `DedupResult.removed` with reason `"jaccard_similarity"`
5. Implement pass 3 (intent-level dedup) -- group by stage+theme+company, match on intent tag within groups
6. Add `aggressive` mode structural comparison (strip company/stop words, compare remaining tokens)
7. Reorder `generateQueryIntelligence()`: move dedup call (step 2) to after stage assignment (current step 3)
8. Wire `DedupMode` as optional parameter on `generateQueryIntelligence` input
9. Add `removedQueries` to `QueryIntelligenceResult`
10. Write unit tests for each pass in isolation, integration test for full pipeline

### E. Acceptance Criteria

- `conservative` mode produces identical output to current behavior (within +/- 2 queries from Jaccard floating-point variance)
- `standard` mode with 4 competitors reduces surviving queries from ~90-120 to ~80-100
- No two surviving queries in `standard` mode share the same (stage, theme, intent, company) tuple
- `DedupResult.removed` is populated with correct reasons and `duplicateOf` references
- Discovery/Evaluation queries score higher than Consideration queries for the same theme
- All existing tests pass; new snapshot test captures removed query list for a representative input

### F. Risk

- **Over-dedup in standard mode.** Two queries with the same intent tag but different phrasing may elicit meaningfully different AI responses. Mitigated by the conservative intent-tag-matching rule: templates with different intents survive even if structurally similar.
- **Scoring reweight changes assessment composition.** Downstream effects: report recommendations that reference "high-priority queries" may shift. Mitigated by the fact that priority scores are cosmetic in the current pipeline -- they do not affect scan execution order or report generation logic.

---

### P1c: Post-Scan Query Performance Scoring (extends Week 2)

**Scope:** After a scan completes, score each query by the signal it produced:
- Did it surface a novel competitor citation? (+signal)
- Did it generate stage-specific insight (mention + positioning data)? (+signal)
- Did it produce a unique response vs near-duplicate of another query? (+signal)
- Did it produce nothing new (no mentions, no citations, generic response)? (-signal)

Store a `signalYield` score on each ScanResult or in scan metadata. Over time, low-yield template IDs accumulate data that can be used to retire weak templates.

**Implementation:**
- `packages/core/src/query-signal-scoring.ts` — new pure function `scoreQuerySignal(result, allResults): number`
- Called in the scan worker after all results are recorded
- Stored in ScanResult metadata as `signalYield: number`
- A future "Template Performance" dashboard view can aggregate signal yield by template across scans

**Effort:** 1 dev-day, extends P1b session in Week 2.

**Acceptance criteria:** Every completed scan result has a `signalYield` score. Template queries that consistently score low across multiple scans are identifiable.

---

## Priority 2: Supplemental LLM-Generated Queries

### A. Scope

Specced in `docs/roadmap/llm-supplemental-queries.md`. Implementation touches 5 files across 3 packages:

| File | Change |
|---|---|
| `packages/prompts/src/supplemental-query-generation.ts` | **New file.** Prompt template for supplemental query generation. Structured JSON output requesting 25 queries with text, theme, stage, rationale. |
| `packages/prompts/src/index.ts` | Export new prompt. |
| `packages/core/src/supplemental-queries.ts` | **New file.** Orchestration: build prompt from `SupplementalQueryInput`, call LLM via injected callback, validate with Zod, dedup against existing queries, verify stage classification. |
| `packages/core/src/query-intelligence.ts` | Add `source?: QuerySource` to `GeneratedQuery`. Tag template queries with `source: "template"`. |
| `packages/db/prisma/schema.prisma` | Add `source String?` to `Query` model. |

**Key design decisions (resolving open questions from the spec):**

**Which LLM provider?** Use the same `queryLLM` function from `apps/jobs/src/llm-client.ts` -- but the core orchestration function does NOT import it directly. Instead, the server action injects a callback `(prompt: string) => Promise<string>`. For v1, this calls Anthropic (Claude Sonnet) at temperature 0.7. The scan worker uses OpenAI with web search for scanning; query generation does not need web search and benefits from Claude's structured output reliability.

**Where does the prompt live?** `packages/prompts/src/supplemental-query-generation.ts`. The existing `packages/prompts/src/query-generation.ts` is preserved but NOT used for supplemental generation -- it was designed for general-purpose generation and lacks the competitive context inputs.

**Operator review flow:** The "Generate strategic queries" button appears on the client detail page (not the scan detail page -- the spec says "after Discovery scan completes" but the client page is the natural location since supplemental queries span all scans). Clicking it triggers a server action that:
1. Loads client, competitors, existing query texts, optional latest scan summary
2. Calls `generateSupplementalQueries()` in `packages/core`
3. Returns validated, deduped queries to the UI
4. Operator reviews list with Accept/Edit/Reject per row
5. "Add to assessment" persists accepted queries as a new `QueryCluster`

The review UI is a new component in `apps/web/src/components/queries/SupplementalQueryReview.tsx` -- a simple table with the query text, theme badge, stage badge, rationale text, and Accept/Reject toggle. No complex state management needed; it is a form that posts to a server action.

**Integration with existing flow:** Supplemental queries do NOT modify existing clusters. They create a new cluster named "AI-Generated -- Strategic Depth" linked to the same client and role profile. This cluster appears alongside template clusters in the scan configuration UI. The operator includes or excludes it per scan.

### B. Dependencies

- **Priority 1 (dedup)** should ship first. Supplemental queries run through `deduplicateQueries` against existing templates. Without intent-level dedup (Priority 1), LLM queries that rephrase existing template intents will survive dedup and add redundancy. However, this is a quality dependency, not a blocking one -- supplemental queries work with current Jaccard dedup, just less effectively.
- **Prisma migration** (`source String?` on `Query`) must run before the feature ships.

### C. Effort Estimate

- Prompt design and tuning: 1 developer-day
- Core orchestration (`supplemental-queries.ts`): 1.5 developer-days
- Server action + review UI: 1.5 developer-days
- Schema migration + source tagging: 0.5 developer-days
- Testing (mock LLM unit test, dedup integration test, stage verification): 1 developer-day
- Total: 5.5 developer-days

### D. Implementation Sequence

1. Schema migration: add `source String?` to `Query` model, run `prisma migrate dev`
2. Tag existing template queries with `source: "template"` in `generateQueryIntelligence()`
3. Write the supplemental prompt in `packages/prompts/src/supplemental-query-generation.ts`
4. Implement `generateSupplementalQueries()` in `packages/core/src/supplemental-queries.ts`:
   - Build prompt from input
   - Call LLM via injected callback
   - Parse JSON output
   - Validate with Zod (`SupplementalQueryOutputSchema`)
   - Dedup against existing queries (existing-first ordering for protected-set behavior)
   - Stage classification verification (override CONSIDERATION->DISCOVERY when no company name)
5. Write server action in `apps/web/src/app/(dashboard)/actions/queries.ts` (or extend existing)
6. Build review UI component (`SupplementalQueryReview.tsx`)
7. Build "Generate strategic queries" button on client detail page
8. Write persistence logic: create `QueryCluster` + `Query` records for accepted items
9. Integration test: full round-trip with mock LLM

### E. Acceptance Criteria

- LLM returns 20-30 queries for a representative input
- After Zod validation and dedup, 15-25 survive
- No surviving supplemental query has Jaccard similarity > 0.6 with any existing template query
- Stage verification overrides CONSIDERATION to DISCOVERY when query text lacks company name
- Accepted queries are persisted as a new `QueryCluster` with `source: "llm"` on each `Query`
- LLM failure returns empty result set; assessment proceeds with template queries only
- Operator can review, edit text, and accept/reject each generated query before persistence

### F. Risk

- **LLM output quality variance.** Different prompt versions produce different quality. Mitigated by Zod validation (drops malformed items), dedup (drops redundant items), and operator review (final gate). Store prompt text and raw response in cluster description for auditability.
- **Latency.** A 25-query structured generation takes 5-15 seconds. This is acceptable for a user-initiated action but must show a loading state. No background job needed.
- **Prompt stability.** The prompt will need tuning after real usage. Version the prompt (e.g., `SUPPLEMENTAL_PROMPT_V1`) and log disagreements between LLM stage assignments and classifier to inform tuning.

---

## Priority 3: Executive Report Framing

### A. Scope

This priority enhances the existing report without replacing it. The journey-format report (`JourneyReportRenderer.tsx`) already has most structural elements. The work is additive: improving what exists and adding two new components.

**3a. Cover page enhancement**

Current state: `CoverPage` interface in `packages/core/src/report-composer.ts` (lines 36-44) already has `documentTitle`, `clientName`, `clientDomain`, `industry`, `logoUrl`, `assessmentDate`, `confidentialityLine`. The `JourneyReportRenderer.tsx` renders this via `AssessmentParametersBlock` (line 1769).

What to add:
- Dedicated cover page component in `apps/web/src/components/report/CoverPage.tsx` (new file)
- Content: Document title ("AI Employer Visibility Assessment"), subtitle ("Candidate Decision Journey Diagnostic"), client name, domain, industry, assessment date, confidentiality line, client logo (if provided), Antellion branding
- Design: full-page layout for print, compact header for screen
- Wire into both the dashboard detail page and the export page

**3a-ii. Structured executive summary component**

Current state: `composeBulletSummary()` in `report-composer.ts` generates markdown bullets. The `JourneyReportRenderer` renders these as `buildExecBullets()` inline. The content is functional but not structured for a VP who has 30 seconds.

What to add:
- New component: `apps/web/src/components/report/ExecutiveSummaryCard.tsx`
- Layout: a visually distinct card that communicates business stakes immediately
- Content structure (exactly 3 blocks):
  - **Situation** (1 paragraph): "ServiceTitan's candidate pipeline collapses at [stage]. [X]% of AI-researching candidates encounter ServiceTitan before making a decision. [Competitor] captures [Y]% at the same stage."
  - **Key Findings** (3-5 bullets): each with bold lead phrase + one sentence. Not the current 7-9 bullets — distill to the 3 most consequential.
  - **Top Recommendation** (1 action): the single highest-priority action with platform name, timeframe, and expected impact. "Publish salary data on Levels.fyi within 30 days — this is the platform AI cites most for compensation comparisons where ServiceTitan is currently absent."
- Data source: all from existing `JourneyMetadata` — journey analysis, remediation plan, competitor data
- This replaces the inline `buildExecBullets()` rendering in the renderer when the component is present
- Design: bordered card with subtle background, print-friendly, designed to be the ONE page a VP photographs and sends to their team
- Position: immediately after the cover page, before everything else

**Critical implementation note: the "Situation" paragraph and "Top Recommendation" block must be LLM-generated at report time, not templated.** Template-driven prose reads like fill-in-the-blank ("ServiceTitan's candidate pipeline collapses at Discovery. 0% of candidates...") and undermines the premium positioning. Instead:

- At report generation time in `generateReport` (`apps/web/src/app/(dashboard)/actions/reports.ts`), after computing journey analysis and recommendations, make a single LLM call to generate:
  - A 2-3 sentence "Situation" paragraph that reads like a senior advisor wrote it
  - A 1-2 sentence "Top Recommendation" framing that contextualizes the action
- The LLM receives: client name, industry, journey stage rates, critical gap stage, top competitor name/rate, top recommendation title/platform/timeframe, earned visibility rate
- The LLM is instructed to write executive prose — no hedge words, no system language, no bullet lists. Plain English as if briefing a VP.
- The output is validated (non-empty, reasonable length) and stored in report metadata as `executiveSummaryProse`
- Fallback: if the LLM call fails, fall back to the current template-driven bullets. The component handles both formats.
- Provider: use Claude Sonnet (same as supplemental query generation) — better prose quality than GPT-4o for this task, lower cost than Opus
- This adds ~3-5 seconds to report generation time and ~$0.01 per report

This is a small prompt engineering task but it's the difference between "system output organized into a card" and "a consultant's briefing note." The prompt should live in `packages/prompts/src/` alongside the existing templates.

This is scoped alongside the cover page (P3a) in Week 1 because together they form the "first 30 seconds" experience — the cover page establishes credibility, the executive summary delivers the business stakes. Neither works well without the other.

Effort: 1.5 developer-days (component + LLM prompt + API integration + fallback logic + renderer integration)

**3b. Methodology section**

Current state: `composeAssessmentScopeSection()` (line 350 in `report-composer.ts`) generates a "Scoring methodology" subsection with metric definitions. The `AssessmentParametersBlock` in the renderer shows AI model, query depth, focus area, query count.

What to add:
- New component: `apps/web/src/components/report/MethodologySection.tsx`
- Content:
  - Assessment overview: query count, AI models used, scan dates, competitor set
  - Decision journey framework explanation (4 stages, what each measures)
  - Metric definitions: mention rate, visibility score, sentiment score, earned vs. prompted visibility
  - Confidence methodology: how confidence tiers are determined, what hedging means
  - Citation analysis methodology: how citation gaps are identified
- Data source: `assessmentParameters` from `JourneyMetadata`, plus static explanatory content
- This replaces the inline `AssessmentParametersBlock` and the flat "Assessment scope and methodology" section from `composeReport()`

**3c. Competitive comparison table**

Current state: The `CompetitorMatrix` component already renders per-stage competitor data. The flat `composeCompetitorSection()` in `report-composer.ts` generates a comparison table with columns [Company, AI Mention Rate, Mentions, Gap vs. Client].

What to add:
- Enhanced `CompetitorComparisonTable` component in `apps/web/src/components/report/CompetitorComparisonTable.tsx` (new file)
- Columns: Company | Discovery Rate | Consideration Rate | Evaluation Rate | Commitment Rate | Overall Rate | Sentiment | Threat Level
- One row per competitor + client row at top (highlighted)
- Color coding: green for client advantages, red for competitor advantages
- Data source: `competitors` array from `JourneyMetadata` already has per-stage rates and threat levels

**3d. Recommendation effort/impact matrix**

Current state: Each recommendation in `remediationPlan.recommendations` has `effort` (string), `expectedImpact` (string), `priority` (CRITICAL/HIGH/MEDIUM/LOW), and `timeframe` (string).

What to add:
- New component: `apps/web/src/components/report/EffortImpactMatrix.tsx`
- Layout: 2x2 grid (Quick Wins = low effort + high impact, Strategic = high effort + high impact, Tactical = low effort + low impact, Defer = high effort + low impact)
- Each recommendation is classified into a quadrant based on its `effort` and `priority` fields
- Effort mapping: recommendations with timeframe "0-30 days" or effort containing "low" -> low effort; others -> high effort
- Impact mapping: CRITICAL/HIGH priority -> high impact; MEDIUM/LOW -> low impact
- Each entry shows recommendation title and target platform badges
- Renders as a visual grid in screen mode and a structured table in print mode

### B. Dependencies

None of these depend on Priorities 1 or 2. All data is already available in `JourneyMetadata` and `ComposedReport`.

### C. Effort Estimate

- 3a (Cover page): 0.5 developer-days
- 3a-ii (Executive summary component): 1 developer-day
- 3b (Methodology): 1 developer-day (mostly content writing + component structure)
- 3c (Comparison table): 1 developer-day
- 3d (Effort/impact matrix): 1 developer-day
- Integration into export page + print styling: 0.5 developer-days
- Total: 4 developer-days

### D. Implementation Sequence

1. Build `CoverPage.tsx` -- standalone, no dependencies on other new components
2. Build `MethodologySection.tsx` -- standalone, references `assessmentParameters` from metadata
3. Build `CompetitorComparisonTable.tsx` -- reads from `JourneyMetadata.competitors` + per-stage data
4. Build `EffortImpactMatrix.tsx` -- reads from `JourneyMetadata.remediationPlan.recommendations`
5. Wire all 4 components into `JourneyReportRenderer.tsx` at the appropriate section positions:
   - CoverPage: before Executive Decision Page
   - Methodology: after Executive Summary, before Discovery section
   - CompetitorComparisonTable: inside or adjacent to existing CompetitorMatrix
   - EffortImpactMatrix: inside the Recommended Actions section, before the individual cards
6. Wire into export page (`apps/web/src/app/(dashboard)/reports/[id]/export/page.tsx`)
7. Print CSS adjustments for page breaks

### E. Acceptance Criteria

- Cover page renders client name, industry, date, confidentiality, and logo when available
- Methodology section explains the 4-stage framework, all metrics, and confidence tiers
- Comparison table shows all competitors with per-stage rates, sorted by overall rate descending
- Effort/impact matrix places each recommendation into the correct quadrant
- All components render correctly in both screen and print modes
- Export page includes all new sections in the correct order

### F. Risk

- **Content quality.** The methodology section is prose-heavy. The first version may need founder review and editing. Plan for an iteration cycle.
- **Print layout.** The 2x2 matrix may not paginate well in PDF export. Fallback: render as a flat table in print mode.
- **Over-engineering.** The comparison table and matrix are simple data displays. Do not add filtering, sorting, or interactive features in v1. Static render only.

---

## Priority 4: Citation Playbook

### A. Scope

This is the most novel priority. Currently, citations are reported as gap lists (platform names with "Gap" status badges). The playbook transforms this into an actionable remediation guide.

**What exists today:**

1. `KNOWN_SOURCE_TYPES` in `report-composer.ts` (lines 119-140): maps 20 domains to source type labels (e.g., "glassdoor.com" -> "Employee review site")
2. `GAP_ACTION_TEMPLATES` in `report-composer.ts` (lines 142-169): maps source type labels to generic remediation strings
3. `classifySourceType()` (line 171): classifies unknown domains by keyword heuristic
4. `gapActionFor()` (line 180): returns a remediation string for a source type
5. Per-stage gap domains in `JourneyStageData.gapDomains` (already computed per stage)
6. Citation ecosystem section in `JourneyReportRenderer.tsx` (lines 2387-2497): renders gap tables grouped by stage

**What to build:**

**4a. Enriched citation classification**

Expand `KNOWN_SOURCE_TYPES` to a richer taxonomy:

```typescript
interface SourceClassification {
  domain: string;
  sourceType: string;           // "Employee review site", "Compensation data platform", etc.
  platformCategory: string;     // "review", "compensation", "tech_community", "job_board", "press", "career_site"
  primaryStage: DecisionStage;  // Which decision stage this platform most affects
  signalType: string;           // "social_proof", "compensation_data", "culture_signal", "technical_credibility"
  controlLevel: string;         // "high" (company profile), "medium" (can respond/post), "low" (third-party content)
}
```

New file: `packages/core/src/citation-taxonomy.ts`

This replaces the flat `KNOWN_SOURCE_TYPES` record. The existing `classifySourceType()` and `gapActionFor()` functions are updated to use the richer classification. Backward-compatible: existing callers that only need the source type string still work.

**4b. Remediation playbook per citation gap**

Expand `GAP_ACTION_TEMPLATES` into structured remediation entries:

```typescript
interface CitationRemediation {
  sourceType: string;
  platformCategory: string;
  actions: Array<{
    step: string;           // "Claim your employer profile on Glassdoor"
    owner: string;          // "Employer Brand / HR" or "Engineering"
    effort: string;         // "1-2 hours" or "2-4 weeks"
    prerequisite?: string;  // "Must have company email domain verified"
  }>;
  expectedImpact: string;   // "AI models will find employee sentiment data to cite"
  timeToImpact: string;     // "2-4 weeks for AI indexing"
  priority: string;         // Derived from stage + gap severity
}
```

New file: `packages/core/src/citation-remediation.ts`

Contains ~15-20 remediation playbooks keyed by source type. Each has concrete, ordered steps rather than a single sentence.

**4c. "Monday morning playbook" report section**

New component: `apps/web/src/components/report/CitationPlaybook.tsx`

This replaces (or supplements) the current Citation Ecosystem section in `JourneyReportRenderer.tsx`. Structure:

1. **Priority actions table:** Top 5 citation gaps ranked by stage impact, with:
   - Platform name
   - Source type
   - Stage affected
   - Control level (can you directly influence this?)
   - First action to take
   - Expected time to impact
2. **Per-platform playbook cards:** For each gap, a card with:
   - Platform name and source type
   - Why it matters (which stage, what signal type)
   - Step-by-step remediation (numbered list)
   - Owner/effort for each step
   - What success looks like
3. **Defensible advantages section:** Platforms where the client is cited but competitors are not. Framed as "protect these" with maintenance actions.

Data sources: `JourneyStageData.gapDomains`, `JourneyStageData.citedDomains`, `KNOWN_SOURCE_TYPES`, new `CitationRemediation` entries.

### B. Dependencies

None on Priorities 1-2. The citation data is already computed by the scan comparison pipeline and stored in report metadata.

### C. Effort Estimate

- 4a (Citation taxonomy): 1 developer-day
- 4b (Remediation playbooks): 1.5 developer-days (mostly content: writing 15-20 structured remediation entries)
- 4c (Playbook component): 1.5 developer-days
- Integration + print styling: 0.5 developer-days
- Total: 4.5 developer-days

### D. Implementation Sequence

1. Create `packages/core/src/citation-taxonomy.ts` with `SourceClassification` type and expanded domain mappings
2. Create `packages/core/src/citation-remediation.ts` with structured remediation entries for each source type
3. Update `report-composer.ts`: replace `KNOWN_SOURCE_TYPES`/`GAP_ACTION_TEMPLATES` with imports from new modules (or keep both for backward compat and deprecate old)
4. Export new functions from `packages/core/src/index.ts`
5. Build `CitationPlaybook.tsx` component with priority table + per-platform cards + defensible advantages
6. Wire into `JourneyReportRenderer.tsx` -- replace or augment the existing Citation Ecosystem section
7. Wire into export page
8. Print styling for playbook cards

### E. Acceptance Criteria

- Every gap domain is classified with source type, platform category, primary stage, signal type, and control level
- Each classified gap has a multi-step remediation with owner, effort, and prerequisite
- Priority actions table shows top 5 gaps ranked by stage impact
- Playbook cards render step-by-step actions, not single-sentence recommendations
- Defensible advantages are listed with maintenance actions
- All content renders correctly in both screen and print modes
- Unknown domains (not in `KNOWN_SOURCE_TYPES`) get a reasonable heuristic classification with a generic remediation fallback

### F. Risk

- **Content quality.** The remediation playbooks are the product's most actionable output. They must be specific enough to act on ("claim your Glassdoor employer profile") without being so prescriptive that they are wrong for edge cases. Plan for founder review of the initial 15-20 remediation entries.
- **Over-classification.** Adding too many classification dimensions (platformCategory, signalType, controlLevel) may not all be useful in v1. Start with sourceType + primaryStage + controlLevel. Add others only if the playbook component actually uses them.
- **controlLevel requires dedicated QA.** The `controlLevel` dimension ("high" = company-controlled profile, "medium" = can respond/post, "low" = third-party content the company cannot directly influence) is the field clients will scrutinize and challenge most. A client who sees "controlLevel: low" on Glassdoor will push back — "we CAN influence Glassdoor, we respond to reviews." The classifications must be defensible:
  - **High**: company career page, LinkedIn company page, Built In employer profile — the company directly owns and publishes this content
  - **Medium**: Glassdoor (can respond to reviews, claim profile), Indeed (can claim employer profile), Comparably (can participate in surveys) — the company can influence but doesn't control the content
  - **Low**: Blind, Reddit, Quora, press coverage — the company has no direct editorial control
  - Each classification should include a brief rationale string explaining WHY it's categorized at that level. This rationale appears in the playbook card so the client understands the reasoning.
  - **Test case**: run the classification against the top 20 employer platforms and have the founder validate each one before shipping. A single wrong controlLevel in a client-facing report undermines the entire playbook's credibility.
- **Data completeness.** If a scan has no citations (provider did not return URLs), the playbook section is empty. Add a "No citation data available" fallback with a note explaining that citation analysis requires web-search-enabled AI providers.

---

## Priority 5: Longitudinal Benchmarking

### A. Scope

This is the most schema-heavy priority. Currently, each report is a standalone snapshot. The baseline metrics section in `JourneyReportRenderer.tsx` (lines 1715-1765) shows current metrics with "track in next assessment" targets, but there is no mechanism to compare across assessments.

**What exists today:**

1. `BaselineMetrics` component renders: earned visibility rate, stage-specific mention rates, funnel throughput, citation gap count, positioning quality. All derived from `JourneyMetadata` at render time.
2. No `BaselineMetric` model in Prisma schema. No historical tracking.
3. The `operations-dashboard-design.md` proposes an `Engagement` model to group scans and reports into audit cycles. This is the natural container for longitudinal data but is not yet implemented.

**What to build:**

**5a. Baseline metric snapshot on report generation**

When a report is generated (in `apps/web/src/app/(dashboard)/actions/reports.ts`), compute and persist a snapshot of key metrics. This happens at the end of the `generateReport` action, after `composeReport()` and `buildJourneyMetadata()`.

New Prisma model:

```prisma
model AssessmentBaseline {
  id                    String   @id @default(cuid())
  reportId              String   @unique
  clientId              String
  assessmentDate        DateTime
  earnedVisibilityRate  Float?
  overallMentionRate    Float
  discoveryRate         Float?
  considerationRate     Float?
  evaluationRate        Float?
  commitmentRate        Float?
  funnelThroughput      Float?
  avgSentimentScore     Float?
  avgVisibilityScore    Float?
  citationGapCount      Int?
  totalQueryCount       Int
  metadata              Json?     // Full stage-level data for future analysis
  createdAt             DateTime  @default(now())

  report  Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
  client  Client @relation(fields: [clientId], references: [id])

  @@index([clientId, assessmentDate])
  @@map("assessment_baselines")
}
```

This is a single-row-per-report snapshot. The `metadata` JSON stores the full stage breakdown so future analysis can drill into stage-level changes without requiring new columns.

**5b. Before/after comparison function**

New file: `packages/core/src/baseline-comparison.ts`

```typescript
interface BaselineComparison {
  previous: AssessmentBaseline;
  current: AssessmentBaseline;
  changes: Array<{
    metric: string;
    previousValue: number;
    currentValue: number;
    changePp: number;           // percentage point change
    changeDirection: "improved" | "declined" | "unchanged";
    significance: "meaningful" | "marginal" | "insufficient_data";
  }>;
  overallTrajectory: "improving" | "declining" | "stable" | "mixed";
  narrativeSummary: string;     // Generated prose: "Since the March assessment, earned visibility improved from 12% to 28%..."
}
```

The function takes two `AssessmentBaseline` records and computes per-metric changes. Significance thresholds: meaningful = 5+ pp change; marginal = 2-5 pp; unchanged = <2 pp.

**5c. Re-assessment report renderer**

New component: `apps/web/src/components/report/BaselineComparisonSection.tsx`

When the report is generated and a previous `AssessmentBaseline` exists for the same client, the comparison is computed and included in the report metadata. The renderer shows:

1. **Before/after summary card:** Side-by-side key metrics with directional arrows
2. **Per-stage comparison table:** Previous rate | Current rate | Change | Status (improved/declined/unchanged)
3. **Trajectory narrative:** 1-2 sentences describing the overall direction
4. **Remediation impact:** Which recommendations from the previous report were addressed (inferred from metric changes)

This section appears after the Executive Summary and before the Discovery section.

**5d. Data loading in `generateReport` action**

In `apps/web/src/app/(dashboard)/actions/reports.ts`:
1. After computing all metrics, create `AssessmentBaseline` record
2. Query for the most recent previous `AssessmentBaseline` for the same client (if any)
3. If previous exists, compute `BaselineComparison` and store in report metadata

### B. Dependencies

- **Schema migration required.** New `AssessmentBaseline` model.
- **Priority 3 (executive framing) should ship first** so the baseline section has a natural position in the report structure.
- **No dependency on Priorities 1, 2, or 4.** Baseline tracking uses the same data that report generation already computes.

### C. Effort Estimate

- 5a (Schema + baseline persistence): 1 developer-day
- 5b (Comparison function): 1 developer-day
- 5c (Comparison renderer): 1.5 developer-days
- 5d (Action integration + previous baseline loading): 0.5 developer-days
- Testing (comparison logic, edge cases for first assessment): 0.5 developer-days
- Total: 4.5 developer-days

### D. Implementation Sequence

1. Schema migration: add `AssessmentBaseline` model, add relation to `Report` and `Client`
2. Implement baseline snapshot creation at end of `generateReport` action -- extract metrics from `journeyMetadataForReport` and `comparison` objects
3. Implement `computeBaselineComparison()` in `packages/core/src/baseline-comparison.ts`
4. Add previous-baseline loading query to `generateReport` -- fetch most recent `AssessmentBaseline` for the same client where `reportId != current report`
5. Store comparison result in report metadata under a `baselineComparison` key
6. Build `BaselineComparisonSection.tsx` component
7. Wire into `JourneyReportRenderer.tsx` between Executive Summary and Discovery section
8. Update `journey-types.ts` to include `baselineComparison?: BaselineComparison` on `JourneyMetadata`
9. Wire into export page + print styling

### E. Acceptance Criteria

- First assessment for a client: `AssessmentBaseline` created, no comparison section shown
- Second assessment for same client: comparison section shows before/after for all tracked metrics
- Per-metric changes show correct percentage point differences
- Trajectory is correctly classified as improving/declining/stable/mixed
- Narrative summary is generated in the advisor voice (not "the system computed")
- `AssessmentBaseline.metadata` stores full stage-level data as JSON

### F. Risk

- **First-report edge case.** Most near-term reports will be first assessments. The comparison section adds zero value until a second assessment is run. This should not block the work -- the baseline snapshot should be persisted from day one so the data is available when the second assessment happens.
- **Metric comparability.** If the template set changes between assessments (due to Priority 1 reweight or new templates), metric changes may reflect template changes rather than client improvements. Mitigated by: (a) noting the assessment parameters (model, query count, depth) in the comparison, (b) flagging comparisons where query count or model differs significantly.
- **Schema migration.** The `AssessmentBaseline` model is additive (new table, new nullable relations). No risk to existing data. But it adds a join to the report generation action.

---

## Priority 6: Weak Assessment Warnings

### A. Scope

Before report generation, warn the operator if the assessment data is too thin to produce a credible report. Suggested actions turn the warning into a decision tree.

### B. Triggers

- Discovery coverage < 10 queries → "Discovery data is thin. Consider generating additional broad queries."
- Evaluation coverage < 8 queries → "Evaluation data is limited. Consider adding competitor comparison queries."
- Overall approved results < 50 → "Total approved results may be insufficient for a premium report."
- No competitor data → "No competitors configured. The report will lack competitive analysis."
- Citation rate < 10% → "Very few citations detected. Citation analysis will be limited."
- Single scan only → "Assessment based on a single scan. Consider a second scan for validation."

### C. Suggested Actions Per Warning

- "Generate supplemental strategic queries" → link to the LLM query generation
- "Add competitors from Discovery scan" → link to competitor discovery
- "Run additional scan with role variants" → link to scan creation
- "Verify web search is enabled" → for low citation rate

### D. Implementation

- `packages/core/src/assessment-readiness.ts` — pure function `assessReadiness(scanData): ReadinessWarning[]`
- Called in `generateReport` action before composition
- Warnings displayed in a modal/alert before proceeding
- Operator can dismiss and proceed, or take suggested actions
- UI component: `apps/web/src/components/AssessmentReadinessCheck.tsx`

### E. Effort Estimate

1.5 dev-days in Week 5-6.

### F. Acceptance Criteria

- Each trigger condition produces the correct warning when met
- Warnings are displayed before report generation proceeds
- Operator can dismiss warnings and proceed
- Suggested actions link to the correct workflow pages
- No warnings are generated when assessment data is sufficient

### G. Risk

- **False positives.** Thresholds may be too conservative and warn on assessments that produce credible reports. Mitigated by making warnings dismissible and tuning thresholds after observing 5+ real assessments.
- **Operator fatigue.** If every report generation shows warnings, the operator will learn to dismiss them. Mitigated by limiting to high-confidence triggers and keeping the list short.

---

## Priority 7: Evidence Traceability in Report

### A. Scope

Each report section should display a traceability line: "This finding is based on X queries / Y sourced responses" with the ability to drill into the supporting evidence.

### B. What Already Exists

- `EvidencePanel` component shows per-section evidence on expand
- `EvidenceSummaryBar` shows report-level evidence stats
- `EvidenceAppendix` shows evidence in print

### C. What's New

- Per-SECTION evidence summary (not just per-report): "Discovery findings based on 47 queries, 12 with citations, confidence: Medium"
- Section-level confidence badge derived from the section's query subset
- In the export/PDF: each section header includes the evidence basis line
- The traceability is inline, not behind a click — visible by default in the printed report

### D. Implementation

- Extend `JourneyStageOutput` with `queryCount` and `sourcedCount` (some of this already exists via `resultCount` and `sourcedRate`)
- In the renderer: each section header shows "Based on N queries · M sourced · [Confidence badge]"
- In the export: same line prints below each section heading
- No new data computation needed — just surface what's already in the stage visibility data

### E. Effort Estimate

1 dev-day in Week 7-8.

### F. Acceptance Criteria

- Each journey stage section displays an inline evidence basis line
- Evidence line shows query count, sourced count, and confidence badge
- Evidence line is visible in both screen and print/export modes
- Confidence badge matches the existing confidence tier logic
- Sections with insufficient data show a lower confidence badge, not an empty line

### G. Risk

- **Visual clutter.** Inline evidence lines add text to every section header. Mitigated by subtle styling (smaller font, muted color) that is informative without competing with the section content.
- **Confidence accuracy.** The confidence badge is derived from query count and source rate. If the thresholds are wrong, a "High" confidence badge on a thin section undermines credibility. Use conservative thresholds and validate against the first 3 real reports.

---

## Sequencing

### Build Order Across Priorities

```
Week 1-2: Foundation
├── P1: Scoring reweight (0.5d)              ← Smallest change, immediate quality impact
├── P1: Intent-aware dedup (2d)              ← Unblocks P2 quality
├── P3a: Cover page component (0.5d)         ← Quick win, visible to founder
├── P3a-ii: Executive summary card (1d)      ← The "first 30 seconds" — must ship with cover page
├── P3b: Methodology section (1d)            ← Content-heavy, benefits from early founder review
└── Founder review: methodology content, scoring impact

Week 3-4: Core features
├── P4a: Citation taxonomy (1d)              ← Foundation for playbook
├── P4b: Remediation playbooks (1.5d)        ← Content-heavy, needs founder review
├── P3c: Competitor comparison table (1d)    ← Straightforward data display
├── P3d: Effort/impact matrix (1d)           ← Straightforward data display
├── P3 integration: wire all into renderer (0.5d)
└── Founder review: playbook content, comparison table data

Week 5-6: LLM integration + playbook + assessment quality
├── P2: Schema migration (source column) (0.5d)
├── P2: Prompt design + core orchestration (2.5d)
├── P2: Server action + review UI (1.5d)
├── P4c: Citation playbook component (1.5d)
├── P4 integration: wire into renderer (0.5d)
├── P6: Assessment readiness checks (1.5d)   ← NEW: weak assessment warnings before report gen
└── P2 testing: mock LLM + integration (1d)

Week 7-8: Longitudinal + signal scoring + evidence + polish
├── P5a: Schema migration (AssessmentBaseline) (0.5d)
├── P5b: Baseline snapshot + comparison function (1.5d)
├── P5c: Comparison renderer (1.5d)
├── P5d: Action integration (0.5d)
├── P1c: Post-scan query signal scoring (1d)  ← NEW: extends P1, scores query yield
├── P7: Evidence traceability in sections (1d) ← NEW: inline evidence basis per section
├── P5 testing (0.5d)
├── End-to-end testing across all priorities
└── Founder review: full report with all new sections
```

**Resequencing note — Executive Summary Card forward reference:** The P3a-ii executive summary card (Week 1) should reference the reassessment capability even before longitudinal tracking (P5) is built. Frame it as: "This assessment establishes a baseline. A reassessment in 90 days will measure the impact of remediation actions." This sets the expectation that the engagement is a program, not a one-time audit — which justifies the price and creates renewal. The LLM prompt for the executive summary should include this framing when `isFirstAssessment: true`.

**Revised total:** ~25 dev-days, 17-18 sessions.

### Parallelization opportunities

- P1 (dedup/scoring) and P3a/P3b (cover page/methodology) are fully independent
- P4a/P4b (taxonomy/remediation) and P3c/P3d (comparison table/matrix) are fully independent
- P2 (supplemental queries) is independent of P3/P4/P5 but benefits from P1 shipping first
- P5 (longitudinal) is independent of P1/P2/P4 but benefits from P3 shipping first
- P6 (assessment readiness) is independent of all other priorities — can slot in whenever Week 5-6 has capacity
- P1c (query signal scoring) depends on P1a/P1b shipping first but is independent of P2-P7
- P7 (evidence traceability) is independent of P1/P2/P4/P6 but benefits from P3 renderer integration being complete

### What to defer

- **Multi-model scan comparison.** Running the same queries against multiple LLM providers (ChatGPT, Claude, Gemini) and comparing results. Interesting but adds complexity to scan execution, result storage, and report composition. Defer until after longitudinal tracking proves the single-model assessment is sufficient for re-assessment comparison.
- **Per-segment longitudinal comparison.** The per-segment reporting (separate baselines per role/focus area) multiplies the complexity of baseline tracking. First ship cross-segment comparison within a single assessment (already partially implemented). Longitudinal per-segment tracking comes later.
- **LLM-generated report narrative.** Using an LLM to generate the executive summary or stage narratives from data. The current template-driven narrative system is deterministic and testable. LLM narrative adds quality variance and latency. Defer until the template narratives are validated with 5+ real assessments. (Note: P3a-ii executive summary card uses a targeted LLM call for the "Situation" and "Top Recommendation" prose — this is a scoped exception, not full narrative generation.)
- **Automated remediation tracking.** Checking whether citation gaps have been closed (e.g., scanning Glassdoor for a new employer profile). Requires external monitoring infrastructure. Defer to post-MVP.
- **Authentication and access control.** Deferred until multi-user workflows are needed. Current operator model is single-user.
- **Automated scheduled reassessment.** Deferred until longitudinal tracking (P5) proves value and the reassessment workflow is validated manually.
- **Competitor source precision (why a competitor wins a theme).** Extends naturally within P3c/P4 work but not scoped for initial delivery. The competitive comparison table shows rates; explaining the causal mechanism requires deeper scan analysis.
- **Platformization (self-serve, client portal).** Deferred until revenue validates the model. Current delivery is operator-mediated.

---

## Resource Model

### What can be built in a single Claude Code session

Each item below is a self-contained unit of work that can be implemented, tested, and committed in one session:

| Session | Work | Est. duration |
|---|---|---|
| 1 | P1: `scoreQuery()` reweight + tests | 1-2 hours |
| 2 | P1: Three-pass dedup pipeline + `DedupResult` type + tests | 3-4 hours |
| 3 | P1: Wire dedup into orchestrator + integration test | 1-2 hours |
| 4 | P3a: `CoverPage.tsx` component + wire into renderer | 1-2 hours |
| 5 | P3a-ii: `ExecutiveSummaryCard.tsx` — situation, 3 findings, top action | 2-3 hours |
| 6 | P3b: `MethodologySection.tsx` + content | 2-3 hours |
| 7 | P3c: `CompetitorComparisonTable.tsx` | 2-3 hours |
| 8 | P3d: `EffortImpactMatrix.tsx` | 2-3 hours |
| 9 | P3 integration: wire all sections + print styling | 1-2 hours |
| 10 | P4a+4b: Citation taxonomy + remediation playbooks | 3-4 hours |
| 11 | P4c: `CitationPlaybook.tsx` + integration | 3-4 hours |
| 12 | P2: Schema migration + prompt + core orchestration | 3-4 hours |
| 13 | P2: Server action + review UI + persistence | 3-4 hours |
| 14 | P2: Testing + prompt tuning | 2-3 hours |
| 15 | P6: `assessReadiness()` + `AssessmentReadinessCheck.tsx` + wire into report action | 2-3 hours |
| 16 | P5a+5b: Schema + baseline snapshot + comparison function | 3-4 hours |
| 17 | P5c+5d: Comparison renderer + action integration + P1c: query signal scoring | 3-4 hours |
| 18 | P7: Evidence traceability — inline section evidence + export integration | 2-3 hours |

### What requires multiple sessions with testing between

- **P1 (dedup):** Session 2 builds the pipeline. Session 3 wires it in and runs integration tests. The founder should review the removed-query output from a real client assessment between sessions to validate dedup aggressiveness.
- **P2 (supplemental queries):** Session 12 builds the core. Session 13 builds the UI. Session 14 tunes the prompt with real LLM output. The founder should review generated queries from a real client between sessions 13 and 14 to assess quality and guide prompt tuning.
- **P5 (longitudinal):** Session 16 builds the data layer. Session 17 builds the UI and includes P1c signal scoring. The founder should verify baseline data accuracy by comparing the `AssessmentBaseline` record against the rendered report between sessions.

### What requires the founder's input/review before proceeding

| Checkpoint | What the founder reviews | Decision needed |
|---|---|---|
| After P1 scoring | Sample query priority rankings for a real client | Are Discovery/Evaluation queries correctly prioritized above Consideration? |
| After P1 dedup | Removed query list from `standard` mode | Is the dedup too aggressive? Any important queries being dropped? |
| After P3b methodology draft | Methodology section prose | Is the explanation accurate, clear, and appropriately detailed for the executive audience? |
| After P4b remediation playbooks | 15-20 remediation entries | Are the step-by-step actions realistic, specific enough, and appropriate for the client audience? |
| After P2 prompt v1 output | Raw LLM-generated queries for a real client | Do the supplemental queries add genuine strategic depth? Are they redundant with templates? Is the rationale useful? |
| After P6 readiness checks | Warning triggers against a real assessment | Are the thresholds calibrated correctly? Do the suggested actions make sense in the operator workflow? |
| After P5 first comparison | Before/after data for a re-assessed client | Are the metric changes meaningful? Is the trajectory narrative helpful? |
| After P1c signal scoring | Signal yield scores for a completed scan | Do the scores correctly identify high-value vs low-value queries? Are any templates consistently low-yield? |
| After P7 evidence traceability | Printed report with inline evidence lines | Is the evidence basis line useful without being visually distracting? Does it add credibility? |

---

## File Reference

### Files modified across all priorities

| File | Priorities |
|---|---|
| `packages/core/src/query-intelligence.ts` | P1, P2 |
| `packages/core/src/report-composer.ts` | P4 |
| `packages/core/src/index.ts` | P1c, P2, P4, P5, P6 |
| `packages/db/prisma/schema.prisma` | P2, P5 |
| `apps/web/src/app/(dashboard)/actions/reports.ts` | P5, P6 |
| `apps/web/src/components/report/JourneyReportRenderer.tsx` | P3, P4, P5, P7 |
| `apps/web/src/components/report/journey-types.ts` | P5, P7 |
| `packages/prompts/src/index.ts` | P2 |
| `apps/jobs/src/` (scan worker) | P1c |

### New files created

| File | Priority |
|---|---|
| `packages/core/src/query-signal-scoring.ts` | P1c |
| `packages/core/src/supplemental-queries.ts` | P2 |
| `packages/core/src/citation-taxonomy.ts` | P4 |
| `packages/core/src/citation-remediation.ts` | P4 |
| `packages/core/src/baseline-comparison.ts` | P5 |
| `packages/core/src/assessment-readiness.ts` | P6 |
| `packages/prompts/src/supplemental-query-generation.ts` | P2 |
| `apps/web/src/components/report/CoverPage.tsx` | P3 |
| `apps/web/src/components/report/MethodologySection.tsx` | P3 |
| `apps/web/src/components/report/CompetitorComparisonTable.tsx` | P3 |
| `apps/web/src/components/report/EffortImpactMatrix.tsx` | P3 |
| `apps/web/src/components/report/CitationPlaybook.tsx` | P4 |
| `apps/web/src/components/report/BaselineComparisonSection.tsx` | P5 |
| `apps/web/src/components/AssessmentReadinessCheck.tsx` | P6 |
| `apps/web/src/components/queries/SupplementalQueryReview.tsx` | P2 |

### Schema migrations

| Migration | Priority | Risk |
|---|---|---|
| Add `source String?` to `Query` model | P2 | None -- nullable addition, no data migration |
| Add `AssessmentBaseline` model + relations | P5 | None -- new table, no existing data affected |

---

## Total Effort Summary

| Priority | Dev-days | Sessions |
|---|---|---|
| P1: Query scoring and dedup | 2.5 | 3 |
| P1c: Post-scan query signal scoring | 1 | (bundled in session 17) |
| P2: Supplemental LLM queries | 5.5 | 3 |
| P3: Executive report framing | 4 | 5 |
| P4: Citation playbook | 4.5 | 2 |
| P5: Longitudinal benchmarking | 4.5 | 2 |
| P6: Weak assessment warnings | 1.5 | 1 |
| P7: Evidence traceability | 1 | 1 |
| **Total** | **~25** | **17-18** |

At the current pace (1-2 sessions per day, 2-4 hours per session), this is approximately 8 weeks of elapsed time including founder review checkpoints. The parallelization in the schedule compresses this: Weeks 1-2 tackle 3 priorities simultaneously (P1, P3a/b), Weeks 3-4 tackle 3 more (P4a/b, P3c/d), Weeks 5-6 add P6 alongside P2/P4c, and Weeks 7-8 add P1c and P7 alongside P5.
