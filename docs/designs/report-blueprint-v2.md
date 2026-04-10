# Report Blueprint v2: Candidate Decision Journey Diagnostic

**Status:** Design specification
**Author:** Report PM
**Date:** March 27, 2026
**Replaces:** Current report-composer.ts output structure
**Depends on:** candidate-decision-journey-design.md (stage framework), scan-comparison.ts (data layer), confidence/scoring.ts (hedging)

---

## Design Intent

The current report is technically strong. It computes real data, hedges appropriately, and produces defensible claims. But it reads like an analysis tool generated it -- not like a senior strategist wrote it for a CHRO. The problem is structural: the report is organized by *what the system computed* (visibility findings, competitor analysis, citation patterns) rather than *what the buyer needs to understand* (where candidates are lost, who is winning, what to do about it).

This blueprint redesigns the report around the candidate decision journey. The narrative backbone is a funnel: Discovery, Consideration, Evaluation, Commitment. Every section either establishes the funnel story, deepens it, or tells the buyer what to do about it.

The report must be strong enough that a VP of Talent Acquisition reads the executive summary and calls a meeting. It must be detailed enough that the meeting produces specific next steps. It must be credible enough that the buyer trusts Antellion to monitor progress over time.

---

## Part 1: Overall Language and Tone Guide

### Voice

The report is written in the voice of a senior advisor who has reviewed the evidence and is explaining the findings to an executive peer. Not a consultant who hedges everything. Not a system that recites data. A strategist who has an opinion backed by evidence.

**Register:** Professional but direct. Closer to McKinsey than to Gartner. No filler, no throat-clearing, no "it is important to note that." Every sentence advances the argument.

**Person:** Third person for findings ("Meridian Technologies appears in..."). No first person plural ("we found"). The report is a document, not a conversation. Exception: the methodology section uses "this assessment" as the subject, which gives it institutional authority without making it personal.

**Tense:** Present tense for current state ("Meridian is invisible at the Evaluation stage"). Past tense only for what was done ("This assessment evaluated 36 queries"). Future tense only in recommendations ("Publishing salary data will close...").

### How to Deliver Bad News

Every client has gaps. The report should not apologize for the findings or soften them into meaninglessness. But it should frame every problem as fixable and every gap as an opportunity.

**Pattern:** State the problem plainly. Quantify the impact. Immediately follow with what can be done.

Good: "Meridian is functionally invisible when candidates compare employers on compensation -- a 17% mention rate at the Evaluation stage. This is the single largest pipeline break identified in this assessment. Publishing salary data on Levels.fyi and Glassdoor is the highest-leverage action available."

Bad: "There may be some room for improvement in the compensation area, where mention rates are somewhat lower than in other categories."

### Creating Urgency Without Alarm

The report establishes urgency through specificity, not through scare language. "Your employer brand is at risk" is generic and ignorable. "Candidates comparing you to Apex on compensation never see you in the AI response" is specific and actionable.

**Rules:**
- Never use "at risk" or "concerning" without a specific quantified consequence
- Never use "should consider" -- use "should" or provide a specific recommendation
- Replace "may impact" with "reduces" or "prevents"
- Use competitor names, not "competitors" generically
- Use stage names, not "earlier in the funnel"

### Numbers vs. Narrative vs. Visual

- **Numbers** belong in tables and in parenthetical citations within narrative. Never open a sentence with a statistic.
- **Narrative** carries the business argument. Every paragraph should make a claim, support it, and state the implication.
- **Tables** are for comparison and reference. A table should be scannable in 5 seconds. Never put narrative in a table cell.

### Language to Avoid

| Do Not Write | Write Instead | Why |
|---|---|---|
| "It is important to note that..." | (delete -- just state it) | Throat-clearing. The reader decides importance. |
| "This suggests that..." | "This means..." | Weak hedge that undermines credibility |
| "There may be opportunities to..." | "The highest-priority action is..." | Vague non-recommendation |
| "Employer brand optimization" | "Strengthening how AI describes you to candidates" | Jargon that sounds like SEO |
| "Leverage your existing..." | "Build on..." | Consultant cliche |
| "In today's competitive landscape..." | (delete entirely) | Generic filler |
| "Best practices suggest..." | (cite the specific finding instead) | Appeals to authority instead of evidence |
| "Consider implementing..." | "Publish salary data on Levels.fyi within 30 days" | Vague vs. specific |
| "Moderate visibility" | "Visible in roughly half of candidate queries" | Label vs. meaning |
| "Stakeholders" | Name the role: "VP of TA", "hiring managers", "candidates" | Abstraction that loses the reader |

### Section Transitions

Every section ends with a sentence that leads to the next section. This creates connective tissue so the report reads as a single argument, not a series of disconnected analyses.

**Pattern:** The last sentence of each section should name the question the next section answers.

Example (end of Executive Summary): "The following sections map exactly where in the candidate journey this pipeline breaks, which competitors are winning at each stage, and what Meridian should do first."

Example (end of Decision Journey Visibility): "The next section examines which specific competitors are displacing Meridian at each stage -- and by how much."

---

## Part 2: Section-by-Section Blueprint

### Cover Page

**Document title:** "AI Employer Visibility Assessment"
**Subtitle:** "[Client Name] -- Candidate Decision Journey Diagnostic"
**Assessment date:** Month Year
**Confidentiality line:** "Confidential -- prepared exclusively for [Client Name] leadership."
**Client details:** Name, domain, industry (if available)
**Logo:** Client logo (if provided)

**Design note:** The subtitle change matters. "Candidate Decision Journey Diagnostic" signals that this is about the buyer's funnel, not about an abstract visibility score. It primes the reader for the journey framework before they turn the page.

---

### Section 1: Executive Summary

**Heading:** "Executive Summary"

**Purpose:** Answer the question: "Should I be worried, and what is the single most important thing I need to know?"

**Opening sentence template:**

The first sentence must create a reaction. It must not be a statistic. It must be a finding with a business consequence.

Template (when an Evaluation gap exists):
> "[Client] has a broken candidate pipeline in AI-driven employer discovery. Candidates who find [Client] through AI research encounter it [Discovery rate], form a reasonable impression ([Consideration] rate), but then disappear at the exact stage where they compare employers and make decisions -- [Evaluation rate]. The pipeline does not leak evenly. It collapses where hiring decisions are made."

Template (when Discovery is the main gap):
> "Most candidates who research employers through AI never learn [Client] exists. At a [Discovery rate] Discovery rate, [Client] is absent from the majority of AI-generated employer lists -- meaning candidates build their shortlists from competitors before [Client] ever enters the conversation."

Template (when client leads):
> "[Client] holds the strongest AI visibility position among all assessed competitors. But the lead is uneven: [strongest stage] visibility anchors the position while [weakest stage] represents the highest-risk gap that competitors can exploit."

