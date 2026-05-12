---
title: "The Hiring Pipeline Leak That Doesn't Show Up in Your ATS: How to Measure It"
description: "Top candidates research employers through AI before responding to recruiter outreach. When AI's answer is thin, the recruiter never gets a reply -- and the loss is invisible to the applicant tracking system. A walkthrough of the four-dimension audit methodology that surfaces the leak: 40 candidate-intent queries, 4 AI models, 3 named candidate personas, 4 candidate-journey stages."
date: "2026-05-12"
author: "Jordan Ellison"
tags: ["ai-visibility", "methodology", "chro", "talent-acquisition", "audit", "candidate-research"]
status: "ready"
---

## The Leak You Cannot See In Your Funnel

A senior hire costs a mid-market company between $1M and $3M once ramp time, productivity gap, and replacement cost are loaded in. For revenue-org roles -- senior account executives, sales managers, customer success leadership -- the loaded cost runs $300K to $500K per role, and a mid-market company is hiring 30 to 80 of them a year. The math compounds quickly.

What does not show up in that math, and does not show up in the applicant tracking system, is the candidate who never replied to the recruiter ping in the first place. A specific sequence has become common: the LinkedIn message arrives, the candidate looks up the company, the candidate opens ChatGPT or Claude or Gemini or Perplexity, and the candidate types something close to *"is [Company] a good place to work, and how does it compare to [Competitor]?"* The reply that comes back shapes whether the recruiter ever gets a response.

When the AI synthesis is thin, generic, contradictory, or unfavorable, the candidate moves on. The recruiter never hears no. The pipeline never logs a rejection. The chief HR officer never sees the leak in the dashboard, because the applicant tracking system records candidates who entered the funnel, not candidates who declined to enter it. The leak is real, it is large, and it is structurally invisible to the existing instrumentation.

This post walks through the methodology that makes the leak measurable. The dimensions are specific: 40 candidate-intent queries, across 4 AI models, across 3 named candidate personas, across 4 candidate-journey stages. The math from those dimensions -- 480 model responses per company -- is the unit of measurement. The output is a set of findings that map directly to remediation work the company's existing employer brand, recruitment marketing, and content teams can do. The Diagnostic that runs this measurement is a fixed-fee, 10-business-day audit. The full methodology is published below so a CHRO can evaluate the instrument before authorizing it.

## Why the Methodology Has Four Dimensions

The narrow question a CHRO is asking when they authorize an AI employer visibility audit is not "what does AI say about us." It is sharper than that: *how does AI describe our company to the specific candidates we are trying to hire, at the specific moments those candidates are deciding whether to engage with us, across the AI systems those candidates actually use?*

That question has four dimensions. A measurement that collapses any one of them produces output that does not generalize back to the hiring decisions the CHRO has to make:

1. **Candidate-intent queries** -- the questions candidates actually ask when researching where to work, drawn from a candidate-research library rather than improvised for the engagement
2. **Candidate-journey stages** -- the four moments at which candidates evaluate an employer, each producing materially different AI responses
3. **AI models** -- the four leading AI systems candidates currently use to research employers, each with different training data, citation behavior, and synthesis style
4. **Candidate personas** -- the named archetypes within the client's job category whose research framing varies enough to produce different AI answers

Running 40 queries against 4 models for 3 personas across 4 stages produces 480 model responses per company. That figure is not a marketing artifact. It is what survives once each dimension is given enough coverage that the finding is reproducible rather than anecdotal.

The next four sections walk through each dimension. If you are a CHRO at a mid-market or enterprise company hiring more than 20 senior revenue roles a year, the patterns in each dimension translate directly to a measurable share of the pipeline leak that does not currently appear in your dashboards.

## Dimension One: 40 Candidate-Intent Queries

The most common shortcut in early AI visibility work is to run a small batch of queries -- five or ten, sometimes one -- and treat what comes back as representative. The result is not measurement. It is a small sample of a high-variance distribution. Run the same query twice and the second response will diverge from the first; run a different but related query and the variance widens.

The methodology floor for a hiring-specific Diagnostic is 40 candidate-intent queries per company, distributed evenly across the four candidate-journey stages -- ten queries per stage.

The queries themselves come from a candidate-intent library, not from analyst improvisation. Candidate-intent queries are the questions a real candidate would type into an AI model when researching whether to engage with a specific employer. Examples (paraphrased and sector-neutral):

- "What is it like to work at [Company]?"
- "How does [Company] compare to [Competitor] as a place to work?"
- "What are the strongest companies in [industry] to work for as a [role]?"
- "Is [Company] a good employer for [persona attribute]?"
- "What do current employees say about [Company]?"

