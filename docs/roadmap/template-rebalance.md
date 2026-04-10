# Roadmap: Template Stage Rebalance

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** High (directly affects assessment signal quality)

---

## Problem

The current template distribution in `packages/core/src/query-intelligence.ts` is heavily skewed toward Consideration queries. Counted from the source (excluding competitor templates, which add ~10 Evaluation queries per competitor):

| Stage | Current count | Current % | Issue |
|---|---|---|---|
| Discovery | 23 | 25% | Adequate but could be stronger with more natural language variety |
| Consideration | 33 | 36% | Too many -- these are prompted queries with low marginal signal |
| Evaluation | 14 | 15% | Too few -- this is where the competitive assessment story lives |
| Commitment | 20 | 22% | Adequate |

The Consideration stage is overrepresented because it is the easiest to template: pick a company name, append an attribute. But each additional Consideration query adds diminishing signal. The AI's response to "{company} work life balance" and "{company} flexible work schedule for {role}" are nearly identical. Recording both wastes operator time and inflates the assessment without adding proportional insight.

Meanwhile, the Evaluation stage -- where the assessment's competitive narrative is built -- has only 14 base templates. Most are compensation lookups ("{role} salary at {company}", "{company} equity compensation for {role}"), not comparative queries. The comparative queries live in `COMPETITOR_TEMPLATES`, which only fire when competitors are configured. For a client with no competitors, the Evaluation stage has almost no representation.

---

## Target Distribution

After rebalancing:

| Stage | Target count | Target % | Rationale |
|---|---|---|---|
| Discovery | 28-32 | 27-30% | More natural conversational queries (per natural-query-language.md) |
| Consideration | 18-22 | 18-21% | Cut redundant prompted queries, keep only distinct signal queries |
| Evaluation | 24-28 | 23-27% | Add natural comparison queries, salary benchmarking, industry ranking |
| Commitment | 18-22 | 18-21% | Slight trim of interview process duplicates |

Total base templates: ~95-105 (vs current ~90). The absolute count stays similar; the distribution shifts toward earned-visibility stages.

With competitors configured, `COMPETITOR_TEMPLATES` (currently 10) add ~10 Evaluation queries per competitor. For a 4-competitor assessment, that is +40 Evaluation queries, which further emphasizes the competitive comparison stage. This is correct -- competitor comparisons are the highest-value data in the report.

---

## Requirements

### R1: Cut Consideration templates from 33 to ~20

Remove templates that produce near-identical AI responses. Identify redundant pairs by running the existing template set through a representative assessment and comparing AI responses for semantic overlap.

Templates to cut (candidates -- final list determined by the implementer after testing):

| Template | Reason for removal |
|---|---|
| `{company} engineering team culture` | Redundant with `{company} engineering culture and values` |
| `{company} {role} day to day work` | Redundant with `day in the life of a {role} at {company}` |
| `{company} professional development opportunities` | Overlaps with `{company} career growth for {role}` |
| `{company} office culture and work environment` | Overlaps with `{company} engineering culture and values` for tech roles |
| `{company} employee retention and turnover` | Overlaps with `{company} layoffs and job security` |
| `{company} leadership and management style` | Low signal -- AI responses are generic for this query |
| `{company} employer reputation {role}` | Overlaps with `is {company} a good company to work for` |
| `{company} glassdoor rating` | Low signal standalone -- better as part of a natural evaluation query |
| `{company} flexible work schedule for {role}` | Overlaps with `{company} remote work policy` and `{company} work life balance` |
| `{company} technology innovation` | Ambiguous (product vs employer) -- either reframe per employment-framing spec or cut |
| `{company} inclusion and belonging for {role}` | Overlaps with `{company} diversity and inclusion` |
| `{company} funding and financial health` | Investor query, not candidate query -- either reframe or cut |
| `what is the engineering team size at {company}` | Low signal -- rarely produces useful employer perception data |

Not every template on this list must be removed. The implementer should verify each one against real AI responses. The target is ~20 surviving Consideration templates, not a specific deletion list.

### R2: Increase Evaluation templates from 14 to ~25

Add templates that measure comparative employer perception through natural language:

**Non-competitor Evaluation (always generated):**

| New template | Theme | Notes |
|---|---|---|
| `how does {company} compare to other {industry} employers for {role}` | competitor_comparison | Natural comparison without naming a competitor |
| `is {company} above or below market for {role} compensation in {geography}` | compensation | Specific and natural |
| `{company} employer ranking in {industry}` | reputation | Positional query |
| `how does {company} treat its {role} employees compared to the industry` | culture | Natural employer comparison |
| `{company} vs industry average for {role} career growth` | culture | Benchmarking |
| `what do {role} employees think of {company} compared to competitors` | reputation | Peer sentiment comparison |
| `is {company} a top-tier employer for {role} in {geography}` | reputation | Tier-positioning query |

**Additional competitor Evaluation (added to COMPETITOR_TEMPLATES):**

| New template | Theme | Notes |
|---|---|---|
| `which is the better employer for {role}, {company} or {competitor}` | competitor_comparison | Natural decision-framing |
| `{company} or {competitor}: where will a {role} grow faster` | culture | Career trajectory comparison |
| `employee satisfaction at {company} vs {competitor}` | reputation | Head-to-head satisfaction |

