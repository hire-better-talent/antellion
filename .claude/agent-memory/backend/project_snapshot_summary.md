---
name: Snapshot Summary Computation (v3, DM quality hardening)
description: computeSnapshotSummary — citation gap now filters to employer-relevant platforms only; isLabelPattern() rejects scraped data labels from quotable text; DM template uses specific gap query + competitor names instead of generic hook evidence
type: project
---

`computeSnapshotSummary` lives at `packages/core/src/snapshot-summary.ts`. All functions are pure — no DB, no LLM, no side effects.

**v3 changes (2026-04-06):**

Citation gap:
- `gapPlatforms` now filtered by `isEmployerRelevantDomain()` — junk domains (asymm.com, softgist.com) excluded
- New fields: `prospectEmployerCitations` (employer-relevant citations in prospect-mentioned responses), `competitorEmployerCitations` (employer-relevant citations in competitor-only responses)
- `citationGap.finding` now names specific platforms: "Competitors are cited alongside glassdoor.com and levels.fyi (8 times). ServiceTitan appears in zero responses citing these platforms."
- `buildCitationFinding()` helper generates the platform-specific finding text

Discovery excerpts:
- `extractDiscoveryExcerpt()` now: filters sentences <20 chars, filters `isLabelPattern()` sentences, prefers multi-competitor sentences (most competitor names in one sentence), then falls back to single-competitor, then 2+ commas
- Label patterns like "Procore - Focus: Construction management software." are now skipped

Quotable text:
- `isLabelPattern(text)` exported — detects "Word Word: Description" and "Word - Label: Description" patterns
- After `extractQuotableText()`, if result is a label pattern, falls back to `winner.result.evidence`
- `isLabelPattern` regex: `/^[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)* ?[-–:][ ]/`

DM template:
- `buildDmTemplate()` now accepts `quotableText` and `topGapQuery` (optional)
- When a gap query has competitor names, DM uses: `When we asked "query text", AI recommended Competitor A and Competitor B. ProspectName wasn't mentioned.`
- Falls back to hook evidence when no gap query with competitors exists
- Falls back to `One response read: "quotable"` when quotable text is clean but no specific gap query

v2 summary shape still applies (competitor ranking, theme breakdown, 5 top gap queries, etc.)

**Why:** Snapshot is the top-of-funnel sales tool. Every field must be DM-ready. The previous output surfaced junk domains in citation gaps and label-pattern strings in quotable text — both looked scraped, not credible.
