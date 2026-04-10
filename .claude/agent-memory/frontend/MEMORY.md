# Agent Memory Index

## Project

- [project_enriched_recs_storage.md](./project_enriched_recs_storage.md) — Where enriched recommendation data (rationale, actions, effortDetail) is stored; backend gap to close in reports action
- [project_traceability_design.md](./project_traceability_design.md) — Report traceability UI design completed; key decisions on lazy loading, confidence tiers, and export appendix
- [project_workflow_dashboard.md](./project_workflow_dashboard.md) — Workflow dashboard, StatusPipeline, WorkflowStatusBar, ResultReviewActions implemented (2026-03-26)
- [project_journey_report_renderer.md](./project_journey_report_renderer.md) — Journey-format report rendering components and dual-mode detection implemented (2026-03-28)
- [project_per_segment_rendering.md](./project_per_segment_rendering.md) — Phase 2 per-segment rendering implemented (2026-04-01); key decisions on co-location, renderFlatPath, and circular import avoidance
- [project_cover_exec_summary.md](./project_cover_exec_summary.md) — P3a/P3a-ii: CoverPage + ExecutiveSummaryCard wired into renderer (2026-04-02); LLM prose generation via claude-sonnet-4-20250514
- [project_inline_evidence_traceability.md](./project_inline_evidence_traceability.md) — P7: Per-section inline evidence basis line (2026-04-02); SectionEvidenceBasis component, Section wrapper prop, deriveSectionConfidence formula
- [project_stability_classification.md](./project_stability_classification.md) — P5: Stability classification display (2026-04-02); StabilityBadge, AssessmentConfidenceCard, StageStabilityRow, stability-aware rec context
- [project_snapshot_findings_page.md](./project_snapshot_findings_page.md) — /snapshots/[id] DM-authoring findings card built (2026-04-03); route separation from [clientId], SnapshotSummary metadata shape, client component split
- [project_operator_action_plan.md](./project_operator_action_plan.md) — Internal Operator Action Plan tab at /reports/[id]/action-plan built (2026-04-05); 7 section cards, red chrome, print watermark, tab nav added to report detail page
- [project_brand_token_propagation.md](./project_brand_token_propagation.md) — BRAND_TOKENS pulled through entire report body (2026-04-06); key pattern for structural cards, print-safe exceptions, ReportFooter added
