# AI Visibility Diagnostic — Implementation Plan

**Status:** Draft, architect-owned
**Last updated:** 2026-04-23
**Related:** `docs/offers/ai-visibility-diagnostic.md`, `docs/money-model-assessment.md`, `docs/full-assessment-offer-stack.md`

This plan resolves the three architectural questions Jordan raised and sequences delivery against the Apr 29 launch.

---

## 1. Spec-to-product gap audit

The Diagnostic is **not** a new pipeline — it is a **parameterized variant of the Snapshot/Baseline scan** with a new structured-findings layer, a new public route, and a deterministic Finding Audit Appendix. The table below is per Diagnostic promise.

| Diagnostic promise | Today | Classification |
|---|---|---|
| 40 queries × 4 journey stages | `generateSnapshotQueries` and `QueryCluster.stage` support this; just a sizing knob | **Reuse** |
| 4 AI models per query (OpenAI, Anthropic, Google, Perplexity) | `ScanRun.model` is a **single string**; worker dispatches one provider per scan. Perplexity is **not** integrated in `llm-client.ts` | **Build** (provider adapter + matrix runner) |
| 3 personas × parameterized queries | **No persona entity.** Queries are static text bound to a `QueryCluster` | **Build** (see §2) |
| 1 conversational layer | Single-turn is what the runner already does | **Reuse** |
| Visibility / sentiment / co-mention / citation scoring | `analyzeResponse` computes visibility + sentiment + `competitorMentions`; `CitationSource` table holds citation inventory | **Reuse** |
| 480 captured responses | `ScanResult` schema supports it; worker runs in batches of 5 concurrent with retry — fine for this volume | **Reuse** |
| Structured "finding" with 3-criteria evidence | **No `Finding` entity.** `snapshot-summary.ts` computes an informal `primaryHook` / opportunity candidates, but those aren't persisted as first-class findings | **Build** (`Finding` model + synthesis pipeline) |
| Finding Audit Appendix (numbered list, per-finding criteria check, total count) | Doesn't exist | **Build** (deterministic renderer off `Finding` records) |
| 18-25 page PDF | `apps/web/src/app/reports/[id]/export/print-button.tsx` is a browser-print button; no headless PDF | **Reuse pattern** for launch; **build** headless PDF Phase 2 |
| 2-page Findings Brief | Not a separate deliverable today | **Build** (second template, same data source as full report) |
| Interactive HTML at `/diagnostic/[token]` | `apps/marketing/src/app/s/[token]/page.tsx` shows how; `ScanRun.shareToken` is the tokenization pattern | **Extend** (new route, new view, same token mechanic) |
| 45-min recorded readout | Calendar/Zoom — out of product scope | n/a |
| Refund trigger when <10 findings | No such check exists | **Build** (QA check + operator alert) |
| Rollover credit (60-day expiration) | Handled in Stripe today; no in-product representation | **Build paper-only for launch**; product-represent in Phase 3 |

**Refund-trigger design (critical).** The refund guarantee must be enforced by a **deterministic count over persisted `Finding` records** that pass the 3-criteria filter. The Finding Audit Appendix must render directly from those records, not from an LLM pass. If the count is <10 at delivery time, the pipeline **blocks delivery** and pages the operator. This is the one place the guarantee becomes enforceable in code.

---

## 2. Persona architecture

**Recommendation: (c) Hybrid — standard archetypes cross-applied to the client's job category, stored as a two-level catalog (`PersonaArchetype` × `JobCategory`) with per-engagement overrides.**

### Why

- **(a) pure function of (job_category, archetype) precomputed** — correct in spirit but rigid. Every time we add a category, we pre-seed N archetypes, and operators can't adjust a persona for a Fortune 500 customer with unusual context (e.g., regulated-industry SWE has very different intent than a consumer-tech SWE).
- **(b) free-form per-engagement** — maximum flexibility, zero reusability. Every Diagnostic becomes bespoke, which kills the "semi-manual, launch in 10 business days" promise.
- **(c) hybrid** — 5 stable archetypes (new-grad, mid-career IC, senior IC, manager, executive) × N job categories. The `Persona` the scan actually runs against is a **projection** (archetype + category + optional overrides captured per-engagement). Operators pick "new-grad SWE" from the catalog; they can override phrasing/context for a specific Diagnostic without polluting the library.

