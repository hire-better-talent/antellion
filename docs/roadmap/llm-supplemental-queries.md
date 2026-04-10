# Roadmap: LLM-Generated Supplemental Queries

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** High (differentiates assessment quality, enables bespoke per-client depth)

---

## Problem

Template queries cover what every candidate asks. "Best fintech companies to work for" and "what is it like to work at ServiceTitan" are reliable but generic. An assessment worth $10K should also contain queries a strategist would ask -- probing the client's specific market, competitive dynamics, and role-specific angles.

These queries cannot be pre-templated because they depend on per-client context:
- Which competitors were actually discovered (not guessed at setup time)
- What the client's industry vertical and market position look like
- What topics the Discovery scan already covers well and where it is thin

The existing `queryGenerationPrompt` in `packages/prompts/src/query-generation.ts` was designed for general-purpose LLM query generation (5-8 queries per theme, covering all themes). It is not suitable for supplemental generation because it does not know what templates already cover, does not incorporate Discovery scan findings, and generates redundant breadth rather than targeted depth.

---

## Requirements

### R1: Timing -- after Discovery scan and competitor discovery

LLM supplemental query generation is NOT part of the initial `generateQueryIntelligence` pipeline. It runs later, after:

1. Initial template queries have been generated and persisted
2. A Discovery scan has been run against those queries
3. Competitors have been discovered (either manually added or auto-detected from scan results)

At this point the system has real signal: mention rates, discovered competitors, themes where the client appears prominently, and gaps where AI coverage is thin. The LLM uses this signal to generate queries that fill the gaps templates cannot.

This means supplemental generation is a separate entry point, not an extension of `generateQueryIntelligence`. It has its own input type, its own orchestration function, and its own prompt.

### R2: Input shape

```typescript
interface SupplementalQueryInput {
  // Client context
  clientName: string;
  clientDomain: string;
  industry: string;
  description?: string;

  // Assessment context
  roleTitle: string;
  geography?: string;

  // Discovered competitors (from the real scan, not setup-time guesses)
  competitors: Array<{ name: string; domain?: string }>;

  // Existing template queries (for dedup awareness in the prompt)
  existingQueryTexts: string[];

  // Optional: Discovery scan summary
  scanSummary?: {
    mentionRate: number;                  // 0-100
    topThemes: string[];                  // themes where client appeared strongly
    gapThemes: string[];                  // themes with low or no coverage
    competitorMentionRates: Record<string, number>;  // competitor name → mention rate
  };
}
```

The `existingQueryTexts` field is critical. It is passed to the LLM prompt so the model can avoid generating queries that overlap with what templates already cover. This is prompt-level dedup -- a first line of defense before the pipeline-level dedup in R5.

The `scanSummary` is optional because the feature should work even if the operator wants to generate supplemental queries before running a Discovery scan (e.g., they have manual competitive intelligence). When present, it dramatically improves the LLM's targeting.

### R3: Prompt design

The new prompt replaces the existing `queryGenerationPrompt`. It belongs in `packages/prompts/src/supplemental-query-generation.ts` as a new export. The existing `queryGenerationPrompt` is preserved (not deleted) since it may serve future general-purpose generation needs, but the supplemental prompt is purpose-built.

The prompt must instruct the LLM to:

1. **Generate queries that templates miss.** "Do not generate generic candidate questions like 'what is it like to work at X' or 'X salary for Y role.' Those are already covered. Generate queries that require specific knowledge of the company, its market, and its competitive position."

2. **Incorporate competitive dynamics.** "Reference specific competitors by name when the comparison adds analytical value."

3. **Target gaps.** When `scanSummary.gapThemes` is provided: "The current assessment has weak coverage on these themes: {gapThemes}. Prioritize queries that probe these gaps."

4. **Distribute across decision stages.** "Generate queries across all 4 stages (DISCOVERY, CONSIDERATION, EVALUATION, COMMITMENT). Weight toward CONSIDERATION and EVALUATION -- these are where strategic depth matters most."

5. **Return structured JSON.** The output schema:

```typescript
interface SupplementalQueryOutput {
  text: string;          // The query text
  theme: QueryTheme;     // One of the 6 existing themes
  stage: DecisionStage;  // DISCOVERY | CONSIDERATION | EVALUATION | COMMITMENT
  rationale: string;     // Why this query adds value beyond templates (1 sentence)
}
```

