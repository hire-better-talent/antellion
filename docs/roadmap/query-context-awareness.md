# Roadmap: Query Template Context Awareness by Job Family

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** High (affects correctness of every non-engineering assessment)

---

## Problem

The query templates in `packages/core/src/query-intelligence.ts` are heavily biased toward engineering roles. Out of ~100 templates (including competitor templates), at least 14 contain hardcoded engineering-specific language that is emitted regardless of the operator's entered `roleTitle`.

Affected templates (representative, not exhaustive):

| Template | Problem for non-engineering roles |
|---|---|
| `best engineering culture at {industry} companies` | Irrelevant for Sales, Product, Marketing assessments |
| `companies known for great engineering teams in {geography}` | Same |
| `{industry} companies with best benefits for engineers` | Assumes engineer audience |
| `top {industry} companies for engineers in {geography}` | Same |
| `{company} engineering team culture` | Wrong function entirely |
| `{company} tech stack for {role}` | Meaningless for non-technical roles |
| `{company} engineering blog` | No equivalent signal for most functions |
| `{company} engineering culture and values` | Wrong function |
| `what do engineers say about working at {company}` | Wrong peer group |
| `what is the engineering team size at {company}` | Wrong team |
| `{company} engineer pay compared to competitors` | Wrong title |
| `{company} compared to {competitor} engineering culture` | Wrong function |
| `does {company} do whiteboard interviews` | Engineering-specific interview format |
| `what is the {company} coding challenge like` | Engineering-specific assessment |
| `what to expect in {company} technical interview` | Engineering-specific |
| `{company} onboarding experience for new engineers` | Wrong function |

When an operator enters "Account Executive" or "Product Manager" as the role, the system still generates queries like "best engineering culture at fintech companies" and "does {company} do whiteboard interviews." This produces irrelevant scan results that pollute the assessment and undermine report credibility.

The `roleTitle` is a free-text string today. The system performs no classification on it and passes it through to `{role}` placeholders without analyzing what function it represents. Templates that don't use the `{role}` placeholder have no mechanism to adapt at all.

Additionally, `businessContext` is declared on `QueryGenerationInput` but entirely unused in the generation pipeline -- it is never read by `generateRawQueries` or any downstream function.

---

## Requirements

### R1: Template tagging with `applicableTo`

Extend the `QueryTemplate` interface with an optional `applicableTo` field:

```typescript
interface QueryTemplate {
  template: string;
  intent: string;
  theme: QueryTheme;
  stage: DecisionStage;
  applicableTo?: JobFamily[];  // omitted or empty = all families
}
```

Semantics:
- **Omitted / empty array:** Template is generic. Always included regardless of job family.
- **Non-empty array:** Template is only included when the detected job family is in the list.

This is a filter, not a transform. Templates tagged `["engineering"]` are excluded for non-engineering roles; they are not rewritten. Phase 2 adds rewriting.

### R2: Job family taxonomy

Define a closed set of job families:

```typescript
const JOB_FAMILIES = [
  "engineering",
  "product",
  "design",
  "data",
  "sales",
  "marketing",
  "operations",
  "general",
] as const;

type JobFamily = (typeof JOB_FAMILIES)[number];
```

`"general"` is the fallback. It means the role could not be classified. When the detected family is `"general"`, include only templates with `applicableTo` omitted/empty. Never include function-specific templates for an unclassified role.

### R3: Job family classifier

A pure function that maps `roleTitle` to a `JobFamily`:

```typescript
function classifyJobFamily(roleTitle: string): JobFamily;
```

Implementation: keyword-based, not LLM. A lookup table mapping common role title substrings to families. Examples:

| Substring matches | Family |
|---|---|
| `engineer`, `developer`, `sre`, `devops`, `qa`, `sdet`, `architect`, `infrastructure`, `platform`, `security engineer`, `frontend`, `backend`, `fullstack` | `engineering` |
| `product manager`, `product lead`, `product owner`, `program manager`, `tpm` | `product` |
| `designer`, `ux`, `ui`, `creative`, `visual design`, `ux research`, `interaction design` | `design` |
| `data scientist`, `data analyst`, `data engineer`, `ml engineer`, `machine learning`, `analytics`, `business intelligence` | `data` |
| `sales`, `account executive`, `bdr`, `sdr`, `customer success`, `account manager`, `revenue`, `business development` | `sales` |
| `marketing`, `growth`, `content`, `brand`, `communications`, `demand gen`, `seo`, `social media` | `marketing` |
| `operations`, `people ops`, `hr`, `recruiting`, `finance`, `legal`, `admin` | `operations` |

Matching is case-insensitive and uses longest-match-first to avoid false positives (e.g., "data engineer" should match `data`, not `engineering`). If no substring matches, return `"general"`.

This function belongs in `packages/core` alongside the existing query intelligence code.

### R4: Template filtering in `generateRawQueries`

Modify `generateRawQueries` to:

