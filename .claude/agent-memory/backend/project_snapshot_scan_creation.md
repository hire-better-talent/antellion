---
name: Snapshot Scan Creation Flow
description: createSnapshotScan server action and CreateSnapshotSchema orchestrate client/competitor/query/scan creation atomically for the snapshot workflow
type: project
---

`CreateSnapshotSchema` lives in `packages/core/src/schemas.ts` (exported from index). It validates the full snapshot input: prospectName, prospectDomain, industry, nicheKeywords (optional), geography (optional), competitors (min 2, max 5), roleTitle.

`createSnapshotScan` lives in `apps/web/src/app/(dashboard)/actions/snapshots.ts` alongside the existing `fetchSnapshot` action.

**Transaction contents (all atomic):**
1. Client create-or-reuse by `(organizationId, domain)` — patches name/industry if different; creates 6 standard ContentAsset stubs for new clients.
2. Competitor upsert: per-domain findFirst → create only if absent for this client.
3. Four QueryClusters (one per category) with names: "Snapshot: Discovery Absence", "Snapshot: Competitor Contrast", "Snapshot: Reputation Probe", "Snapshot: Citation & Source".
4. Queries: `source: "snapshot"`, contrast queries store competitor name in `intent` as `"competitor:<name>"` prefix for later worker recovery.
5. ScanRun: `queryDepth: "snapshot"`, `model: "gpt-4o-mini"`, `status: "RUNNING"`, `metadata.snapshot: true`, `metadata.automated: true`, `metadata.snapshotVersion: 1`.

**Key conventions:**
- Competitors in formData come as a JSON string in a single hidden field named `"competitors"`.
- nicheKeywords from the form is a comma/newline-delimited string; the action splits it to `string[]` before passing to `generateSnapshotQueries`.
- The CLUSTER_NAME_TO_CATEGORY map in the worker must mirror the cluster names written here — they are the coupling point.

**Why:** Atomicity prevents orphaned clients/competitors if the scan creation fails. Reusing the client by domain avoids duplicate records when the same prospect is scanned multiple times.

**How to apply:** The action returns `{ scanId }` on success (no redirect — the UI redirects to `/snapshots/{scanId}`). On validation failure, returns `{ errors }`. On DB failure, returns `{ message }`.
