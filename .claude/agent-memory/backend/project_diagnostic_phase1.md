---
name: Diagnostic Phase 1 Build
description: AI Visibility Diagnostic ($4,900 offer) Phase 1 implementation status and key decisions made
type: project
---

Phase 1 complete as of 2026-04-23 (6 days before Apr 29 launch).

**Why:** Antellion's first paid offer ($4,900 fixed-fee diagnostic). The refund guarantee (10 material findings) must be enforced in code.

**What shipped:**
- Schema migration: JobCategory, Persona, EngagementPersona, Engagement, Finding, FindingAuditEntry. ScanRun.engagementId (nullable), ScanResult.modelName + personaId (nullable, backward-compat). LLMProvider.PERPLEXITY added.
- Perplexity Sonar adapter in llm-client.ts using fetch to api.perplexity.ai/chat/completions. Model: sonar-pro. 90s timeout.
- Matrix runner in scan-worker.ts: reads metadata.models[] and metadata.personaIds[], expands (query x model x persona) = 480 cells for Diagnostic. Backward-compat (null persona = legacy). renderPrompt() weaves seedContext into prompt text. ScanEvidence.promptText stores fully-rendered prompt.
- packages/core/src/diagnostic/: findings.ts (7 rule-based extractors, no LLM), validation.ts (validateDiagnosticDelivery, isMaterialFinding, buildAuditAppendix), schemas.ts (Zod validators).
- Server actions: apps/web/src/app/(dashboard)/actions/diagnostic.ts (createEngagement, triggerEngagementScan, materializeCandidateFindings, approveFinding, rejectFinding, updateFindingNarrative, publishEngagement).
- Public route: apps/web/src/app/diagnostic/[token]/page.tsx — token-gated, print-ready, no auth.
- Operator dashboard: apps/web/src/app/(dashboard)/diagnostic/ — list, new wizard, detail, findings review, publish.
- 29 new tests (all passing). 1338 total tests passing. All packages typecheck clean.

**Key decisions:**
- ScanResult unique constraint changed from (scanRunId, queryId) to (scanRunId, queryId, modelName, personaId). Old scans have null in both new columns — Postgres null uniqueness means old scans are still unique.
- Dedup in finding extractor is category-scoped so same evidence can produce multiple finding types.
- FindingAuditEntry is materialized at publish time (upsertable for re-publish). Never rendered from LLM.
- MINIMUM_MATERIAL_FINDINGS = 10 (hardcoded constant).

**Jordan must run before Apr 29:**
1. `pnpm --filter @antellion/db migrate` — applies the Prisma migration against prod DB
2. Set `PERPLEXITY_API_KEY` in Vercel env vars (and local .env)
3. Navigate to /diagnostic/new to create the first engagement (manual dry run)
4. After scan completes, call materializeCandidateFindings from the engagement detail page
5. Approve 10+ findings with narratives
6. Publish → verify the /diagnostic/[token] route renders cleanly in browser
7. Test Print → Save as PDF in Chrome at letter size

**How to apply:** The diagnostic domain is isolated in packages/core/src/diagnostic/. All new operator actions are in actions/diagnostic.ts. Public route is in apps/web/src/app/diagnostic/ (outside the (dashboard) group — no auth). The scan worker is backward-compat: null persona = snapshot behavior.