**Body structure:**

1. **Opening paragraph** (3-4 sentences): The funnel story. Stage-by-stage rates in a single narrative flow. End with the business consequence.

2. **Journey snapshot** (inline mini-table): Four columns, one row. Discovery | Consideration | Evaluation | Commitment with rates and status indicators. This is the "napkin sketch" the VP can photograph and share in Slack.

3. **Key findings** (3-5 bullets): Each bullet is one sentence with one number and one business implication. Lead with the finding, not the category label.

4. **Competitive anchor** (1-2 sentences): Name the top competitor, the stage where they win most, and the multiplier. "At the Evaluation stage, Apex is 4.4x more visible than Meridian -- candidates comparing employers encounter Apex in three of four AI responses while Meridian appears in fewer than one in five."

5. **Recommendation preview** (1-2 sentences): Number of recommendations, number at CRITICAL/HIGH priority, and the single highest-priority action stated as a verb phrase.

6. **Forward pointer** (1 sentence): "The following sections map exactly where this pipeline breaks, which competitors win at each stage, and what to do first."

**Data sources:**
- `ScanComparisonResult.clientMentionRate` (overall)
- Per-stage `clientMentionRate` from `stageBreakdown` (when available) or approximated from `queryThemeBreakdown`
- `EntityMentionStats` for competitor names and rates
- `CitationAnalysis.gapDomains.length`
- `recommendations[0]` for preview

**Confidence hedging:**
- HIGH: Assert directly. No qualifiers.
- MEDIUM: Prefix the opening sentence with "Based on [N] evaluated candidate queries, " -- then assert.
- LOW: Open with "Preliminary findings from a limited assessment indicate..." and add a data quality note at the end of the summary.

The hedge should appear once, at the opening, not repeated on every claim. Repeating the hedge undermines authority.

**Example passage (Meridian Technologies):**

> Meridian Technologies has a broken candidate pipeline in AI-driven employer discovery. Candidates who research employers through AI encounter Meridian about half the time during initial Discovery (50% mention rate), and those who search for Meridian by name find a reasonable company profile (Consideration: 67%). But when candidates compare employers on compensation, culture, and fit -- the Evaluation stage where hiring decisions are actually made -- Meridian is functionally invisible (17% mention rate). The pipeline does not leak evenly. It collapses at the comparison stage.
>
> | Discovery | Consideration | Evaluation | Commitment |
> |---|---|---|---|
> | 50% -- Moderate | 67% -- Moderate | 17% -- Critical Gap | 83% -- Strong |
>
> Key findings:
>
> - **Critical Evaluation gap (17% mention rate):** When candidates compare employers on compensation and culture, Meridian appears in fewer than one in five AI responses -- a 58pp deficit vs. Apex Cloud Systems at the exact stage where candidates make decisions
> - **28pp overall visibility gap vs. Apex:** Apex appears in 75% of all candidate queries, making candidates 1.6x more likely to encounter Apex before Meridian
> - **7 citation gaps on named platforms:** AI models cite Levels.fyi, Built In, Comparably, and 4 other sources when recommending competitors but find no Meridian content on these platforms
> - **Compensation data absence is the primary pipeline break:** The 17% Evaluation rate is driven by missing salary and equity data on the platforms AI cites for head-to-head comparisons
> - **Commitment stage is a strength (83%):** Candidates who make it to the application stage find detailed, positive information about Meridian's interview process -- the problem is that too few candidates reach this stage
>
> At the Evaluation stage, Apex Cloud Systems is 4.4x more visible than Meridian. Candidates comparing employers encounter Apex in three of four AI responses. Meridian appears in fewer than one in five.
>
> This assessment identifies 6 prioritized recommendations, 2 requiring immediate attention. The highest-priority action is to publish salary and equity data on Levels.fyi and Glassdoor within 30 days -- directly addressing the data absence that makes Meridian invisible at the comparison stage.
>
> The following sections map exactly where in the candidate journey this pipeline breaks, which competitors are winning at each stage, and what Meridian should do first.

---

### Section 2: Decision Journey Visibility

**Heading:** "Candidate Decision Journey"

**Purpose:** Answer the question: "Where in the candidate journey do we show up, and where do we disappear?" This is the centerpiece section. It is the "aha moment" that justifies the assessment.

**Opening sentence template:**

> "Candidates do not make employer decisions in a single step. They discover options, research companies, compare alternatives, and decide whether to apply. AI shapes every stage of this journey. This section maps [Client]'s visibility at each stage and identifies where the pipeline breaks."

**Body structure:**

1. **Journey framework introduction** (2-3 sentences): Explain the four stages without jargon. The reader should understand the framework in 10 seconds.

2. **Journey summary table** (the centerpiece visual):

| Stage | What Candidates Ask | Mention Rate | Positioning | Top Competitor | Gap | Status |
|---|---|---|---|---|---|---|
| Discovery | "What companies should I consider?" | 50% | Contender | Apex (83%) | -33pp | Moderate |
| Consideration | "Tell me about [Company]" | 67% | Contender | Apex (83%) | -16pp | Moderate |
| Evaluation | "How does [Company] compare?" | 17% | Invisible | Apex (75%) | -58pp | Critical Gap |
| Commitment | "What's the interview process?" | 83% | Champion | Apex (67%) | +16pp | Strong |

3. **Funnel narrative** (1 paragraph): The story that connects the stages. This is the sentence that gets quoted in the buyer's internal presentation.

4. **Funnel math** (1 sentence with a number): "A 50% Discovery rate and 17% Evaluation rate means approximately 8.5% of AI-researching candidates make it from initial awareness through the comparison stage."

5. **Per-stage subsections** (4 subsections, one per stage): Each follows the same internal structure:
   - **Stage heading:** "[Stage]: [One-line description]"
   - **Metric line:** Mention rate, positioning tier, confidence indicator
   - **Narrative paragraph** (3-5 sentences): What happens at this stage, how the client performs, what the business consequence is
   - **Competitive callout** (1-2 sentences): Who wins at this stage and by how much
   - **Citation context** (1-2 sentences): Which sources matter at this stage and whether the client is present on them

**Data sources:**
- Per-stage `clientMentionRate`, `clientAvgVisibility`, `clientAvgSentiment` from `StageComparisonResult` or derived from `queryThemeBreakdown` mapped to stages
- Per-stage `topCompetitorMentionRate` and `topCompetitorName`
- Per-stage `citationGaps` (domains cited at this stage where client is absent)
- `narrativePositioning` derived from `mentioned + visibilityScore + sentimentScore` per the design doc classification (Champion/Contender/Peripheral/Cautionary/Invisible)
- Per-stage confidence tier from `computeStageConfidence()`

