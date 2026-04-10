---
name: Assessment Report Specification
description: Detailed spec written to align the report output with the paid "AI Employer Visibility Assessment" deliverable from the growth playbook. Located at docs/report-assessment-spec.md.
type: project
---

A comprehensive report specification was produced (2026-03-22) that bridges the growth playbook's "AI Employer Visibility Assessment" ($7,500-$25,000 deliverable) with the current report-composer.ts output.

**Why:** The current report reads like a system output summary (data recitation in paragraphs). The growth playbook promises a $50K-consulting-quality strategic deliverable. The gap is significant -- title says "Audit" instead of "Assessment", no methodology section, no per-theme breakdown, no comparison tables, citations are just domain lists, and recommendations lack actionable detail.

**How to apply:** When working on any report-related changes, reference docs/report-assessment-spec.md for the target structure, language guidance, gap analysis, and implementation priorities (P0 through P3). The spec defines exact section hierarchy, data sources for each section, TypeScript type changes needed, and anti-patterns to avoid. Key must-haves: per-theme mention rate computation, source type classifier, gap action templates, structured ReportSection type (tables + subsections), and richer top-3 recommendations.
