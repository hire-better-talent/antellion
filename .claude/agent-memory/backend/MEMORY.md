# Backend Agent Memory Index

## User
- [user_role.md](./user_role.md) — Jordan Ellison's role, working style, and how to collaborate

## Project
- [project_workflow_state_machine.md](./project_workflow_state_machine.md) — Unified workflow state machine implementation status and key decisions
- [project_org_scoping.md](./project_org_scoping.md) — Org scoping coverage: all actions fixed, reusable helpers in auth.ts, scoping chain reference
- [project_approved_only_report_pipeline.md](./project_approved_only_report_pipeline.md) — Report pipeline now enforces APPROVED-only at scan results, evidence linking, and QA check levels
- [project_report_lifecycle_hardening.md](./project_report_lifecycle_hardening.md) — QA is a true blocking gate; reports create in DRAFT; transition rules are strict and skip-proof
- [project_read_path_org_scoping.md](./project_read_path_org_scoping.md) — All detail/edit page reads use findFirst with org scope chain; findUnique is unsafe for tenant isolation
- [project_two_pass_scan_workflow.md](./project_two_pass_scan_workflow.md) — Two-pass scan workflow: Pass 1 discovers competitors from AI responses, Pass 2 runs comparison queries
- [project_query_intelligence_expansion.md](./project_query_intelligence_expansion.md) — 90 base + 10 competitor templates; classifiers are fallback-only; "or " removed from competitor_comparison keywords
- [project_standard_client_assets.md](./project_standard_client_assets.md) — createClient auto-creates 6 standard ContentAsset rows atomically; slug/URL derivation lives in packages/core
- [project_journey_pipeline_wiring.md](./project_journey_pipeline_wiring.md) — generateReport now computes journey analysis and stores JourneyMetadata in Report.metadata, activating the JourneyReportRenderer
- [project_visibility_boundary.md](./project_visibility_boundary.md) — nicheKeywords on Client, specificity-tagged Discovery queries, boundary detection, and report metadata integration
- [project_employer_platform_filter.md](./project_employer_platform_filter.md) — isEmployerRelevantDomain filters gap domains before recommendation generation; news/press sites excluded from recs but still in citation table
- [project_per_segment_reporting.md](./project_per_segment_reporting.md) — Phase 1 complete: per-segment grouping, analysis, cross-segment summary stored in metadata; Phase 2 (renderer) deferred
- [project_report_quality_audit.md](./project_report_quality_audit.md) — All fabricated benchmarks and misleading claims removed; key bugs fixed (boundary comparison, inverted filter, positioning vocabulary, competitor matrix, hardcoded targets)
- [project_supplemental_llm_queries.md](./project_supplemental_llm_queries.md) — LLM supplemental query generation (Priority 2): bespoke strategic queries after Discovery scan, injected callback pattern, dedup against templates, stage verification
- [project_query_signal_scoring.md](./project_query_signal_scoring.md) — P1c complete: signal yield scores on every ScanResult.metadata.signalYield; Jaccard duplicate detection; batch post-scan + inline manual scoring; UI badge on scan detail page
- [project_multi_run_aggregation.md](./project_multi_run_aggregation.md) — Phase 1 complete: pure function module for confidence-validated multi-run assessment; groupResultsByQuery + computeMultiRunAnalysis; effectiveScanRunCount drives downstream confidence
- [project_snapshot_summary.md](./project_snapshot_summary.md) — computeSnapshotSummary: pure function; now wired into finalizeScan post-COMPLETED hook; category recovered from cluster name; competitor name from query.intent prefix
- [project_snapshot_scan_creation.md](./project_snapshot_scan_creation.md) — createSnapshotScan action + CreateSnapshotSchema: atomic transaction creating client/competitors/clusters/queries/ScanRun; competitors as JSON hidden field
- [project_operator_action_plan.md](./project_operator_action_plan.md) — Phase 1 complete: pure transform from Report.metadata → OperatorActionPlan; no LLM, no DB writes; entry point is buildOperatorActionPlan in packages/core
- [project_clerk_auth_integration.md](./project_clerk_auth_integration.md) — Clerk v6 live in apps/web; getAuthContext() is the auth entry point; migration script written, not run; self-review guard has OWNER/ADMIN override
- [project_diagnostic_phase1.md](./project_diagnostic_phase1.md) — Diagnostic Phase 1 complete (2026-04-23): schema, Perplexity adapter, matrix runner, finding extractor, validation gate, public route, operator dashboard
