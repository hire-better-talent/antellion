---
name: Supplemental LLM Query Generation
description: Feature that generates 20-30 bespoke strategic queries via Anthropic after Discovery scan; injected LLM callback pattern, dedup against existing queries, stage verification
type: project
---

LLM supplemental query generation (Priority 2) is complete.

**Why:** Template queries cover generic candidate intent; supplemental queries add strategic depth using real competitive context from the Discovery scan. Differentiates the $10K assessment from generic tooling.

**How to apply:** When extending query generation, remember:
- Supplemental queries are always ADDITIVE — they never modify existing clusters
- The LLM callback pattern (`(prompt: string) => Promise<string>`) keeps `packages/core` provider-agnostic
- `validateSupplementalQueries()` in `packages/core/src/supplemental-queries.ts` is the single validation entry point — don't duplicate filtering logic in the server action
- `verifySupplementalStages()` only overrides CONSIDERATION→DISCOVERY; all other disagreements keep the LLM's assignment
- Dedup uses the protected-set pattern: existing queries go first in the combined array, `deduplicateQueries` keeps first occurrence, so templates always win
- Prompt is versioned as `SUPPLEMENTAL_PROMPT_V1` and stored in cluster description for auditability

**Key files:**
- `packages/prompts/src/supplemental-query-generation.ts` — SUPPLEMENTAL_PROMPT_V1 prompt
- `packages/core/src/supplemental-queries.ts` — validateSupplementalQueries, verifySupplementalStages
- `apps/web/src/app/(dashboard)/actions/queries.ts` — generateSupplementalQueries server action
- `apps/web/src/lib/llm.ts` — generateStructuredJSON (new, 30s timeout, 4096 tokens)
- `apps/web/src/components/GenerateStrategicQueriesButton.tsx` — client detail page button
- `packages/db/prisma/schema.prisma` — `source String?` added to Query model

**Schema change:** `Query.source String?` — nullable, "template" | "llm". All new template queries tagged "template" at persist time. Legacy rows get null (treated as "template" in app logic).

**UI entry points:**
1. Client detail page — "Generate strategic queries" button, visible only when hasCompletedScan && hasCompetitors
2. Generate queries form — "Also generate AI strategic queries" toggle with inline run button
