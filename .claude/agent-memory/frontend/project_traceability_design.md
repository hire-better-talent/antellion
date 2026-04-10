---
name: Report traceability UI implementation
description: Evidence traceability UI implemented and demo-polished — EvidenceSummaryBar, EvidenceAppendix, response previews, and restructured ScanEvidenceDetail added 2026-03-28.
type: project
---

Initial implementation: 2026-03-26.
Demo-polish pass: 2026-03-28.

## Components

- `EvidenceBadge.tsx` — server component, confidence tier (HIGH/MEDIUM/LOW) with color badges and percentage
- `EvidenceCard.tsx` — client component, renders a single evidence item. Shows 150-char response preview always visible; full response behind "View full response" toggle
- `EvidencePanel.tsx` — client component, lazy-loads evidence per section. Trigger area has `bg-gray-50` background and a computed summary stats line (query count, approved count, avg confidence) shown after first load
- `EvidenceSummaryBar.tsx` — server component, report-level evidence stats bar (total links, unique records, approval status, avg confidence, unique domains). Returns null when no evidence exists. Renders between QA bar and report body on report detail page
- `ScanEvidenceDetail.tsx` — server component. Restructured: query text + response preview always visible, key metric row (status/confidence/sources), approval note. Full detail (prompt, full response, sources, notes) behind "Show full evidence record" `<details>` toggle
- `EvidenceAppendix.tsx` — server component, export-only. Per-section evidence tables (top 5 queries, mentioned/visibility/sentiment). Gated: returns null when report has no linked evidence. Rendered at end of export page before footer

## Integration points

- `reports/[id]/page.tsx`: `EvidenceSummaryBar` between QA bar and report body; report body wrapped in `div#evidence-trail` for scroll-anchor
- `reports/[id]/export/page.tsx`: `EvidenceAppendix` rendered after all recommendations, before footer
- `scans/[id]/page.tsx`: `ScanEvidenceDetail` after truncated response per result

## Key architectural decisions

- `EvidencePanel` fetches ALL sections at once via `getEvidenceByReport`, then filters client-side — avoids per-section round trips
- Evidence data comes from `ReportEvidence` links; NOT derived from scanRunIds
- `ScanEvidenceDetail` fetches the latest evidence by version desc — callers pass only `scanResultId`
- `EvidenceSummaryBar` and `EvidenceAppendix` both return null when no evidence exists — safe to render unconditionally on all reports including legacy
- `EvidenceAppendix` uses `page-break` class (already in print CSS) to force a new page before the appendix
- Response preview in `EvidenceCard` truncates at 150 chars; `ScanEvidenceDetail` at 200 chars

**Why:** Enterprise buyers need to trust report findings. Traceability is opt-in (collapsed by default) but verifiable on demand. Demo credibility requires that the key output (what the AI said) is visible without clicks.

**How to apply:** Do not fetch evidence data at page load for report sections — it is always lazy. EvidenceSummaryBar and EvidenceAppendix are server-rendered and self-gating. Evidence panels are client islands; everything else stays server-rendered.
