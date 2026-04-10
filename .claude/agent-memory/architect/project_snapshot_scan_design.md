---
name: Snapshot scan mode design
description: Cold outreach snapshot scan -- v2 redesign with 100 queries (gpt-4o-mini) for ~$3.50, discovery-dominant at 65%, designed for statistically meaningful DM findings
type: project
---

Snapshot scan mode is the top-of-funnel growth feature. v2 redesign (2026-04-04) scales from 20 to 100 queries to produce findings that are impossible to replicate by hand.

**Why v2:** Jordan identified that 20 queries is trivially reproducible -- a VP TA can open ChatGPT themselves. 100 systematic queries across 10 themes, 7 phrasings, 4 specificity levels produces a mention rate with statistical weight.

**Key design decisions:**
- 65 discovery / 18 contrast / 10 reputation / 7 citation (totals exactly 100)
- Uses gpt-4o-mini with web search (~$0.035/query) instead of gpt-4o (~$0.15/query) -- 5x more queries for only 18% more total cost
- Summary output adds competitor ranking table, top 5 gap queries, theme breakdown, per-competitor contrast summaries, narrative consistency
- DM hook becomes "We tested 100 queries candidates ask AI about employers in your space..."
- `snapshotVersion: 2` in metadata; no migration of v1 snapshots
- Scan worker uses `metadata.model` to select gpt-4o-mini for snapshot scans
- Target latency: <60s at 10 concurrent, <90s at 5 concurrent

**How to apply:**
- Design doc at `docs/designs/snapshot-scan-mode.md`
- Reuses ScanRun/ScanResult with `queryDepth: "snapshot"` and `metadata.snapshot: true`
- Query generation is pure template expansion in packages/core, no LLM calls
- UI lives at `/snapshots/*`, separate from `/scans/*` routes