**Tone rules:**
- The funnel narrative must read as a connected story, not four separate analyses
- Use "pipeline breaks" not "gaps" for critical stages
- Name the specific stage where the biggest problem is, do not generalize
- The per-stage subsections should vary in length: spend the most words on the stage with the biggest gap

**Confidence hedging:**
- Per-stage confidence tiers control language within each subsection
- LOW confidence stages get an inline qualifier: "(based on [N] queries -- a preliminary signal)" appended to the mention rate
- MEDIUM stages get the standard scoping prefix
- HIGH stages assert directly
- The journey summary table includes a "Confidence" column so the reader can see data strength at a glance
- Never hedge the funnel narrative paragraph -- it describes the pattern, not a specific measurement. The pattern is valid even with preliminary data.

**Example passage (Meridian, Evaluation stage subsection):**

> **Evaluation: How candidates compare you to alternatives**
>
> Mention rate: 17% | Positioning: Invisible | Confidence: Medium
>
> This is where Meridian's candidate pipeline breaks. When candidates ask AI to compare employers on compensation, culture, or overall fit, Meridian appears in fewer than one in five responses. At this stage, AI needs quantitative data -- salary benchmarks, equity details, benefit comparisons -- to construct a fair comparison. For Meridian, that data does not exist on the platforms AI cites.
>
> Apex Cloud Systems dominates the Evaluation stage at 75% mention rate -- a 58pp advantage. In practical terms, when a candidate asks "Should I work at Meridian or Apex?", AI builds the comparison almost entirely from Apex's data. Meridian is not positioned unfavorably. It is absent from the conversation.
>
> The sources AI cites most at the Evaluation stage are Levels.fyi, PayScale, and Glassdoor Salaries. Meridian has no indexed salary data on Levels.fyi and limited presence on Glassdoor's compensation section. These are not optional platforms. They are the data that AI uses to answer the comparison question.

---

### Section 3: Competitive Dominance Map

**Heading:** "Competitive Landscape"

**Purpose:** Answer the question: "Who is beating us, and at which stage of the candidate journey?"

**Opening sentence template:**

> "Competitive visibility in AI is not uniform. A competitor may dominate Discovery but fade at Commitment. This section maps where each competitor wins and loses across the candidate decision journey -- because a competitor who beats you at the comparison stage is more dangerous than one who beats you at the awareness stage."

**Body structure:**

1. **Competitive positioning matrix** (the key table):

| Competitor | Discovery | Consideration | Evaluation | Commitment | Overall | Biggest Threat At |
|---|---|---|---|---|---|---|
| Apex Cloud Systems | 83% | 83% | 75% | 67% | 75% | Discovery + Evaluation |
| NovaBridge Analytics | 67% | 67% | 50% | 50% | 58% | Consideration |
| VeloChain | 50% | 50% | 33% | 33% | 42% | -- |
| Forge Industrial | 33% | 33% | 17% | 33% | 28% | -- |
| **Meridian (client)** | **50%** | **67%** | **17%** | **83%** | **47%** | -- |

2. **Primary threat narrative** (1-2 paragraphs): The story of the most dangerous competitor. Not just "Apex leads" but WHERE Apex leads and what that means for specific candidate decision points.

3. **Per-competitor analysis** (one subsection per competitor, ordered by threat level):
   - Competitor name and overall rate
   - The stage where they beat the client by the widest margin
   - What drives their advantage at that stage (content footprint, citation presence)
   - One sentence on what the client would need to do to close the gap at that stage

4. **Relative strength callout** (1 paragraph): Where the client beats competitors and what that means. This prevents the section from being entirely negative.

**Data sources:**
- Per-competitor `EntityMentionStats.mentionRate` (overall)
- Per-competitor per-stage mention rates from `stageBreakdown`
- Stage-level gap calculations (`competitorRate - clientRate`)
- `CitationAnalysis` for source-level competitive differences

**Tone rules:**
- Frame competitors as threats at specific stages, not overall threats
- Use multipliers ("4.4x more visible") only for the most dramatic gaps -- overuse numbs the reader
- The relative strength callout must feel genuine, not compensatory
- Never use "unfortunately" or apologetic framing when stating a competitor leads

**Confidence hedging:**
- Competitor comparisons use the overall confidence tier
- LOW confidence: "Based on preliminary data, [Competitor] appears to lead..." and add the caveat that a broader assessment would sharpen the competitive picture
- MEDIUM: Standard scoping ("In the queries evaluated...")
- HIGH: Assert directly

**Example passage (Meridian, primary threat narrative):**

> Apex Cloud Systems is the dominant AI-visible employer in this competitive set. At 75% overall mention rate, Apex appears in three of every four candidate queries -- 28 percentage points ahead of Meridian. But the overall gap understates the problem. The critical stage is Evaluation, where Apex holds a 75% rate vs. Meridian's 17%. When a candidate asks AI "Should I work at Meridian or Apex?", the AI comparison is constructed almost entirely from Apex data.
>
> What drives this: Apex has salary data on Levels.fyi, active compensation discussions on Blind, a 4.2 Glassdoor rating with 800+ reviews, and consistent press coverage. These are the exact sources AI cites when building employer comparisons. Meridian's content footprint on these platforms is thin to nonexistent. The gap is not about employer brand quality -- it is about data availability on the platforms AI draws from.
>
> Meridian holds one notable advantage: at the Commitment stage, Meridian's 83% mention rate leads Apex's 67% by 16 percentage points. Candidates who reach the point of asking about Meridian's interview process find detailed, positive information. The strategic challenge is ensuring more candidates survive the Evaluation stage to reach this point.

---

### Section 4: Citation Ecosystem Analysis

**Heading:** "Sources Shaping AI's Answers"

**Purpose:** Answer the question: "What platforms and sources are shaping what AI tells candidates about us?"

**Opening sentence template:**

> "AI does not invent employer information. It synthesizes answers from indexed sources -- review sites, compensation databases, employer directories, press coverage, and company-owned content. Which sources AI cites determines which employers candidates hear about. This section maps which sources are working for [Client], which are working against it, and which are missing entirely."

**Body structure:**

1. **Stage-mapped citation analysis** (the new framing -- this is what distinguishes the redesigned section from the current flat domain frequency table):

For each stage, identify the sources that matter most and whether the client is present:

| Stage | Key Sources | Client Present? | Impact |
|---|---|---|---|
| Discovery | Built In, Comparably, Glassdoor "Best Places", Forbes | Partial (Glassdoor only) | Missing from 2 of 4 list-generating platforms |
| Consideration | Glassdoor, LinkedIn, Indeed, engineering blog | Present (Glassdoor, LinkedIn) | Profile sources adequate but not comprehensive |
| Evaluation | Levels.fyi, PayScale, Glassdoor Salaries, Blind | Absent on 3 of 4 | No quantitative data for AI to build comparisons |
| Commitment | Glassdoor interviews, career page, LeetCode | Present (Glassdoor interviews) | Adequate -- strongest citation coverage |