The `rationale` field is not persisted on the Query model but is displayed in the operator review UI (R7) so the operator understands why the LLM generated each query.

6. **Request 20-30 queries.** The prompt explicitly asks for 25 queries. With natural variation, the LLM returns 20-30. After dedup, 15-25 survive.

Temperature: 0.7. Structured JSON output mode (when available) or JSON-in-markdown with parsing.

### R4: Validation

LLM output goes through strict validation before entering the pipeline:

1. **Zod schema validation.** Each item must conform to `SupplementalQueryOutput`. Invalid items are silently dropped.
2. **Minimum quality bar.** Query text must contain at least 5 words. Queries shorter than this are typically fragments or nonsense.
3. **Theme validation.** The `theme` value must be one of the 6 values in `QUERY_THEMES`. If the LLM invents a theme, the item is dropped.
4. **Stage validation.** Same -- must be one of the 4 `DecisionStage` values.
5. **Company name presence check.** At least 60% of the generated queries should contain the client name or a competitor name. If fewer than 60% do, log a warning (the prompt may need tuning) but do not reject the batch.

### R5: Dedup against existing queries

After validation, surviving LLM queries go through the same `deduplicateQueries` function that template queries use (from the query-dedup-improvement spec). The dedup runs against the combined set of existing template queries + new LLM queries.

Implementation:
1. Load the client's existing persisted queries (all active queries across all clusters for this client + role profile)
2. Concatenate with the validated LLM queries
3. Run `deduplicateQueries` with mode `standard`
4. Return only the LLM queries that survived (existing template queries are already persisted; we are not re-deduping them against each other)

This means `deduplicateQueries` must support a "protected set" concept: existing queries participate in comparison but are never themselves removed. Implementation: pass existing queries first in the input array. Since `deduplicateQueries` iterates in order and keeps the first occurrence, existing queries naturally survive.

### R6: Stage classification verification

The LLM assigns a `stage` to each query. After dedup, the pipeline runs `classifyQueryStage` from `packages/core/src/decision-journey/classifier.ts` on each surviving LLM query. If the classifier disagrees with the LLM's assignment:

- If the LLM said CONSIDERATION but the classifier says DISCOVERY (the query does not contain the company name): **override to DISCOVERY**. The classifier's rule here is deterministic and correct.
- If the LLM said EVALUATION but the classifier says CONSIDERATION (no comparison terms detected): **keep the LLM's assignment**. The LLM may have generated a subtle comparison query that the keyword classifier misses.
- Otherwise: **keep the LLM's assignment**. The LLM has broader context about the query's purpose.

Log all disagreements for prompt tuning.

### R7: Source tagging

Add a `source` field to distinguish query provenance. This requires two changes:

**In `packages/core`:** Extend `GeneratedQuery` with an optional `source` field:

```typescript
type QuerySource = "template" | "llm";

export interface GeneratedQuery {
  text: string;
  intent: string;
  theme: QueryTheme;
  stage: DecisionStage;
  priority: number;
  source?: QuerySource;
}
```

**In `packages/db`:** Add an optional `source` column to the `Query` model:

```prisma
model Query {
  // ... existing fields ...
  source  String?  // "template" | "llm" -- null for legacy queries
}
```

This is a nullable string column, not an enum, to avoid a Prisma migration for future source types. Existing rows get `null` (treated as `"template"` in application logic). New template queries are tagged `"template"`. LLM queries are tagged `"llm"`.

This enables:
- Filtering queries by source in the UI
- Analyzing LLM vs template query quality over time (which source produces higher visibility signal)
- Confidence scoring that weights sources differently

### R8: Persistence and cluster assignment

Accepted LLM queries are persisted as a new `QueryCluster` with a descriptive name like "AI-Generated -- Strategic Depth" and the intent "LLM-generated queries targeting gaps and competitive dynamics not covered by standard templates."

The cluster is linked to the same `clientId` and `roleProfileId` as the existing template clusters. It contains only LLM-generated queries.

Storing LLM queries in a dedicated cluster (rather than merging into existing theme clusters) keeps the provenance clear and makes it easy to include or exclude them from scans. An operator who wants a template-only scan simply deselects the LLM cluster.

