---
name: Snapshot Findings Page
description: /snapshots/[id] DM-authoring findings card built (2026-04-03); key decisions on route separation, client components, and metadata shape
type: project
---

`/snapshots/[id]/page.tsx` — server component findings card for new scan-based snapshots using `SnapshotSummary` from `scan.metadata.snapshotSummary`.

**Why:** Separate from the existing `/snapshots/[clientId]` route (older `VisibilitySnapshot` format from `fetchSnapshot` action). The new route targets `queryDepth: "snapshot"` ScanRun records.

**Key decisions:**
- `SnapshotMetadata` interface casts `scan.metadata` JSON to access `prospectName`, `roleTitle`, `industry`, `snapshotSummary`
- `DMTemplateEditor` and `RawResultsSection` are client components — co-located in the route directory
- `DMTemplateEditor` has a `textareaHidden` prop to render as a copy-only button (used for the primary finding card)
- `RawResultsSection` uses index-range tab filtering (0-7 discovery, 8-12 contrast, 13-16 reputation, 17+ citations) since ScanResult rows don't carry a `snapshotCategory` field
- Three page states: running/pending (ScanProgressBar + auto-refresh), completed-no-summary (refresh link), completed-with-summary (full card)
- Primary finding card border color: red=discovery_absence, orange=competitor_contrast, yellow=reputation, blue=citation_gap

**How to apply:** When extending or linking to snapshot findings, use `/snapshots/{scanRunId}` (not clientId). The list page at `/snapshots/page.tsx` currently links to `/snapshots/{clientId}` — that route remains as the old visibility snapshot format.