2. **Citation gap table** (existing structure, enhanced):

| Gap Source | Source Type | Decision Stage Affected | Recommended Action |
|---|---|---|---|
| levels.fyi | Compensation data | Evaluation | Publish salary bands and equity data |
| builtin.com | Employer directory | Discovery | Create employer profile with culture narrative |
| comparably.com | Employee review | Discovery + Consideration | Establish employer profile, encourage reviews |
| blind.com | Anonymous forum | Evaluation | Monitor and participate authentically |
| payscale.com | Compensation data | Evaluation | Verify and submit salary data |
| wellfound.com | Startup job platform | Discovery | Claim profile, post open roles |
| vault.com | Career intelligence | Consideration | Update company profile |

3. **Defensible advantages** (sources where only the client appears): Reframe from "exclusive domains" to "citation assets worth protecting."

4. **Contested sources** (sources where both client and competitors appear): Brief note on where content quality determines who AI highlights.

**Data sources:**
- `CitationAnalysis.gapDomains`, `clientExclusiveDomains`, `sharedDomains`
- `CitationAnalysis.domainFrequency`
- `classifySourceType()` for categorization
- Stage mapping from `STAGE_CITATION_SOURCES` config (new constant mapping expected sources per stage)
- `gapActionFor()` for remediation text (enhanced with stage context)

**Tone rules:**
- Frame citations as "the sources AI draws from" not as "domains" or "platforms"
- Connect every gap to a specific stage: "This source matters at the Evaluation stage because..."
- Avoid making this section feel like an SEO audit. The language is about AI input sources, not web traffic.
- The recommendation in each gap row should be a specific action, not a generic "establish presence"

**Confidence hedging:**
- Citation analysis uses the citation-specific confidence tier
- LOW: "Citation patterns from this assessment provide a preliminary view of the source ecosystem..."
- The stage-mapped analysis inherits per-stage confidence

**Example passage (Meridian, opening + Evaluation citation context):**

> AI does not invent employer information. It synthesizes answers from indexed sources -- review sites, compensation databases, employer directories, and company-owned content. Which sources AI cites determines which employers candidates hear about. This section maps which sources are working for Meridian, which are working against it, and which are missing entirely.
>
> The most consequential finding is at the Evaluation stage. When AI compares employers on compensation and benefits, it draws primarily from Levels.fyi, PayScale, and Glassdoor's salary section. Meridian has no indexed data on Levels.fyi and limited salary information on Glassdoor. This is not a visibility problem -- it is a data availability problem. AI cannot include Meridian in compensation comparisons because the underlying data does not exist on the platforms AI cites.
>
> Across all stages, this assessment identified 7 citation gaps -- sources where AI models retrieve competitor information but find nothing about Meridian. Three of these gaps (Levels.fyi, PayScale, Blind) directly affect the Evaluation stage, which is where Meridian's pipeline breaks. Two gaps (Built In, Comparably) affect Discovery, where Meridian is inconsistently visible. Closing the Evaluation-stage gaps is the highest-leverage action because it addresses the stage with the largest deficit.

---

### Section 5: Narrative Positioning Gap

**Heading:** "How AI Describes You"

**Purpose:** Answer the question: "What story is AI telling about us, and how does that compare to the story we want it to tell?" This section is NEW -- the current report does not have it.

**Opening sentence template:**

> "Visibility measures whether AI mentions [Client]. Positioning measures *how* AI describes [Client] when it does. A company can be visible but poorly positioned -- mentioned but described in ways that discourage candidates. This section analyzes the narrative AI constructs about [Client] at each stage of the candidate journey."

**Body structure:**

1. **Positioning summary table:**

| Stage | Positioning | What AI Says | Implication |
|---|---|---|---|
| Discovery | Contender | Named in lists but not featured | Candidates see Meridian but do not prioritize it |
| Consideration | Contender | Reasonable profile, slightly positive tone | Candidates keep Meridian on the list but without enthusiasm |
| Evaluation | Invisible | Not present in comparisons | Candidates cannot evaluate Meridian against alternatives |
| Commitment | Champion | Detailed, positive interview information | Candidates who reach this stage are encouraged to apply |

Positioning tier definitions (from the design doc):
- **Champion:** Mentioned prominently, positive sentiment, featured as a recommendation
- **Contender:** Mentioned, moderate visibility, neutral-to-positive sentiment
- **Peripheral:** Mentioned briefly, low visibility, neither positive nor negative
- **Cautionary:** Mentioned with negative sentiment or caveats
- **Invisible:** Not mentioned at all

2. **Narrative excerpts** (2-3 representative AI response patterns, paraphrased): Show the reader what AI actually says. Not raw response dumps -- paraphrased representative descriptions.

Example:
> At the Discovery stage, a typical AI response lists 5-7 employers for backend engineers in Austin. Meridian appears in approximately half of these lists, typically mid-list: "...Meridian Technologies is building interesting supply chain optimization tools, though they are less well-known than Apex Cloud Systems or NovaBridge Analytics." The positioning is present but not compelling -- candidates see the name but receive no reason to prioritize it.

3. **Positioning gap analysis** (1-2 paragraphs): Where the gap between actual positioning and desired positioning is largest. Connect to the sentiment score and visibility score data.

4. **Sentiment context** (1 paragraph): Translate the sentiment score into candidate behavior. "Slightly positive sentiment means AI describes Meridian in neutral-to-favorable terms. This is adequate at the Consideration stage but insufficient at Discovery, where a more enthusiastic recommendation would differentiate Meridian from alternatives."

**Data sources:**
- `narrativePositioning` per stage: derived from `mentioned`, `visibilityScore`, `sentimentScore` using the classification function from the design doc
- `avgVisibilityScore` and `avgSentimentScore` per stage
- `sentimentWord()` and `sentimentImplication()` for tone description
- Raw response patterns (paraphrased -- the composer generates representative descriptions from the score ranges, not from actual response text)

**Tone rules:**
- This section must feel insightful, not mechanical. The positioning table is the anchor, but the narrative excerpts are what make it vivid.
- Do not dump raw AI responses. Paraphrase representative patterns.
- Use "AI describes" and "AI positions" as the subject, not "the system found" or "analysis shows"
- Frame Invisible as a positioning problem, not just a visibility problem: "Meridian is not positioned unfavorably. It is absent -- which means candidates form no impression at all."

**Confidence hedging:**
- Narrative positioning is a derived classification. The section should note: "These positioning assessments are based on [N] queries per stage. Individual AI responses vary; the positioning tier reflects the dominant pattern observed."
- LOW confidence: State that positioning is "directional" and note sample limitations
- Do not hedge on the Invisible classification -- if the client was not mentioned, it was not mentioned, regardless of sample size

