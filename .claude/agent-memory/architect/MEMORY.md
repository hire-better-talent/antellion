# Architect Agent Memory Index

## Project Context
- [project_first_audit_findings.md](project_first_audit_findings.md) -- First real audit (HGV, 2026-03-31) findings that drove 5 roadmap specs for template quality
- [project_recommendation_asset_awareness.md](project_recommendation_asset_awareness.md) -- Both recommendation engines check existingAssetUrls before recommending platform creation
- [project_journey_suppresses_legacy_recs.md](project_journey_suppresses_legacy_recs.md) -- composeReport returns empty recs when journey data is present; stage recs live in metadata only
- [project_enterprise_scaling_approach.md](project_enterprise_scaling_approach.md) -- Enterprise support via profile fields + scale-aware templates; deferred AssessmentSegment model
- [project_per_segment_reporting_spec.md](project_per_segment_reporting_spec.md) -- Per-segment reporting spec: focusArea grouping, no schema changes, 3-phase plan
- [project_snapshot_scan_design.md](project_snapshot_scan_design.md) -- Cold outreach snapshot scan: 20 queries/$3, reuses ScanRun, DM-ready findings for VP TA outreach
