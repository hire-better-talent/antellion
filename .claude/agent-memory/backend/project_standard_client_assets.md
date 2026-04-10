---
name: Standard Client Assets on Creation
description: createClient auto-creates 6 standard ContentAsset rows atomically; slug/URL derivation lives in packages/core
type: project
---

When a client is created, 6 standard ContentAsset rows are inserted atomically in the same `prisma.$transaction` as the client record. The transaction uses `createMany` with `skipDuplicates: true` for safety.

The 6 assets (Careers, Glassdoor, LinkedIn, Levels.fyi, Built In, Indeed) are defined in `packages/core/src/content-assets.ts` via `STANDARD_ASSET_TEMPLATES`. URL derivation uses `deriveCompanySlug(name)` + `deriveStandardAssets(name, domain)` — pure functions, no DB calls.

`CreateClientWithAssetsSchema` was added to `schemas.ts` for future use when the form submits overridden asset URLs (spec section 5). The current `createClient` action still derives assets server-side from validated name/domain rather than accepting them from the form (simplest safe path; form-submission variant is ready when the frontend catches up).

**Why:** Eliminates the manual step of adding 6 URLs after every client creation; speeds time-to-first-scan.

**How to apply:** If extending asset auto-creation to competitors, `deriveStandardAssets(name, domain)` already accepts any name/domain pair — same pattern applies.
