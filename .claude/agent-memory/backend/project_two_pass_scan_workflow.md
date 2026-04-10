---
name: Two-pass scan workflow — competitor discovery
description: Discovery scan runs first (no competitors), system extracts competitor names from responses, operator adds them, then full assessment runs with comparison queries
type: project
---

Two-pass workflow is implemented as of 2026-03-30. Pass 1: operator creates client with no competitors, generates Discovery/Consideration queries (competitor templates are skipped automatically when `input.competitors` is empty — no code change needed), runs scan. Pass 2: operator reviews the discovered competitor list, adds relevant ones, then re-generates queries (which now include `COMPETITOR_TEMPLATES` vs queries), runs second scan.

Key implementation files:
- `packages/core/src/competitor-discovery.ts` — pure heuristic extraction function (`discoverCompetitors`)
- `apps/web/src/app/(dashboard)/actions/scans.ts` — `discoverCompetitorsFromScan` server action
- `apps/web/src/app/(dashboard)/actions/competitors.ts` — `addDiscoveredCompetitor` server action (infers domain as `name.toLowerCase().replace(/[^a-z0-9]/g,'') + ".com"`)
- `apps/web/src/components/AddDiscoveredCompetitorButton.tsx` — client component for inline add
- `apps/web/src/app/(dashboard)/scans/[id]/page.tsx` — "Talent Competitors Discovered" section shown when scan is COMPLETED and candidates exist

**Why:** Operators don't know competitor names upfront. Discovery scan surfaces who AI actually recommends, so the second pass asks targeted comparison queries.

**How to apply:** When touching query generation or scan result handling, remember that zero-competitors is a valid and expected state (Pass 1). Never require competitors to proceed.