1. Call `classifyJobFamily(input.roleTitle)` once.
2. Filter `TEMPLATES` to include only templates where `applicableTo` is omitted/empty OR contains the detected family.
3. Apply the same filter to `COMPETITOR_TEMPLATES`.

This is the only change to the generation pipeline. Scoring, deduplication, clustering, and stage assignment are unaffected.

### R5: Template audit and tagging

Every existing template must be reviewed and tagged. The expected breakdown:

- **Generic (no tag needed):** ~65 templates. Templates about company reputation, compensation, work-life balance, remote policy, general culture, interview process, career growth, etc. These use `{role}` or `{company}` placeholders without assuming a specific function.
- **`["engineering"]` only:** ~14 templates. All templates listed in the Problem section above.
- **Cross-applicable (multiple families):** Some templates may apply to 2-3 families. Example: `{company} tech stack for {role}` applies to `["engineering", "data"]`. Keep cross-application narrow and intentional.

### R6: Replacement terms for Phase 2

Engineering-specific concepts have equivalents in other functions. These are NOT implemented in Phase 1 but should guide Phase 2 variant creation:

| Engineering term | Sales equivalent | Product equivalent | Design equivalent | Generic fallback |
|---|---|---|---|---|
| engineering culture | sales culture | product culture | design culture | team culture |
| engineering blog | -- | product blog | design portfolio | company blog |
| tech stack | sales tools / CRM stack | product tools | design tools | -- (omit) |
| coding challenge | case study / pitch exercise | product case study | design challenge | take-home assignment |
| whiteboard interviews | role play exercise | case presentation | portfolio review | interview format |
| engineering team size | sales team size | product team size | design team size | team size |
| technical interview | sales interview | product interview | design interview | interview process |

### R7: Fallback safety

If `classifyJobFamily` returns `"general"`:
- Include all templates with `applicableTo` omitted/empty.
- Exclude all templates with a non-empty `applicableTo`.
- Never show "engineering blog" or "coding challenge" queries for an unrecognized role.

This is strictly safer than the current behavior, which shows all templates including engineering-specific ones for every role.

---

## Implementation Phases

### Phase 1: Tag and filter (smallest shippable unit)

**Scope:** ~1 day.

1. Add `applicableTo?: JobFamily[]` to `QueryTemplate` interface.
2. Add `JOB_FAMILIES` const and `JobFamily` type.
3. Implement `classifyJobFamily()` as a keyword lookup.
4. Tag all 14+ engineering-biased templates with `applicableTo: ["engineering"]`.
5. Add the filter step to `generateRawQueries` before template expansion.
6. Update tests:
   - New test: generating queries with `roleTitle: "Account Executive"` produces zero queries containing "engineering", "coding challenge", "whiteboard", or "tech stack".
   - New test: generating queries with `roleTitle: "Senior Backend Engineer"` still includes all engineering templates.
   - New test: `classifyJobFamily` correctly classifies representative titles from each family.
   - Existing tests continue to pass (they use `roleTitle: "Senior Backend Engineer"` which classifies as engineering).

**Result:** Non-engineering assessments stop producing irrelevant queries. No new templates are added; engineering assessments are unchanged.

### Phase 2: Role-specific template variants

**Scope:** ~2-3 days.

Instead of just filtering out engineering templates for non-engineering roles, create parallel variants for other job families. Each engineering-specific template gets equivalents:

```typescript
{
  template: "{company} sales team culture",
  intent: "Team culture assessment",
  theme: "culture",
  stage: "CONSIDERATION",
  applicableTo: ["sales"],
},
{
  template: "{company} product team culture",
  intent: "Team culture assessment",
  theme: "culture",
  stage: "CONSIDERATION",
  applicableTo: ["product"],
},
```

This ensures non-engineering assessments have equivalent query coverage, not just fewer queries.

Template count will grow from ~100 to ~150-180. The deduplication and clustering pipeline handles this without changes.

Also add function-specific discovery templates:
- `"best companies for {role} sales culture"` (sales)
- `"companies with best product teams in {geography}"` (product)
- `"top design-driven companies in {industry}"` (design)

### Phase 3: `businessContext` integration

**Scope:** ~1-2 days. Depends on Phase 1.

The `businessContext` field on `QueryGenerationInput` is already accepted by the schema and passed through the server action, but the generation pipeline ignores it. Phase 3 uses it to:

1. Refine family classification. If `roleTitle` is ambiguous but `businessContext` contains "enterprise sales" or "B2B SaaS sales org," boost the `sales` classification.
2. Inject context-specific query variants. If `businessContext` mentions "enterprise deals," add templates like `"{company} enterprise sales process"` and `"{company} enterprise account executive culture"`.

This is a lightweight enhancement, not an LLM call. Parse `businessContext` for signal keywords and use them to influence template selection and variable substitution.

---

## Technical Design

### Where the logic lives

All new code goes in `packages/core/src/query-intelligence.ts`:
- `JOB_FAMILIES` const and `JobFamily` type: exported alongside existing `QUERY_THEMES` / `QueryTheme`.
- `classifyJobFamily()`: exported pure function.
- `applicableTo` field: added to the existing `QueryTemplate` interface (internal, not exported).
- Filtering logic: added inside `generateRawQueries()` (internal).