Each query is constructed so the candidate's intent is unambiguous to the AI model. The library is updated as candidate-research behavior evolves -- as new phrasing patterns appear, the library absorbs them.

Forty queries per company is not the ceiling. It is the floor that produces stable signal. Below 40, the variance in AI responses overwhelms the underlying pattern. Above 40, additional queries produce diminishing returns: the seventh query about culture at a given company does not surface materially different information than the third query. The audit budgets coverage where coverage matters and stops where it does not.

## Dimension Two: Four Candidate-Journey Stages

If you are running this kind of measurement against your own company, the single largest mistake to avoid is averaging across stages. A candidate researching an employer moves through four distinct moments, each producing a materially different question to an AI model -- and the company's visibility, sentiment, and citation pattern can diverge dramatically between them. A measurement that collapses across stages produces an averaged signal that masks the specific moments at which the company is winning or losing candidate attention.

The four stages are:

1. **Discovery** -- "What companies should I be looking at in [industry] or for a [role]?" The candidate is open-ended. They do not yet have a target list. The company either appears in the AI's synthesized answer or does not.
2. **Consideration** -- "How does [Company] compare to [Competitor]?" The candidate has a target list. They are evaluating tradeoffs across employers. AI surfaces co-mentions, comparisons, and competitive sentiment.
3. **Evaluation** -- "Is [Company] a good place to work as a [persona]? What is the compensation, the culture, the management quality?" The candidate is deciding whether to apply or interview. AI surfaces specific details about working conditions, comp, growth, and reputation.
4. **Commitment** -- "I have an offer from [Company]. Should I take it? What are the things current employees regret about working there?" The candidate is deciding whether to accept. AI surfaces tenure patterns, exit narratives, and second-order signals that rarely appear in earlier stages.

Ten queries per stage is the floor. Stages are not interchangeable. A company can be strongly visible at Discovery and structurally absent at Evaluation, or vice versa -- and the remediation for each pattern is different. Discovery invisibility is a top-of-funnel awareness problem. Evaluation invisibility is usually a citation-source mismatch where AI is reading platforms the company is not present on.

A scan that averages across stages cannot tell those two patterns apart. A scan that runs ten queries per stage can.

## Dimension Three: Four AI Models

The four AI models in scope are ChatGPT, Claude, Gemini, and Perplexity. These are the four AI systems candidates currently use most frequently when researching employers. Other models exist; some have meaningful niches. The four selected are the ones whose answers reach material candidate populations today.

The reason for running the scan against all four models, rather than one, is that the same query produces a meaningfully different response across them. The variance is not random. Each model has different training data cutoffs, different sources it weights heavily in synthesis, and different citation behaviors. The result is that a company can be strongly visible in one model and structurally absent in another, or described positively by one and negatively by another, on identical queries.

A few of the systematic differences:

- **Citation behavior.** Perplexity cites named sources inline; ChatGPT and Claude synthesize sources into a single answer without inline attribution in most candidate-intent queries; Gemini's behavior sits between.
- **Source weight.** Each model weights different citation surfaces differently. One model may surface a company's engineering blog content prominently; another may have not indexed it at all. One may give heavy weight to Glassdoor; another may discount it.
- **Sentiment synthesis.** Where contradictory information exists in the source corpus, models resolve it differently. One model may report a layoff narrative as the dominant cultural signal; another may surface it as historical context with current hiring growth foregrounded.
- **Recency.** Training-data cutoffs differ. A leadership change six months ago may be reflected in one model and absent in another.

Running the same query across all four models is what produces the *sentiment divergence index* -- a measurement of how widely AI models disagree about the same company. A high divergence number tells the CHRO that candidates using different AI tools will form different impressions of the company, and that one or more citation sources is contributing to the disagreement. A low divergence number means the AI consensus is stable -- which is good if the consensus is positive, and a hard problem to remediate if it is negative.

A single-model scan cannot produce a divergence number. It produces one answer and presents it as if it were *the* answer.

## Dimension Four: Three Candidate Personas

If the four dimensions of this methodology are what make a hiring-specific audit structurally different from a brand-side scan, the persona dimension is where the difference is most legible. AI does not produce the same answer for a "Senior AE candidate researching [Company]" as it does for "[Company] as an employer." The framing of the query matters. Different personas surface different AI behaviors because the model's synthesis is conditioned on the role and seniority context the candidate brings to the query.

Each Diagnostic uses three named candidate personas, scoped to the client's named job category. A "Software Engineering" engagement runs different personas than a "Revenue" engagement. The personas are drawn from a library of archetypes by years of experience and track, then specialized to the client's named category. Examples (sector-neutral on the surrounding company):

