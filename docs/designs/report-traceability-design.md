# Report Traceability System -- Information Architecture

**Status:** Design-only
**Date:** 2026-03-26
**Author:** Report PM
**Related:** `docs/report-assessment-spec.md`, `docs/designs/report-qa-system-design.md`

---

## Table of Contents

1. [Design Context](#1-design-context)
2. [Evidence Architecture Per Section](#2-evidence-architecture-per-section)
3. [Evidence Presentation Strategy](#3-evidence-presentation-strategy)
4. [Evidence Hierarchy (Progressive Disclosure)](#4-evidence-hierarchy)
5. [Traceability for Recommendations](#5-traceability-for-recommendations)
6. [Anti-Patterns to Avoid](#6-anti-patterns-to-avoid)
7. [Export/Print Considerations](#7-exportprint-considerations)

---

## 1. Design Context

### The problem

Antellion reports are sold as $10K+ enterprise deliverables. The buyers -- CHROs, VPs of Talent Acquisition, senior People leaders -- are sophisticated and skeptical. They need to trust the findings, but they will not tolerate raw data dumps or academic-style appendices. They want confidence, not homework.

Today, the report makes claims backed by real data, but the connection between claim and evidence is invisible. A reader sees "67% mention rate" but cannot verify where that number came from, how many queries contributed, or what the underlying AI responses actually said. This creates two problems:

1. **Trust gap.** The enterprise buyer has no way to independently verify claims without asking Antellion for supporting data -- which signals low confidence in the product.
2. **Advisory gap.** The Antellion team delivering the report walkthrough has no built-in way to drill into findings when a buyer asks "but what exactly did the AI say about us?"

### What this design covers

The information architecture for report traceability -- what evidence backs each section, how it should be surfaced, and at what levels of detail. This design tells the frontend engineer WHAT to show. It does not prescribe the interaction pattern (that is the frontend engineer's job).

### What this design does NOT cover

- QA validation checks (covered in `docs/designs/report-qa-system-design.md`)
- The analyst workflow (covered in `docs/designs/analyst-workflow-design.md`)
- Visual design or component architecture
- API endpoints or data fetching implementation

### Key constraints

1. The report is template-driven, not LLM-generated. All narrative text is produced by `composeReport()` in `report-composer.ts`. Every claim is deterministic and traceable to a specific computation.
2. Evidence flows through a three-layer pipeline: `ScanResult` (raw) -> `ScanComparisonResult` (aggregated) -> `ComposedReport` (narrative). Traceability must connect backward through all three layers.
3. The export/print format is flat HTML. Progressive disclosure that works in the dashboard must degrade gracefully to a static format.
4. The QA system (designed separately) validates evidence integrity before publication. Traceability is about buyer-facing evidence presentation, not internal validation.

---

## 2. Evidence Architecture Per Section

### 2A. Executive Summary

The executive summary (`composeSummary()`, lines 886-1073 of report-composer.ts) is the highest-stakes section. It is the only section many executives will read in full. It makes 5-7 specific claims.

#### Claims and evidence mapping

| # | Claim | Source computation | Source data | Example output |
|---|-------|-------------------|-------------|----------------|
| 1 | Mention rate and tier | `mentionTier(sc.clientMentionRate)`, `pct()`, `humanFraction()` | `ScanComparisonResult.clientMentionRate` derived from `results.filter(r => r.mentioned).length / results.length` | "moderate visibility... appearing in roughly one-third of evaluated candidate queries (33%)" |
| 2 | Competitive gap (pp and multiple) | `Math.round((top.mentionRate - sc.clientMentionRate) * 100)`, `visibilityMultiple()` | Top competitor from `sc.entityMentions` sorted by `mentionRate` desc (excluding client) | "Apex Cloud leads by 16 percentage points -- candidates are 2.1x more likely to encounter Apex Cloud first" |
| 3 | Citation gap count and top sources | `sc.citations.gapDomains.length`, `classifySourceType()` | `CitationAnalysis.gapDomains` from `computeCitations()`: domains present in `clientAbsentDomains` but not in `clientPresentDomains` | "4 citation gaps -- sources including compensation data platform and employee review site (payscale.com, glassdoor.com)" |
| 4 | Sentiment posture | `sentimentWord(sc.avgSentimentScore)`, `sentimentImplication()` | `ScanComparisonResult.avgSentimentScore` from `avg(sentScores)` where sentScores = `results.map(r => r.sentimentScore).filter(v => v != null)` | "Slightly positive sentiment posture -- leaning favorable, which mildly supports candidate engagement" |
| 5 | Exclusive citation sources | `sc.citations.clientExclusiveDomains.length` | Domains in `clientPresentDomains` but not in `clientAbsentDomains` | "3 exclusive citation sources -- these sources cite only [Client]" |
| 6 | Weakest intent theme | `queryThemeBreakdown.sort(a.mentionRate - b.mentionRate)[0]` | `QueryThemeStats[]` per-cluster aggregation | "Weakest intent area: Compensation & Benefits at 12% mention rate" |
| 7 | Recommendation count and top action | `recommendations.length`, `recommendations[0].title` | Generated recommendations from `generateRecommendations()` | "This assessment identifies 5 prioritized recommendations, 2 requiring immediate attention" |
| 8 | Decision-stage visibility gap | `decisionEntries.reduce(sum + mentionRate) / length` compared to `top.mentionRate` | `queryThemeBreakdown` filtered to "Compensation & Benefits" and "Competitor Comparison" themes | "At the consideration stage, Apex Cloud is 3x more visible than [Client] in AI responses" |

#### Evidence levels for the Executive Summary

**Level 0 (the polished claim):** The summary paragraph text as currently generated. No changes needed to what the exec reads.

**Level 1 (supporting context):** For the executive summary, Level 1 is a compact "Assessment at a glance" sidebar or card that shows the 4-5 anchor metrics with their values:

- AI Mention Rate: 33% (moderate)
- Top Competitor: Apex Cloud at 49% (+16pp)
- Citation Gaps: 4 sources
- Sentiment: Slightly positive (+0.15)
- Queries Evaluated: 48 of 52

This gives the reader a quick reference frame without leaving the summary. It is NOT expandable detail -- it is always visible alongside the summary text.

**Level 2 (claim verification):** Each bold finding in the "Key findings" bullets should link to the section that contains its full analysis. This is simple cross-referencing, not inline evidence. In the dashboard, these are anchor links. In print, these are section references ("See Section 3: Visibility Findings").

**Level 3 (not applicable for the summary):** The executive summary does not need raw audit trail data. Its evidence is derived from later sections, which have their own Level 3 detail.

---

### 2B. Assessment Scope and Methodology

This section (`composeAssessmentScopeSection()`, lines 245-294) establishes credibility. It does not make claims that need evidence -- it IS the evidence context. But it does state facts that must be verifiable.

#### Claims and evidence mapping

| # | Claim | Source computation | Source data |
|---|-------|-------------------|-------------|
| 1 | Companies assessed (list) | Direct from input | `[clientName, ...competitors.map(c => c.name)]` or `assessmentScope.competitorNames` |
| 2 | Query coverage ("48 of 52 queries") | Direct values | `assessmentScope.completedQueries` / `assessmentScope.totalQueries`, fallback to `sc.completedQueries` / `sc.totalQueries` |
| 3 | Intent themes (list) | Direct from input | `assessmentScope.queryThemes` |
| 4 | AI models evaluated | Direct from input | `assessmentScope.aiModels` |
| 5 | Scoring methodology descriptions | Static text | Hardcoded in `composeAssessmentScopeSection()` |

#### Evidence levels for Assessment Scope

**Level 0:** The section text as generated -- companies, query counts, themes, methodology descriptions.

**Level 1:** Query coverage by theme. This extends what the section already does by showing: for each intent theme, how many queries were evaluated and how many produced results. This information exists in `queryThemeBreakdown` but is not currently shown in the scope section. Data:

```
Theme                          | Queries | With Results
-------------------------------|---------|-------------
Compensation & Benefits        | 8       | 8
Culture & Work-Life Balance    | 10      | 9
Engineering Culture            | 6       | 6
Competitor Comparison          | 8       | 7
...
```

**Level 2:** Scan run details. For each scan run that contributed to the report (`metadata.scanRunIds`), show: model used, date, query count, result count, status. This is relevant when multiple scan runs contribute to one report. Data from `ScanRun` records.

**Level 3:** Query list. The actual query text strings evaluated in each theme cluster. Available from `Query.text` joined through `QueryCluster`. This is a due diligence artifact -- it lets a buyer see exactly what AI was asked.

---

### 2C. Visibility Findings

This section (`composeVisibilitySection()`, lines 296-387) makes the report's most consequential claims. It tells the client how visible they are, how that translates to candidate behavior, and how their visibility compares to the top competitor.

#### Claims and evidence mapping

| # | Claim | Source computation | Source data | Evidence trail |
|---|-------|-------------------|-------------|----------------|
| 1 | Overall mention rate and tier | `mentionTier(sc.clientMentionRate)`, `pct()`, `humanFraction()` | `clientMentionRate = results.filter(r => r.mentioned).length / results.length` | Each `ScanResult.mentioned` boolean; the query text that was asked; the AI response text |
| 2 | Mention count ("mentioned in N responses") | Direct | `client.mentionCount` from `EntityMentionStats` | Every `ScanResult` where `mentioned === true` |
| 3 | Weakest theme visibility drop | `queryThemeBreakdown.sort(by mentionRate asc)[0]` | Per-theme `mentionRate` from `QueryThemeStats` | Per-theme scan results |
| 4 | "This is not a projected risk" framing | Static text (conditional on `completedQueries > 0`) | N/A | Included to establish urgency; not a data claim |
| 5 | Visibility prominence interpretation | `visibilityInterpretation(sc.avgVisibilityScore)` | `avgVisibilityScore = avg(results.map(r => r.visibilityScore))` | Each `ScanResult.visibilityScore` from `scoreVisibility()`: keyword proximity + early mention + positive/negative signal detection |
| 6 | Sentiment narrative | `sentimentWord()`, `sentimentImplication()` | `avgSentimentScore = avg(results.map(r => r.sentimentScore))` | Each `ScanResult.sentimentScore` from `scoreSentiment()`: POSITIVE_SIGNALS vs NEGATIVE_SIGNALS word count |
| 7 | Contextual competitor comparison | `visibilityMultiple()`, percentage point gap | `top.mentionRate` vs `sc.clientMentionRate` | Competitor mention data from `ScanResult.metadata.competitorMentions` |

#### Evidence levels for Visibility Findings

**Level 0:** The narrative paragraphs as generated. The current text is strong -- it leads with business interpretation, connects to candidate behavior, and contextualizes the numbers.

**Level 1 (supporting evidence summary):** An evidence panel that accompanies the narrative with:

- **Mention rate breakdown:** A compact visual -- N mentioned / M total queries. Not a chart (too much for Level 1), but a clear fraction. "Mentioned in 16 of 48 queries (33%)."
- **Visibility score context:** The 0-100 score with the tier threshold bands shown. "Score: 42/100. Thresholds: 70+ = prominent positioning, 40-69 = moderate prominence, below 40 = peripheral mention."
- **Sentiment score context:** The -1 to +1 score with the tier boundaries. "+0.15 (slightly positive). Thresholds: above +0.3 = positive, 0 to +0.3 = slightly positive, -0.3 to 0 = slightly negative, below -0.3 = negative."

These summaries let a reader verify the tier classification without needing to see the underlying scan results. They answer the question: "How did you arrive at 'moderate visibility'?"

**Level 2 (detailed evidence):** Per-query evidence. For each query that was evaluated, show:

| Query text | Mentioned? | Visibility score | Sentiment score | AI model | Scan date |
|------------|-----------|-----------------|----------------|----------|-----------|
| "Best tech companies for senior engineers in fintech" | Yes | 55 | +0.3 | Claude 3.5 | 2026-03-15 |
| "Where should I work if I care about work-life balance?" | No | 0 | 0 | Claude 3.5 | 2026-03-15 |

This table lets a buyer scan for the specific queries where they were absent and understand the pattern. It also lets the buyer verify any individual claim ("you said we appear in 33% -- show me which 33%").

Data sources: `ScanResult.mentioned`, `ScanResult.visibilityScore`, `ScanResult.sentimentScore`, `Query.text`, `ScanRun.model`, `ScanResult.createdAt`.

**Level 3 (raw audit trail):** The actual AI response text for individual queries. Available from `ScanResult.response`. This is the "prove it" layer -- a buyer can read exactly what the AI said about them. This is the most sensitive data. It should only be shown on explicit request, never inline.

**Critical design note for Level 3:** The AI response text is the single most powerful evidence artifact in the entire report. When a CHRO reads "Candidates asking AI about work-life balance will not encounter your company," the ability to show them the actual AI response -- where their competitor is recommended and they are not mentioned -- transforms the report from advisory opinion to observable reality. This layer should be available but never forced.

---

### 2D. Competitor Analysis

This section (`composeCompetitorSection()`, lines 389-472) makes comparative claims that are inherently sensitive. Clients will scrutinize competitor data more closely than their own.

#### Claims and evidence mapping

| # | Claim | Source computation | Source data |
|---|-------|-------------------|-------------|
| 1 | Per-competitor mention rate | `pct(c.mentionRate)` for each competitor | `EntityMentionStats.mentionRate = competitorMentions.filter(mentioned).length / results.length` from `computeMentions()` |
| 2 | Percentage point gap vs client | `Math.round((c.mentionRate - sc.clientMentionRate) * 100)` | Subtraction of two computed rates |
| 3 | Visibility multiple ("2.1x more likely") | `visibilityMultiple(competitorRate, clientRate)` | Division of two rates, with floor of 1.05 for "roughly equally" |
| 4 | "Competitors above/below client" grouping | `competitors.filter(c => c.mentionRate > sc.clientMentionRate)` | Direct comparison of rates |
| 5 | "Most significant competitive risk" | Conditional on `top.mentionRate > sc.clientMentionRate` | Top competitor's rate gap |
| 6 | Comparison table | `allEntities.map()` with gap column | All entity mention stats sorted by rate |

#### Evidence levels for Competitor Analysis

**Level 0:** The narrative text and the "Competitive visibility comparison" table. The table already shows company, AI mention rate, mentions, and gap vs client. This is effective as-is.

**Level 1 (supporting evidence summary):** Add two pieces of context to the existing table:

- **Per-competitor query overlap indicator:** For each competitor, how many of the total queries mentioned BOTH the client and the competitor, vs. the competitor alone. This answers the question "are we competing for the same queries?" without overwhelming the table.
  - Data: Cross-reference `ScanResult.mentioned` with `ScanResult.metadata.competitorMentions` per query. For each competitor, count: (a) queries where both are mentioned, (b) queries where only the competitor is mentioned, (c) queries where only the client is mentioned.
  - Presentation: A single column, e.g., "Co-mentioned: 4 of 16 queries" or a ratio.
- **Per-competitor sentiment comparison:** When the client IS mentioned, what is the sentiment in those same responses vs. when the competitor is mentioned? This answers whether the competitor is not just more visible but also better perceived.
  - Data: Average `sentimentScore` for `ScanResult` rows where the competitor is mentioned (from `metadata.competitorMentions`) vs where the client is mentioned.
  - Note: This data exists but is not currently computed. `scan-comparison.ts` would need a per-entity sentiment breakdown. Flag as a future enhancement, not a launch requirement.

**Level 2 (detailed evidence):** Per-competitor query-level detail. For each competitor, the queries where:
- The competitor was mentioned and the client was not (displacement queries)
- The competitor was mentioned and the client was also mentioned (head-to-head queries)
- Neither was mentioned (both absent)

Data: `ScanResult.mentioned` cross-referenced with `ScanResult.metadata.competitorMentions[].mentioned` for each query.

This is high-value evidence for the advisory conversation. When a VP of Talent asks "Where exactly is Apex Cloud beating us?", this table answers it at the query level.

**Level 3 (raw audit trail):** The AI response text for displacement queries -- specifically the queries where the competitor was recommended and the client was absent. These are the most commercially powerful evidence artifacts because they show the client exactly what candidates see when the AI talks about their market but does not talk about them.

---

### 2E. Citation Patterns

This section (`composeCitationSection()`, lines 474-549) explains WHERE AI gets its information. It makes structural claims about the information supply chain that feeds AI employer recommendations.

#### Claims and evidence mapping

| # | Claim | Source computation | Source data |
|---|-------|-------------------|-------------|
| 1 | Total unique citation sources | `citations.totalDomains` | `computeCitations()` builds `allDomains` from union of `clientPresentDomains` and `clientAbsentDomains` |
| 2 | Citation gap count and domains | `citations.gapDomains` | Domains in `clientAbsentDomains` but not in `clientPresentDomains` -- i.e., domains cited ONLY in responses where client was NOT mentioned |
| 3 | Source type classification | `classifySourceType(domain)` | `KNOWN_SOURCE_TYPES` lookup table (17 known domains) + heuristic fallbacks |
| 4 | Top 10 citation landscape | `citations.domainFrequency.slice(0, 10)` | `domainCounts` map built from all `result.citations.map(c => c.domain)` |
| 5 | Gap recommended actions | `gapActionFor(sourceType)` | `GAP_ACTION_TEMPLATES` lookup by source type classification |
| 6 | Client-exclusive domains | `citations.clientExclusiveDomains` | Domains in `clientPresentDomains` but not in `clientAbsentDomains` |
| 7 | Shared/contested domains | `citations.sharedDomains` | Domains in both sets |

#### Evidence levels for Citation Patterns

**Level 0:** The narrative text, the "Citation landscape" table (top 10 domains with source type and citation count), the "Citation gaps" table (gap domains with source type and recommended action), the "Defensible advantages" list, and the "Contested sources" list.

**Level 1 (supporting evidence summary):** Add classification context for each gap domain:

- **Which specific queries cited this domain.** Not the full response, but a count: "glassdoor.com was cited in 7 of 48 queries." This transforms an abstract "gap domain" into a concrete frequency measure.
- **Whether the domain was cited in competitor-mentioned responses.** "glassdoor.com was cited in 5 queries where Apex Cloud was mentioned but [Client] was not." This connects the citation gap to the competitive displacement narrative.

Data: `CitationSource` records joined with `ScanResult` to correlate `domain` presence with `mentioned` status and `metadata.competitorMentions`. This cross-reference exists in the `computeCitations()` function logic (it already partitions by `result.mentioned`) but is not surfaced at the per-domain level.

**Level 2 (detailed evidence):** Per-citation-source detail. For each domain in the citation landscape:

| Domain | Source type | Total citations | Cited when client mentioned | Cited when client absent | Classification |
|--------|------------|----------------|---------------------------|-------------------------|---------------|
| glassdoor.com | Employee review site | 12 | 5 | 7 | Gap |
| linkedin.com | Professional network | 18 | 10 | 8 | Shared |
| payscale.com | Compensation data | 4 | 0 | 4 | Gap |

This table lets the buyer see the full citation picture -- not just which domains are gaps, but the ratio of client-present to client-absent citations for each domain. A domain cited 12 times with a 5/7 split tells a different story than one cited 4 times with a 0/4 split.

**Level 3 (raw audit trail):** For each citation source record: the full `CitationSource` row (url, title, domain, sourceType) linked to the `ScanResult` it came from. This lets a buyer trace: "AI cited glassdoor.com in response to the query 'best tech companies for engineers' -- here is the citation URL, here is the full AI response."

Data: `CitationSource.url`, `CitationSource.title`, joined to `ScanResult.response` and `Query.text`.

---

### 2F. Query Intent Map

This section (`composeQueryIntentMapSection()`, lines 552-643) breaks visibility down by candidate intent theme. It only appears when `queryThemeBreakdown` data is available.

#### Claims and evidence mapping

| # | Claim | Source computation | Source data |
|---|-------|-------------------|-------------|
| 1 | Per-theme mention rate | `pct(t.mentionRate)` | `QueryThemeStats.mentionRate` per cluster |
| 2 | Per-theme status tier | `statusTier(rate)` using thresholds: >=65% Strong, >=40% Moderate, >=20% Weak, <20% Critical gap | Derived from mentionRate |
| 3 | Strongest/weakest theme identification | `sorted[0]` / `sorted[last]` by mentionRate | Sorted queryThemeBreakdown array |
| 4 | Critical gap identification and damage reasoning | `sorted.filter(t => t.mentionRate < 0.2)` + `themeDamageReason` lookup | Static damage reason templates keyed by theme name |
| 5 | Theme-stage narrative ("gaps in early-stage themes mean candidates filter out before reaching later-stage themes") | Static framing text | N/A -- this is advisory interpretation, not a data claim |

#### Evidence levels for Query Intent Map

**Level 0:** The narrative text and the "Visibility by intent theme" table (theme, queries evaluated, client mentioned, mention rate, status).

**Level 1 (supporting evidence summary):** Per-theme competitor comparison. For each intent theme, show not just the client's mention rate but the top competitor's mention rate for the same theme. This lets the buyer see WHERE in the candidate journey the competitive gap is widest.

Data needed: This requires extending `QueryThemeStats` to include per-theme competitor mention rates. Currently, `queryThemeBreakdown` only tracks client mentions per theme. The per-query competitor mention data exists in `ScanResult.metadata.competitorMentions` and can be aggregated by query cluster. Flag as a data enhancement -- not a display problem.

Interim presentation (without the data enhancement): Per-theme query count with a "queries where client was absent" callout. e.g., "Compensation & Benefits: 1 of 8 queries (12%). Client absent from 7 queries in this theme."

**Level 2 (detailed evidence):** Per-theme query list. For each intent theme, the queries evaluated and their individual outcomes:

| Query | Mentioned? | Visibility | Sentiment |
|-------|-----------|-----------|-----------|
| "What is the compensation like at companies in fintech?" | No | 0 | -- |
| "Best paying tech companies for senior engineers" | Yes | 45 | +0.2 |

Data: `Query.text` joined through `QueryCluster` to `ScanResult` for each theme.

**Level 3 (raw audit trail):** The AI response text for each query within a theme, same as Visibility Findings Level 3 but filtered to a single theme.

---

### 2G. Recommendations

Recommendations are covered in depth in Section 5 below. They have their own traceability architecture because they are the most actionable part of the report and require a different evidence framing.

---

## 3. Evidence Presentation Strategy

### 3A. Language that frames evidence effectively

Evidence framing is about CONNECTING the finding to the proof, not about dumping the proof alongside the finding.

**Effective framing patterns:**

| Pattern | Use when | Example |
|---------|----------|---------|
| "Based on [N] evaluated queries..." | Introducing an aggregate metric | "Based on 48 evaluated queries, [Client] appears in 33% of AI responses to candidate employer questions." |
| "This finding reflects..." | Connecting a claim to its data basis | "This finding reflects analysis of 48 AI responses across 6 candidate intent themes, evaluated on March 15, 2026." |
| "Specifically, [evidence detail]" | Drilling into a claim without leaving the narrative | "Apex Cloud holds a 16-point advantage. Specifically, Apex Cloud appeared in 24 of 48 queries while [Client] appeared in 16." |
| "[N] of [M] queries [verb]" | Making a rate tangible | "7 of 8 compensation-related queries returned AI responses that did not mention [Client]." |
| "In queries about [theme]..." | Connecting evidence to candidate behavior | "In queries about compensation and benefits -- the stage where candidates are comparing offers -- [Client] appeared just once." |

**Framing to avoid:**

| Pattern | Why it fails | Better alternative |
|---------|-------------|-------------------|
| "The data shows..." | Sounds like a system reporting its output, not a strategic finding | "This assessment found..." or just state the finding directly |
| "Raw data available upon request" | Signals low confidence; makes the buyer do the work | Build the evidence into the progressive disclosure layers so it is available on demand |
| "According to our analysis..." | Filler that adds no information | Remove. Lead with the finding. |
| "We observed that..." | Passive, academic tone | Active: "AI models consistently [verb]..." or "[Client] [verb]..." |
| "Results indicate..." | Hedging language that undermines credibility | Commit to the finding: "[Client] has limited visibility in..." not "Results indicate limited visibility" |

### 3B. Handling contradictory evidence

Contradictory evidence is common. A company might have strong visibility in culture queries but minimal visibility in compensation queries. The report already handles this well in the Query Intent Map section. The traceability layer should make contradictions easier to understand, not harder.

**Principle: Contradictions are NOT weaknesses. They are the most actionable findings.**

When visibility is inconsistent across themes, the traceability framing should be:

> "[Client] has uneven visibility across candidate intent themes. Visibility is strong in culture and reputation queries (67% mention rate), where AI models consistently surface [Client] as a recommended employer. However, in compensation and hiring process queries, visibility drops to 12% -- meaning candidates who move from general interest to active comparison encounter [Client] in early research but lose sight of it at the decision stage."

The evidence at Level 1 for contradictions: a two-column comparison.

```
Strongest themes:                    Weakest themes:
Culture & Work-Life: 67% (Strong)   Compensation & Benefits: 12% (Critical gap)
Engineering Culture: 55% (Moderate) Competitor Comparison: 18% (Weak)
```

At Level 2: the specific queries in each category, showing what the buyer CAN see vs. what they CANNOT.

**What NOT to do with contradictory evidence:**
- Do not average across themes and present only the average. This hides the most actionable signal.
- Do not present contradictions as uncertainty about the finding. The finding IS the contradiction.
- Do not hedge: "Results are mixed" is meaningless. "Strong in culture queries, absent in compensation queries" is useful.

### 3C. Framing low-confidence findings honestly

Low confidence happens in two scenarios:

1. **Low sample size.** A theme with 3 queries and a 33% mention rate (1 of 3) is less reliable than a theme with 12 queries and a 33% rate (4 of 12).
2. **Heuristic scoring limitations.** Visibility scores (0-100) and sentiment scores (-1 to +1) come from keyword-proximity heuristics in `scan-analysis.ts`, not from validated NLP models.

**Principle: Be precise about what you know and what you are estimating. Do not use uncertainty language -- use scope language.**

Weak framing (sounds uncertain):
> "Our analysis suggests that [Client] may have limited visibility, though results should be interpreted with caution given the sample size."

Strong framing (scopes the finding):
> "Across the 6 compensation-related queries evaluated, [Client] appeared once. While 6 queries is a focused sample, the pattern is consistent: AI models responding to compensation questions do not reference [Client]."

For heuristic scoring, the Assessment Scope section already explains the methodology. The traceability layer does not need to repeat scoring caveats on every finding. Instead:

- The visibility score should always be shown WITH the query count: "42/100 visibility score (based on 48 queries)."
- The sentiment score should always be shown WITH the word: "+0.15 (slightly positive)."
- If fewer than 5 queries contribute to a theme's score, the Level 1 evidence should note: "Based on [N] queries -- a focused sample for this theme."

For findings based on fewer than 3 data points, the system should NOT suppress the finding. It should scope it. A single query where the client is absent from a compensation question is still evidence. It should be framed as: "In the compensation query evaluated, [Client] did not appear" -- not "33% mention rate in compensation queries."

### 3D. Transparency vs. polish -- the right balance

The balance depends on the audience layer:

| Layer | Audience | Transparency level | Polish level |
|-------|----------|-------------------|-------------|
| Level 0 (report narrative) | Executive reader (CHRO, CPO) | Low transparency, high interpretation. Numbers are contextualized, not raw. | Maximum polish. Every sentence should sound like it came from a senior advisor. |
| Level 1 (evidence summary) | Engaged stakeholder (VP TA, Head of Employer Brand) | Medium transparency. Show the metrics with their thresholds and context. Let the reader verify the classification. | High polish. Clean formatting, clear labels, no jargon. |
| Level 2 (detailed evidence) | Analytical stakeholder or internal team | High transparency. Show per-query breakdowns, per-competitor detail, per-domain citation maps. | Moderate polish. Tables and structured data. Clarity over elegance. |
| Level 3 (raw audit trail) | Due diligence, legal review, or "prove it" moments | Maximum transparency. The actual AI response text. | Minimal polish. This is raw evidence. Present it clearly but do not interpret it. |

The report should never feel like it is hiding anything. The progressive disclosure layers exist so that MORE evidence is always available, but the reader does not need to process it to understand the finding.

---

## 4. Evidence Hierarchy

### Level 0: The Polished Report Claim

**What is shown:** The narrative text generated by `composeReport()`. Paragraphs, tables, and bullet points that tell a strategic story. Numbers are always contextualized ("33% mention rate -- roughly one in three queries") rather than raw.

**Who reads it:** The executive sponsor. The person who signs the check. The person who has 10 minutes and needs to understand "do we have a problem and what should we do about it?"

**Why it matters:** This is the selling surface. If Level 0 is not compelling on its own, the traceability layers are irrelevant. Level 0 must stand alone as a complete, credible deliverable.

**What it must NOT include:** Query IDs, scan run identifiers, score calculation details, technical methodology beyond the Scope section. No system language. No hedging. No raw data.

### Level 1: Supporting Evidence Summary

**What is shown:** Compact evidence panels that appear alongside the Level 0 narrative. Each panel provides the numbers, thresholds, and brief context that let a reader verify the Level 0 claim without drilling into raw data.

Specific Level 1 artifacts per section:

| Section | Level 1 artifact |
|---------|-----------------|
| Executive Summary | "Assessment at a glance" metrics card (mention rate, top competitor gap, citation gaps, sentiment, query count) |
| Assessment Scope | Per-theme query coverage table |
| Visibility Findings | Mention rate fraction (N/M), visibility score with tier thresholds, sentiment score with tier boundaries |
| Competitor Analysis | Per-competitor co-mention counts, displacement query counts |
| Citation Patterns | Per-gap-domain citation frequency and competitor-correlation count |
| Query Intent Map | Per-theme "absent from N of M queries" callout |
| Recommendations | "Based on" evidence link (which section finding triggered the recommendation) |

**Who reads it:** The engaged VP or Head of function who will own the response. The person who needs to answer their boss's questions about the report. The Antellion advisor delivering the report walkthrough.

**Why it matters:** Level 1 bridges the gap between "I believe the finding" and "I can defend the finding to my leadership team." It gives the buyer ammunition for internal advocacy without requiring them to become a data analyst.

**Implementation note for the dashboard:** Level 1 evidence should be visible by default in the dashboard view (always shown alongside sections). In the export view, it can be shown as sidebar callouts or inline summary blocks.

### Level 2: Detailed Evidence

**What is shown:** Per-query, per-competitor, or per-domain breakdowns that validate specific Level 0 claims. Structured tables with filterable columns.

Specific Level 2 artifacts per section:

| Section | Level 2 artifact |
|---------|-----------------|
| Visibility Findings | Per-query results table (query text, mentioned?, visibility score, sentiment score, AI model, date) |
| Competitor Analysis | Per-competitor displacement matrix (which queries mentioned competitor but not client) |
| Citation Patterns | Full citation frequency table with client-present/client-absent split per domain |
| Query Intent Map | Per-theme query list with individual outcomes |

**Who reads it:** The internal analytics team. The employer brand manager who needs to plan specific content actions. The Antellion customer success team preparing for the advisory call.

**Why it matters:** Level 2 is where traceability becomes operational. It turns the report from "here is what is wrong" into "here is exactly where each problem occurs." This is the layer that justifies the $10K price -- the client is getting data they cannot get anywhere else.

**Implementation note for the dashboard:** Level 2 should be accessible via expand/drill-down from Level 1 artifacts. It should never be shown by default -- it is opt-in detail.

### Level 3: Raw Audit Trail

**What is shown:** The actual AI response text (`ScanResult.response`), full citation URLs (`CitationSource.url`, `CitationSource.title`), and scan execution metadata (model, date, token count, latency).

**Who reads it:** Due diligence reviewers. Legal teams at enterprise clients. Procurement teams validating the deliverable. Internal QA before publication.

**Why it matters:** This is the "prove it" layer. Its existence -- even if rarely accessed -- signals to enterprise buyers that Antellion's findings are based on observable, auditable evidence, not black-box analysis. The fact that this layer exists may matter more than how often anyone reads it.

**Implementation note:** In the dashboard, Level 3 should be accessible through a "View AI response" action on individual scan results at Level 2. It should not be reachable directly from Level 0 -- the reader must pass through Level 1 and Level 2 to get context before seeing raw responses. This prevents the "dump of text" problem.

**Print/export handling:** Level 3 is NOT included in the standard export. It is available as a separate "Evidence Appendix" export that the client can request. See Section 7.

---

## 5. Traceability for Recommendations

Recommendations are generated by `generateRecommendations()` (lines 647-768) and enriched by `enrichTopRecommendations()` (lines 772-882). They are the most actionable part of the report and the part most likely to be challenged.

### 5A. What evidence triggers each recommendation

| Recommendation | Trigger condition | Source data | Evidence chain |
|---------------|-------------------|-------------|---------------|
| **Close citation gaps** | `sc.citations.gapDomains.length > 0` | `CitationAnalysis.gapDomains` -- domains cited only in responses where client was NOT mentioned | `ScanResult.mentioned === false` + `CitationSource.domain` for those results -> gap domain list -> recommendation |
| **Strengthen competitive positioning** | `top.mentionRate > sc.clientMentionRate` (top competitor has higher rate) | `EntityMentionStats` for top competitor vs client | `computeMentions()` aggregation -> rate comparison -> gap calculation -> recommendation |
| **Increase employer brand signal density** | `sc.clientMentionRate < 0.5 && sc.completedQueries > 0` | `clientMentionRate` | Rate below 50% threshold -> recommendation |
| **Build technical content presence** | No BLOG_POST or SOCIAL_PROFILE in `contentAssetTypes` | `ContentAsset` records for the client, filtered to those types | Absence of content asset types -> recommendation |
| **Address negative AI sentiment** | `sc.avgSentimentScore < 0` | `avgSentimentScore` from `ScanComparisonResult` | Average of per-result `sentimentScore` values -> negative average -> recommendation |
| **Publish a structured careers page** | No CAREERS_PAGE in `contentAssetTypes` and `completedQueries > 0` | `ContentAsset` records | Absence of CAREERS_PAGE asset type -> recommendation |

### 5B. How evidence should justify the priority

Each recommendation has a `priority` field (CRITICAL, HIGH, MEDIUM, LOW). The priority logic is embedded in the trigger conditions:

| Recommendation | Priority logic | Evidence that justifies it |
|---------------|---------------|---------------------------|
| Citation gaps | HIGH if `gapDomains.length > 3`, MEDIUM otherwise | "4 citation gaps found" -- the count directly determines priority. Level 1 evidence: the list of gap domains with their citation frequency. |
| Competitive positioning | CRITICAL if gap > 30pp, HIGH otherwise | "Apex Cloud leads by 34 percentage points" -- the gap size determines priority. Level 1 evidence: the competitor comparison table. |
| Employer brand density | CRITICAL if `clientMentionRate < 0.3`, HIGH otherwise | "17% mention rate" -- below the 30% critical threshold. Level 1 evidence: the mention rate fraction and the tier classification. |
| Technical content | Always MEDIUM | Based on content asset absence, not severity of impact. Level 1 evidence: the content asset audit showing no blog or social profiles. |
| Negative sentiment | HIGH if `avgSentimentScore < -0.3`, MEDIUM otherwise | "-0.4 sentiment score" -- below the -0.3 threshold. Level 1 evidence: the sentiment score with the interpretation. |
| Careers page | Always HIGH | Based on content asset absence (CAREERS_PAGE specifically). Level 1 evidence: the content asset audit. |

**Traceability framing for priority:**

Each enriched recommendation already has a `rationale` field (generated by `enrichTopRecommendations()`) that connects the recommendation to the finding. The traceability layer should make this connection explicit and verifiable:

> **Based on:** Citation Patterns (Section 4) -- 4 sources cite competitors but not [Client]
> **Priority driver:** Gap count exceeds threshold of 3 (HIGH)
> **Supporting data:** glassdoor.com (7 citations), payscale.com (4 citations), builtin.com (3 citations), levels.fyi (2 citations)

This "Based on" link is the single most important traceability artifact for recommendations. It answers the question "Why should we do this first?" with a pointer to the evidence, not just an assertion.

### 5C. How impact and effort claims should be backed up

The `impact` and `effort` fields are currently the weakest evidence claims in the report. They contain advisory language that is not directly derivable from scan data.

**Impact claims:**

Current impact text uses phrases like "Based on assessment benchmarks, establishing presence on gap platforms typically improves theme-level mention rates by 15-25 percentage points within two quarterly scan cycles." This is a benchmark claim. It is credible if the buyer trusts Antellion's assessment experience. It is unverifiable from the report data alone.

Traceability approach for impact:
- **What CAN be traced:** The specific finding that the recommendation addresses. "Each citation gap represents a source where AI models already retrieve employer information but find nothing about [Client]" -- this is traceable to the citation analysis.
- **What CANNOT be traced from this report alone:** Cross-client benchmark data ("typically improves by 15-25 percentage points"). This is a product-level claim based on aggregate assessment results.
- **Recommended framing:** Separate the traceable impact from the benchmark claim. The traceable part goes in the evidence link. The benchmark part is labeled as a Antellion benchmark: "Antellion benchmark: Clients who close 3+ citation gaps typically see 15-25pp improvement within two scan cycles." This signals that the benchmark is based on institutional knowledge, not this specific assessment.

**Effort claims:**

Effort estimates are advisory and not derivable from scan data. They are professional judgment about implementation complexity. The traceability system should not pretend these are data-driven.

Traceability approach for effort:
- Present effort estimates as what they are: "Estimated effort based on typical implementation timelines."
- Do NOT try to trace effort claims back to scan data. Effort is advisory, and framing it otherwise would be dishonest.
- The enriched `effortDetail` field (e.g., "Profile audit and prioritization: 1-2 weeks. Profile creation and content: 2-4 weeks.") is already the right level of specificity. It does not need an evidence layer -- it needs to be clearly labeled as an estimate.

---

## 6. Anti-Patterns to Avoid

### 6A. Over-disclosure that drowns the insight

**The pattern:** Showing Level 2 or Level 3 evidence inline with Level 0 narrative. Embedding query-level data tables directly in the report body. Treating more data as more trust.

**Why it fails:** Enterprise executives do not build trust by reading more data. They build trust from three signals: (1) the finding makes intuitive sense, (2) the methodology is credible, (3) more detail is available if they want it. Forcing detail on them signals that the product does not trust its own findings.

**The rule:** Level 0 is the report. Level 1 is always-available context. Level 2 and Level 3 are opt-in. The default state should be clean and interpretive. If a reader has to scroll past tables of query results to read the next finding, the traceability system has failed.

### 6B. Raw data dumps that look like an excuse

**The pattern:** When a finding is weak or surprising, responding with a wall of supporting data. "We know this seems low, but here are all 48 query results showing..."

**Why it fails:** Data dumps in response to weak findings signal defensiveness. The buyer reads it as "they know this is wrong but they are trying to prove it with volume."

**The rule:** Weak findings get scoping language (see Section 3C), not more data. The evidence layers exist for readers who WANT to verify, not as a defense mechanism for findings that need explaining. If a finding cannot be stated confidently in one sentence, the finding should be reframed, not buried in evidence.

### 6C. Confidence language that sounds uncertain rather than measured

**The pattern:** "Our analysis suggests..." "Results may indicate..." "It is possible that..." "This could mean..."

**Why it fails:** Hedging language undermines the entire report. The buyer paid $10K+ for a definitive assessment, not a hypothesis. If Antellion hedges, the buyer wonders what they are paying for.

**The rule:** State findings directly. "33% mention rate indicates limited visibility" -- not "33% mention rate may suggest limited visibility." Use scope language when precision matters: "Across the 48 queries evaluated" is precise and honest. "Results may indicate" is imprecise and reads as uncertain.

**Exception:** Forward-looking statements about impact should be explicitly marked as projections: "Closing these gaps is expected to improve mention rates" is fine. The word "expected" applied to a future outcome is honest. The word "suggests" applied to a current finding is weak.

### 6D. Evidence that contradicts the finding without explanation

**The pattern:** The report says "limited visibility in compensation queries" but the Level 2 evidence shows that 2 of 3 compensation queries actually DID mention the client (67%). This happens when small sample sizes produce volatile rates, or when theme groupings capture edge cases.

**Why it fails:** The buyer catches the contradiction, loses trust in the whole report, and wonders what else is wrong.

**The rule:** The traceability system must ensure that Level 2 evidence is directionally consistent with Level 0 claims. If the data contradicts the narrative, the narrative needs to change -- the evidence should never be hidden. The QA system (designed separately) is responsible for catching these inconsistencies before publication. The traceability system is responsible for presenting evidence that supports the published finding, not evidence that undermines it.

**Practical implementation:** When evidence at Level 2 shows a finding based on a small sample (N < 5), the Level 1 evidence summary should include the sample size prominently: "Based on 3 compensation queries." This sets the reader's expectations before they see the detail. If 2 of 3 queries show a mention but the theme is classified as "weak," the Level 1 should explain: "1 of 3 queries (33% mention rate). Note: This theme had fewer evaluated queries than other themes."

### 6E. Treating all evidence as equally important

**The pattern:** Every section gets the same depth of evidence. The citation landscape table gets the same treatment as the competitive displacement analysis. Minor findings get the same evidence architecture as critical findings.

**Why it fails:** Evidence emphasis should follow finding severity. A critical competitive gap with a 34-point lead deserves rich evidence. A minor sentiment finding based on keyword heuristics does not. Treating them equally dilutes the impact of the important findings and makes the less-important findings look overblown.

**The rule:** Evidence depth should correlate with finding severity and recommendation priority. CRITICAL and HIGH findings should have robust Level 1 and Level 2 evidence. MEDIUM findings should have solid Level 1. LOW and informational findings need only Level 0 with optional Level 1.

### 6F. Showing evidence without the "so what"

**The pattern:** A Level 2 table showing 48 query results with mentioned/not-mentioned status, but no summary of what the pattern means.

**Why it fails:** Raw evidence without interpretation forces the reader to do the analysis. If the reader wanted to do the analysis, they would not have hired Antellion.

**The rule:** Every Level 2 evidence view should open with a one-sentence summary of what the evidence shows. The summary goes ABOVE the detail, not below. Example: "Of 8 compensation queries, [Client] appeared in 1. The 7 absent queries all referenced [Competitor] -- indicating AI models consistently recommend [Competitor] for compensation inquiries while omitting [Client]."

---

## 7. Export/Print Considerations

### 7A. What evidence should be inline vs. appendix

The printed/PDF report has no expand/collapse. Every piece of information is either on the page or it is not. The design must decide what is part of the main flow and what goes in an optional appendix.

**Main report body (always included in export):**

| Content | Level | Rationale |
|---------|-------|-----------|
| Narrative text for all sections | Level 0 | The core deliverable |
| Assessment at a Glance metrics | Level 1 | Essential context for the executive summary; fits in a sidebar or callout box |
| Competitive comparison table | Level 0 | Already part of the section; serves as both narrative and evidence |
| Citation landscape table (top 10) | Level 0 | Already part of the section |
| Citation gaps table | Level 0 | Already part of the section |
| Visibility by intent theme table | Level 0 | Already part of the section |
| Recommendation rationale, actions, effort detail (top 3) | Level 0 | Already rendered as enriched recommendation cards |

**Evidence sidebar (included in export, lighter treatment):**

| Content | Level | Rationale |
|---------|-------|-----------|
| Mention rate fraction (N of M) per section | Level 1 | Compact enough to fit in a margin note or sidebar callout |
| Score thresholds for visibility and sentiment | Level 1 | One-time sidebar in the Visibility Findings section, not repeated |
| Per-recommendation "Based on" section reference | Level 1 | A single line per recommendation, e.g., "Based on: Citation Patterns (Section 4)" |

**Evidence appendix (optional, separate export):**

| Content | Level | Rationale |
|---------|-------|-----------|
| Per-query results table | Level 2 | Too dense for main flow; breaks the narrative arc |
| Per-competitor displacement matrix | Level 2 | Valuable but operational, not executive |
| Full citation frequency table with client-present/absent split | Level 2 | More detail than the main flow can support |
| Per-theme query list with individual outcomes | Level 2 | Operational detail |
| AI response text excerpts | Level 3 | Raw evidence; never in main flow |
| Full scan metadata (model, date, tokens, latency per result) | Level 3 | Audit artifact only |

### 7B. How to handle expandable content in a flat medium

The printed report cannot expand and collapse. Three strategies for handling progressive disclosure in print:

**Strategy 1: Appendix references.** The main report body contains a footnote-style reference: "See Evidence Appendix, Table E-2 for per-query results." The appendix is a separate section at the end (or a separate document entirely). This is the standard consulting-report approach and is familiar to enterprise buyers.

**Strategy 2: Sidebar callouts.** Level 1 evidence appears in a visually distinct callout box alongside the relevant narrative. The callout uses a different background color or border treatment. This keeps the evidence close to the claim without interrupting the narrative flow. The current export page structure (max-w-3xl single column) can accommodate narrow sidebar callouts or full-width callout blocks between paragraphs.

**Strategy 3: Section summary cards.** Each section ends with a compact "Evidence basis" card that lists: data points used (N queries, M competitors, P citation sources), thresholds applied, and a pointer to the appendix for detail. This is a compromise between inline evidence and separate appendix.

**Recommended approach for the initial implementation:**

Use Strategy 2 (sidebar callouts) for Level 1 evidence and Strategy 1 (appendix references) for Level 2 and Level 3. This keeps the main report body clean and credible while making verification possible. The appendix is opt-in -- the client can request it, and Antellion can generate it from the same data.

### 7C. Right evidence density for a printed report

The current export renders at approximately 8-12 pages for a typical assessment (cover + summary + 4-5 sections + recommendations). Adding Level 1 evidence should add no more than 1-2 pages of sidebar/callout content. The report should not exceed 15 pages in the main body.

The evidence appendix, if requested, can be as long as needed. It is a reference document, not a narrative. Enterprise buyers are accustomed to 5-page executive reports backed by 30-page appendices.

**Density guidelines:**

| Section | Max additional evidence (print) | Format |
|---------|-------------------------------|--------|
| Executive Summary | 1 sidebar card (Assessment at a Glance) | 4-5 metrics in a bordered box |
| Assessment Scope | 0 additional (section IS the evidence) | N/A |
| Visibility Findings | 1 callout block (score thresholds + mention fraction) | 3 lines in a gray box |
| Competitor Analysis | 0 additional (table IS the evidence) | N/A |
| Citation Patterns | 0-1 callout (gap frequency note if gaps exist) | 1-2 lines per gap domain |
| Query Intent Map | 0 additional (table IS the evidence) | N/A |
| Recommendations | 1 line per recommendation ("Based on: Section N") | Inline text, not a box |

---

## 8. Implementation Priorities

This design should be implemented in phases to avoid scope creep while delivering value early.

### Phase 1: Level 1 evidence (highest value, lowest complexity)

- Add "Assessment at a Glance" metrics card to the executive summary
- Add mention rate fraction (N of M) to visibility findings
- Add score threshold context to visibility and sentiment scores
- Add "Based on" section references to each recommendation
- Add per-gap-domain citation frequency counts to the citation patterns section

All of this data already exists in `ScanComparisonResult` and the composed report. No new data queries or schema changes are needed. The frontend engineer needs the data passed through `ReportSection` or `ReportSubsection` structures.

### Phase 2: Level 2 evidence in the dashboard

- Per-query results table (requires fetching `ScanResult` + `Query` records for the report's scan runs)
- Per-competitor displacement matrix (requires cross-referencing `mentioned` with `competitorMentions` per query)
- Full citation frequency table with client-present/absent split per domain

This requires new data fetching in the dashboard page. The export page does NOT need this -- it remains at Level 0 + Level 1.

### Phase 3: Level 3 evidence and evidence appendix export

- "View AI response" action on individual scan results in the dashboard
- Evidence appendix export as a separate document
- Per-theme competitor mention rate comparison (requires extending `QueryThemeStats`)

This phase depends on the analyst workflow being in place, because raw AI responses should only be visible to authorized users.

### Data changes needed

| Change | Phase | Impact |
|--------|-------|--------|
| Extend `ReportSubsection` type to support evidence callout data (e.g., an `evidence` field with structured metadata) | Phase 1 | TypeScript types in `report-composer.ts` |
| Pass `ScanResult` IDs through to the composed report (currently only aggregated data is passed) | Phase 2 | `ReportInput` and `Report.metadata` |
| Extend `QueryThemeStats` to include per-theme competitor mention rates | Phase 3 | `report-composer.ts` data flow, requires scan result cross-referencing |
| Add per-entity sentiment breakdown to `ScanComparisonResult` | Phase 3 | `scan-comparison.ts` |

---

## 9. Summary

The traceability system is not about exposing more data. It is about building a confidence chain from claim to evidence that the buyer can follow at their own pace. The four-level hierarchy (polished claim, supporting context, detailed evidence, raw audit trail) maps to four distinct audience needs and four trust-building moments.

The most important design decisions:

1. **Level 1 is always visible in the dashboard.** Evidence context should not be hidden behind a click. The buyer should see the support alongside the finding.
2. **Level 2 is opt-in.** Detail on demand, never forced. The reader must choose to drill down.
3. **Level 3 exists but is never inline.** Its existence builds trust. Forcing it into the flow destroys trust.
4. **Evidence framing follows finding severity.** Critical findings get rich evidence. Minor findings get scope context.
5. **Print exports include Level 0 + Level 1 only.** Level 2 and Level 3 go in a separate appendix, available on request.
6. **Every Level 2 view opens with a one-sentence summary.** Evidence without interpretation is raw data, not evidence.

The goal is not transparency for its own sake. The goal is to make every claim in the report feel grounded, verifiable, and worth the price.
