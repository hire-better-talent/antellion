---
name: Brand Token Propagation
description: Antellion brand tokens pulled through entire report body (post ExecutiveSummaryCard), replacing ad-hoc Tailwind colors throughout JourneyReportRenderer, CitationPlaybook, and RecommendationCard
type: project
---

BRAND_TOKENS from `@antellion/core` now applied consistently across all report sections beyond CoverPage and ExecutiveSummaryCard.

**Why:** Report body after "Assessment Overview" used a mix of arbitrary Tailwind color classes that broke visual cohesion.

**How to apply:** When adding new report sections or sub-components, always import BRAND_TOKENS and use:
- `BRAND_TOKENS.accentPrimary` for section headings, label tags, left-border accents, rank circles, platform pills
- `BRAND_TOKENS.reportSurface` / `BRAND_TOKENS.reportBorder` for card backgrounds and borders (inline style, not Tailwind)
- `BRAND_TOKENS.reportText` for primary headings and important data values
- Semantic badge colors (green/red/amber) are intentionally left as Tailwind classes — they communicate meaning, not brand

**Key pattern:** Section structural cards use `style={{ border: \`1px solid ${BRAND_TOKENS.reportBorder}\`, backgroundColor: BRAND_TOKENS.reportBg }}` rather than Tailwind `border-gray-*` classes. This prevents future drift.

**Components updated:**
- `JourneyReportRenderer.tsx`: Section wrapper, AssessmentParametersBlock, AssessmentConfidenceCard, ExecutiveDecisionPage, SectionCloseOut, ThemeInsights, InlineRecommendations, DiscoveryLevelCard, EvaluationSubsectionCard, CommitmentSubsectionCard, SegmentHeader, BaselineMetrics, StageStabilityRow, plus ReportFooter added
- `CitationPlaybook.tsx`: SourceTypeBadge, StageBadge, PlaybookCard rank circles and label headings, summary bar, Defensible advantages label
- `RecommendationCard.tsx`: Card border, stage badge, title, Why this matters, Sequencing block, Actions label + step circles, platform pills, footer border

**ReportFooter component added:** Screen-mode footer at bottom of renderer with logo-mark, "Antellion | AI Employer Visibility Assessment", client name. Print CSS uses `@page { margin-bottom: 0.7in }`.

**Print-safe gray classes retained:** All `border-gray-300 text-gray-700` variants inside print-mode badge conditionals are intentional — PDF rendering strips color backgrounds, so these bordered variants survive PDF export.