- *Revenue category* -- Senior AE (5-10 years closing experience), Sales Manager (people leadership, 5+ years), VP Sales candidate (executive search)
- *Engineering category* -- New-grad SWE, Staff infrastructure engineer (8-15 years), Engineering Manager
- *Customer Success category* -- Senior CSM (5-10 years), Director of Customer Success, VP Customer Success candidate

The persona is not a metadata tag. It parameterizes the AI query at call time. Each model receives intent context specifying who is asking the question and what they are weighing. The AI model conditions its synthesis on that context -- producing genuinely different answers, not the same answer relabeled three times.

This is the dimension that produces some of the most actionable findings in a Diagnostic Report. Three patterns recur:

1. **Persona invisibility.** AI returns rich, coherent answers about working at the company for some personas and produces vague, generic answers for others. The asymmetry is usually a citation-coverage problem -- specific platforms cover one persona's research surface (engineering blogs for software engineering, Levels.fyi for technical IC compensation, RepVue for sales reps, the Gainsight community for customer success) and not others.
2. **Cross-persona contradictions.** AI describes the company favorably to one persona and unfavorably to another. Often the contradiction reflects a real tension in the company's culture -- it is a great place for experienced ICs but not for managers, or vice versa -- that is visible in the citation corpus but invisible in the company's own brand narrative.
3. **Persona-specific citation-source maps.** The platforms AI cites when answering for a Senior AE candidate are not the same platforms it cites for a Staff Engineer candidate. A company's content strategy may cover the engineering surface well and the sales surface poorly, or any other combination.

A scan that does not run distinct personas cannot surface any of these. The output is a single averaged narrative about working at the company -- useful for general awareness, insufficient for hiring decisions tied to specific candidate populations.

## Three Worked Examples

The persona dimension is the one most worth grounding in examples. The following are sector-neutral illustrations of what running the same Diagnostic methodology produces across three different candidate personas at the same hypothetical company. The company is a mid-market employer in any sector; the patterns generalize.

### Worked example one -- Senior AE persona

A scan run for a Senior Account Executive persona (5-10 years of closing experience, evaluating revenue-org employers) typically surfaces patterns in three areas: commission-structure narrative, sales-culture description, and co-mention pattern against the company's named competitors.

What the methodology produces, across 40 queries × 4 models, is a structured view of:

- How AI describes the company's commission plan -- generously, conservatively, with named OTE ranges, with named accelerators, or without specifics
- Which competitor companies AI co-mentions in answers about working in the company's sales organization -- often a different set than the competitors the CHRO would name from instinct
- Which citation sources AI draws from when answering -- frequently RepVue, Sales Hacker, Substack newsletters by named sales leaders, and SaaStr session transcripts, in addition to Glassdoor and the company's own careers content
- Where sentiment diverges across the four models -- one model may surface a 2024 thread about a manager who churned a team, another may not have indexed it at all

A common pattern in the Senior AE persona is that the company's sales-culture narrative is more variable across AI models than its general culture narrative. This is because sales-specific citation sources are concentrated and personality-driven; a single departed sales leader's Substack can swing the AI synthesis for one model and not appear at all in another.

### Worked example two -- Staff Engineer persona

A scan run for a Staff Engineer persona (8-15 years, senior IC track, evaluating engineering-org employers) surfaces a different finding set. The dominant variables are tech-stack representation, senior-IC voice citation, engineering leadership credibility, and open-source presence.

Across the 480 model responses produced for this persona, the typical patterns are:

- Whether AI accurately surfaces the company's actual technology stack at any depth, or whether it returns generic phrasing like "modern web technologies"
- Whether AI cites named senior engineers from the company (engineering blog posts, conference talks, GitHub presence, podcast appearances)
- How AI characterizes the engineering leadership -- CTO and VP Engineering -- when the candidate asks who they would be working for
- How AI handles ambiguous signals -- open-source contributions, public engineering culture writing, hiring-related layoff history

Engineering personas often produce richer AI answers than other personas, because the engineering candidate-research surface is unusually well-cited. Engineering blogs, Stack Overflow contributions, conference talks, and developer-focused review platforms produce dense citation coverage. The corresponding pattern is that a company with weak engineering content presence shows up *more visibly* as an outlier in this persona than in other personas -- the contrast against well-cited competitors is starker.

### Worked example three -- Senior CSM persona

A scan run for a Senior Customer Success Manager persona (5-10 years, evaluating CS-org employers) surfaces patterns in three recurring areas: CS-culture description, career-path representation, and citation pattern around CS-specific surfaces.

The 480 model responses typically reveal:

