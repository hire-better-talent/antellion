---
name: Read path org scoping
description: All detail/edit page read paths now enforce org scoping via findFirst + where clause; findUnique is not safe for tenant isolation
type: project
---

All detail and edit page read paths across the dashboard (and the export page outside the dashboard layout) were converted from `prisma.*.findUnique({ where: { id } })` to `prisma.*.findFirst({ where: { id, <org scope chain> } })`.

The pattern in every page is:
1. `const organizationId = await getOrganizationId();`
2. `findFirst` with `organizationId` pushed into the `where` via the correct relation chain
3. `if (!result) notFound();`

Org scope chains by entity type:
- Client: `{ id, organizationId }`
- Competitor: `{ id, clientId, client: { organizationId } }`
- ScanRun: `{ id, client: { organizationId } }`
- Report: `{ id, client: { organizationId } }`
- ContentAsset: `{ id, client: { organizationId } }`
- QueryCluster: `{ id, client: { organizationId } }`
- Query: `{ id, queryClusterId, queryCluster: { client: { organizationId } } }`

The snapshot page (`snapshots/[clientId]/page.tsx`) was already safe — it delegates to `fetchSnapshot()` in actions/snapshots.ts which calls `getOrganizationId()` internally.

**Why:** `findUnique` only filters by unique index (id). Without an org condition in the where clause, any authenticated user could read any tenant's data by guessing IDs once real auth ships.

**How to apply:** Whenever adding a new detail or edit page, always use `findFirst` with the org scope chain from the start. Never use `findUnique` for tenant-scoped reads in page components.
