---
name: Journey Report Renderer
description: Journey-format report rendering components and dual-mode detection logic implemented 2026-03-28
type: project
---

Report rendering now supports two formats, detected at runtime from metadata:

- **Journey format** (new): detected via `extractJourneyMetadata()` — presence of `metadata.journeyAnalysis`. Renders using `JourneyReportRenderer` with 7 sections: Executive Summary, Decision Journey, Competitive Landscape, Citation Ecosystem, Narrative Positioning, Pipeline Impact, Recommended Actions.
- **Legacy format**: falls through to the existing section/recommendation rendering unchanged.

**Why:** The report structure was redesigned around the candidate decision journey framework. New reports will carry `journeyAnalysis`, `remediationPlan`, and `competitors` in their metadata. Old reports only have `sections`.

**How to apply:** Both the dashboard detail page and the export page use the same dual-mode detection and the same `JourneyReportRenderer` component. The export page passes `printMode={true}`, which switches badge and layout styles to border-based variants that survive PDF rendering. The dashboard page passes an `evidencePanel` render prop; the export page omits it.
