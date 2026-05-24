---
name: query-cluster-review-state-and-migration-caveat-may2026
description: QueryCluster review-state workflow was added and the live Neon DB was synced via db push plus migrate resolve; the migration chain still lacks a reliable baseline for migrate dev replay.
type: project
---

`QueryCluster` review state (`reviewStatus`, `reviewNotes`, `reviewedById`, `reviewedAt`) was added and synced to the live Neon database by 2026-05-06. The live DB is correct and `prisma migrate status` is clean, but this was achieved with `db push` and `migrate resolve` after `migrate dev` failed on the older chain.

**Why:** The product needed explicit review state for query clusters and scan setup needed to reflect approved vs stale inputs. The existing migration chain failed on the shadow database because older migrations cannot replay from a clean baseline.

**How to apply:** If future backend work touches Prisma migrations, treat migration-history repair as a real technical task before adding more schema churn. Do not assume `prisma migrate dev` is healthy just because the live DB and current status are clean.
