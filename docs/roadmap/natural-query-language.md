# Roadmap: Natural Query Language

**Status:** Implemented
**Author:** Architect
**Date:** 2026-03-31
**Priority:** Critical (highest-impact query quality improvement)

---

## Problem

Most templates in `packages/core/src/query-intelligence.ts` follow a "[Company Name] + attribute" search engine pattern:

```
{company} work life balance
{company} glassdoor rating
{company} {role} compensation package
{company} employee reviews
```

This is how people use Google, not how they talk to AI. Real AI conversations are conversational, open-ended, and often do not name a specific company:

```
"what companies pay the best for timeshare sales"
"is vacation ownership sales a good career"
"how do I get into hospitality sales"
"I'm considering a sales job at HGV, what should I know"
"should I take a sales role at Marriott or Hilton Grand Vacations"
```

The current template distribution (counted from the TEMPLATES + COMPETITOR_TEMPLATES arrays):
- Discovery: ~23 templates (no company name -- good)
- Consideration: ~33 templates (company + attribute -- too many, low-value)
- Evaluation: ~14 base + 10 competitor = ~24 total (but most are compensation benchmarks, few are natural comparisons)
- Commitment: ~20 templates (adequate)

The Consideration templates are the weakest part of the assessment. When you ask AI "tell me about [Company]", of course the AI talks about that company. The mention rate is nearly tautological. The real signal is: "When a candidate asks about careers in your industry, does AI recommend you?" -- and that is what the current template set underserves.

---

## Requirements

### R1: Add conversational Discovery templates

New Discovery templates should model how candidates actually talk to AI assistants. These fall into three patterns:

**Career exploration (no company, no specific role):**
```
"is [industry] a good industry to work in"
"what are the career options in [industry]"
"what's it like working in [industry] sales"
"earning potential in [industry]"
```

**Role exploration (no company, specific role):**
```
"what companies should I apply to for [role] in [geography]"
"how do I break into [role] in [industry]"
"what skills do I need for [role] in [industry]"
"career path for a [role] in [geography]"
```

**Industry-specific comparative (no company):**
```
"best companies for [industry] sales careers"
"which [industry] companies have the best commission structure"
"highest paying [industry] companies for [role]"
"best entry-level [industry] jobs in [geography]"
```

Target: add 8-12 new Discovery templates using these conversational patterns. Each must use natural sentence structure, not keyword-stuffed search terms.

### R2: Add natural Evaluation templates

Current Evaluation templates are mostly compensation lookups ("{role} salary at {company}") and mechanical comparisons ("{company} vs {competitor}"). Real candidates evaluate through natural questions:

**Decision-framing:**
```
"should I take a [role] job at {company} or {competitor}"
"I have offers from {company} and {competitor}, which should I choose"
"is {company} better than {competitor} for [role] careers"
```

**Attribute-specific natural comparison:**
```
"which company pays better for [role], {company} or {competitor}"
"where will I grow faster as a [role], {company} or {competitor}"
"better work-life balance for [role]: {company} or {competitor}"
```

**Scenario-based:**
```
"I'm a [role] considering {company}. What should I know before applying?"
"what do current employees say about {company} vs {competitor}"
```

Target: add 8-10 new Evaluation templates using natural conversational patterns. Every comparison template must include employment framing (per employment-framing-in-templates.md).

### R3: Reduce Consideration template redundancy

Several Consideration templates produce near-identical AI responses:
- `{company} employee reviews` vs `what do engineers say about working at {company}` -- same intent, same AI output
- `{company} work life balance` vs `{company} flexible work schedule for {role}` -- overlapping signal
- `{company} engineering team culture` vs `{company} engineering culture and values` -- redundant

Do not delete these templates outright. Instead:
1. Mark redundant templates with a `deprecated: true` flag (or remove them during the template-rebalance spec)
2. For now, ensure the dedup pipeline catches them (the query-dedup-improvement spec handles this)
3. The template-rebalance spec will make the final cuts

### R4: Vary query structure

No more than 30% of templates in any stage should follow the same syntactic structure. Measure structure by pattern:

| Pattern | Example |
|---|---|
| `{company} [noun phrase]` | `{company} work life balance` |
| `[question word] {company} [rest]` | `what is it like to work at {company}` |
| `[conversational question]` | `should I take a job at {company} or {competitor}` |
| `[natural statement + question]` | `I'm considering {company}. What should I know?` |
| `[superlative/ranking request]` | `best companies for {role} in {geography}` |

