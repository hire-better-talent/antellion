# Narrative Positioning Analysis: Complete Section Design

**Status:** Design specification
**Author:** Report PM
**Date:** March 28, 2026
**Section:** "How AI Describes You" (Section 5 in report-blueprint-v2.md)
**Depends on:** report-blueprint-v2.md (parent spec), decision-journey types (PositioningTier, StageVisibility), stage-comparison.ts (classifyPositioning), confidence/scoring.ts (hedge language), report-composer.ts (section generation)

---

## Why This Section Exists

This is the highest-value insight Antellion delivers. Every other section answers a quantitative question: how often, how many, who leads. This section answers a qualitative question: **what story is AI telling about you to candidates, and how does that story compare to the one AI tells about your top competitor?**

Three reasons this commands premium positioning:

1. **It is invisible to the client.** Companies monitor Glassdoor ratings and LinkedIn follower counts. Nobody monitors what ChatGPT says when a candidate asks "should I work there?" This section reveals something the buyer has never seen before.

2. **It reveals competitive framing, not just competitive presence.** AI does not list companies neutrally. It positions them: "Apex has stronger employer branding and higher reported compensation." That is a competitive displacement happening silently, at scale.

3. **It creates urgency through specificity.** "AI is telling candidates you lack compensation transparency" triggers a different response than "your mention rate is 47%." The first is a narrative the buyer can fix. The second is a statistic the buyer can debate.

---

## Part 1: Positioning Analysis Framework

### What the System Analyzes Today

The current `classifyPositioning()` function in `stage-comparison.ts` assigns a tier based on three inputs:

- `mentionRate` (0-1): fraction of stage results where the client was mentioned
- `avgVisibility` (0-100): mean visibility score across stage results
- `avgSentiment` (-1 to 1): mean sentiment score across stage results

Current tier logic:
- **INVISIBLE:** mentionRate < 0.2
- **CAUTIONARY:** mentioned but avgSentiment < -0.2
- **PERIPHERAL:** mentioned but mentionRate < 0.4 OR avgVisibility < 30
- **CHAMPION:** mentionRate >= 0.7 AND avgVisibility >= 60 AND avgSentiment > 0.2
- **CONTENDER:** everything else

This classification is sound for tier assignment. What it does not capture is the **narrative shape** -- how AI introduces the client, what attributes it highlights, what caveats it attaches, and how this compares to the story AI tells about competitors.

### What the Analysis Should Detect

The narrative positioning analysis goes beyond tier classification into pattern detection. These patterns are derived from the combination of quantitative signals the system already captures, not from raw response text analysis (which would require a separate NLP pipeline). The composer constructs representative narrative descriptions from score ranges and tier classifications.

#### Client Narrative Patterns

For each stage where the client is mentioned (mentionRate > 0):

| Pattern | Detection Logic | What It Means |
|---|---|---|
| **Featured recommendation** | visibilityScore >= 60, sentimentScore > 0.3, mentioned early (top-20% position proxy from visibility score) | AI positions the client as a primary answer -- candidates receive a strong signal to pursue |
| **Listed but not featured** | visibilityScore 30-59, sentimentScore >= 0 | AI includes the client in a list but does not differentiate it -- candidates see the name without a reason to prioritize |
| **Brief or peripheral mention** | visibilityScore < 30, mentioned = true | AI names the client in passing or as an "also includes" -- candidates may not register the mention |
| **Mentioned with caveats** | mentioned = true, sentimentScore < 0 | AI names the client but attaches warnings ("limited data," "some reviews suggest," "less transparency") -- visibility becomes a liability |
| **Absent** | mentioned = false | AI constructs the answer without the client -- candidates form their shortlist from competitors |

**Data source:** Per-result `visibilityScore` and `sentimentScore` from `scan-analysis.ts`, aggregated per stage by `stage-comparison.ts` into `StageVisibility.avgVisibility` and `StageVisibility.avgSentiment`.

#### Competitor Narrative Patterns

For each stage, the system already computes:
- Which competitor has the highest mention rate (`StageVisibility.topCompetitor`)
- The gap between the top competitor and the client (`StageVisibility.gapVsTopCompetitor`)
- Per-competitor mention counts from `EntityMentionStats` (from `scan-comparison.ts`)

The narrative analysis derives:

| Pattern | Detection Logic | What It Means |
|---|---|---|
| **Displacement** | Competitor mentioned in >= 60% of stage results AND client mentioned in < 30% | Competitor actively occupies the position the client is absent from |
| **Favorable comparison** | Both mentioned, but competitor visibilityScore > client visibilityScore by 20+ points | When both appear, AI positions the competitor more prominently |
| **Co-occurrence without differentiation** | Both mentioned at similar rates and visibility, similar sentiment | AI treats them as interchangeable -- not losing, but not winning |
| **Client advantage** | Client mentionRate > competitor mentionRate at this stage | Client leads at this specific stage -- a defensible position |

**Data source:** Per-competitor mention rates derived from `extractCompetitorMentions()` in `stage-comparison.ts`, plus per-stage `topCompetitor` and `gapVsTopCompetitor`.

#### Comparative Narrative Patterns

These capture the *interaction* between client and competitor positioning:

| Pattern | Detection Logic | What It Means |
|---|---|---|
| **Narrative inversion** | Client is CHAMPION at one stage but INVISIBLE/CAUTIONARY at another | AI tells contradictory stories about the client depending on what the candidate asks |
| **Competitor convergence** | Multiple competitors cluster at CHAMPION/CONTENDER while client is PERIPHERAL or below | The competitive set is established and the client is outside it |
| **Single-dimension weakness** | Client is CONTENDER+ at 3+ stages but INVISIBLE at exactly one | One specific data gap drives the entire positioning problem |
| **Broad weakness** | Client is PERIPHERAL or below at 3+ stages | Systemic content footprint problem, not a targeted gap |

**Data source:** Cross-stage comparison of the client's `PositioningTier` values from `JourneyAnalysis.stages`.

---

## Part 2: Section Design

### Section Heading

**"How AI Describes You"**

This heading works because it is concrete, direct, and slightly provocative. The executive reader immediately wonders: "What *is* AI saying about us?" The heading does not use jargon ("narrative positioning analysis") or abstract framing ("perception audit"). It asks the question the reader already has.

### Section Structure

#### 2.1 Opening (2-3 sentences)

**Purpose:** Frame why positioning matters separately from visibility.

**Template:**

> "Visibility measures whether AI mentions [Client]. Positioning measures *how* AI describes [Client] when it does. A company can appear in every AI response but still lose candidates if the description is lukewarm, incomplete, or qualified with caveats. This section analyzes the narrative AI constructs about [Client] at each stage of the candidate journey -- and how it compares to the story AI tells about [Top Competitor]."

**Data:** `clientName`, `topCompetitor.name` (from the highest overall-rate competitor in `EntityMentionStats`).

**Confidence hedging:** None. This is a framing paragraph, not a claim.

#### 2.2 Positioning Summary Table

**Purpose:** Give the executive a stage-by-stage view of *how* the client is positioned, not just whether the client is mentioned.

| Stage | Positioning Tier | Narrative Pattern | Candidate Impact |
|---|---|---|---|
| Discovery | Contender | Listed but not featured | Candidates see the name without a reason to prioritize it |
| Consideration | Contender | Listed with slight positive tone | Candidates keep [Client] on the list but without enthusiasm |
| Evaluation | Invisible | Absent from comparisons | Candidates cannot evaluate [Client] against alternatives |
| Commitment | Champion | Featured with positive detail | Candidates who reach this stage are encouraged to apply |