- Whether AI describes the CS function as retention-aligned (compensation tied to renewals and gross retention) or expansion-aligned (compensation tied to net retention, upsell, and quota), and whether that description matches the company's actual comp plan
- How AI represents the career path from individual contributor CSM through manager to leadership -- often the thinnest narrative in any persona's output, because CS career-path content is sparsely cited across the public web
- Which citation sources AI draws from -- the Gainsight community, the Customer Success Network, ChurnZero's podcast, SaaStr customer-success-track session content, occasionally LinkedIn long-form posts by named CS leaders
- Where AI is silent -- the most common finding for the CSM persona is that AI returns thin or generic answers about specific companies' CS organizations, because the citation surface is sparse relative to the persona's hiring volume

A common pattern across mid-market companies is that the CSM persona surfaces lower AI visibility per hire than any other revenue-org persona, despite CSM hiring volume often equaling or exceeding AE hiring volume. The asymmetry is measurable, and the remediation is bounded: a small number of specific citation surfaces, if a company invests in them, produces disproportionate AI-citation lift for the persona.

## What the Methodology Produces

Running the four dimensions together produces 480 scored model responses per company. Each response is scored on four measurements:

- **Visibility** -- did the company appear in the model's answer at all?
- **Sentiment** -- positive, neutral, negative, or contradictory across the response
- **Co-mention rate** -- which other companies appeared alongside the named company, and in what comparative posture
- **Citation sources** -- which specific platforms AI cited or appeared to draw from in the synthesis

The scoring matrix produces the inputs to the Diagnostic Report's six finding categories: zero-presence queries, competitor dominance, stale narrative anchors, sentiment divergence, citation monoculture, and persona-specific invisibility. Each material finding in the report has a specific named issue, data evidence from the corpus, and an actionable category that maps to remediation work the company's existing employer brand, recruitment marketing, or content team can do.

A finding is not the same as an observation. A finding has all three: named issue, data evidence, actionable category. Observations without all three are not counted toward the report's material-finding total.

## What the Methodology Does Not Include

A Diagnostic is a measurement instrument, not a full strategic engagement. Specifically, the Diagnostic does not include:

- A Journey Action Map laying out remediation sequencing across quarters
- A prioritized remediation roadmap ranking findings by ROI
- Multi-layer conversational probing (single-turn queries only -- no follow-up questioning of the AI model)
- Hallucination or source-drift analysis (whether AI is citing accurate vs. inaccurate information)
- Cross-category pattern analysis comparing the company across multiple personas as a strategic narrative
- Quarterly re-scans or monitoring across time
- Competitor deep-dives beyond co-mention rate and citation mapping
- Content production or asset development

Those exist in deeper engagements. The Diagnostic is the measurement floor, designed for a single CHRO or VP of Talent Acquisition to authorize on a fixed-fee, 10-business-day timeline.

## Five Questions to Ask Any AI Visibility Measurement

If you are evaluating AI visibility measurement options -- whether for the recruiting funnel specifically or for the broader employer-brand surface -- five methodology questions surface most of what matters about the instrument:

1. **How many candidate-intent queries are run, and are they distributed across candidate-journey stages?** A measurement that runs fewer than 10 queries per stage will miss stage-specific findings.
2. **How many AI models are scanned?** A single-model measurement cannot produce a sentiment divergence number, and divergence is one of the highest-signal findings for citation-source remediation.
3. **How are candidate personas defined, and how many are run?** A measurement that uses one persona, or no persona at all, produces averaged signal that masks the asymmetries between candidate populations the company actually hires across.
4. **What is the scoring framework on each response?** Visibility, sentiment, co-mention, and citation source are the four measurements that produce findings. A scan that produces only visibility scoring is producing a small fraction of the available signal.
5. **What is the minimum bar for a "finding" in the report?** A scan that reports observations as findings is producing a longer report than it should. The published bar -- specific named issue, data evidence, actionable category -- is the line between an observation and a finding.

Each of those five questions has an answer in the Antellion Diagnostic methodology. They are published because the methodology is the measurement, and the measurement is what justifies the fee. A CHRO authorizing an audit should be able to read the methodology before authorizing it.

## The Next Step

The hiring pipeline leak -- candidates who pass on the recruiter ping after consulting AI, conversations that never happen, applications that never appear in the applicant tracking system -- is invisible to your existing instrumentation by construction. The Diagnostic is the instrument designed to surface it.

The mechanics: a fixed-fee, $4,900, 10-business-day audit. Forty candidate-intent queries across four AI models, three named candidate personas, four candidate-journey stages. 480 scored model responses per company. A Diagnostic Report with at least 10 material findings, a Findings Brief shareable to the CEO or board, and a 45-minute Findings Review Call with the analyst who wrote the report.

Win Your Money Back. If we surface fewer than 10 material findings, full refund.

The next step for a CHRO who wants to see what this measurement produces against their own company is a single conversation to confirm the persona scoping and the named competitor benchmark set. After that, the 10-business-day clock starts.