**Example passage (Meridian):**

> Visibility measures whether AI mentions Meridian. Positioning measures *how* AI describes Meridian when it does. A company can be visible but poorly positioned -- mentioned but described in ways that discourage candidates. This section analyzes the narrative AI constructs about Meridian at each stage of the candidate journey.
>
> At Discovery, Meridian is a Contender: named in employer lists but not featured. A typical AI response to "best enterprise software companies for backend engineers in Austin" includes Meridian mid-list, described briefly as "building supply chain optimization tools" without the enthusiastic language used for Apex ("top choice for engineers seeking competitive compensation and remote flexibility"). Candidates see the name but receive no compelling reason to prioritize Meridian over alternatives.
>
> At Consideration, the picture improves modestly. When candidates search for Meridian by name, AI constructs a reasonable company profile with slightly positive sentiment. The description covers the product domain, team size, and general culture -- but lacks the specific details (compensation philosophy, growth trajectory, technical challenges) that create candidate urgency.
>
> At Evaluation, Meridian is Invisible. This is not a positioning problem -- it is an absence problem. AI does not describe Meridian unfavorably in comparisons. It does not describe Meridian at all. When candidates ask "Should I work at Meridian or Apex?", the comparison is built entirely from Apex data. Meridian's positioning at this stage is undefined because AI has no material to work with.
>
> At Commitment, Meridian is a Champion. AI provides detailed, positive information about the interview process, describing it as "faster than many enterprise companies" with a "2-3 week timeline." This is the positioning Meridian would want across all stages -- but it only exists where it matters least (candidates have nearly decided) and is absent where it matters most (candidates are comparing options).

---

### Section 6: Visibility Gap Diagnosis

**Heading:** "Pipeline Impact Analysis"

**Purpose:** Answer the question: "Where exactly is our pipeline breaking and how bad is it?" This section quantifies the funnel math so the buyer understands the compounding effect of per-stage gaps.

**Opening sentence template:**

> "Each stage of the candidate decision journey is a conversion gate. A candidate who does not find [Client] at Discovery never reaches Consideration. A candidate who is not convinced at Consideration never reaches Evaluation. Gaps compound across stages. This section quantifies the cumulative impact."

**Body structure:**

1. **Funnel math** (the headline number):

Take per-stage mention rates and compute the compounding conversion:
- Discovery (50%) x Evaluation (17%) = ~8.5% of AI-researching candidates make it through the comparison stage
- If Consideration is the bottleneck: Discovery (50%) x Consideration (30%) = 15% survive to Evaluation

Present as: "Of every 100 candidates who research employers through AI, approximately [N] will encounter Meridian at Discovery, and approximately [M] of those will still see Meridian when they compare employers. The net result: roughly [X] out of 100 AI-researching candidates make it through the comparison stage with Meridian still in their consideration set."

**Important caveat in implementation:** The funnel math is illustrative, not literal. Not every candidate follows a linear path through all four stages. The report should frame this as "approximate pipeline impact" and note that the model simplifies a more complex decision process. This honesty strengthens credibility.

2. **Stage-by-stage gap diagnosis table:**

| Stage | Client Rate | Top Competitor | Gap | Funnel Impact | Priority |
|---|---|---|---|---|---|
| Discovery | 50% | Apex (83%) | -33pp | Half of candidates never enter the pipeline | High |
| Consideration | 67% | Apex (83%) | -16pp | Most candidates who search form a reasonable impression | Moderate |
| Evaluation | 17% | Apex (75%) | -58pp | Pipeline collapses -- 83% of comparison-stage candidates never see Meridian | Critical |
| Commitment | 83% | Apex (67%) | +16pp | Candidates who reach this stage convert well | Defend |

3. **Diagnosis narrative** (2-3 paragraphs): The story of where and why the pipeline breaks. This is different from the Journey section's per-stage detail -- it focuses on the *interaction* between stages and the *compounding* effect.

4. **Cost implication** (optional, 1-2 sentences): If the assessment can estimate pipeline impact, state it. Otherwise, frame as: "Every candidate lost at the Evaluation stage is a candidate who already discovered Meridian, already researched it, and was ready to compare -- but was handed to a competitor instead. These are the highest-intent candidates in the pipeline, and they are the most expensive to lose."

**Data sources:**
- Per-stage `clientMentionRate`
- Per-stage `topCompetitorMentionRate`
- Computed funnel throughput (product of sequential stage rates)
- `StageGapDiagnosis.remediationPriority` from the design doc

**Tone rules:**
- Funnel math should feel vivid, not academic: "8 out of 100" not "8.5%"
- Frame each stage gap in terms of candidate behavior, not data
- The cost implication should feel grounded, not alarmist. If we cannot quantify the dollar cost, frame in terms of candidate loss.
- Do not repeat the per-stage detail from Section 2 -- this section is about the interaction and compounding, not the individual stages

**Confidence hedging:**
- The funnel math inherits per-stage confidence. If any stage in the multiplication has LOW confidence, note: "This pipeline estimate includes stages with preliminary data. The directional pattern is reliable; the exact throughput will sharpen with a broader assessment."
- Never present the funnel math as exact ("exactly 8.5% of candidates"). Use "approximately" or "roughly."

**Example passage (Meridian):**

> Each stage of the candidate decision journey is a conversion gate. Gaps compound across stages. This section quantifies the cumulative impact on Meridian's candidate pipeline.
>
> The numbers tell a stark story. Of every 100 candidates who research employers through AI, approximately 50 encounter Meridian during Discovery. Of those 50, roughly 34 form a positive enough impression at Consideration to continue. But at Evaluation -- when those 34 candidates compare employers on compensation and fit -- only about 6 still see Meridian in the AI response. The remaining 28 are handed a comparison built entirely from competitor data. Meridian's Commitment-stage strength (83%) is irrelevant for these candidates because they never reach it.
>
> The compounding effect means that roughly 6 out of every 100 AI-researching candidates survive through the comparison stage with Meridian in their consideration set. For a company hiring across multiple roles, this is a structural pipeline constraint that no amount of recruiter outreach can offset. The candidates are not rejecting Meridian. They are never given the opportunity to consider it.
>
> Apex Cloud Systems, by contrast, retains roughly 47 out of 100 candidates through the same stages -- an 8x advantage in pipeline throughput from AI-driven research. This is not a marginal difference. It is the difference between competing for candidates and being absent from the competition entirely.
>
> *Note: This pipeline model is illustrative. Not every candidate follows a linear path through all four stages. The compounding calculation approximates the cumulative impact of per-stage visibility gaps on overall candidate reach.*

---

### Section 7: Prioritized Remediation Plan

**Heading:** "Recommended Actions"

**Purpose:** Answer the question: "What should we do first, and why?"

**Opening sentence template:**

