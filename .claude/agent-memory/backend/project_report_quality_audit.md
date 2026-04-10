---
name: Report Quality Audit — Fabricated Benchmarks and Misleading Language
description: All fabricated percentage benchmarks, misleading causal claims, and inverted logic bugs fixed across the four report quality files
type: project
---

All fabricated benchmark language has been removed from the report pipeline. The canonical replacements are:
- "typically improve mention rates by X-XX percentage points within two quarterly cycles" → "Improvement is measurable in follow-up assessments."
- "based on assessment patterns/benchmarks" → removed
- Establishing presence on gap platforms: "Establishing presence on gap platforms directly addresses the data absence driving visibility gaps."

**Why:** These numbers were invented and not sourced from any real data. Presenting them in client-facing reports creates legal and credibility risk.

**How to apply:** Any time a recommendation `expectedImpact` or `effortDetail` field proposes a specific percentage improvement, flag it as a fabricated benchmark and replace with directional language.

Key bugs also fixed:
- `broaderComp` boundary comparison was wrong (checked `!== firstAppearsAt` instead of `< clientOrder`). Fixed with `BOUNDARY_ORDER` map ordering.
- Inverted filter on sentiment recommendation `targetPlatforms` (was excluding the relevant review sites). Fixed by removing the filter entirely.
- Positioning vocabulary mismatch in `report-composer.ts` exec summary: code compared against "strong/featured/adequate/moderate" but actual values are "champion/contender/peripheral/cautionary/invisible". Fixed.
- Consideration and Commitment builders had `_existingAssetUrls` (unused). Now wired to `clientHasPlatformPresence` same as Discovery and Evaluation.
- Funnel impact projection now capped at 50% with `Math.min(rawFixedThroughput, 0.5)` and discloses the assumption.
- Decision multiple floor `< 2 ? 2 : decisionMultiple` removed — when ratio < 1.5x, uses descriptive language instead.
- Competitor callout now requires `topCompetitor.mentionRate >= 0.15` before generating.
- Competitor positioning in matrix now derived from the competitor's own mention rate via `classifyPositioning(competitorRate, 50, 0)` instead of copying the client's positioning.
- "solicict" typo fixed → "solicit".
- Hardcoded "from Peripheral to Contender" in commitment close-out replaced with actual positioning value.
