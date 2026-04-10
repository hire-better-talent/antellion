---
name: Organization scoping — helpers and coverage status
description: All action files now have full org scoping. Reusable helpers live in apps/web/src/lib/auth.ts.
type: project
---

All server action files in `apps/web/src/app/(dashboard)/actions/` are fully org-scoped as of 2026-03-27.

**Why:** Quality audit found several actions accepted user-supplied IDs and wrote/deleted data with no tenant isolation check — any caller could mutate any org's data.

**How to apply:** Any new server action that accepts a user-supplied entity ID must call `getOrganizationId()` and either use a `require*` helper or include `organizationId` in the Prisma `where` clause before performing any write or sensitive read.

## Helpers in `apps/web/src/lib/auth.ts`

All helpers fail closed — they throw if the entity is not found or does not belong to the org:

- `requireOrgClient(clientId, orgId)` — verifies Client belongs to org
- `requireOrgScan(scanId, orgId)` — verifies ScanRun via client
- `requireOrgCompetitor(competitorId, orgId)` — verifies Competitor via client
- `requireOrgContentAsset(contentAssetId, orgId)` — verifies ContentAsset via client
- `requireOrgQueryCluster(clusterId, orgId)` — verifies QueryCluster via client
- `requireOrgQuery(queryId, orgId)` — verifies Query via queryCluster → client

## Scoping chain (reference)

- Client → Organization (direct: `client.organizationId`)
- Competitor / ContentAsset / QueryCluster / ScanRun → Client → Organization
- Query → QueryCluster → Client → Organization
- ScanResult → ScanRun → Client → Organization
- ScanEvidence → ScanResult → ScanRun → Client → Organization
- Report → Client → Organization

## Files fixed in this pass

- `clients.ts` — `updateClient`, `deleteClient`
- `competitors.ts` — `createCompetitor`, `updateCompetitor`, `deleteCompetitor`
- `content.ts` — `createContentAsset`, `updateContentAsset`, `deleteContentAsset`
- `queries.ts` — `generateQueries`, `updateQueryCluster`, `deleteQueryCluster`, `addQuery`, `updateQuery`, `toggleQueryActive`, `deleteQuery`
- `scans.ts` — `createScan`, `recordResult`, `completeScan`, `deleteScan`
- `reports.ts` — `client.findUnique` converted to `findFirst` with explicit `organizationId`

## Files already scoped (no changes needed)

- `evidence.ts`, `result-workflow.ts`, `qa.ts`, `reports.ts` (primary path), `snapshots.ts`