**Data per row:**
- **Stage:** `DecisionStage` from `DECISION_STAGES`
- **Positioning Tier:** `StageVisibility.positioning` (computed by `classifyPositioning()`)
- **Narrative Pattern:** Derived from the client narrative pattern table in Part 1, using `avgVisibility` and `avgSentiment` per stage
- **Candidate Impact:** Template string selected by tier (see Part 3 below)

**Confidence hedging:** Add a "Confidence" column to the table showing the per-stage confidence tier. This is transparent without interrupting the narrative.

**Table with confidence (as rendered):**

| Stage | Positioning | Narrative Pattern | Candidate Impact | Confidence |
|---|---|---|---|---|
| Discovery | Contender | Listed but not featured | Candidates see the name without a reason to prioritize | Medium |
| Consideration | Contender | Slight positive tone | Candidates keep [Client] on list without enthusiasm | Medium |
| Evaluation | Invisible | Absent | Candidates cannot evaluate [Client] | Medium |
| Commitment | Champion | Featured, positive detail | Candidates encouraged to apply | Medium |

#### 2.3 Client Narrative Analysis

**Purpose:** Tell the executive what story AI tells about their company. Not data. A story.

**Structure:** One paragraph per stage where the client has data. The paragraph answers: "When a candidate asks [stage question], what does AI say about [Client]?"

**Template per stage:**

The composer generates a representative paraphrase based on the tier classification and score ranges. It does **not** dump raw response text (which varies between queries and AI models). Instead, it constructs a descriptive summary that reflects the aggregate pattern.

**Template selection logic:**

For each stage, select the narrative description template based on `PositioningTier`:

```
CHAMPION + high visibility + positive sentiment:
  "At [Stage], AI positions [Client] as a strong recommendation. [Client] is described
   [positively/with enthusiasm], typically named early in the response with specific
   attributes highlighted. Candidates who encounter this description receive a clear
   signal to pursue [Client]."

CONTENDER + moderate visibility + neutral-to-positive sentiment:
  "At [Stage], AI includes [Client] in its response but does not differentiate it from
   alternatives. [Client] is named alongside [N] other employers, described in
   [neutral/slightly positive] terms without the specific detail or enthusiasm that
   would cause a candidate to prioritize it. The description is adequate but not
   compelling."

PERIPHERAL + low visibility:
  "At [Stage], AI mentions [Client] briefly -- typically as an afterthought or
   'also consider' addition. The mention is too brief to form a meaningful impression.
   Candidates scanning a list of employers may not register [Client]'s presence."

CAUTIONARY + negative sentiment:
  "At [Stage], AI mentions [Client] but attaches qualifications. The description
   includes cautionary language -- [sentiment-derived phrases] -- that actively
   discourages candidates. Visibility here is a liability: candidates who encounter
   [Client] receive reasons to deprioritize it."

INVISIBLE:
  "At [Stage], AI does not mention [Client]. This is not a positioning problem -- it
   is an absence problem. Candidates asking [stage question] receive an answer built
   entirely from competitor information. [Client] does not exist in this conversation."
```

**Sentiment-derived phrases for CAUTIONARY tier:**

When `avgSentiment` < -0.2, the composer selects cautionary language phrases based on the stage context:

| Stage | Sentiment-Derived Phrase Examples |
|---|---|
| Discovery | "less well-known," "not typically listed among top employers" |
| Consideration | "limited information available," "mixed reviews," "some concerns noted" |
| Evaluation | "less transparency on compensation," "fewer data points than competitors" |
| Commitment | "process described as unclear," "mixed interview feedback" |

These are not hardcoded strings. They are template fragments selected based on `stage + sentimentScore range`, designed to paraphrase the *type* of cautionary language AI produces at that sentiment level.

**Data:** Per-stage `PositioningTier`, `avgVisibility`, `avgSentiment`, `mentionRate`, `topCompetitor`.

**Confidence hedging:** Per-stage inline qualifier.
- HIGH: Assert the narrative pattern directly
- MEDIUM: "Based on observed response patterns, " prefix once per stage paragraph
- LOW: "Preliminary signals suggest " prefix + "(based on [N] queries)" after the stage description

#### 2.4 Competitive Narrative Analysis

**Purpose:** Show what story AI tells about the top competitor at the same stages -- creating a direct contrast.

**Structure:** One focused comparison per stage, not a full competitive breakdown (that belongs in Section 3: Competitive Landscape). This subsection answers: "What story does AI tell about our biggest competitor, and how does it differ from what AI says about us?"

**Template:**

> "For comparison, at the [Stage] stage, AI describes [Top Competitor] as [competitor narrative pattern]. Where [Client] is [client tier], [Top Competitor] is [competitor tier]. The contrast is [sharpest/most consequential/most visible] at [Stage with widest tier gap], where [specific contrast statement]."

**Competitor tier per stage:** The system currently computes `topCompetitor.mentionRate` per stage from `StageVisibility`. To produce a full competitor narrative, the composer needs to classify the top competitor's positioning at each stage using the same `classifyPositioning()` function, applied to the competitor's mention rate and the stage's overall visibility/sentiment scores.

**Implementation note:** The competitor's `avgVisibility` and `avgSentiment` are not currently broken out per-competitor per-stage. For the initial implementation, approximate the competitor's positioning tier using their per-stage `mentionRate` as the primary signal (mentionRate < 0.2 = INVISIBLE, >= 0.7 = CHAMPION, etc.) with a neutral sentiment assumption. This is defensible because the system does not compute per-competitor sentiment. A future enhancement could add per-competitor visibility and sentiment scoring.

**Data:** `StageVisibility.topCompetitor` per stage, `EntityMentionStats` for overall competitor rates, `classifyPositioning()` for competitor tier approximation.

**Confidence hedging:** Same as client narrative analysis -- this inherits the per-stage confidence tier.

#### 2.5 Positioning Gap

**Purpose:** Name the gap between the client's narrative and the competitor's narrative at each stage, in candidate-consequence terms.

**Structure:** One paragraph summarizing the most significant positioning gap, followed by a gap summary table.

**Gap Summary Table:**

| Stage | Client Positioning | Competitor Positioning | Narrative Gap | Candidate Consequence |
|---|---|---|---|---|
| Discovery | Contender | Champion | Competitor featured; client listed | Candidates prioritize competitor |
| Consideration | Contender | Champion | Competitor described with detail; client described generically | Candidates develop stronger impression of competitor |
| Evaluation | Invisible | Champion | Client absent from comparisons | Candidates compare only competitor options |
| Commitment | Champion | Contender | Client leads on interview detail | Few candidates reach this stage to benefit |

**Candidate Consequence column templates:**

| Client Tier | Competitor Tier | Candidate Consequence |
|---|---|---|
| CHAMPION | CHAMPION | Candidates weigh both equally -- differentiation comes from content quality |
| CHAMPION | Lower | [Client] holds a positioning advantage candidates can act on |
| CONTENDER | CHAMPION | Candidates develop a stronger first impression of [Competitor] |
| PERIPHERAL | CHAMPION | Candidates may not notice [Client] while [Competitor] anchors their shortlist |
| CAUTIONARY | Any above | [Client]'s mention actively pushes candidates toward [Competitor] |
| INVISIBLE | CHAMPION | Candidates build their evaluation entirely from [Competitor] data |
| INVISIBLE | CONTENDER | [Client] absent; [Competitor] is at least present in candidate research |
| INVISIBLE | INVISIBLE | Neither employer influences AI-driven candidate research at this stage |

