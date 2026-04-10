# Roadmap: Tighter Query Deduplication

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** High (directly affects assessment quality and operator time)

---

## Problem

The current deduplication in `packages/core/src/query-intelligence.ts` uses Jaccard similarity on word sets with a fixed threshold of 0.7. This catches only lexical overlap. Near-duplicate queries with the same intent but different wording survive.

Concrete example with the existing templates:

| Query A | Query B | Jaccard | Survives? |
|---|---|---|---|
| `what is it like to work at ServiceTitan` | `is ServiceTitan a good company to work for` | ~0.30 | Both survive |
| `ServiceTitan employee reviews` | `what do engineers say about working at ServiceTitan` | ~0.22 | Both survive |
| `ServiceTitan work life balance` | `ServiceTitan vs fintech average work life balance` | ~0.50 | Both survive |
| `ServiceTitan {role} interview process` | `how to get hired at ServiceTitan as a {role}` | ~0.33 | Both survive |

These pairs produce nearly identical AI responses. Recording both wastes operator time during manual scan entry, inflates the query count without adding signal, and makes the assessment feel padded rather than precise.

With 4 competitors and geography provided, the current pipeline generates ~130 raw queries. After Jaccard dedup at 0.7, approximately 90-120 survive. Many of those 90-120 are intent-duplicates.

---

## Requirements

### R1: Multi-pass dedup pipeline

Replace the single Jaccard pass with a pipeline of three dedup passes, applied in order:

1. **Exact normalized match.** If `normalize(a) === normalize(b)`, remove the later query. This catches trivial reformatting that Jaccard already handles, but makes it explicit and O(1) via Set lookup instead of O(n^2) pairwise comparison.

2. **Jaccard word overlap (existing).** Keep the current `jaccardSimilarity` function. The threshold becomes configurable per mode (see R3).

3. **Intent-level dedup (new).** Two queries are intent-duplicates if ALL of the following are true:
   - Same `stage` value (both CONSIDERATION, both EVALUATION, etc.)
   - Same `theme` value (both "reputation", both "culture", etc.)
   - Same company name present in both (after normalization)
   - Same `intent` tag string, OR structural similarity after stripping the company name, stop words, and question words

Pass 3 runs AFTER stage assignment, so two queries that happen to share words but serve different stages both survive.

### R2: Normalized structural comparison

For intent-level dedup (pass 3), normalize queries before comparison:

```
Input:  "what is it like to work at ServiceTitan"
Step 1: lowercase → "what is it like to work at servicetitan"
Step 2: strip company name → "what is it like to work at"
Step 3: strip stop words (the, a, an, is, it, at, to, for, of, in, and, or, how, what, like) → "work"
Step 4: sort remaining tokens → "work"
```

```
Input:  "is ServiceTitan a good company to work for"
→ "good company work"
```

These normalized forms are different ("work" vs "good company work"), so this pair would not be caught by structural comparison alone. But they share stage=CONSIDERATION, theme=reputation, and both contain the company name. The intent tag is the tiebreaker: the first has intent "Direct employer research" and the second has "General employer evaluation" -- these are different strings, so this pair survives under intent-level dedup unless the tags are unified.

This is correct behavior. The intent tags in the current TEMPLATES array are the operator's best signal for whether two queries add distinct value. If two queries have the same intent tag AND the same stage/theme/company, one is redundant.

Queries with different intent tags survive even if they look similar. This is conservative by design: the operator assigned those intents for a reason.

### R3: Configurable aggressiveness modes

```typescript
type DedupMode = "conservative" | "standard" | "aggressive";
```

Each mode controls which passes run and with what thresholds:

| Mode | Pass 1 (exact) | Pass 2 (Jaccard threshold) | Pass 3 (intent-level) |
|---|---|---|---|
| `conservative` | Yes | 0.7 (current) | No |
| `standard` | Yes | 0.6 | Yes |
| `aggressive` | Yes | 0.5 | Yes, plus structural comparison (strip company + stop words, compare remaining tokens) |

Default: `standard`.

`conservative` is the current behavior -- no regressions for existing assessments. `standard` is the recommended default going forward. `aggressive` is for operators who want maximum diversity and minimal query count.

### R4: Dedup returns removed queries

The dedup function's return type changes from `T[]` to:

```typescript
interface DedupResult<T> {
  surviving: T[];
  removed: Array<{ query: T; reason: string; duplicateOf: T }>;
}
```

The `reason` string is one of: `"exact_match"`, `"jaccard_similarity"`, `"intent_duplicate"`.

The `duplicateOf` field references which surviving query caused the removal. This enables:
- Debugging why a specific query was dropped
- A future UI that shows "these queries were removed as duplicates" with the ability to restore them
- Validation that the dedup is not being too aggressive

### R5: Target outcome

With `standard` dedup and a typical 4-competitor assessment:

| Metric | Before (current) | After |
|---|---|---|
| Raw generated queries | ~130 | ~130 (unchanged) |
| After dedup | 90-120 | 80-100 |
| Reduction | ~8-30% | ~23-38% |