### R3: Increase Discovery templates to ~30

Add 5-8 natural conversational Discovery templates (per natural-query-language.md). These should include:
- Industry career exploration queries
- Role path queries
- Context-specific queries using `{context}` variable

Specific templates are defined in the natural-query-language.md spec. This requirement ensures the rebalance accounts for those additions.

### R4: Trim Commitment templates from 20 to ~18-20

The Commitment stage has minor redundancy:
- `{company} {role} interview process` vs `{company} {role} interview questions and process` -- near-identical
- `{company} hiring timeline` vs `{company} hiring process timeline` -- same query differently worded
- `{company} offer negotiation tips` vs `negotiating salary at {company} for {role}` -- overlapping

Remove 2-3 of the weakest duplicates. Do not aggressively cut Commitment -- interview preparation queries are high-value for the Commitment stage narrative.

### R5: Verify post-rebalance distribution

After applying all changes, run `generateQueryIntelligence` with a representative input (4 competitors, geography, industry, engineering role) and verify:

1. **Stage distribution (base templates only, no competitors):**
   - Discovery: 27-30%
   - Consideration: 18-21%
   - Evaluation: 23-27%
   - Commitment: 18-21%

2. **Stage distribution (with 4 competitors):**
   - Discovery: 20-23% (diluted by competitor Evaluation queries)
   - Consideration: 13-16%
   - Evaluation: 35-42% (boosted by competitor templates -- this is correct)
   - Commitment: 13-16%

3. **Dedup behavior:** Run the rebalanced templates through dedup (both current Jaccard and the tighter dedup from query-dedup-improvement.md if available) and verify the surviving set maintains the target distribution within +/- 3%.

4. **Theme coverage:** Every theme (reputation, compensation, culture, role_expectations, hiring_process, competitor_comparison) has at least 5 templates after dedup. No theme is zeroed out.

### R6: Employment framing compliance

Every new or modified template must comply with the employment-framing-in-templates.md spec. No ambiguous consumer/product queries.

---

## Implementation

### Where the changes live

`packages/core/src/query-intelligence.ts` -- the `TEMPLATES` and `COMPETITOR_TEMPLATES` arrays. This is the only file that changes (plus tests).

### Approach

1. Apply employment framing fixes first (per employment-framing-in-templates.md).
2. Remove redundant Consideration templates.
3. Add new Evaluation and Discovery templates.
4. Trim Commitment duplicates.
5. Run the full pipeline and verify distribution.
6. Update snapshot/assertion tests.

### What does NOT change

- `QueryTemplate` interface -- unchanged.
- `GeneratedQuery` interface -- unchanged.
- `generateQueryIntelligence` orchestrator -- unchanged (operates on whatever templates exist).
- `deduplicateQueries` -- unchanged.
- Stage classifier -- unchanged (templates carry explicit stage assignments).
- Prisma schema -- no migration needed.
- Existing persisted query clusters -- unaffected (regeneration is opt-in).

### Estimated effort

1-2 days: template editing, distribution verification, test updates. The work is primarily template authoring and validation, not code.

---

## Risks and Tradeoffs

1. **Removing Consideration templates changes the assessment for re-scanned clients.** A client who was scanned with the old template set and then re-scanned with the rebalanced set will have different query clusters. Mitigation: query clusters are generated per scan. Old scans retain their original queries. The re-scan explicitly generates new clusters. The operator should be aware that the query set changed.

2. **Fewer Consideration queries may lower the overall mention rate.** Consideration queries have the highest mention rate because the company is named in the query. Cutting them reduces the denominator of prompted mentions. Mitigation: this is correct behavior. The earned visibility rate (Discovery + Evaluation) is the primary metric, and it is unaffected by Consideration count. The overall mention rate should be reported with the earned/prompted split so the reduction is understood.

3. **New Evaluation templates may produce low mention rates for some clients.** Natural comparison queries like "how does {company} compare to other {industry} employers" might not always mention the client. Mitigation: this is the point. Low earned mention rates in Evaluation are a real signal, not a data quality issue. The report narrative should explain that a low Evaluation mention rate means the AI does not independently position the client in comparisons.

4. **Risk of over-fitting to one audit.** The rebalance is motivated by findings from the first real audit (HGV). The template distribution should be validated across multiple client profiles before committing. Mitigation: the distribution targets (27-30% Discovery, 18-21% Consideration, etc.) are based on the product's methodology, not one client's results. The specific templates added/removed should be reviewed against 2-3 client profiles.

---

## Interaction with Other Specs

- **employment-framing-in-templates.md:** Prerequisite. Apply framing fixes before rebalancing to avoid editing templates twice.
- **natural-query-language.md:** Provides the specific new Discovery and Evaluation templates to add. This spec defines the distribution targets; that spec defines the template content.
- **query-dedup-improvement.md:** Tighter dedup ensures that the rebalanced template set's distribution is preserved through the dedup pipeline. Without tighter dedup, new templates that share words with existing ones may be incorrectly removed, distorting the distribution. Recommend shipping tighter dedup alongside or shortly after the rebalance.
- **query-context-awareness.md:** The context-awareness spec filters templates by job family. After rebalancing, verify that each job family profile still has adequate coverage across all four stages. A rebalance that cuts Consideration templates for engineering roles should not accidentally zero out Consideration for non-engineering roles.
