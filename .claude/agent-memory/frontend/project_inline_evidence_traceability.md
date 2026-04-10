---
name: P7 Inline Evidence Traceability
description: Per-section evidence basis line implemented inline (not expandable) — query count, sourced count, confidence badge
type: project
---

Per-section "Based on N queries · M sourced (X%) · Confidence: [badge]" line wired into all four major report sections.

**Why:** P7 in development-plan.md — makes evidence basis visible to report readers by default, not hidden behind an EvidencePanel click.

**How to apply:** The `Section` wrapper in `JourneyReportRenderer.tsx` now accepts an optional `evidenceBasis` prop. Pass it to add the line beneath the subtitle. The `SectionEvidenceBasis` component lives at `apps/web/src/components/report/SectionEvidenceBasis.tsx`.

Key decisions:
- Query counts for Discovery come from `boundary.rateByLevel[level].queryCount` (summed) when boundary data is present; fallback to `assessmentParameters.queryCount / stageCount`.
- Evaluation + Consideration counts are proportional estimates from `assessmentParameters.queryCount`.
- When `assessmentParameters` is absent (legacy reports), all `queryCount` values are 0 and the basis line does not render.
- Confidence score uses `deriveSectionConfidence(queryCount, sourcedRate)` — formula: `min(1, (queryCount/50)*0.6 + sourcedRate*0.4)`.
- `EvidenceBadge` renders the confidence tier label + percentage.
- Print mode uses slightly darker text (`text-gray-500` vs `text-gray-400`) for legibility on paper.
