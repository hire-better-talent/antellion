---
name: agent-ops-and-scan-gate-may2026
description: Agent operating system, query-ops workflow, and scan-readiness process were codified and pushed on 2026-05-06; next recommended work is migration-history repair and stricter scan gating.
type: project
---

Agent operating docs, SOPs, and the first productized query-cluster review workflow were completed and pushed on 2026-05-06 at commit `1c0fbad`.

**Why:** The founder wants to standardize and operationalize manual business processes so future Codex/Claude sessions can pick up where prior ones left off and reduce day-to-day operational drag.

**How to apply:** When future work touches scan operations, start from the repo docs and the new query-cluster review-state workflow instead of treating scans as an unstructured manual process. The next high-value steps are repairing Prisma migration-history reliability and tightening in-product scan gating around approved vs stale query clusters.
