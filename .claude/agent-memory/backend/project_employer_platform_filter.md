---
name: Employer platform filter for citation gaps
description: Only employer-relevant domains (glassdoor, linkedin, levels.fyi, etc.) drive recommendation generation — news/press sites are filtered out
type: project
---

Gap domains from scan comparison always include all AI-cited domains. Before generating recommendations, filter them through `isEmployerRelevantDomain()` from `packages/core/src/employer-platforms.ts`. News domains (barrons.com, forbes.com, techcrunch.com) are excluded from recommendations but still appear in the citation landscape TABLE for context.

**Why:** A barrons.com citation in an AI response was generating a recommendation to "get presence on Barron's" — absurd for an employer discovery platform.

**How to apply:** Any new recommendation builder that iterates over gap domains must call `isEmployerRelevantDomain(normaliseDomain(d))` before acting on a domain. The scan-comparison layer is intentionally untouched — filtering happens at the recommendation/report layer only.