**Data:** Client and competitor `PositioningTier` per stage (as computed in 2.3 and 2.4).

**Confidence hedging:** The gap table inherits the lowest confidence tier across client and competitor at each stage. Add a column or footnote if any stage is LOW confidence.

#### 2.6 What Drives the Gap

**Purpose:** Explain *why* the narrative gap exists -- connecting back to the citation ecosystem and content footprint.

**Structure:** 1-2 paragraphs that tie the positioning gap to specific data sources.

**Template:**

> "The positioning gap at [Critical Stage] is not about employer brand quality. It is about data availability. AI constructs its narrative from indexed sources. At the [Critical Stage], the sources AI draws from most heavily are [top cited domains at this stage]. [Top Competitor] has [specific content footprint on those sources]. [Client] has [specific absence or thin presence]. AI cannot position [Client] favorably when the underlying data does not exist."

**For stages where sentiment drives the gap (CAUTIONARY tier):**

> "At the [Stage], the positioning gap is driven by tone, not absence. AI draws its characterization of [Client] from [cited sources at this stage], where the available content carries [negative signal type]. This is different from a visibility gap: [Client] is present but described in terms that discourage candidates. The remediation path is different -- improving the content AI finds, not simply creating content that did not exist."

**Data:** Per-stage `citedDomains` and `gapDomains` from `StageVisibility`, `classifySourceType()` for domain categorization, `topCompetitor` data.

**Confidence hedging:** Uses citation-specific confidence tier. LOW confidence gets: "Citation patterns from this assessment provide a preliminary view of the source ecosystem driving this gap."

#### 2.7 What Can Change

**Purpose:** Close with forward momentum. The narrative is not fixed -- it is derived from sources the client can influence. This prevents the section from feeling like a verdict.

**Structure:** 1 paragraph + a compact table of highest-leverage narrative shifts.

**Opening template:**

> "AI-generated employer narratives are not permanent characterizations. They are synthesized from indexed sources that change over time. When the underlying data changes, the narrative changes. The positioning gaps identified in this section are addressable through specific actions on specific platforms."

**Narrative Shift Table:**

