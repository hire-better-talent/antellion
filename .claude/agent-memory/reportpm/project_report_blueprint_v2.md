---
name: Report Blueprint v2
description: Complete redesign spec for the report around the candidate decision journey framework -- 7 sections, tone guide, data mapping, worked Meridian examples, anti-patterns, confidence integration
type: project
---

A full report blueprint was produced (2026-03-27) at docs/designs/report-blueprint-v2.md. It redesigns the report from "organized by analysis type" to "organized by candidate decision journey stage."

**Why:** The current report (report-composer.ts, 1,218 lines) is technically accurate but reads like system output, not a strategic diagnostic. Sections like "Visibility Findings" and "Citation Patterns" map to internal computation categories, not buyer questions. The executive summary opens with a statistic instead of a story. Recommendations are category-ordered instead of funnel-ordered. The assessment spec (project_assessment_spec.md) improved the current report significantly but did not restructure it around the journey framework.

**How to apply:** The blueprint defines 7 sections (Executive Summary, Decision Journey, Competitive Landscape, Citation Ecosystem, Narrative Positioning, Pipeline Impact, Recommended Actions) plus cover page. It includes full tone/language guide, data mapping from ScanComparisonResult fields to narrative elements, worked Meridian examples for 4 sections, 7 anti-patterns with good/bad comparisons, confidence integration rules per section, and implementation notes. When implementing, the key dependency is stageBreakdown data on ReportInput -- the blueprint preserves backward compatibility (falls back to current structure when stage data is absent).
