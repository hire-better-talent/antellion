# Roadmap: Employment Framing in Templates

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** Critical (blocks assessment validity -- affects every scan result)

---

## Problem

Comparison and evaluation templates that lack explicit employment context produce consumer-focused AI answers instead of employer-focused answers. The AI interprets ambiguous queries as product or service comparisons, not employer comparisons.

Concrete example from the first real audit (Hilton Grand Vacations):

| Template | What the operator intended | What the AI answered |
|---|---|---|
| `pros and cons of {company} vs {competitor}` | Employer comparison for candidates | Timeshare product comparison for consumers |
| `{company} vs {competitor} work life balance` | Work-life comparison as employers | Partially employer-focused, but some responses drifted into resort/product reviews |
| `{company} vs {competitor} benefits and perks` | Employee benefits comparison | Mixed -- some interpreted as customer loyalty program perks |

This is not a marginal issue. When the AI misinterprets the query domain, the entire response is off-topic. The visibility score, sentiment score, and competitor mention data are all measuring the wrong thing. Every result recorded against a misframed query is noise, not signal.

### Affected templates

The `COMPETITOR_TEMPLATES` array in `packages/core/src/query-intelligence.ts` has 10 templates. Of these, the following lack explicit employment framing:

| Template | Missing framing |
|---|---|
| `{company} vs {competitor} for {role}` | Has role but no "working at" or "as an employer" |
| `pros and cons of {company} vs {competitor}` | No employment context at all |
| `better for {role} {company} or {competitor}` | Has role but ambiguous -- "better for" could mean product suitability |
| `{company} vs {competitor} benefits and perks` | "Benefits" is ambiguous -- could be customer benefits |
| `{company} vs {competitor} remote work policy` | Already employer-framed (remote work policy is unambiguous) |

Several `TEMPLATES` (non-competitor) also have weak framing:

| Template | Issue |
|---|---|
| `{company} funding and financial health` | Investor query, not candidate query |
| `{company} technology innovation` | Could be product innovation, not engineering culture |
| `{company} engineering blog` | Reference lookup, not employer evaluation |

---

## Requirements

### R1: Add employment framing to all comparison templates

Every template in `COMPETITOR_TEMPLATES` must include at least one of these signals:
- "working at" / "work at"
- "as an employer" / "employer"
- "for [role]" with a verb that implies employment ("join", "work as", "career as")
- "career at" / "career growth at"

Specific fixes:

| Current | Fixed |
|---|---|
| `{company} vs {competitor} for {role}` | `working at {company} vs {competitor} as a {role}` |
| `pros and cons of {company} vs {competitor}` | `pros and cons of working at {company} vs {competitor} for {role}` |
| `better for {role} {company} or {competitor}` | `better place to work as a {role} {company} or {competitor}` |
| `{company} vs {competitor} benefits and perks` | `{company} vs {competitor} employee benefits and perks` |

Templates that already have unambiguous employment framing (e.g., "should I work at", "engineering culture", "compensation for {role}", "career growth") require no change.

### R2: Audit all base templates for ambiguity

Review every template in `TEMPLATES` (currently ~90 entries). For each template where the query text could plausibly be interpreted as a consumer/product/investor query rather than a candidate/employer query, add minimal employment framing. Do not over-qualify templates that are already unambiguous.

Templates to fix:

| Current | Fixed | Reason |
|---|---|---|
| `{company} funding and financial health` | `{company} financial health as an employer` | Reframes from investor to candidate stability concern |
| `{company} technology innovation` | `{company} technology innovation for engineers` | Anchors to engineering context |
| `{company} engineering blog` | No change needed | Unambiguous -- engineering blogs are employer signals |
| `{company} mission and social impact` | `{company} mission and social impact as an employer` | Could otherwise return CSR/product impact |

### R3: Do not change template intent tags or stage assignments

Employment framing is a text-level fix. It must not alter the `intent`, `theme`, or `stage` fields on any template. The dedup pipeline, clustering, and stage classification must produce identical structural results.

### R4: Verify with the dedup pipeline

After applying fixes, run `generateQueryIntelligence` with a representative input and confirm:
- `totalAfterDedup` is within +/- 5 of the pre-fix count (adding "working at" may cause a few new Jaccard collisions)
- No stage distribution changes beyond +/- 1 query per stage
- No templates are lost to dedup that previously survived

---

## Implementation

### Where the changes live

`packages/core/src/query-intelligence.ts` -- the `TEMPLATES` and `COMPETITOR_TEMPLATES` arrays. No other files.

### Scope

This is a data-level fix: editing string literals in template definitions. No logic changes, no new functions, no schema changes, no migrations.

### Estimated effort

2-3 hours: audit all templates, apply framing where needed, update snapshot tests in `packages/core/src/__tests__/query-intelligence.test.ts`.

---

## Risks

1. **Over-qualification.** Adding "working at" to every template makes them all sound the same, which could reduce AI response diversity. Mitigation: vary the framing ("working at", "as an employer", "career at", "for [role]") across templates. Do not use the same framing phrase more than 3 times across the full set.

2. **Dedup regression.** Adding common words like "working" increases Jaccard overlap between templates. Mitigation: R4 requires a dedup verification pass. If dedup becomes too aggressive, the tighter dedup spec (query-dedup-improvement.md) will address it through intent-level dedup that preserves templates with different intent tags even when words overlap.

3. **Existing scan data.** Scans already recorded with the misframed templates produced off-topic results. Those results are already in the database. This fix only affects future query generation. Previously recorded results should be flagged during report QA (the operator can mark them as REJECTED during result review).

---

## Interaction with Other Specs

- **query-dedup-improvement.md:** Adding employment framing increases word overlap across templates. The tighter dedup pipeline (intent-level dedup) will correctly preserve templates that share "working at" but have different intent tags. Ship employment framing first; tighter dedup is safe to ship independently after.
- **template-rebalance.md:** The rebalance spec proposes adding/removing templates. Employment framing should be applied first so the rebalance operates on correctly-framed templates. Framing is a prerequisite, not a dependency -- both can be implemented independently but framing should land first.
- **natural-query-language.md:** New natural-language templates written under that spec must include employment framing from day one. That spec should reference this one as a constraint.
