---
name: Multi-run aggregation core module
description: Phase 1 complete — pure function module for confidence-validated assessments across multiple scan runs
type: project
---

Phase 1 of multi-run aggregation is implemented as a pure function module with no database access.

**Why:** Antellion needs to run the same queries across multiple scan runs to measure stability and confidence, rather than trusting single-run results.

**Key design decisions:**
- `STABLE_PRESENCE` threshold is `>= 0.67` — note that `2/3` in IEEE 754 (`≈ 0.6667`) falls *below* this threshold. Tests reflect the floating point reality.
- `mentionConsistency` formula: `1 - 2 * Math.min(mentionRate, 1 - mentionRate)` — 1.0 at unanimity, 0.0 at 50/50.
- `visibilityVariance` is sample variance (divides by n-1), returns 0 if fewer than 2 non-null values.
- `effectiveScanRunCount` is 2 if `validationRate >= 0.7`, else 1.
- `groupResultsByQuery` silently skips results for query IDs not in the lookup map; this is intentional for caller simplicity.
- Null stages in `computeMultiRunAnalysis` are keyed as `"UNKNOWN"` in stage summaries.

**How to apply:** When integrating multi-run data into report generation, call `groupResultsByQuery` to shape flat result records, then pass the output to `computeMultiRunAnalysis`. The `effectiveScanRunCount` field is what downstream report confidence scoring should use.