The current spec's "5 generic universal personas" is wrong. **Update `docs/offers/ai-visibility-diagnostic.md` Section B "Standard persona options" to describe category-scoped archetypes, with "new-grad SWE / senior applied-ML engineer / staff infra engineer" shown as a worked example for the Software Engineering category.**

### Data model (Prisma sketch)

```prisma
enum PersonaArchetype {
  EARLY_CAREER       // 0–3 yrs
  MID_CAREER_IC      // 4–8 yrs, individual contributor
  SENIOR_IC          // 8–15 yrs, specialist track
  MANAGER            // people manager
  EXECUTIVE          // VP / C-level
}

model JobCategory {
  id             String   @id @default(cuid())
  organizationId String   // Antellion is its own org — catalog lives under it
  slug           String   // "software-engineering", "revenue", "design"
  name           String
  description    String?  @db.Text

  personas       Persona[]

  @@unique([organizationId, slug])
  @@index([organizationId])
}

model Persona {
  id             String           @id @default(cuid())
  organizationId String
  jobCategoryId  String
  archetype      PersonaArchetype
  label          String           // "New-grad SWE", "Staff infra engineer"
  intent         String?          @db.Text   // concise "what they care about"
  seedContext    String?          @db.Text   // prompt fragment injected into query generation
  isCatalog      Boolean          @default(true) // false = engagement-specific override
  createdAt      DateTime         @default(now())

  jobCategory    JobCategory      @relation(fields: [jobCategoryId], references: [id])
  engagementBindings EngagementPersona[]

  @@unique([organizationId, jobCategoryId, archetype, label])
}
```

The `EngagementPersona` join table (§3) binds three personas to a Diagnostic engagement and captures any per-engagement overrides without mutating the catalog.

### Prompt integration

Queries remain text in `Query`, but at scan-matrix expansion time the worker renders each query through a Handlebars-style template that substitutes `{{persona.seedContext}}` (e.g., "You are a {{persona.label}} evaluating employers…" prepended to the user prompt, or woven into a system prompt). Store the fully-rendered prompt on `ScanEvidence.promptText` as we do today — provenance is preserved.

### Matrix containment

40 base queries × 4 models × 3 personas = 480 responses — fixed by spec. Persona is a **scan-matrix dimension**, not a query multiplier. When we go to Baseline (300-400 queries × 3 models × 3 personas) we stay explicit: persona count is a contractual scope variable, not a free-form lever. Operator UX surfaces the matrix size before scan start so nobody launches a 4,000-response run by accident.

---

## 3. Implementation plan

Guiding principle: **one scan engine, two product skins.** The Diagnostic is Snapshot's older sibling — same `ScanRun` table, same worker, added persona/model-matrix dimensions, new structured-findings layer downstream.

### Phase 1 — Launch-critical (Apr 29)

**Goal: ship ONE real Diagnostic delivery, operator-driven, with deterministic refund enforcement. No automation polish.**

1. **Schema changes** (single migration, additive only):
   - New: `JobCategory`, `Persona`, `Engagement`, `EngagementPersona`, `Finding`, `FindingAuditEntry`.
   - Extend `ScanRun`: nullable `engagementId`, and accept `model: string[]` semantics via existing `metadata.models` JSON array (do **not** change the `model` column yet — keep breaking changes out of launch week).
   - Add `Engagement.shareToken` (tokenized link pattern, copied from `ScanRun`).
   - Everything `organizationId`-scoped per CLAUDE.md.