No new files. No schema changes. No new packages. No changes to `apps/web` or `apps/jobs`.

### Interaction with `QueryGenerationInput`

The input type does not change. `roleTitle` is already a string. The classifier reads it; the caller does not need to know about job families.

If a future feature (like the job-category-extraction roadmap item) wants to pass an explicit job family, extend `QueryGenerationInput` then:

```typescript
export interface QueryGenerationInput {
  // ... existing fields ...
  jobFamily?: JobFamily;  // explicit override, skips classification
}
```

Do not add this field in Phase 1. The classifier is sufficient and avoids coupling the UI to the family taxonomy before it is validated.

### Interaction with job-category-extraction roadmap item

The `job-category-extraction` spec proposes auto-detecting job categories from career sites and presenting them as selectable options. Those categories become `roleTitle` values. Context-awareness complements this: once the operator selects "Account Executive" from an extracted category list, the query generation pipeline correctly excludes engineering templates.

The two features are independent and can ship in either order. If job-category-extraction ships first, non-engineering categories will still generate engineering-biased queries until this spec ships. If this spec ships first, the benefit applies immediately to manually entered role titles.

### No schema migration

This change is entirely within the template definitions and generation logic in `packages/core`. No Prisma schema changes. No database migration. No changes to stored data. Existing generated queries (already persisted in the database) are unaffected.

### Effect on query counts

Phase 1 reduces the number of generated queries for non-engineering roles by approximately 14 templates (out of ~85 base templates + competitor expansions). This is intentional: fewer, more relevant queries produce better scan results. The system should not pad the query count with irrelevant templates.

Phase 2 restores query count parity by adding role-specific variants.

---

## Testing Strategy

### Phase 1 tests

1. **`classifyJobFamily` unit tests.** Cover each family with 2-3 representative titles, plus edge cases: mixed-case input, titles with seniority prefixes ("Senior", "Staff", "VP of"), titles that could match multiple families ("Data Engineer" should be `data` not `engineering`), and unrecognizable titles returning `"general"`.

2. **Integration test: non-engineering role produces no engineering-specific queries.** Generate queries for `roleTitle: "Account Executive"` and assert zero queries contain engineering-specific substrings ("engineering culture", "tech stack", "coding challenge", "whiteboard", "engineering blog", "engineering team").

3. **Integration test: engineering role is unaffected.** Generate queries for `roleTitle: "Senior Backend Engineer"` and confirm the total query count and engineering-specific query presence match the current baseline.

4. **Integration test: unrecognized role gets only generic templates.** Generate queries for `roleTitle: "Chief of Staff"` (maps to `"general"`) and confirm no function-specific templates are included.

5. **Existing test suite passes unchanged.** The `BASE_INPUT` uses `roleTitle: "Senior Backend Engineer"`, which classifies as engineering. All current assertions hold.

### Phase 2 tests

6. **Variant coverage.** For each job family, generate queries and confirm at least one function-specific template is included (e.g., `"sales team culture"` for sales).

7. **Query count parity.** Non-engineering roles should generate within 80-100% of the engineering query count, not dramatically fewer.

---

## Risks and Tradeoffs

1. **Classifier accuracy.** A keyword-based classifier will misclassify unusual titles. Mitigation: the `"general"` fallback is safe (generic templates only), and operators can always edit generated queries. An explicit `jobFamily` override (future) provides an escape hatch.

2. **Template maintenance cost.** Phase 2 multiplies the template count by ~1.5-2x. Each new template needs tagging and an intent string. Mitigation: templates are static data, not code. A future improvement could generate variants programmatically from a base template + substitution table, but this is not needed in Phase 1 or 2.

3. **Backward compatibility of generated queries.** Existing assessments that used non-engineering roles already have engineering-biased queries persisted in the database. This spec does not retroactively fix them. Operators would need to re-generate queries for existing clients to benefit. This is acceptable; query re-generation is already a supported workflow.

4. **"Data Engineer" ambiguity.** Some roles span families. "Data Engineer" is more `data` than `engineering` in candidate intent (they search for data team culture, not engineering blog posts). The classifier should use longest-match-first to handle this correctly. "ML Engineer" similarly maps to `data`.

---

## Future Considerations

- **LLM-assisted classification.** If the keyword classifier proves insufficient for long-tail titles, a single LLM call to classify `roleTitle` into a `JobFamily` is cheap and deterministic enough (temperature 0, enum output). But do not introduce this dependency until the keyword classifier demonstrably fails on real operator input.
- **Multi-family roles.** Some roles genuinely span families ("Technical Product Manager"). The classifier could return `JobFamily[]` instead of a single value, and template filtering would include templates matching any of the detected families. Defer until there is evidence this matters.
- **Per-family theme tuning.** Different functions may weight themes differently. Sales candidates care more about compensation and less about "tech innovation." Theme priority scores could be family-dependent. Defer until report analysis confirms this matters.