> "This section prioritizes [N] actions based on where they intervene in the candidate decision journey. Actions that fix earlier-stage or higher-impact gaps are prioritized over actions that optimize stages where [Client] already performs well."

**Body structure:**

Recommendations are organized by stage, not by category. Each recommendation follows this structure:

1. **Recommendation card** (for top 3):

```
PRIORITY: Critical | Stage: Evaluation
───────────────────────────────────────
Publish salary and equity data on Levels.fyi and Glassdoor

Why this matters:
The Evaluation stage is where Meridian's pipeline breaks. AI cannot
include Meridian in compensation comparisons because the data does not
exist. This single gap drives the 17% mention rate at the stage
where candidates make decisions.

Actions:
1. Compile salary band data for target roles (Senior Backend Engineer,
   ML Engineer) within 2 weeks
2. Submit verified salary data to Levels.fyi within 30 days
3. Ensure Glassdoor salary section has at least 15 data points per
   target role within 60 days
4. Publish transparent compensation philosophy on careers page

Expected impact: Addresses the primary driver of Evaluation-stage
invisibility. Based on assessment patterns, salary data presence on
Levels.fyi typically moves Evaluation mention rates by 20-30pp within
two quarterly cycles.

Effort: Medium (4-6 weeks for data compilation and submission)
```

2. **Remaining recommendations table** (for recommendations 4+):

| Priority | Stage | Recommendation | Impact | Effort |
|---|---|---|---|---|
| High | Discovery | Establish employer profiles on Built In and Comparably | Increases list inclusion on AI's primary Discovery sources | Medium (2-4 weeks) |
| Medium | Consideration | Launch engineering blog with 2 posts/month | Deepens the company profile AI constructs | Medium (ongoing) |

3. **90-day action plan summary** (timeline view):

| Timeframe | Action | Stage Impact |
|---|---|---|
| Weeks 1-2 | Compile salary data for target roles | Evaluation |
| Weeks 2-4 | Submit to Levels.fyi; create Built In profile | Evaluation + Discovery |
| Weeks 4-8 | Launch engineering blog; increase Glassdoor reviews | Consideration |
| Weeks 8-12 | Follow-up assessment to measure impact | All stages |

**Data sources:**
- Recommendations generated by `generateRecommendations()` (enhanced with stage tagging)
- `enrichTopRecommendations()` output for detailed action steps
- Priority logic: stage-based (Evaluation/Discovery gaps = Critical/High; Consideration sentiment issues = High; Commitment gaps = Medium)
- Per-stage gap data for the "Why this matters" context

**Tone rules:**
- Every recommendation must name the stage it fixes
- Every recommendation must state WHY before WHAT: the business reason first, then the action
- Actions must be specific enough that someone could execute them without further instructions: name the platform, name the timeline, name the target metric
- Never recommend "consider doing X" -- recommend "do X within Y days"
- The 90-day plan should feel achievable, not overwhelming. 3-5 actions per 30-day window maximum.

**Confidence hedging:**
- Recommendations are not hedged. They are professional judgments. If the underlying data has LOW confidence, the recommendation section notes: "These recommendations are based on a preliminary assessment. A broader scan would sharpen the priority ordering, but the directional actions are sound."
- Do not hedge individual recommendations -- this makes the report feel uncertain and undermines the buyer's willingness to act

**Example passage (Meridian, top recommendation):**

> This section prioritizes 6 actions based on where they intervene in the candidate decision journey. Actions that fix higher-impact gaps receive higher priority.
>
> **CRITICAL -- Evaluation Stage**
> **Publish salary and equity data on Levels.fyi and Glassdoor**
>
> The Evaluation stage is where Meridian's pipeline breaks. At 17% mention rate, Meridian is invisible when candidates compare employers on compensation. AI cannot include Meridian in these comparisons because the underlying salary data does not exist on the platforms AI cites. Apex Cloud Systems, by contrast, has extensive compensation data on Levels.fyi and dominates Evaluation-stage queries at 75%. This single data gap is the primary driver of the 58pp Evaluation deficit.
>
> Actions:
> 1. Compile salary band data for Senior Backend Engineer and ML Engineer roles within 2 weeks
> 2. Submit verified compensation data to Levels.fyi within 30 days
> 3. Ensure Glassdoor's salary section has at least 15 data points per target role within 60 days
> 4. Publish a compensation philosophy statement on the careers page that AI can index
>
> Expected impact: Directly addresses the data absence driving Evaluation-stage invisibility. Establishing compensation data presence on Levels.fyi and Glassdoor is the single highest-leverage action available.
>
> Effort: Medium -- 4-6 weeks for data compilation and platform submission. No product or engineering resources required.

---

## Part 3: Data Mapping

This section maps each narrative element to the computation that powers it.

### Report Input Types (Required Extensions)

The current `ReportInput` needs these additions to support the journey framework:

```typescript
interface StageBreakdown {
  stage: DecisionStage;
  mentionRate: number;
  mentionCount: number;
  queryCount: number;
  avgVisibility: number | null;
  avgSentiment: number | null;
  topCompetitor: { name: string; mentionRate: number } | null;
  gapPp: number;  // gap vs. top competitor in percentage points
  positioning: "champion" | "contender" | "peripheral" | "cautionary" | "invisible";
  citationGaps: string[];
  confidence: { score: number; tier: string };
  status: "strong" | "moderate" | "critical_gap" | "defend";
}

// Added to ReportInput:
stageBreakdown?: StageBreakdown[];
```

### Narrative Element to Data Source Mapping

| Report Element | Data Source | Computation |
|---|---|---|
| Executive summary opening sentence | `stageBreakdown[].mentionRate` | Identify which stage has the largest gap; template selection based on gap pattern |
| Journey summary table | `stageBreakdown[]` | Direct mapping of stage, mentionRate, positioning, topCompetitor, gapPp, status |
| Funnel math | `stageBreakdown[].mentionRate` | Product of sequential stage rates (Discovery x Consideration x Evaluation) |
| Funnel math (competitor) | Competitor per-stage rates | Same product for top competitor |
| Competitive positioning matrix | Per-competitor per-stage mention rates | `computeScanComparison()` filtered by stage, iterated per competitor |
| Primary threat narrative | Top competitor by overall rate + stage with widest gap | `topCompetitor()` + max of per-stage `gapPp` |
| Stage-mapped citations | `CitationAnalysis` per stage | `computeCitations()` called on stage-filtered result sets |
| Citation gap stage mapping | Gap domain + `STAGE_CITATION_SOURCES` config | Join gap domains with expected-sources-per-stage lookup |
| Narrative positioning | `mentioned`, `visibilityScore`, `sentimentScore` | `presenceType()` from design doc, computed per stage |
| Positioning summary table | Per-stage positioning + descriptive text | Positioning tier + template descriptions per tier |
| Pipeline throughput | `stageBreakdown[].mentionRate` | Sequential multiplication with rounding |
| Recommendation stage tag | Gap analysis by stage | Highest-gap stage determines recommendation stage |
| Recommendation priority | Stage position + gap magnitude | Discovery/Evaluation gaps > 30pp = CRITICAL; Consideration sentiment < 0 = HIGH |

