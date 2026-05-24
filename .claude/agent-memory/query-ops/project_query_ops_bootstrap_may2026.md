---
name: query-ops-bootstrap-may2026
description: Query-ops SOP was pressure-tested against seeded Meridian data; the outcome was ready-with-edits and identified weaker clusters plus product gaps in review-state persistence.
type: project
---

The first `query-ops` dry run was completed against the seeded Meridian Technologies dataset on 2026-05-03. The outcome was `ready with edits`: Hiring Process, Role Expectations, and Competitor Comparison were usable; Engineering Culture, Compensation, and Culture & Work-Life Balance needed tightening. This work directly motivated adding explicit query-cluster review state to the product.

**Why:** The founder wanted a concrete, repeatable query-review workflow before real client data arrived, and the seeded data was sufficient to expose both process gaps and product gaps.

**How to apply:** Future query-ops work should start from the SOP plus the Meridian dry run as the reference example. Use the review-state workflow in product instead of relying on cluster recency or operator memory alone.