The current Consideration templates are >70% the `{company} [noun phrase]` pattern. After this spec, that pattern should be <30% of Consideration templates.

### R5: Industry-parameterized Discovery queries

The `QueryGenerationInput` type already accepts `industry?: string` and `businessContext?: string`. New Discovery templates should use `{industry}` more aggressively to produce industry-specific natural queries.

The `businessContext` field is currently unused in template expansion. If the client has business context (e.g., "vacation ownership / timeshare sales"), it should be available as a `{context}` variable for templates that benefit from specificity:

```
"best companies for {context} careers"
"earning potential in {context}"
"is {context} a good career path"
```

Implementation: add `context: input.businessContext ?? input.industry ?? ""` to the `vars` record in `generateRawQueries()`. Templates referencing `{context}` are filtered out when no businessContext or industry is provided (same pattern as the existing geography filter).

---

## Impact

This is the single highest-impact improvement to assessment quality. It shifts the measurement from:

**Current:** "When you ask AI about [Company], does it know about [Company]?" -- tautologically high mention rate, low signal.

**After:** "When a candidate explores careers naturally, does AI recommend [Company]?" -- earned visibility, real signal.

The Discovery and natural Evaluation templates produce the data that powers the earned visibility rate (`earnedVisibilityRate` in `JourneyAnalysis`). More natural queries in these stages = higher-fidelity earned visibility measurement = more defensible reports.

---

## Implementation

### Where the changes live

1. `packages/core/src/query-intelligence.ts` -- new template entries in `TEMPLATES` and `COMPETITOR_TEMPLATES`, plus the `{context}` variable addition to `generateRawQueries()`.
2. `packages/core/src/__tests__/query-intelligence.test.ts` -- updated test fixtures and assertions.

### What does NOT change

- `QueryGenerationInput` interface -- `businessContext` field already exists, no schema change needed.
- `GeneratedQuery` interface -- unchanged.
- Stage classification logic -- new templates carry explicit `stage` assignments; the classifier is not affected.
- Dedup logic -- operates on the expanded templates as before. New templates with different wording and different intent tags will survive dedup correctly.

### No schema migration

No Prisma model changes. No new fields. The `Query.text` field is a `String` and accommodates longer conversational queries. The existing `max(1000)` Zod validation in `CreateQuerySchema` is sufficient (conversational queries are longer than keyword queries but still well under 1000 chars).

### Estimated effort

1-2 days: write new templates, update tests, verify dedup output, verify stage distribution. The template authoring itself requires domain knowledge about what real AI conversations look like -- the operator who ran the first audit should review the new templates before merge.

---

## Risks and Tradeoffs

1. **Template count growth.** Adding 16-22 new templates increases the raw query count from ~100 to ~120 before dedup. This is acceptable -- the dedup pipeline and the template-rebalance spec will keep the post-dedup count manageable. The new templates add genuine signal that the current set lacks.

2. **{context} variable produces odd queries when business context is vague.** Mitigation: filter out `{context}` templates when the expanded text still contains `{context}` (same pattern as geography filtering). Only expand when meaningful context is available.

3. **Conversational queries may produce longer AI responses.** Open-ended questions like "is [industry] a good career" elicit essay-length responses. This increases token count per scan result but does not change the analysis logic -- `analyzeResponse` works on any length text.

4. **Backward compatibility for existing assessments.** Clients with previously generated query clusters will not automatically get the new templates. Their clusters were generated from the old template set and are persisted in the database. New templates only appear when queries are regenerated. This is correct behavior -- the operator must explicitly regenerate to get the updated set.

---

## Interaction with Other Specs

- **employment-framing-in-templates.md:** Must land first. All new templates written under this spec must include employment framing from day one. This spec treats employment framing as a prerequisite constraint.
- **template-rebalance.md:** This spec adds templates; the rebalance spec adjusts the overall distribution. They are complementary. The rebalance spec should be written with the new templates in mind.
- **query-dedup-improvement.md:** Tighter dedup ensures new conversational templates that overlap with existing keyword templates are correctly handled. Independent but complementary.
- **query-context-awareness.md:** The `{context}` variable addition aligns with the context-awareness spec's goal of making templates more industry/role-aware.