| Current Positioning | Target Positioning | What Needs to Change | Recommended Action |
|---|---|---|---|
| Invisible at Evaluation | Contender at Evaluation | Salary and equity data on Levels.fyi and Glassdoor | Publish compensation data (see Recommendation #1) |
| Contender at Discovery | Champion at Discovery | Featured on employer ranking platforms | Establish profiles on Built In and Comparably |

**Data:** Derived from per-stage positioning tier + gap domains + recommendations (cross-reference with `RemediationPlan.recommendations`).

**Important:** This subsection links forward to the Recommended Actions section (Section 7). It should name the recommendation by number or title, not repeat the full action plan. The purpose is to show that the narrative gap has a clear remediation path, not to duplicate the recommendation.

**Confidence hedging:** None needed. This is a forward-looking framing section, not a measurement claim.

---

## Part 3: Positioning Tier Descriptions

### CHAMPION

**What it looks like in an AI response:**

> "For senior backend engineers in Austin, Meridian Technologies stands out for its supply chain optimization platform. Engineers report high ownership, interesting technical challenges, and a fast hiring process. The company recently raised Series D and is scaling their AI/ML team, making it a strong option for engineers who want to build from the ground up."

**Characteristics:**
- Named in the first 20% of the response
- Described with specific, differentiated attributes (not generic filler)
- Positive language: "stands out," "strong option," "recommended"
- No caveats or qualifiers attached
- Often the response explicitly recommends the company

**Classification thresholds:** mentionRate >= 0.7, avgVisibility >= 60, avgSentiment > 0.2

**Business consequence:** Candidates who encounter a Champion-positioned employer in AI research add it to their active shortlist. AI has done the equivalent of a warm introduction -- the candidate arrives at the careers page already interested. This is the highest-conversion positioning.

**Remediation path:** Not applicable -- this is the target state. The priority is to *defend* this positioning by maintaining the content sources that produce it. If content goes stale or competitors publish more aggressively, Champion positioning erodes.

**How the report describes it:**

> "[Client] is positioned as a Champion at the [Stage] stage. AI features [Client] prominently, describes it with specific positive attributes, and presents it as a recommended employer. Candidates who encounter this description receive a clear signal to pursue [Client]. This positioning converts AI visibility into candidate engagement."

---

### CONTENDER

**What it looks like in an AI response:**

> "Austin has a growing enterprise software scene. Notable companies for backend engineers include Apex Cloud Systems, known for competitive compensation and a remote-first culture. Meridian Technologies is building a platform engineering team focused on supply chain optimization. VeloChain is another option."

**Characteristics:**
- Named in the response, typically mid-list
- Description is factual but not enthusiastic
- Neutral-to-slightly-positive tone
- No specific reason given for candidates to prioritize this company over others
- Often described with what the company *is*, not why a candidate should *choose* it

**Classification thresholds:** Does not meet CHAMPION criteria but mentionRate >= 0.4, avgVisibility >= 30, avgSentiment >= -0.2

**Business consequence:** Candidates see the company name and form a basic impression, but AI provides no differentiation. The company stays on the consideration list but does not rise to the top. Candidates are likely to research further if they were already interested, but AI alone does not create interest. Contender positioning is the "passive visibility" state -- present but not compelling.

**Remediation path:** Move from Contender to Champion by deepening the content that AI can cite. The gap is usually content specificity, not content existence. AI has enough data to mention the company but not enough to recommend it. Actions: publish more detailed employer narratives (engineering blog, culture content, specific compensation data) on the platforms AI cites at this stage.

**How the report describes it:**

> "[Client] is positioned as a Contender at the [Stage] stage. AI includes [Client] in its response but does not differentiate it from alternatives. The description is factual and neutral -- candidates see the name but receive no compelling reason to prioritize [Client] over other options. This is a passive positioning: present but not persuasive."

---

### PERIPHERAL

**What it looks like in an AI response:**

> "Top engineering teams at mid-size enterprise software companies include Apex Cloud Systems and NovaBridge Analytics. Other companies in the space include Meridian Technologies, VeloChain, and several others."

**Characteristics:**
- Named but barely -- an afterthought or "also includes" mention
- Little to no descriptive detail
- Typically appears in the last third of the response
- Often grouped with other low-visibility employers
- AI treats the company as background noise, not a distinct option

**Classification thresholds:** mentionRate < 0.4 OR avgVisibility < 30, with sentimentScore >= -0.2

**Business consequence:** Candidates may technically "see" the company name but are unlikely to register it as a real option. Peripheral positioning is functionally similar to invisibility for candidate behavior -- the mention is too brief to form an impression, and candidates who scan a list of employers will gravitate toward the names with more detail and stronger framing.

**Remediation path:** The company exists in AI's training data but lacks the structured content to produce a substantive description. Actions: create or complete employer profiles on the platforms AI cites at this stage, publish structured content (culture, compensation, team descriptions) that gives AI material to work with.

**How the report describes it:**

> "[Client] is positioned as Peripheral at the [Stage] stage. AI mentions [Client] briefly, typically as an afterthought in a list of employers. The mention is too brief to form a meaningful candidate impression. At this positioning, visibility is technically present but functionally ineffective -- candidates scan past [Client] toward employers described with more substance."

---

### CAUTIONARY

**What it looks like in an AI response:**

> "Limited data is available on Meridian Technologies compensation specifically. Based on available Glassdoor reviews, the company appears to offer competitive base salaries for Austin, but there is less transparency around equity and total compensation compared to competitors like Apex Cloud Systems. Some reviews suggest benefits are standard but not standout."

**Characteristics:**
- The company IS mentioned -- often by name, sometimes with moderate visibility
- But the description carries negative sentiment or explicit caveats
- Language includes "limited data," "however," "but," "some concerns," "less transparent"
- AI often positions the company as an inferior alternative to a named competitor
- The mention may actively discourage rather than encourage candidate interest

**Classification thresholds:** mentioned = true (mentionRate >= 0.2), avgSentiment < -0.2

**Business consequence:** This is worse than being invisible. Invisible means candidates form no impression. Cautionary means candidates form a *negative* impression. AI has enough data to mention the company but the data available produces an unfavorable characterization. Candidates who encounter a Cautionary description are less likely to apply than candidates who never encountered the company at all -- the mention itself becomes a deterrent. This is the only tier where visibility is a liability.

**Remediation path:** Different from other tiers. The problem is not content absence -- it is content quality. The sources AI cites produce negative signals. Actions: conduct a sentiment audit across the platforms AI cites at this stage, identify the recurring themes driving negative characterization, address the root causes (not just the reviews), and increase the volume of authentic positive signals.

**How the report describes it:**

> "[Client] is positioned as Cautionary at the [Stage] stage. AI mentions [Client] but attaches qualifications or negative framing. The description includes language that actively discourages candidates -- [specific sentiment-derived phrases]. This is the most urgent positioning to address: visibility with negative framing is worse than no visibility at all. Candidates who encounter this description receive a signal to deprioritize [Client]."

---

### INVISIBLE

**What it looks like in an AI response:**

> "Senior backend engineers in enterprise SaaS in Austin typically earn $165K-$210K base. Apex Cloud Systems is among the higher-paying employers in this segment. VeloChain offers competitive equity packages. Sources: Levels.fyi, Glassdoor, Comparably, PayScale."

(Note: the client is simply not present. There is no mention, no description, no positioning.)

**Characteristics:**
- The company does not appear in the response at all
- AI constructs the entire answer from competitor data
- The response is complete and coherent without the client -- AI did not struggle to find data, it just had no reason to include this company
- Candidates receive a fully formed answer that excludes the client

**Classification thresholds:** mentionRate < 0.2

**Business consequence:** Candidates who use AI for employer research at this stage build their consideration set without the client. The company is not rejected -- it is never considered. The damage is silent: there is no negative impression to overcome because there is no impression at all. Candidates move through this stage of their decision journey with a shortlist that was shaped entirely by competitors.

**Remediation path:** Create the data that AI needs. Invisible positioning almost always traces to the absence of structured employer content on the platforms AI cites at this stage. When `gapDomains` are present for this stage, each gap domain represents a platform where competitors have data and the client does not. Publishing content on these platforms directly addresses the cause.

**How the report describes it:**

> "[Client] is Invisible at the [Stage] stage. AI does not mention [Client] when candidates ask [stage question]. This is not a negative characterization -- it is an absence. Candidates asking [stage question] receive a complete answer built entirely from competitor data. [Client] does not participate in the conversation. The remediation is straightforward: the data AI needs to include [Client] does not exist on the platforms AI cites at this stage."

---

## Part 4: Per-Stage Narrative Differences

### The "Aha" Moment: Narrative Inconsistency

The most valuable insight in this section is often not the overall positioning but the **inconsistency** between stages. A company that is CHAMPION at Commitment but INVISIBLE at Evaluation has a specific, addressable problem: candidates who reach the application stage love what they find, but most candidates never get there.

### Shift Detection Logic

Compare the client's `PositioningTier` across all stages that have data. Flag any pair of stages where:

1. **Positive-to-negative shift:** Client drops 2+ tiers between sequential stages (e.g., CONTENDER at Discovery -> INVISIBLE at Evaluation)
2. **Strength-at-wrong-stage:** Client is CHAMPION at Commitment but PERIPHERAL or below at Discovery/Evaluation -- strength is concentrated at the stage with the lowest leverage
3. **Inconsistent story:** Different tiers at adjacent stages create a contradictory candidate experience

### Shift Patterns and Templates

| Pattern | Detection | Template |
|---|---|---|
| **Late-stage collapse** | CONTENDER+ at Discovery/Consideration, INVISIBLE at Evaluation | "Candidates discover [Client] and form a reasonable impression, but when they move to compare employers, [Client] disappears. The pipeline breaks at the decision point." |
| **Strong finish, weak start** | INVISIBLE/PERIPHERAL at Discovery, CHAMPION at Commitment | "Candidates who find [Client] and persist through to the application stage encounter excellent information. The problem is that most candidates never find [Client] in the first place. [Client]'s best positioning exists at the stage fewest candidates reach." |
| **Broad weakness** | PERIPHERAL or below at 3+ stages | "[Client] lacks the content depth for AI to construct a substantive employer narrative at any stage. This is not a single-gap problem -- it is a systemic content footprint issue that requires a coordinated response across platforms." |
| **Single-stage break** | CONTENDER+ at all stages except one where INVISIBLE | "[Client] is well-positioned at [N] of [M] stages. The entire pipeline bottleneck traces to [Gap Stage], where [specific data absence]. Fixing this single gap would transform the overall positioning." |
| **Consistent strength** | CHAMPION or CONTENDER at all stages | "[Client] maintains strong positioning across the full candidate journey. AI tells a consistent, positive story at every stage. The priority is to defend this positioning and monitor for competitive erosion." |
| **Cautionary at consideration** | CAUTIONARY at Consideration, any tier elsewhere | "AI mentions [Client] at the research stage but the characterization discourages candidates. This is worse than invisibility: candidates who search for [Client] by name come away with a negative impression. The narrative at Consideration is undermining the pipeline regardless of performance at other stages." |

### Stage Transition Narrative

The per-stage paragraphs should not be four isolated descriptions. They should tell a connected story of the candidate's journey through AI:

> "The candidate journey through AI starts reasonably for [Client]. At Discovery, [Client] appears on the list -- not prominently, but present. At Consideration, candidates who search for [Client] by name find [positive/adequate/thin] information. But at Evaluation -- the stage where candidates compare employers on compensation and fit -- the story breaks. [Client] disappears entirely. The candidate who was building interest in [Client] is now comparing employers without [Client] in the frame. By the time the candidate reaches Commitment, it is too late: the comparison was made, and [Client] was not part of it."

**Data:** `JourneyAnalysis.stages` array, iterated in funnel order (`DECISION_STAGES` constant).

---

## Part 5: Competitive Narrative Displacement

### What Displacement Is

Displacement is the most premium insight in this section. It occurs when AI actively positions a competitor ahead of the client -- not just mentioning the competitor more often, but constructing a narrative where the competitor fills the role the client should occupy.

Displacement is different from a visibility gap. A visibility gap means the client is absent. Displacement means the competitor is *present in the client's place*, often described in terms that make the competitor the obvious choice.

### Detecting Displacement

Displacement requires two conditions at a given stage:

1. **Competitor prominence:** The top competitor's mentionRate at this stage is >= 0.6 (competitor is consistently present)
2. **Client absence or weakness:** The client's mentionRate at this stage is < 0.3 (client is rarely or never present)

When both conditions hold, the competitor is not just visible -- it occupies the candidate's attention in the space where the client should be.

**Strength of displacement:**

| Competitor Rate | Client Rate | Displacement Severity |
|---|---|---|
| >= 0.8 | < 0.2 | Critical displacement: competitor fully occupies the candidate's frame |
| >= 0.6 | < 0.3 | Strong displacement: competitor is the default answer |
| >= 0.5 | < 0.4 | Moderate displacement: competitor has a clear narrative advantage |

**Data:** Per-stage `StageVisibility.topCompetitor.mentionRate` and `StageVisibility.mentionRate`.

### Presenting Displacement in the Report

Displacement should be presented as "what the candidate reads," not as abstract data. The composer constructs a representative scenario:

**Template (Critical Displacement):**

> "At the [Stage] stage, [Top Competitor] has displaced [Client] in AI-driven candidate research. When candidates ask '[stage question],' AI constructs its answer almost entirely from [Top Competitor] data. [Top Competitor] appears in [competitor rate] of these responses; [Client] appears in [client rate]. In practical terms, candidates who use AI for [stage purpose] receive a response that features [Top Competitor] and excludes [Client]. The candidate's decision at this stage is shaped by [Top Competitor]'s narrative alone."

**Template (Strong Displacement):**

> "At the [Stage] stage, [Top Competitor] holds a dominant narrative position. AI responds to candidate queries at this stage with [Top Competitor] as a primary recommendation ([competitor rate] mention rate) while [Client] appears infrequently ([client rate]). Candidates who rely on AI research form their impression of this competitive space based primarily on [Top Competitor]'s story."

### Making Displacement Actionable

After presenting the displacement, immediately connect to the remediation:

**Template:**

> "This displacement is driven by a data gap, not a quality gap. [Top Competitor] has [specific content presence: 'salary data on Levels.fyi, 800+ Glassdoor reviews, active Blind discussions']. [Client] has [specific content absence]. When [Client] publishes [specific content type] on [specific platforms], AI will have the data it needs to include [Client] in these responses. Displacement is addressable because it is caused by source availability, not by AI's assessment of employer quality."

**Data:** Per-stage `gapDomains` from `StageVisibility`, cross-referenced with `classifySourceType()` and `PLATFORM_KNOWLEDGE` from `recommendations.ts`.

---

## Part 6: Language and Tone

### Directness Calibration

This section tells a company something they may not want to hear: AI does not think they are a good employer to recommend. The language must be direct enough to create urgency but framed in a way that:

1. **Attributes the positioning to data, not to quality.** AI is not making a judgment about whether the company is a good employer. It is synthesizing available data. If the data is absent or negative, the positioning reflects the data, not the reality.

2. **Focuses on what AI says, not what the company is.** "AI describes you as..." not "You are..." The client is the audience, and AI is the subject. This creates emotional distance between the finding and the buyer's identity.

3. **Connects every finding to a candidate behavior.** "AI says X" is informational. "Candidates who read X decide Y" is actionable. The section should always close the loop to candidate impact.

### Framing Bad News

**Pattern:** State the finding. Attribute it to data. State the candidate impact. Name the fix.

**Good:**
> "At the Evaluation stage, AI describes Apex Cloud Systems as the compensation leader in this competitive set. Meridian is absent from these comparisons -- not because AI has evaluated Meridian's compensation and found it lacking, but because the underlying salary data does not exist on the platforms AI draws from. Candidates who compare employers on compensation see Apex and do not see Meridian. Publishing salary data on Levels.fyi directly addresses this gap."

**Bad:**
> "Meridian's compensation positioning is weak compared to Apex Cloud Systems, which may be concerning for talent acquisition efforts."

The bad version makes a judgment ("weak"), uses passive voice ("may be concerning"), and offers no path forward.

### Creating Urgency Without Alarm

**Rules:**

- Never describe the positioning as "at risk" or "concerning" -- these are abstract. Instead, describe what candidates experience: "Candidates comparing employers see Apex and do not see Meridian."
- Never use exclamation points or urgency words ("critical threat," "alarming gap"). Let the numbers create urgency: "In 5 out of 6 compensation queries, AI constructed the comparison without Meridian."
- Name the competitor. "Your biggest competitor has displaced you" is generic. "Apex Cloud Systems appears in 75% of comparison queries while Meridian appears in 17%" is specific and undeniable.
- Frame the timeline. "This is happening now, in responses candidates are reading today" is more urgent than "this could impact hiring."

### Connecting Insight to Hiring Consequence

Every narrative finding should close with a hiring consequence. The mapping:

| Positioning Finding | Hiring Consequence |
|---|---|
| Invisible at Discovery | Candidates build shortlists from competitors. Meridian is never in the consideration set. |
| Contender at Consideration | Candidates keep Meridian on the list but develop stronger impressions of better-positioned competitors. |
| Invisible at Evaluation | Candidates compare employers without Meridian. The decision is made before Meridian enters the conversation. |
| Cautionary at any stage | Candidates who encounter Meridian receive a signal to deprioritize it. Visibility becomes a negative. |
| Champion at Commitment only | Candidates who reach the application stage convert well -- but the funnel leading to this stage loses candidates at earlier stages. |

---

## Part 7: Confidence-Aware Wording

### Core Principle

Confidence applies to the *precision* of the positioning claim, not to the *classification* itself. INVISIBLE means invisible, regardless of sample size. If the client was not mentioned in any of the 6 Evaluation queries, it was not mentioned. The hedge applies to how representative those 6 queries are of all possible Evaluation queries -- not to whether the client was mentioned.

### Per-Confidence-Tier Wording

**HIGH (confidence score >= 70):**

Assert the positioning directly. No qualifiers.

> "AI consistently positions Apex ahead of Meridian at the Evaluation stage. In the queries evaluated, Apex appears in 75% of comparison responses while Meridian appears in 17%. This is a well-established pattern across a robust sample."

**MEDIUM (confidence score 40-69):**

Scope the claim to the assessed data but do not weaken the directional finding.

> "In the queries evaluated, AI tends to position Apex more favorably than Meridian at the Evaluation stage. Apex appears in approximately 75% of comparison responses while Meridian appears in approximately 17%. This pattern is consistent across the assessed queries, though a broader sample would provide additional precision."

**LOW (confidence score < 40):**

Signal that the finding is preliminary while preserving the directional insight.

> "Early signals suggest a narrative gap at the Evaluation stage. In the limited queries assessed, Apex appears significantly more frequently than Meridian in comparison responses. A larger assessment would provide more definitive positioning analysis, but the directional pattern -- Meridian's absence from compensation comparisons -- is clear even in this preliminary sample."

### What Is Never Hedged

1. **The INVISIBLE classification.** If the client was not mentioned, it was not mentioned. Regardless of sample size. "Meridian was not mentioned in any of the [N] Evaluation queries assessed" is a fact, not a claim that requires hedging.

2. **The tier label.** CHAMPION, CONTENDER, PERIPHERAL, CAUTIONARY, INVISIBLE are classifications based on defined thresholds. The classification is deterministic given the inputs. The hedge applies to how confident we are that the inputs are representative, not to the classification logic itself.

3. **The remediation direction.** "Publish salary data on Levels.fyi" is a professional recommendation, not a measurement claim. Recommendations are not hedged.

### Where Confidence Appears in the Section

| Element | Confidence Handling |
|---|---|
| Positioning summary table | Confidence column shows per-stage tier (visible, not buried) |
| Client narrative per stage | One qualifying phrase per stage paragraph based on stage confidence |
| Competitive narrative | Inherits per-stage confidence tier |
| Positioning gap table | Footnote if any stage is LOW confidence |
| Displacement finding | Scoped to assessed queries if MEDIUM, noted as preliminary if LOW |
| "What can change" subsection | No hedging needed (forward-looking framing) |

### Confidence Footnote Template (for LOW stages)

> "Positioning at the [Stage] stage is based on [N] queries. This is a preliminary signal. A broader assessment covering additional [stage-relevant query types] would strengthen the confidence in this positioning classification."

---

## Part 8: Worked Example -- Meridian Technologies

This is the complete section as it would appear in a delivered report for Meridian Technologies. All data is drawn from the seed data in `packages/db/prisma/seed.ts`.

### Data Summary (from seed)

| Stage Proxy (Cluster) | Queries | Meridian Mentioned | Mention Rate | Avg Visibility | Avg Sentiment |
|---|---|---|---|---|---|
| Engineering Culture (Discovery/Consideration) | 6 | 3 | 50% | 60 (when mentioned) | 0.5 (when mentioned) |
| Compensation (Evaluation) | 6 | 1 | 17% | 38 (when mentioned) | -0.1 (when mentioned) |
| Hiring Process (Commitment) | 6 | 5 | 83% | 61 (when mentioned) | 0.56 (when mentioned) |
| Role Expectations (Consideration) | 6 | 4 | 67% | 61 (when mentioned) | 0.55 (when mentioned) |
| Culture & WLB (Discovery/Consideration) | 6 | 1 | 17% | 35 (when mentioned) | 0.1 (when mentioned) |
| Competitor Comparison (Evaluation) | 6 | 3 | 50% | 51 (when mentioned) | 0.33 (when mentioned) |

Approximate stage mapping (for positioning classification):
- **Discovery:** Engineering Culture + Culture & WLB = 4/12 = 33% mention rate -> PERIPHERAL
- **Consideration:** Role Expectations + direct research queries = ~67% -> CONTENDER
- **Evaluation:** Compensation + Competitor Comparison = 4/12 = 33% mention rate, but compensation alone is 17% -> Between PERIPHERAL and INVISIBLE depending on grouping. For narrative purposes, the Compensation cluster (the pure Evaluation signal) is the story: **INVISIBLE at pure compensation evaluation.**
- **Commitment:** Hiring Process = 5/6 = 83% -> CHAMPION

Top competitor: **Apex Cloud Systems** at ~75% overall.

---

### Rendered Section

---

**How AI Describes You**

Visibility measures whether AI mentions Meridian Technologies. Positioning measures *how* AI describes Meridian when it does. A company can appear in every AI response but still lose candidates if the description is lukewarm, incomplete, or qualified with caveats. This section analyzes the narrative AI constructs about Meridian at each stage of the candidate journey -- and how that narrative compares to the story AI tells about Apex Cloud Systems.

**Positioning by Stage**

| Stage | Positioning | Narrative Pattern | Candidate Impact | Confidence |
|---|---|---|---|---|
| Discovery | Peripheral | Listed but barely described | Candidates may see the name but form no impression | Medium |
| Consideration | Contender | Adequate profile, slightly positive | Candidates keep Meridian on the list without enthusiasm | Medium |
| Evaluation | Invisible | Absent from compensation comparisons | Candidates compare employers without Meridian in the frame | Medium |
| Commitment | Champion | Detailed, positive interview narrative | Candidates who reach this stage are encouraged to apply | Medium |

**What AI Says About Meridian**

The candidate journey through AI starts poorly for Meridian and recovers only at the stage with the least leverage.

At Discovery, Meridian is Peripheral. When candidates ask AI "What companies should I consider for backend engineering in Austin?", Meridian appears in roughly one-third of responses, typically named briefly in a list without differentiation. A representative AI response lists Apex Cloud Systems and NovaBridge Analytics with specific attributes -- "competitive compensation," "strong engineering culture," "open-source contributions" -- and then adds Meridian as an afterthought: "Meridian Technologies is also in the supply chain space." Candidates scanning this response gravitate toward the names with more substance. Meridian registers as background, not as an option.

At Consideration, the picture improves. When candidates search for Meridian by name -- "What is it like to work as an engineer at Meridian Technologies?" -- AI constructs a reasonable company profile. The description covers the product domain (supply chain optimization), the technical stack (Go and TypeScript), the growth stage (Series D, scaling AI/ML), and general culture signals. Sentiment is slightly positive. But the description lacks the specificity that creates urgency: no compensation philosophy, no concrete growth numbers, no differentiated culture narrative. Candidates who search for Meridian learn what the company *is* but not why they should prioritize it over alternatives.

At Evaluation, Meridian is Invisible. This is where the candidate pipeline breaks. When candidates ask AI to compare employers on compensation, equity, and benefits, Meridian does not appear. In 5 of 6 compensation-related queries, AI constructed its answer entirely from competitor data -- Apex Cloud Systems and VeloChain on salary benchmarks, NovaBridge Analytics on equity packages. The one query where Meridian appeared ("How does Meridian Technologies compensation compare to competitors?") produced a response that noted "less transparency around equity and total compensation compared to competitors like Apex Cloud Systems" and "limited data" -- a Cautionary characterization that discourages rather than encourages. Meridian is not positioned unfavorably at the Evaluation stage. It is absent. And the one exception is worse than absence.

At Commitment, Meridian is a Champion. When candidates ask about the interview process, AI delivers detailed, positive information: a clear timeline ("2-3 weeks, faster than many enterprise companies"), a structured process (recruiter screen, technical phone screen, virtual onsite), and positive candidate sentiment. This is exactly the positioning Meridian would want across all stages. The problem is that it exists only at the stage fewest candidates reach.

**What AI Says About Apex Cloud Systems**

For comparison, AI positions Apex Cloud Systems as a Champion or strong Contender at every stage. At Discovery, Apex is the first name mentioned in employer lists, described with specific attributes ("competitive compensation," "remote-first engineering culture," "4.2 Glassdoor rating"). At Consideration, Apex receives a detailed profile anchored by concrete data points. At Evaluation, Apex dominates compensation comparisons with salary data from Levels.fyi and discussion presence on Blind. At Commitment, Apex appears in most interview process responses, though with slightly less enthusiasm than Meridian (the process is "structured but can be lengthy").

The contrast is most consequential at the Evaluation stage. Apex is featured; Meridian is absent.

**The Positioning Gap**

| Stage | Meridian | Apex | Narrative Gap | Candidate Consequence |
|---|---|---|---|---|
| Discovery | Peripheral | Champion | Apex featured with detail; Meridian listed briefly | Candidates prioritize Apex before researching Meridian |
| Consideration | Contender | Champion | Apex described with concrete data; Meridian described generically | Candidates develop stronger impression of Apex |
| Evaluation | Invisible | Champion | Meridian absent; Apex anchors all comparisons | Candidates compare options without Meridian in the frame |
| Commitment | Champion | Contender | Meridian leads on interview detail and speed | Few candidates reach this stage to benefit |

The positioning gap tells a specific story: Meridian loses candidates at every stage before the one where it wins. By the time a candidate reaches Commitment -- where Meridian's positioning is strongest -- the candidate's shortlist has already been shaped by stages where Apex dominated.

**What Drives the Gap**

The positioning gap at the Evaluation stage is not about employer quality. It is about data availability. AI constructs compensation comparisons from Levels.fyi, PayScale, Glassdoor Salaries, and Blind. Apex Cloud Systems has salary data on Levels.fyi, active compensation discussions on Blind, a 4.2 Glassdoor rating with substantial review volume, and consistent press coverage. These are the exact sources AI synthesizes when a candidate asks "How does Apex's compensation compare?"

Meridian has no indexed salary data on Levels.fyi. Glassdoor compensation data is limited. Meridian is absent from Blind discussions. AI cannot include Meridian in compensation comparisons because the underlying data does not exist. This is a data availability problem, not an employer brand problem.

At Discovery, the gap is similar: Built In, Comparably, and Glassdoor's "Best Places" lists are the citation sources AI draws from for employer rankings. Apex and NovaBridge have active profiles on these platforms. Meridian does not. AI cannot feature Meridian in employer lists when the listing platforms do not carry Meridian's profile.

**What Can Change**

AI-generated employer narratives are not permanent characterizations. They are synthesized from indexed sources that change over time. When the underlying data changes, the narrative changes. The positioning gaps identified in this section are addressable through specific actions on specific platforms.

| Current Positioning | Target | What Needs to Change | Remediation |
|---|---|---|---|
| Invisible at Evaluation | Contender | Salary data on Levels.fyi and Glassdoor | See Recommendation #1: Publish compensation data within 30 days |
| Peripheral at Discovery | Contender | Employer profiles on Built In and Comparably | See Recommendation #2: Establish employer ranking platform presence |
| Contender at Consideration | Champion | Deeper culture content, engineering blog, specific EVP data | See Recommendation #4: Strengthen content depth |
| Champion at Commitment | Defend | Maintain interview review volume, keep process content current | Monitor quarterly; no immediate action required |

The highest-leverage change is at the Evaluation stage. Moving from Invisible to Contender at Evaluation has the largest impact on pipeline throughput because it occurs at the decision point -- the stage where candidates choose between employers. Every other stage improvement is secondary to this.

---

## Part 9: Anti-Patterns Specific to This Section

### Anti-Pattern 1: Describing Tiers as Scores

**Bad:**
> "Meridian received an Invisible positioning score at the Evaluation stage."

**Why it fails:** "Score" implies measurement precision. Positioning is a classification derived from observed patterns. Calling it a "score" invites the buyer to debate the methodology instead of acting on the finding.

**Good:**
> "Meridian is Invisible at the Evaluation stage."

### Anti-Pattern 2: Hedging the Invisible Tier

**Bad:**
> "Preliminary analysis suggests Meridian may have limited positioning at the Evaluation stage, pending further data collection."

**Why it fails:** If the client was not mentioned in compensation queries, it was not mentioned. That is a fact, not a preliminary finding. Hedging Invisible undermines the section's most urgent finding.

**Good:**
> "Meridian was not mentioned in any of the 6 compensation-related queries evaluated. A broader assessment would determine how consistent this pattern is across additional query variations, but the finding is unambiguous: in the queries assessed, Meridian is absent from compensation comparisons."

### Anti-Pattern 3: Generic Tier Descriptions

**Bad:**
> "At the Contender tier, companies receive moderate visibility with neutral sentiment."

**Why it fails:** This describes the classification criteria, not the candidate experience. The buyer does not care about tier definitions. They care about what candidates see.

**Good:**
> "At Consideration, AI includes Meridian in its response but describes it generically -- the product domain, the team size, the growth stage. Missing: why a candidate should choose Meridian over the three other companies described with more enthusiasm."

### Anti-Pattern 4: Treating All Stages Equally

**Bad:**
> (Spending equal words on each stage, even when one stage is the obvious story)

**Why it fails:** Not every stage is equally important to the narrative. The section should spend the most words on the stage with the most consequential finding. For Meridian, the Evaluation stage is the story. Discovery and Consideration are context. Commitment is the bright spot. The section should allocate word count accordingly.

**Good:** Evaluation gets a full paragraph with specific query counts, specific response patterns, and a displacement analysis. Commitment gets 3 sentences acknowledging the strength.

### Anti-Pattern 5: Disconnecting Positioning from Action

**Bad:**
> "Meridian's positioning at the Evaluation stage is classified as Invisible, which represents a significant gap in the candidate decision journey."

**Why it fails:** States the finding but does not connect it to anything the buyer can do. The word "significant" adds nothing.

**Good:**
> "Meridian is Invisible at Evaluation because AI has no salary data to work with. Publishing compensation data on Levels.fyi (see Recommendation #1) directly addresses this."

### Anti-Pattern 6: Dumping Raw Response Text

**Bad:**
> AI Response: "Senior backend engineers in enterprise SaaS in Austin typically earn $165K-$210K base, with total compensation including equity ranging from $200K-$300K. Apex Cloud Systems is among the higher-paying employers..."

**Why it fails:** Raw responses are noisy, vary between queries, and look like system output, not strategic analysis. The buyer sees unprocessed data instead of interpreted findings.

**Good:** Paraphrase the pattern: "When candidates ask about compensation, AI names Apex Cloud Systems and VeloChain with specific salary ranges but does not mention Meridian. The response is coherent and complete without Meridian -- AI did not omit it due to a gap in its reasoning. Meridian simply does not exist in the data AI draws from."

---

## Part 10: Implementation Notes

### New Types Needed

```typescript
// In report-composer.ts or a new narrative-positioning.ts file

export type NarrativePattern =
  | "FEATURED_RECOMMENDATION"
  | "LISTED_NOT_FEATURED"
  | "BRIEF_PERIPHERAL"
  | "MENTIONED_WITH_CAVEATS"
  | "ABSENT";

export type DisplacementSeverity =
  | "CRITICAL"   // competitor >= 0.8, client < 0.2
  | "STRONG"     // competitor >= 0.6, client < 0.3
  | "MODERATE"   // competitor >= 0.5, client < 0.4
  | "NONE";

export type StageShiftPattern =
  | "LATE_STAGE_COLLAPSE"
  | "STRONG_FINISH_WEAK_START"
  | "BROAD_WEAKNESS"
  | "SINGLE_STAGE_BREAK"
  | "CONSISTENT_STRENGTH"
  | "CAUTIONARY_AT_CONSIDERATION";

export interface NarrativePositioningAnalysis {
  /** Per-stage client narrative pattern */
  clientPatterns: Array<{
    stage: DecisionStage;
    tier: PositioningTier;
    narrativePattern: NarrativePattern;
    candidateImpact: string;
  }>;
  /** Per-stage competitor narrative approximation (top competitor only) */
  competitorPatterns: Array<{
    stage: DecisionStage;
    competitorName: string;
    approximateTier: PositioningTier;
  }>;
  /** Per-stage positioning gap */
  positioningGaps: Array<{
    stage: DecisionStage;
    clientTier: PositioningTier;
    competitorTier: PositioningTier;
    narrativeGap: string;
    candidateConsequence: string;
  }>;
  /** Displacement detection per stage */
  displacements: Array<{
    stage: DecisionStage;
    competitorName: string;
    severity: DisplacementSeverity;
    competitorRate: number;
    clientRate: number;
  }>;
  /** Cross-stage shift pattern */
  shiftPattern: StageShiftPattern;
  /** The stage where the most consequential positioning finding occurs */
  criticalStage: DecisionStage | null;
}
```

### New Functions Needed

```typescript
/**
 * Classify the narrative pattern from visibility and sentiment scores.
 * Uses the client narrative pattern table from Part 1.
 */
function classifyNarrativePattern(
  mentioned: boolean,
  avgVisibility: number,
  avgSentiment: number,
): NarrativePattern;

/**
 * Approximate a competitor's positioning tier at a given stage
 * from their mention rate alone (no per-competitor sentiment data yet).
 * Uses relaxed thresholds with neutral sentiment assumption.
 */
function approximateCompetitorTier(
  competitorMentionRate: number,
): PositioningTier;

/**
 * Detect displacement at a given stage.
 */
function detectDisplacement(
  competitorRate: number,
  clientRate: number,
): DisplacementSeverity;

/**
 * Detect the cross-stage shift pattern from an array of per-stage
 * positioning tiers.
 */
function detectShiftPattern(
  stages: Array<{ stage: DecisionStage; tier: PositioningTier }>,
): StageShiftPattern;

/**
 * Generate the candidate impact string for a given positioning tier.
 */
function candidateImpactForTier(
  tier: PositioningTier,
  stage: DecisionStage,
  clientName: string,
): string;

/**
 * Build the full NarrativePositioningAnalysis from JourneyAnalysis data.
 */
function computeNarrativePositioning(
  journey: JourneyAnalysis,
  clientName: string,
  topCompetitorName: string,
): NarrativePositioningAnalysis;

/**
 * Compose the "How AI Describes You" report section from the analysis.
 */
function composeNarrativePositioningSection(
  analysis: NarrativePositioningAnalysis,
  clientName: string,
  topCompetitorName: string,
  stageConfidence: Record<DecisionStage, { score: number; tier: string }>,
): ReportSection;
```

### Data Flow

```
JourneyAnalysis (from stage-comparison.ts)
  |
  v
computeNarrativePositioning()
  |-- Per stage: classifyNarrativePattern(mentioned, visibility, sentiment)
  |-- Per stage: approximateCompetitorTier(topCompetitor.mentionRate)
  |-- Per stage: detectDisplacement(competitorRate, clientRate)
  |-- Cross-stage: detectShiftPattern(allTiers)
  |
  v
NarrativePositioningAnalysis
  |
  v
composeNarrativePositioningSection()
  |-- Opening paragraph (template)
  |-- Positioning summary table (from clientPatterns)
  |-- Client narrative paragraphs (per stage, word count weighted by criticality)
  |-- Competitive narrative summary (from competitorPatterns)
  |-- Positioning gap table (from positioningGaps)
  |-- Displacement callout (if any stage has CRITICAL or STRONG displacement)
  |-- "What drives the gap" paragraphs (from StageVisibility.gapDomains)
  |-- "What can change" table (from positioningGaps + recommendations cross-ref)
  |
  v
ReportSection (existing type from report-composer.ts)
```

### Integration with Existing Report Composer

The section is composed as `composeNarrativePositioningSection()` and inserted between `composeCitationEcosystem()` (Section 4) and `composePipelineImpact()` (Section 6) in the report section array.

**Backward compatibility:** When `stageBreakdown` is not available on `ReportInput`, this section is omitted entirely (as specified in report-blueprint-v2.md). The narrative positioning analysis requires per-stage data to be meaningful.

### Subsection Mapping to ReportSection/ReportSubsection Types

```typescript
// The section uses the existing ReportSection/ReportSubsection types:
{
  heading: "How AI Describes You",
  body: opening_paragraph,  // 2.1
  subsections: [
    {
      heading: "Positioning by stage",
      table: positioning_summary_table,  // 2.2
    },
    {
      heading: "What AI says about [Client]",
      body: client_narrative_paragraphs,  // 2.3
    },
    {
      heading: "What AI says about [Top Competitor]",
      body: competitor_narrative_paragraphs,  // 2.4
    },
    {
      heading: "The positioning gap",
      body: gap_narrative,
      table: gap_summary_table,  // 2.5
    },
    {
      heading: "What drives the gap",
      body: data_source_explanation,  // 2.6
    },
    {
      heading: "What can change",
      body: forward_looking_framing,
      table: narrative_shift_table,  // 2.7
    },
  ],
}
```

### Performance Considerations

The narrative positioning analysis adds no new database queries. All data is derived from `JourneyAnalysis` (already computed) and `ScanComparisonResult` (already computed). The computational overhead is pure in-memory classification and template selection. No additional API calls, no response text parsing.

### Testing Approach

1. **Unit test `classifyNarrativePattern()`:** Verify that each combination of mentioned/visibility/sentiment produces the expected NarrativePattern.

2. **Unit test `detectDisplacement()`:** Verify severity thresholds.

3. **Unit test `detectShiftPattern()`:** Verify that Meridian's tier array [PERIPHERAL, CONTENDER, INVISIBLE, CHAMPION] produces `SINGLE_STAGE_BREAK` (or `LATE_STAGE_COLLAPSE` depending on the Evaluation classification).

4. **Integration test `composeNarrativePositioningSection()`:** Using Meridian seed data, verify that the composed section:
   - Contains the opening paragraph
   - Contains the positioning summary table with 4 rows
   - Contains per-stage narrative paragraphs
   - Contains the positioning gap table
   - Contains a displacement callout for Evaluation stage
   - Allocates the most narrative to Evaluation (the critical stage)
   - Does not dump raw response text

5. **Snapshot test:** Capture the full rendered section for Meridian and compare against the worked example in Part 8 of this document.

---

## Appendix: Language Reference Tables

### Narrative Pattern Display Names

| Internal Value | Report Display |
|---|---|
| FEATURED_RECOMMENDATION | Featured as a primary recommendation |
| LISTED_NOT_FEATURED | Listed but not featured or differentiated |
| BRIEF_PERIPHERAL | Mentioned briefly, not substantively |
| MENTIONED_WITH_CAVEATS | Mentioned with qualifications or caveats |
| ABSENT | Not present in the response |

### Displacement Severity Display Language

| Severity | Report Language |
|---|---|
| CRITICAL | "[Competitor] has displaced [Client] at the [Stage] stage" |
| STRONG | "[Competitor] holds a dominant narrative position at the [Stage] stage" |
| MODERATE | "[Competitor] has a clear narrative advantage over [Client] at the [Stage] stage" |
| NONE | (No displacement callout) |

### Stage Question Templates (for narrative context)

| Stage | Candidate Question Used in Narrative |
|---|---|
| Discovery | "What companies should I consider for [role] in [location]?" |
| Consideration | "What is it like to work at [Client]?" |
| Evaluation | "How does [Client]'s compensation compare to competitors?" |
| Commitment | "What is the interview process like at [Client]?" |

These are drawn from `STAGE_CONFIGS` in `decision-journey/types.ts` and adapted for narrative use with client-specific detail.
