# Query Ops SOP

**Status:** Active  
**Owner:** `query-ops` with `coo` orchestration  
**Last updated:** 2026-05-03

## Purpose

Standardize how Antellion decides whether a client's query set is fit to run before a scan is created.

This SOP is designed around the current product flow in this repo:

1. Client context lives on the client detail page.
2. Template query generation runs from `/queries/generate`.
3. Supplemental LLM queries can be generated from the client detail page.
4. Query clusters are reviewed on `/queries/[id]`.
5. Scan creation happens on `/scans/new`.

The goal is not to maximize query count. The goal is to approve a scan-ready set that is commercially relevant, stage-balanced, and comparable across runs.

## Trigger

Run this SOP whenever one of the following is true:

- a new client is preparing for its first full scan
- template queries were just generated
- a strategic LLM query cluster was just created
- a founder wants to rerun a scan with changed query inputs
- a scan is expensive, client-facing, or intended to feed a report

## Required inputs

The workflow is blocked until these inputs exist:

- client profile with industry and basic business context
- at least one role profile or job category to anchor query generation
- at least one active query cluster
- known competitors for comparison-oriented scans

Strongly preferred before supplemental query generation:

- at least one completed scan
- at least one confirmed competitor
- latest scan signal that shows where coverage is thin

## Source-of-truth surfaces

Use these surfaces in order:

1. [Client detail page](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/clients/[id]/page.tsx)
   Confirms competitor readiness, completed scans, and whether strategic query generation should be available.
2. [Query generation action](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/actions/queries.ts)
   Defines how template queries are generated and persisted.
3. [Supplemental query generation action](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/actions/queries.ts:177)
   Defines when LLM strategic queries can be created and how they are stored.
4. [Query cluster detail page](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/queries/[id]/page.tsx)
   Primary review surface for active vs inactive queries and per-query scan history.
5. [Scan creation action](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/actions/scans.ts:18)
   Final gate where selected active query clusters become a `ScanRun`.

## Workflow

### 1. Confirm client readiness

Check:

- industry is present
- business context is sufficient to generate non-generic queries
- competitors exist if the scan is meant to support competitive findings
- there is a clear role or talent segment in scope

Decision:

- If client context is weak, stop here and fix the client profile first.

### 2. Review template coverage

Inspect the generated template clusters and classify them by:

- Discovery
- Consideration
- Evaluation
- Commitment

Review questions:

- Does Discovery test earned visibility, not just branded recall?
- Does Evaluation contain real head-to-head comparison prompts?
- Are Consideration and Commitment present because they matter, not because they are easy to generate?
- Is the wording specific enough to elicit distinct answers?

Decision:

- If template coverage is broad but generic, proceed to targeted edits or supplemental generation.
- If coverage is obviously broken or missing major stages, regenerate or edit before any scan is approved.

### 3. Review cluster quality

For each candidate cluster on the query detail page:

- deactivate weak or redundant queries
- avoid deleting queries that already have results; deactivate instead
- separate harmless phrasing variation from duplicate intent
- look for low-signal prompts that are too generic to change model output

Decision buckets:

- `approve`: keep active as-is
- `edit`: change wording before scan use
- `add`: create missing prompts or generate strategic depth
- `retire`: deactivate because the query adds little value

### 4. Decide whether strategic LLM queries are warranted

Use the strategic query workflow only when it adds depth beyond templates.

Good reasons to run it:

- the client has unusual market positioning
- known competitors create specific comparison opportunities
- the latest completed scan shows thin coverage in key themes
- the next scan is report-bound and needs richer Evaluation or Consideration depth

Bad reasons to run it:

- no completed scan and no confirmed competitors
- template quality has not been reviewed yet
- the team is using LLM queries to compensate for weak client setup

Decision:

- If strategic depth is needed, generate the supplemental cluster and review it separately.
- If templates already cover the need, skip LLM generation and preserve comparability.

### 5. Run scan-readiness gate

Before the operator creates a scan, check the final selected cluster set for:

- intentional stage coverage
- explicit persona or role relevance
- workable competitor comparison prompts
- minimal duplicate intent across selected clusters
- no inactive or obviously weak queries driving volume

Minimum approval bar:

- at least one strong Discovery path
- at least one strong Evaluation path
- no selected cluster with zero active queries
- no obvious gaps that would make the scan non-diagnostic

Final decision:

- `ready`
- `ready with edits`
- `not ready`

## Output artifact

Every run of this SOP should produce a short operator-facing decision with:

- the clusters approved for scan use
- the clusters or queries that require edits
- any new queries that should be added
- any queries or clusters that should be retired or deactivated
- the final readiness decision

Use this exact output shape:

```md
Status: ready | ready with edits | not ready

Approved clusters:
- ...

Required edits:
- ...

Adds:
- ...

Retirements:
- ...

Risks:
- ...

Next operator action:
- ...
```

## Escalation rules

Escalate to `architect` when:

- the current schema cannot represent the review state you need
- query scoring or dedup behavior is the real issue, not operator review
- scan creation or query persistence needs to change
- the workflow should become partially automated in product code

Escalate to `backend` when:

- the SOP exposes a missing mutation, missing validation, or missing read path

Escalate to the founder when:

- the decision depends on commercial judgment that is not yet codified
- the scan purpose is unclear
- comparability should be traded off against bespoke depth

## Repo-specific notes

- Template generation currently persists queries with `source: "template"` in [queries.ts](/Users/jordanellison/Projects/talentsignal/apps/web/src/app/(dashboard)/actions/queries.ts).
- Supplemental strategic queries persist into a separate cluster named `AI-Generated — Strategic Depth`.
- Scan creation only counts active queries in selected clusters and will reject a selection that results in zero active queries.
- Query clusters that already have scan results should be pruned by deactivation rather than destructive removal.

## Recommended Claude usage

- Use [run-query-ops.md](/Users/jordanellison/Projects/talentsignal/claude/commands/run-query-ops.md) when the main need is query-set approval.
- Use [review-scan-readiness.md](/Users/jordanellison/Projects/talentsignal/claude/commands/review-scan-readiness.md) immediately before creating a scan.
- Use `coo` first if the founder is really asking for workflow design, not just query review.