Store the LLM prompt text and raw response as JSON in the cluster's `description` field (which is `@db.Text`, no length limit). This provides auditability: if a generated query looks wrong, the operator can inspect what the LLM was given and what it returned.

### R9: Fallback behavior

If the LLM call fails, times out (30-second timeout), or returns unparseable output:
- Log the error with the full prompt and raw response (for debugging)
- Return an empty result set
- The assessment proceeds with template queries only

LLM supplemental queries are always additive, never required. The system must never block an assessment because the LLM is unavailable.

### R10: Target volume

| Metric | Value |
|---|---|
| LLM queries requested | 25 |
| LLM queries returned (typical) | 20-30 |
| After Zod validation | 18-28 |
| After dedup against templates | 15-25 |
| After operator review (accept/reject) | 12-20 (operator dependent) |

Combined with 80-100 template queries (after tighter dedup from the dedup-improvement spec), the total assessment reaches 95-120 high-quality, diverse queries.

---

## UX Flow

This is user-initiated, not automatic. The flow:

1. Operator creates a client, generates template queries, and runs a Discovery scan.
2. After the Discovery scan completes and competitors are confirmed, the scan detail page shows a **"Generate strategic queries"** action.
3. Clicking it opens a confirmation with a summary of what context will be sent to the LLM (client name, competitors, scan summary if available). The operator can optionally add a free-text instruction (e.g., "focus on engineering leadership reputation" or "emphasize remote work angles").
4. The LLM call executes (typically 5-15 seconds). A loading state is shown.
5. The generated queries appear as a reviewable list. Each row shows:
   - Query text
   - Assigned theme and stage
   - Rationale (from the LLM)
   - Accept / Edit / Reject controls
6. The operator reviews, edits as needed, and clicks "Add to assessment."
7. Accepted queries are persisted as a new QueryCluster. They appear in the query list alongside template clusters and are included in the next scan.

### Where the action lives

The "Generate strategic queries" button triggers a server action in `apps/web`. The server action:
1. Loads the client, competitors, and existing queries from the database
2. Optionally loads the latest scan summary
3. Calls the core orchestration function (in `packages/core`) which builds the prompt, calls the LLM, validates, and deduplicates
4. Returns the validated, deduped query list to the UI for review

The LLM call itself goes through `packages/core`, not directly from the server action. The server action is responsible for data loading and persistence. Core is responsible for prompt construction, LLM invocation, validation, and dedup.

The LLM call does NOT go through `apps/jobs`. This is a user-initiated, synchronous request with a 5-15 second expected latency. Background job processing adds complexity (polling, status tracking) without benefit for this use case.

---

## Technical Design

### New files

| File | Purpose |
|---|---|
| `packages/prompts/src/supplemental-query-generation.ts` | Prompt template for supplemental queries |
| `packages/core/src/supplemental-queries.ts` | Orchestration: prompt building, LLM call, validation, dedup, stage verification |

### Modified files

| File | Change |
|---|---|
| `packages/core/src/query-intelligence.ts` | Add `source?: QuerySource` to `GeneratedQuery`. Tag template queries with `source: "template"`. |
| `packages/core/src/schemas.ts` | Add `GenerateSupplementalQueriesSchema` for the server action input |
| `packages/db/prisma/schema.prisma` | Add optional `source String?` to `Query` model |
| `packages/prompts/src/index.ts` | Export the new prompt |

### Schema migration

The only schema change is adding `source String?` to the `Query` model. This is a nullable column addition -- no data migration, no default value needed, no downtime. Existing rows get `null`.

Migration SQL: `ALTER TABLE queries ADD COLUMN source TEXT;`

### LLM provider abstraction

The core orchestration function accepts an LLM client interface, not a specific provider:

```typescript
interface LLMClient {
  generateJSON<T>(prompt: string, schema: z.ZodType<T>, options?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }): Promise<T>;
}
```

The server action injects the concrete provider (Anthropic or OpenAI) based on environment configuration. Core does not import any LLM SDK directly. This keeps `packages/core` provider-agnostic and testable -- tests can inject a mock LLM client that returns predetermined responses.

If a `generateJSON` abstraction does not exist yet, the initial implementation can accept a simpler callback: `(prompt: string) => Promise<string>`. Parsing and Zod validation happen in core regardless.

