# Scan Readiness SOP

**Status:** Active  
**Owner:** `coo` orchestrating `query-ops`, with `quality` as optional gate  
**Last updated:** 2026-05-03

## Purpose

Decide whether a planned scan is operationally ready before time, model budget, or client-facing trust is spent.

This SOP sits after query review and before scan creation. Query quality is necessary but not sufficient. A scan can still be unready because the selected clusters, competitors, personas, or workflow context are weak.

## Trigger

Run this SOP whenever:

- an operator is about to create a new scan
- a query set was recently changed
- a report-bound scan is being prepared
- a high-cost model or deep query mode is being considered
- a seeded/demo workflow will be used in a live conversation

## Required inputs

- client selected
- intended query clusters selected
- chosen model
- chosen query depth
- focus area or role segment

Additional requirements for comparison-heavy or report-bound scans:

- competitors configured
- at least one reviewed query cluster
- a clear statement of what this scan is supposed to answer

## Source-of-truth surfaces

1. [Create scan form](/Users/jordanellison/Projects/talentsignal/apps/web/src/components/create-scan-form.tsx)
   Defines the operator choices that become the scan contract.
2. [Create scan action](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/actions/scans.ts)
   Defines the actual gate enforced today: active-query count and org-scoped cluster selection.
3. [New scan page](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/scans/new/page.tsx)
   Shows how clients, prior scans, and cluster recency are presented to the operator.
4. [Query Ops SOP](/Users/jordanellison/Projects/talentsignal/docs/query-ops-sop.md)
   Upstream input-quality review that should be completed first.

## Workflow

### 1. Confirm the scan objective

Every scan should answer one of these:

- baseline visibility question
- follow-up validation question
- report-generation question
- targeted investigation of a weak theme

If the operator cannot say which one it is, the scan is not ready.

### 2. Check query-cluster readiness

Review the selected clusters, not just the client’s total cluster inventory.

Check:

- are the selected clusters still the right ones for this scan objective?
- do the selected clusters contain active queries only because they are truly approved, or just because nothing has been pruned yet?
- are the selected clusters duplicative across the same underlying intent?

If selected clusters have not gone through `query-ops`, the scan should usually be `ready with edits` at best.

### 3. Check comparison readiness

For scans expected to drive competitor findings:

- competitors must be configured
- competitor comparison prompts must exist
- broad discovery prompts must not be the only comparison mechanism

If the scan is supposed to support competitive reporting but the query set mostly asks generic category questions, stop and fix the inputs.

### 4. Check scan configuration fit

Review whether the operator’s chosen scan settings match the purpose:

- model choice should match the importance of the run
- query depth should match the intended use
- focus area should actually reflect the talent segment being investigated

Heuristics:

- `manual` is acceptable for exploratory or validation work, not ideal as the only path for a repeatable high-volume operation
- `First Layer` is acceptable for baseline coverage, but weaker for nuanced comparison work
- stronger models deserve stronger input quality; do not waste them on weak clusters

### 5. Return the gate decision

Use only these outcomes:

- `ready`
- `ready with edits`
- `not ready`

Definitions:

- `ready`: the operator can create the scan now without material quality concern
- `ready with edits`: the scan can run, but there are known weaknesses that should be corrected first if the output will be client-facing
- `not ready`: the scan would create misleading confidence, wasted spend, or low-value output

## Approval rubric

Evaluate each area on a 1-5 scale:

- query quality
- cluster selection fit
- competitor readiness
- configuration fit
- report usefulness potential

Decision defaults:

- average `4.0+` with no category below `3` -> `ready`
- average `3.0-3.9` or one category at `2` -> `ready with edits`
- average below `3.0` or any category at `1` -> `not ready`

Use judgment. A single severe blocker can still force `not ready`.

## Output artifact

Use the founder-facing template in [scan-decision-template.md](/Users/jordanellison/Projects/talentsignal/docs/scan-decision-template.md).

## Escalation rules

Escalate to `query-ops` when:

- the real issue is cluster quality or missing coverage

Escalate to `architect` when:

- the scan should depend on product-level approval state that does not yet exist
- the workflow needs system-enforced preflight gates
- the current model/depth configuration options do not reflect operational reality

Escalate to `quality` when:

- the scan is technically runnable but likely to produce unreliable downstream conclusions

## Repo-specific notes

- Current product enforcement is minimal by design. The create-scan path mainly ensures org scope and non-zero active query count.
- The UX currently highlights whether a cluster is `new` or `scanned`, not whether it is reviewed or approved.
- That means the operational gate currently lives in the agent/process layer, not in product state.
