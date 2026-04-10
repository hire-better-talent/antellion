---
name: Response Theme Extraction System
description: Qualitative theme extraction from AI responses for enterprise report quality -- industry framing, compensation specificity, unsolicited competitors, attribute analysis
type: project
---

Response theme extraction was implemented 2026-04-01 to materially upgrade report quality for enterprise clients.

**Why:** The reports were only showing quantitative data (mention rates, positioning tiers, platform gaps). Enterprise buyers (VP TA at Home Depot, TD Bank, Coca-Cola) need to understand WHAT AI says about them, not just whether they're mentioned. Key questions: How does AI frame us? What competitors do candidates see that we don't track? Does AI have real comp data or just "competitive"?

**How to apply:**
- `packages/core/src/response-themes.ts` contains the keyword-based extraction logic
- Themes are extracted per-stage AND overall, passed through `stageResponseTexts` on `JourneyMetadataBuilderInput`
- Frontend renders via `ThemeInsights` component in JourneyReportRenderer
- `composeBulletSummary()` in report-composer.ts includes theme-derived bullets (industry framing, comp specificity, unsolicited competitors, negative perceptions)
- All fields are optional -- existing reports without themes render unchanged
- Theme extraction is pure keyword matching, no LLM calls