### Interaction with existing `queryGenerationPrompt`

The existing prompt in `packages/prompts/src/query-generation.ts` is NOT used for supplemental generation. It was designed for general-purpose generation (5-8 queries per theme, all themes) and lacks the contextual inputs needed for supplemental queries (competitor list, scan summary, existing query awareness).

The existing prompt is preserved as-is. A future use case (e.g., fully LLM-driven query generation for a premium tier that replaces templates entirely) may evolve from it. But supplemental generation is a different prompt with different goals.

---

## Interaction with Other Roadmap Items

### Query dedup improvement

Supplemental queries rely on the dedup pipeline to prevent overlap with templates. The tighter dedup spec (intent-level dedup, configurable modes) directly benefits this feature. Without it, LLM queries that are worded differently but cover the same intent as templates would survive dedup and add redundancy.

The "protected set" behavior described in R5 above requires that `deduplicateQueries` processes existing queries before LLM queries. The current implementation already iterates in insertion order and keeps the first occurrence. No change needed beyond passing the combined array in the right order.

### Query context awareness (job family filtering)

The supplemental prompt should be aware of the detected job family. If the assessment is for an Account Executive role, the LLM should not generate engineering-specific strategic queries. The `roleTitle` in the input is sufficient for the LLM to infer this, but if `classifyJobFamily` is available, passing the explicit family to the prompt improves reliability.

### Job category extraction

If job categories are auto-extracted from career sites, the supplemental prompt can reference the full list of categories the client hires for. This adds context: "ServiceTitan hires across Engineering, Sales, Product, and Customer Success" lets the LLM generate cross-functional comparison queries that templates cannot.

---

## Testing Strategy

1. **Prompt output validation test.** Call the supplemental prompt with a representative input, parse the output with Zod, and assert all items conform to `SupplementalQueryOutput`. Use a real LLM call (integration test, not unit test) with a fixed seed input and assert structural validity, not exact content.

2. **Mock LLM unit test.** Inject a mock LLM client that returns a predetermined JSON array. Assert the orchestration function correctly validates, deduplicates, and returns the surviving queries with source tagging.

3. **Dedup integration test.** Generate template queries for a client, then generate supplemental queries. Assert no surviving supplemental query has a Jaccard similarity > 0.6 with any template query.

4. **Stage verification test.** Inject LLM queries with intentionally wrong stage assignments (e.g., a query containing no company name assigned to CONSIDERATION). Assert the pipeline overrides to DISCOVERY.

5. **Fallback test.** Inject a mock LLM client that throws an error. Assert the orchestration function returns an empty result set without throwing.

6. **Source tagging test.** Generate both template and supplemental queries. Assert all template queries have `source: "template"` and all supplemental queries have `source: "llm"`.

---

## Risks and Tradeoffs

1. **LLM output quality variance.** Different models and temperatures produce different query quality. Mitigation: Zod validation drops malformed items, dedup drops redundant items, and operator review is the final gate. The system never persists LLM queries without human approval.

2. **Prompt stability.** The supplemental prompt will need tuning as we see real LLM outputs. Storing the prompt text in the cluster description (R8) means we can always trace which prompt version generated which queries. The prompt should be versioned (e.g., `SUPPLEMENTAL_PROMPT_V1`) so we can A/B test prompt improvements.

3. **Cost.** Each supplemental generation is one LLM call generating ~25 queries. At current pricing (Claude Sonnet, ~$3/M input tokens, ~$15/M output tokens), a typical call costs $0.01-0.03. Negligible per assessment, but worth monitoring if operators spam the button.

4. **Latency.** A 25-query structured generation takes 5-15 seconds. This is acceptable for a user-initiated action with a loading state. It is NOT acceptable for an automated pipeline, which is why this is explicitly not in `apps/jobs`.

5. **Schema migration.** The `source` column on `Query` is the only schema change. It is nullable, additive, and backward-compatible. No risk to existing data or queries.

6. **Existing `queryGenerationPrompt` divergence.** We are intentionally not reusing the existing prompt. Over time, having two query-generation prompts creates maintenance surface. Mitigation: the existing prompt is small (56 lines), stable, and may be deleted once supplemental generation is validated. Document this intent in a code comment.
