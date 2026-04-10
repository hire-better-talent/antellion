---
name: Narrative Positioning Section Design
description: Complete section design for "How AI Describes You" (Section 5) -- positioning analysis framework, tier descriptions, displacement detection, stage shift patterns, worked Meridian example, implementation types and function signatures
type: project
---

A full section design was produced (2026-03-28) at docs/designs/narrative-positioning-section-design.md. It elevates Section 5 ("How AI Describes You") from a placeholder in report-blueprint-v2.md into a first-class premium deliverable element with 10 parts.

**Why:** Narrative positioning is the highest-value insight Antellion delivers because it reveals what AI *says* about the client -- something invisible to the buyer today. The blueprint-v2 had a placeholder with a positioning table and example prose, but no detection framework, no displacement analysis, no stage shift patterns, and no implementation specification.

**How to apply:** The design defines: (1) a narrative pattern classification system built entirely on existing signals (visibilityScore, sentimentScore, mentionRate) with no new NLP pipeline required, (2) competitive displacement detection with severity thresholds, (3) cross-stage shift pattern detection (6 named patterns), (4) complete tier descriptions with AI response examples/business consequences/remediation paths, (5) full worked Meridian section as it would appear in a delivered report, (6) TypeScript types (NarrativePositioningAnalysis, NarrativePattern, DisplacementSeverity, StageShiftPattern) and function signatures for implementation. Key dependency: JourneyAnalysis must be computed (stageBreakdown data on ReportInput). No new DB queries or API calls needed -- all computation is in-memory derivation from existing data.