2. **`Finding` as the spine of the refund guarantee.** Fields:
   ```
   id, engagementId, index (1..N),
   namedIssue: string,
   evidenceScanResultIds: String[],
   evidenceCitations: Json,
   actionableCategory: enum (from existing RecommendationCategory + new DIAGNOSTIC_* values),
   personaId?, model?, stage?, competitorId?,
   narrative: Text,
   status: DRAFT | APPROVED | REJECTED,
   approvedById?, approvedAt?
   ```
   `isMaterial` is computed: `!!namedIssue && evidenceScanResultIds.length > 0 && !!actionableCategory`. The Finding Audit Appendix is a pure render over `Finding.where(status=APPROVED && isMaterial)`.

3. **Scan matrix runner** (`apps/jobs/src/scan-worker.ts`):
   - Accept `metadata.models: string[]` and `metadata.personaIds: string[]`.
   - Expand matrix: for each `(query, model, persona)` tuple, enqueue one `ScanResult`-producing job.
   - Add `ScanResult.modelName` + `ScanResult.personaId` (nullable for backward compatibility).
   - **Add Perplexity provider** to `llm-client.ts` (new adapter, parallel to OpenAI/Anthropic/Google). This is the only new external dependency Phase 1 needs.

4. **Finding synthesis — operator-in-the-loop**:
   - After scan completes, run a **deterministic candidate-finding extractor** in `packages/core/src/diagnostic/findings.ts`: scans results, produces 20-30 candidate `Finding` drafts by rule (zero-presence queries, sentiment divergence across models, citation monoculture, competitor-dominance-on-own-name, persona-specific invisibility). Each candidate is a DRAFT `Finding` record with pre-filled evidence pointers.
   - Operator reviews, edits narrative, approves or rejects in a new `/diagnostic/[engagementId]/findings` internal page. **No LLM in this loop for launch.**
   - Findings that require LLM synthesis (e.g., narrative-quality writeups) are an explicit Phase 2 addition; for launch, Jordan writes the narrative text from the evidence bundle.

5. **Refund-trigger gate**: a `validateDiagnosticDelivery` QA check (extends existing `packages/core/src/qa`) that blocks publishing if `approvedMaterialFindingCount < 10`. Blocking = operator sees a red banner with a forced-acknowledge step. Slack/email alert on first trigger.

6. **Reports**:
   - `composeDiagnosticReport` in `packages/core/src/diagnostic/compose.ts` — structured output with the Section C outline (exec summary, methodology, visibility index, co-mention map, per-stage summaries, citation inventory, narrative consistency, findings list, Finding Audit Appendix). It consumes `Finding[]` + `ScanComparisonResult` (reused), not LLM output.
   - `composeFindingsBrief` — same input, 2-page compressed view.
   - Interactive HTML: new route `apps/web/src/app/diagnostic/[token]/page.tsx` rendering `DiagnosticView` from `packages/ui`. Mirrors the `/s/[token]` pattern exactly — public, token-gated, org-agnostic lookup via `Engagement.shareToken`.
   - PDF: **stay with browser Print → Save as PDF for launch.** Jordan uses it, delivers the PDF by email. Headless PDF is Phase 2.

7. **Operator dashboard** (`apps/web/src/app/(dashboard)/diagnostic/`): engagement list, create-engagement wizard (client + competitors + 3 personas), scan progress, findings review/approve, publish button.

8. **Rollover tracking**: **spreadsheet only for Phase 1.** Stripe coupon exists per launch checklist. Don't build `RolloverCredit` yet — we'll have <3 Diagnostics delivered in the first 30 days; product representation is premature.

### Phase 2 — First 30 days post-launch

- Headless PDF (Puppeteer in `apps/jobs/`, triggered by publish action). Fork the HTML view into a print stylesheet.
- `RolloverCredit` entity (`clientId`, `sourceEngagementId`, `amount`, `issuedAt`, `expiresAt`, `redeemedAt`, `stripeCreditMemoId`) with a nightly job that flips status to `EXPIRED` past 60 days and emails the account owner at day 45 and day 55.
- LLM-assisted finding narrative drafting (still operator-approved). Prompt lives in `packages/prompts`.
- Promote `ScanRun.model: String` to `models: String[]` as a breaking migration once all legacy scans have rolled off or been backfilled.
- Automated candidate-finding extractor coverage grows: add hallucination detection (cross-reference response claims against a client-fact registry), citation-source-we-expected detection (pull from `ContentAsset`).