### Backward Compatibility

When `stageBreakdown` is not available (no stage data on queries):
- Executive summary falls back to the current flat structure using `queryThemeBreakdown`
- Section 2 (Decision Journey) renders the current query intent map instead
- Section 5 (Narrative Positioning) is omitted
- Section 6 (Pipeline Impact) is omitted
- Sections 3, 4, and 7 use overall data without per-stage breakdown

This preserves the current report quality for assessments that have not yet been tagged with decision stages.

---

## Part 4: Confidence Integration Guide

### Principles

1. **Hedge once, not repeatedly.** A section's confidence tier produces one qualifying phrase in the opening, not a hedge on every sentence. Repeated hedging destroys readability.

2. **Never hedge the pattern, only the precision.** "The pipeline breaks at Evaluation" is a pattern observation valid at any sample size. "17% mention rate" is a precision claim that needs hedging at LOW confidence.

3. **Tables always show confidence.** Every summary table includes a confidence column. This is transparent and lets the reader calibrate.

4. **Recommendations are never hedged.** Recommendations are professional judgments. If the data is preliminary, the section opening says so once. Individual recommendations state actions without qualifiers.

### Per-Section Confidence Behavior

| Section | Confidence Source | HIGH Behavior | MEDIUM Behavior | LOW Behavior |
|---|---|---|---|---|
| Executive Summary | Overall | Assert directly | "Based on [N] queries, " prefix on opening sentence | "Preliminary findings indicate..." opening + data quality note at end |
| Decision Journey | Per-stage | Assert per stage | "In the [N] queries evaluated at this stage, " | "(based on [N] queries -- a preliminary signal)" inline after rate |
| Competitive Landscape | Overall | Assert directly | "In the queries evaluated, " | "Preliminary data suggests " + broader assessment recommendation |
| Citation Ecosystem | Citation-specific | Assert directly | "Citation patterns from this assessment indicate..." | "With limited citation data, " opening |
| Narrative Positioning | Per-stage | Assert directly | "Based on observed response patterns, " | "Directional positioning from preliminary data:" |
| Pipeline Impact | Lowest per-stage tier | Assert directly | Funnel math stated as "approximately" | Funnel math stated as "roughly" + explicit caveat paragraph |
| Recommended Actions | N/A | Assert directly | Assert directly | "Based on a preliminary assessment. Directional actions are sound." |

### Hedge Phrase Templates (Updated)

```typescript
function hedgePhrase(tier: string | undefined, context: "section_open" | "inline_rate" | "funnel_math"): string {
  if (!tier || tier === "HIGH") return "";

  if (tier === "MEDIUM") {
    switch (context) {
      case "section_open": return "Based on the queries evaluated in this assessment, ";
      case "inline_rate": return "approximately ";
      case "funnel_math": return "approximately ";
    }
  }

  // LOW
  switch (context) {
    case "section_open": return "Preliminary findings from a limited assessment indicate ";
    case "inline_rate": return "an estimated ";
    case "funnel_math": return "roughly ";
  }
}
```

The current `hedgePhrase()` function's claim-type variants (mention, sentiment, competitor, citation) are replaced with context-type variants (section_open, inline_rate, funnel_math) because the new report structure does not separate claims by type -- it separates them by where they appear in the narrative.

---

## Part 5: Anti-Patterns

### Anti-Pattern 1: Opening with a Statistic

**Bad:**
> "Meridian Technologies demonstrates moderate AI visibility with a 47% mention rate across 36 evaluated queries."

**Why it fails:** The reader processes a number before they have context for what it means. "Moderate" is a label, not an insight. The sentence answers "what is the number?" when the buyer is asking "should I be worried?"

**Good:**
> "Meridian Technologies has a broken candidate pipeline in AI-driven employer discovery. Candidates who find Meridian during initial research disappear at the exact stage where they compare employers and make decisions."

**Why it works:** The first sentence creates a reaction. The second sentence explains the pattern. Numbers come later, in context.

### Anti-Pattern 2: Organizing by Analysis Type

**Bad:**
> Section 1: Visibility Findings
> Section 2: Competitor Analysis
> Section 3: Citation Patterns

**Why it fails:** These are the system's internal categories, not the buyer's questions. A CHRO does not think in terms of "citation patterns." They think "who is beating us and what should I do about it?"

**Good:**
> Section 2: Candidate Decision Journey
> Section 3: Competitive Landscape
> Section 4: Sources Shaping AI's Answers

**Why it works:** Each heading is a question the buyer is already asking, phrased in business language.

### Anti-Pattern 3: Flat Comparison Tables

**Bad:**

| Company | Mention Rate | Mentions | Gap |
|---|---|---|---|
| Apex | 75% | 27 | +28pp |
| NovaBridge | 58% | 21 | +11pp |
| Meridian | 47% | 17 | -- |

**Why it fails:** Shows overall rates but does not reveal WHERE competitors win. 75% vs. 47% feels abstract. The buyer cannot act on it.

**Good:**

| Competitor | Discovery | Evaluation | Biggest Threat At |
|---|---|---|---|
| Apex | 83% | 75% | Evaluation (58pp gap) |
| NovaBridge | 67% | 50% | Discovery |

**Why it works:** Shows the stage where each competitor is most dangerous. The buyer immediately knows where to focus.

### Anti-Pattern 4: Generic Recommendations

**Bad:**
> "Improve Glassdoor presence to increase employer brand visibility."

**Why it fails:** This could come from any consulting deck. It is not connected to a specific finding, a specific stage, or a specific gap. The buyer has no idea whether to prioritize it.

**Good:**
> "Publish salary data on Levels.fyi within 30 days. This directly addresses the data absence driving Meridian's 17% Evaluation mention rate -- the stage where candidates compare employers and AI currently has no Meridian compensation data to work with."

**Why it works:** Names the platform, names the timeline, names the gap it closes, names the stage it fixes. The buyer can assign it to someone tomorrow.

### Anti-Pattern 5: Repeating the Same Point Across Sections

**Bad:**
Executive summary: "Apex leads by 28 percentage points."
Visibility section: "Apex captures 75% of queries, 28 points ahead."
Competitor section: "The gap between Apex and Meridian is 28 percentage points."

**Why it fails:** Each section should advance the argument, not restate it. By the third mention, the reader is skimming.

**Good:**
Executive summary: "Apex leads by 28 percentage points overall."
Decision Journey section: "At the Evaluation stage, Apex's advantage widens to 58 percentage points."
Competitive Landscape section: "Apex's lead is driven by compensation data presence on Levels.fyi and Glassdoor -- platforms where Meridian has no indexed data."

