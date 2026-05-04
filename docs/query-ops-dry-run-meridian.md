# Query Ops Dry Run: Meridian Technologies

**Date:** 2026-05-03  
**Workflow:** `query-ops` SOP against seeded demo data  
**Client source:** [packages/db/prisma/seed.ts](/Users/jordanellison/Projects/talentsignal/packages/db/prisma/seed.ts)

## Why this dry run matters

Before real client query sets arrive, the seeded Meridian account is the best available stand-in for pressure-testing the operating workflow.

The value of this exercise is not that Meridian is perfect demo data. The value is that it exposes where the current repo supports operational review cleanly and where the product still relies on operator judgment that is not yet captured in product state.

## Seeded context summary

- Client: Meridian Technologies
- Competitors: Apex Cloud Systems, NovaBridge Analytics, VeloChain, Forge Industrial
- Roles represented: Senior Backend Engineer, ML Engineer
- Query clusters: 6
- Queries: 36 total
- Existing completed scan: 1 completed run with realistic result distribution and thematic strengths/gaps

## Query-ops dry run

### Status

`ready with edits`

### Approved clusters

- `Hiring Process & Candidate Experience`
  Strong direct and comparative queries. Good evidence in seeded results. High scan usefulness.
- `Role Expectations & Impact`
  Strong technical and ownership-oriented prompts. Good fit for Meridian’s positioning.
- `Competitor Comparison`
  Worth including because it produces buyer-relevant tradeoff language, though a few prompts are still broad.

### Required edits

- `Engineering Culture & Reputation`
  Keep the direct Meridian query and the Austin discovery query, but tighten the broad “top engineering teams” and “great developer experience” prompts because they over-favor better-branded competitors and may not produce distinct signal.
- `Compensation & Benefits`
  This cluster is strategically important because the seeded results show it is a weak spot, but half the prompts are broad market lookups rather than Meridian-diagnostic comparisons. It needs sharper comparative wording before a report-bound rerun.
- `Culture & Work-Life Balance`
  This is the weakest cluster. The business question is right, but too many prompts are generic category searches that will default to better-documented competitors and fail to say anything diagnostic about Meridian.

### Adds

- Add 2-3 sharper compensation comparison prompts focused on transparency and total rewards.
  Example direction: compare Meridian against named competitors for salary transparency, equity clarity, and benefits credibility.
- Add 2-3 culture evidence prompts that test whether Meridian has enough public proof points to surface in AI.
  Example direction: culture evidence, inclusion signals, hybrid/remote clarity, employee-proof surfaces.
- Add 1-2 ML-specific head-to-head queries beyond the single NovaBridge comparison.
  The current set has enough backend depth but thinner strategic depth for ML hiring competition.

### Retirements

- Consider deactivating or rewriting these broad prompts before a high-value rerun:
  - `top engineering teams at mid-size enterprise software companies`
  - `enterprise software companies known for great developer experience`
  - `best paying enterprise software companies for engineers`
  - `best company cultures in supply chain technology`
  - `top employers in logistics and supply chain technology`

These are not bad prompts in isolation, but they are weak as Meridian-diagnostic instruments because they bias toward companies with stronger ambient brand presence.

### Risks

- The current query clusters in seed data do not encode explicit review state.
  There is no `approved`, `stale`, or `needs revision` status at cluster level.
- The seed queries are manually authored and do not consistently carry structured stage metadata.
  The SOP can infer stage intent, but the product does not yet persist review outcomes clearly.
- The scan creation flow defaults toward selecting new clusters, not approved clusters.
  That is useful UX, but it is not the same as an operational approval gate.

### Next operator action

- Review the three weaker clusters first: `Engineering Culture & Reputation`, `Compensation & Benefits`, and `Culture & Work-Life Balance`.
- Tighten or deactivate broad prompts that mostly measure competitor ambient visibility.
- If this were a real client preparing for a report-bound rerun, generate a supplemental strategic cluster after the first Discovery scan and review it separately.

## What this dry run taught us

### What works already

- The repo has enough structure to support manual query review.
- Cluster detail pages already support the correct operational action for used queries: deactivate instead of deleting.
- The seeded scan results make it possible to reason about which themes are weak and therefore where supplemental depth is justified.

### What is still missing from the product

- cluster-level review status
- last-reviewed timestamp
- reviewer notes
- explicit scan-approved marker
- a founder-facing decision output inside the product

These are not blockers for the SOP. They are the next productization opportunities if this workflow proves valuable in practice.