### Phase 3 — After 2-3 Diagnostics delivered

- Persona catalog expansion based on what operator needed to override in real deliveries.
- Quarterly re-scan automation for Continuous (requires engagement → scan scheduling).
- Unified engagement model: Snapshot, Diagnostic, Baseline, Phase 2 all rooted at `Engagement` with tier enum. Current `ScanRun`-rooted share tokens migrate to `Engagement.shareToken`.

---

## 4. Open questions / decisions Jordan needs to make

1. **Perplexity integration scope.** Perplexity's API returns citation data shaped differently than OpenAI/Anthropic/Google. Is web-search-equivalent grounding acceptable, or does the spec require Perplexity specifically for the citation-source analysis? *If flexible, we can use "search-augmented ChatGPT + Claude + Gemini + one more" and rename "Perplexity" → "a fourth model" in the spec. This removes one integration risk from launch week.*
2. **Refund gate: block or warn?** My recommendation is hard block (delivery cannot publish with <10 approved findings). Agree? Or warn-only, and trust the operator?
3. **Rollover-credit durability.** Comfortable with spreadsheet-only for 30 days, or do you want `RolloverCredit` in Phase 1?
4. **Job categories at launch.** Which 2-3 do we seed? Proposed: Software Engineering, Revenue (Sales/CS), Executive. Anything else for the Apr 29 pipeline?
5. **Persona SOW language.** The spec says "client picks 3 from 5 standard options." With the hybrid model we pick 3 from a category-scoped catalog. Update SOW language accordingly.

---

## 5. Complexity and risks

| Phase | T-shirt | Biggest risks |
|---|---|---|
| Phase 1 | **M-L** | (1) Perplexity adapter eats a day. (2) Matrix runner has to handle 480 responses reliably — today's worker is tuned for ~100; we need to verify rate-limit behavior at 4x concurrency. (3) Operator UX for findings approval has to be usable within 6 days of launch or Jordan will hand-write in a doc anyway. |
| Phase 2 | M | (1) Headless PDF rendering always has edge cases — give it a full week. (2) `RolloverCredit` + Stripe reconciliation is bookkeeping-heavy, not technical-heavy. |
| Phase 3 | L | (1) Breaking `ScanRun.model` migration requires a data backfill window. (2) Unified `Engagement` rooting is a larger refactor — don't start until we have 5+ Diagnostics in prod teaching us the shape. |

**Top 3 architectural risks overall**
1. **The refund guarantee is a code obligation, not a doc.** If the Finding Audit Appendix is ever rendered from anything other than persisted `Finding` records, we can hallucinate the count and the guarantee becomes fraud. This is the single most important boundary to enforce. **Owner: backend.**
2. **Persona is retroactively a candidate-intent *generator*, not a label.** If we bolt personas on as a metadata tag without actually parameterizing the query text sent to the LLM, the 3-persona dimension produces 3× the cost with 1× the information. **Owner: core/prompts.**
3. **Matrix explosion under Baseline.** Diagnostic is 480 responses. Baseline is 300-400 × 3 × 3 = 2,700-3,600. The scan worker's current BATCH_SIZE=5 + rate-limit handling needs explicit load-testing before Baseline volume arrives. **Owner: jobs.**

**Apr 29 launch blockers (must-haves)**
- Schema migration shipped.
- Perplexity adapter (or decision to substitute).
- Matrix runner shipped and tested end-to-end on a dry-run Diagnostic.
- `/diagnostic/[token]` route renders a minimally credible interactive HTML report.
- Finding review/approve operator page.
- `validateDiagnosticDelivery` blocks publish on <10 findings.
- Print-to-PDF path works in the delivered HTML template.

Nothing else in Phase 1 is launch-blocking.