**Why it works:** Each mention deepens the analysis. Overall gap -> stage-specific gap -> root cause.

### Anti-Pattern 6: Passive Voice in Findings

**Bad:**
> "It was observed that mention rates were lower in compensation-related queries."

**Why it fails:** Passive voice hides the subject and sounds bureaucratic.

**Good:**
> "Meridian is invisible in compensation queries. AI has no salary data to work with."

**Why it works:** Active voice. Named subject. Direct cause.

### Anti-Pattern 7: Hedging Recommendations

**Bad:**
> "Meridian may want to consider establishing a presence on Levels.fyi, which could potentially improve compensation-related visibility."

**Why it fails:** "May want to consider" is not a recommendation. "Could potentially" is a non-commitment. The buyer paid for advice, not suggestions.

**Good:**
> "Publish salary data on Levels.fyi within 30 days."

**Why it works:** Imperative mood. Specific platform. Specific timeline. The buyer can act on it.

---

## Part 6: Implementation Notes for Developers

### Report Composer Function Signature

The new `composeReport()` function should accept the same `ReportInput` type, extended with `stageBreakdown?: StageBreakdown[]`. When `stageBreakdown` is present, the journey-based report structure is used. When absent, the current structure is preserved (backward compatibility).

### Section Composition Order

```
1. composeCoverPage()           -- unchanged
2. composeSummary()             -- rewritten for journey framing
3. composeDecisionJourney()     -- NEW: replaces composeQueryIntentMapSection()
4. composeCompetitiveLandscape() -- enhanced: per-stage competitive matrix
5. composeCitationEcosystem()   -- enhanced: stage-mapped citations
6. composeNarrativePositioning() -- NEW
7. composePipelineImpact()       -- NEW
8. composeRecommendations()      -- enhanced: stage-tagged, stage-ordered
```

The old `composeAssessmentScopeSection()` is removed as a standalone section. Methodology details move into a brief subsection within the Decision Journey section or into a compact appendix. Rationale: the buyer does not need a full methodology section before the findings. The methodology should be available for skeptical readers but not interrupt the narrative flow.

### Key Computation Functions Needed

1. `computeFunnelThroughput(stages: StageBreakdown[]): { clientThroughput: number; competitorThroughput: number; description: string }` -- product of sequential stage mention rates

2. `classifyPositioning(stage: DecisionStage, mentioned: boolean, visibility: number | null, sentiment: number | null): PositioningTier` -- from the design doc

3. `mapCitationToStage(domain: string): DecisionStage[]` -- maps a citation domain to the stage(s) where it matters most, using the `STAGE_CITATION_SOURCES` constant

4. `stageStatus(mentionRate: number): "strong" | "moderate" | "critical_gap" | "defend"` -- same thresholds as current `statusTier()` (65%/40%/20%)

5. `stageRemediationPriority(stage: DecisionStage, gapPp: number, mentionRate: number): "critical" | "high" | "medium" | "low"` -- priority logic from design doc

### Template Selection Logic

The executive summary opening sentence is selected from templates based on the pattern of stage gaps:

```typescript
type GapPattern = "evaluation_break" | "discovery_absent" | "consideration_negative" | "uniform_weak" | "client_leads";

function detectGapPattern(stages: StageBreakdown[]): GapPattern {
  const eval = stages.find(s => s.stage === "evaluation");
  const disc = stages.find(s => s.stage === "discovery");
  const cons = stages.find(s => s.stage === "consideration");

  if (eval && eval.mentionRate < 0.3 && disc && disc.mentionRate > 0.4)
    return "evaluation_break";  // strong top, weak middle
  if (disc && disc.mentionRate < 0.3)
    return "discovery_absent";  // invisible from the start
  if (cons && cons.avgSentiment != null && cons.avgSentiment < -0.1)
    return "consideration_negative";  // known but disliked
  if (stages.every(s => s.mentionRate < 0.4))
    return "uniform_weak";  // weak everywhere
  return "client_leads";  // ahead of competitors
}
```

Each gap pattern maps to a different opening sentence template, as specified in Section 1 above.

### Positioning Tier Generation

For the Narrative Positioning section, generate representative descriptions per tier:

```typescript
const POSITIONING_DESCRIPTIONS: Record<PositioningTier, (clientName: string, stage: string) => string> = {
  champion: (name, stage) =>
    `At the ${stage} stage, AI positions ${name} as a top recommendation -- prominently featured with positive language that encourages candidates to take the next step.`,
  contender: (name, stage) =>
    `At the ${stage} stage, ${name} is mentioned but not featured. AI includes ${name} in lists and descriptions but does not highlight it as a top choice.`,
  peripheral: (name, stage) =>
    `At the ${stage} stage, ${name} appears briefly -- typically as a trailing mention in a longer list, without detail or endorsement.`,
  cautionary: (name, stage) =>
    `At the ${stage} stage, AI mentions ${name} with caveats or negative framing that may discourage candidates from further research.`,
  invisible: (name, stage) =>
    `At the ${stage} stage, ${name} is absent from AI responses. Candidates at this stage form no impression of ${name} because AI does not mention it.`,
};
```

---

## Summary of Changes from Current Report

| Current Report | New Report | Rationale |
|---|---|---|
| Executive summary opens with a statistic | Opens with a funnel story | Creates immediate reaction |
| Sections organized by analysis type | Sections organized by buyer question | Maps to how executives think |
| Flat comparison table (overall rates) | Stage-by-stage competitive matrix | Shows WHERE competitors win |
| Citation section lists domains by frequency | Citations mapped to decision stages | Shows WHY each gap matters |
| No narrative positioning analysis | Full positioning section (Champion through Invisible) | Shows HOW AI describes the client |
| No funnel math | Pipeline impact section with compounding calculation | Quantifies the business cost |
| Recommendations ordered by priority label | Recommendations ordered by stage + priority | Connects actions to the funnel story |
| Query intent map as a flat table | Replaced by the Decision Journey centerpiece | Theme-level data now lives in the journey context |
| Methodology section before findings | Methodology as a brief appendix or subsection | Does not interrupt the narrative |
| Assessment scope section is prominent | Scope details folded into methodology appendix | Buyers want findings first, not setup |
| "Visibility findings" heading | "Candidate Decision Journey" heading | Business question, not analysis label |
| "Citation patterns" heading | "Sources Shaping AI's Answers" heading | Meaningful, not technical |
| Sentiment paragraph in visibility section | Sentiment woven into Narrative Positioning section | Proper home for tone analysis |
| Competitor section ends with table | Competitive section leads with stage matrix | Visual-first, then narrative |
| Recommendations have category labels | Recommendations have stage labels | Connects to the funnel |
