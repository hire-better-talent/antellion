---
name: Query Intelligence Expansion
description: Template expansion to 90 base + 10 competitor templates; stage/theme classifier roles clarified as fallbacks only
type: project
---

Template count expanded from ~32 base to 90 base, plus 3 → 10 competitor templates. With 4 competitors, this produces 130 raw queries and 90+ after dedup at threshold 0.7.

**Why:** $10K audit needed more query depth. Target was 100-120 queries per assessment. Stage×theme matrix coverage: 23 DISCOVERY, 33 CONSIDERATION, 14 EVALUATION, 20 COMMITMENT base templates.

**How to apply:** When adding new templates, always include both `theme` and `stage` fields. The theme and stage classifiers are now fallback-only — they no longer run on template-generated queries. Template assignments are authoritative.

Key design decisions made:
- `DEDUP_THRESHOLD` lowered from 0.8 to 0.7 to allow more template variation to survive.
- Stage overwrite bug fixed: classifier only runs as fallback when `!q.stage`.
- Theme re-classification removed from the orchestrator loop entirely — template themes are authoritative. `classifyTheme()` remains exported for external callers.
- `"or "` removed from `competitor_comparison` THEME_KEYWORDS (too broad — matched "Senior" role titles, "for " prepositions). Replaced with `"pros and cons"`.
</content>
</invoke>