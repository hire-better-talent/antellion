---
name: Query Signal Scoring (P1c)
description: Post-scan signal yield scoring for every scan result — measures query value for template retirement decisions
type: project
---

Signal yield scoring is implemented and wired. Each ScanResult gets a `signalYield` object stored in `metadata.signalYield` after a scan completes.

**Why:** Enables long-term template quality tracking — operators can see which queries produce high/medium/low/zero signal and retire consistently low-yield templates over time.

**How to apply:** When building report features or query analytics, `metadata.signalYield` is available on every ScanResult from this point forward. Historical results (before this feature) will have no `signalYield` field — treat absence as unscored, not zero.

Key implementation facts:
- `scoreQuerySignal()` in `packages/core/src/query-signal-scoring.ts` — pure function, no DB deps
- Novelty is cumulative: iterates results in `createdAt` order, tracking seen competitors and domains
- Duplicate detection uses word-set Jaccard similarity at threshold 0.8 (`DUPLICATE_JACCARD_THRESHOLD`)
- Batch scoring runs in `scoreAllResults()` in `apps/jobs/src/scan-worker.ts` after the query loop, before `finalizeScan`
- Scoring failures are caught and logged — they do not block scan completion
- Manual recording in `recordResult` computes signal yield inline using prior results from DB, stores it in the create transaction
- UI badge on scan detail page: success (high), warning (medium), default (low), danger (zero)
- `SignalYield` must be cast `as unknown as Prisma.InputJsonObject` when writing to `metadata` — Prisma's Json type does not accept typed interfaces directly