The removed queries are intent-duplicates that do not add scan signal. The surviving set has higher per-query information density.

---

## Technical Design

### Where the logic lives

All changes are in `packages/core/src/query-intelligence.ts`. No new files.

The current exported `deduplicateQueries<T extends { text: string }>()` function signature changes to accept a mode parameter and return `DedupResult<T>`:

```typescript
export function deduplicateQueries<T extends { text: string; stage?: string; theme?: string; intent?: string }>(
  queries: T[],
  mode?: DedupMode,
): DedupResult<T>;
```

The generic constraint widens to include optional `stage`, `theme`, and `intent` fields. When these fields are absent (e.g., when called with a plain `{ text: string }` array), intent-level dedup is skipped -- only exact match and Jaccard run. This preserves backward compatibility for any caller that uses the function with minimal objects.

### Internal to the orchestrator

`generateQueryIntelligence` currently calls dedup BEFORE stage assignment (line 919). This must change: stage assignment (step 3) must happen before dedup (step 2) so that intent-level dedup can use stage information.

New order:
1. Generate raw queries from templates
2. Stage assignment (safety net -- templates already carry stages)
3. Deduplicate (all three passes, using stage + theme + intent)
4. Score
5. Cluster

### No schema changes

The `DedupMode` is a runtime parameter, not persisted. It could be added to `GenerateQueriesSchema` later if we want operators to choose their dedup aggressiveness, but that is not required in v1. The default `standard` mode is applied automatically.

### No breaking changes to `QueryIntelligenceResult`

The return type already includes `totalGenerated` and `totalAfterDedup`. Add an optional `removedQueries` field:

```typescript
export interface QueryIntelligenceResult {
  clusters: GeneratedCluster[];
  totalGenerated: number;
  totalAfterDedup: number;
  removedQueries?: Array<{ text: string; reason: string; duplicateOfText: string }>;
}
```

The field is optional so existing consumers are unaffected. Populated only when the caller opts in (e.g., a debug flag or always in development).

---

## Interaction with Other Roadmap Items

### LLM supplemental queries

The LLM supplemental query spec (separate roadmap item) feeds LLM-generated queries through the same dedup pipeline. Tighter dedup ensures LLM queries that overlap with template queries are correctly removed. The two specs are independent but complementary: tighter dedup makes the LLM supplemental queries more effective because the surviving LLM queries are guaranteed to add genuinely new signal.

### Query context awareness (job family filtering)

The context-awareness spec reduces the raw template count for non-engineering roles by filtering irrelevant templates. Tighter dedup further reduces the surviving count. Combined, a non-engineering assessment might go from 130 raw queries to ~85 (after family filtering) to ~65-75 (after tighter dedup). This is the right direction: fewer, more relevant queries.

---

## Testing Strategy

1. **Unit test: intent-level dedup catches known pairs.** Construct two queries with identical stage, theme, intent, and company name but different words. Confirm one is removed in `standard` mode and both survive in `conservative` mode.

2. **Unit test: different stages are not deduped.** Two queries with similar text but different stages both survive in all modes.

3. **Unit test: different themes are not deduped.** Two queries with similar text but different themes both survive in all modes.

4. **Unit test: `DedupResult.removed` is populated correctly.** Verify reason strings and duplicateOf references.

5. **Integration test: full pipeline with `standard` mode.** Generate queries for a representative input (4 competitors, geography, engineering role). Assert total after dedup is in the 80-100 range. Assert no two surviving queries share the same (stage, theme, intent, company) tuple.

6. **Regression test: `conservative` mode matches current behavior.** Generate queries with `conservative` mode and assert the count matches the current baseline within +/- 2 (to account for any floating-point edge cases in Jaccard).

7. **Snapshot test: removed query list.** For a fixed input, snapshot the removed queries to detect unintended dedup behavior changes in future template edits.

---

## Risks and Tradeoffs

1. **Over-deduplication.** Aggressive intent-level dedup could remove queries that look similar but elicit meaningfully different AI responses (e.g., "ServiceTitan glassdoor rating" vs "ServiceTitan employee reviews" -- similar intent but different source signals). Mitigation: intent-level dedup requires matching on the `intent` tag string, which the template author controls. Two templates with different intent strings survive even if everything else matches.

2. **Execution order change.** Moving dedup after stage assignment changes the surviving query set even in `conservative` mode, because the Jaccard pass now runs on a potentially different ordering. Mitigation: template-generated queries already carry their stage, so the stage-assignment step is a no-op for them. The ordering change is immaterial for template queries. It only matters for future runtime-injected queries (e.g., LLM-generated) where the safety-net classifier would assign a stage.

3. **Performance.** The current O(n^2) Jaccard comparison is fine at n=130. Intent-level dedup adds another O(n) pass (grouped by stage+theme+company, then pairwise within groups). Total remains well under 1ms for the current query volume. No concern.
