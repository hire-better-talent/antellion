---
title: "The 40-Query Coverage Floor: Why Sample Size Decides Whether an AI Employer Visibility Scan Finds Anything Worth Acting On"
description: "A CHRO can ask AI three questions about their company and get a feel for the answer. They cannot get findings worth circulating to the board. Forty candidate-intent queries -- ten per candidate-journey stage -- is the floor below which the most consequential findings simply do not surface. A walkthrough of where the number comes from, what a 12-query scan misses, and where the curve flattens."
date: "2026-05-19"
author: "Jordan Ellison"
tags: ["ai-visibility", "methodology", "sample-size", "chro", "ai-employer-brand", "audit-design"]
status: "ready"
---

## What a Quick Look Tells You, and What It Doesn't

It takes roughly four minutes to open ChatGPT, Claude, Gemini, and Perplexity in four browser tabs and ask each of them whether your company is a good place to work. The four answers will not match each other. The variance across them is, by itself, an interesting observation. A CHRO who runs that small experiment will come away with a stronger intuition about how AI describes the company than they had ten minutes earlier.

What the same CHRO will not come away with is a set of findings that can be circulated to a head of recruiting, an employer brand director, or a board committee with the expectation that they will be acted on. The exercise has produced sentiment, not structure. The reason is sample size.

This post is about the sample size below which an AI employer visibility scan does not produce findings worth acting on, the sample size at which it does, and the sample size at which additional queries stop returning new information. The short version is that the floor is forty queries, structured as ten per candidate-journey stage across four stages. The longer version, including the worked example and the honest treatment of diminishing returns, follows.

## Why Sample Size Matters Differently for Employer Visibility

The reason a small number of queries is enough for some research questions and not enough for others has to do with what is varying inside the response surface. If the answer to "is [Company] a good place to work" were a single fact, one query per model would settle it. The answer is not a single fact. It is a synthesis built from a distribution of citation sources, conditioned on the specific question being asked, the specific persona implied by the question, and the specific stage of the candidate's decision process the question reflects.

Each of those conditions changes the answer. The same company can be described as employee-respected on a query asking about culture and as commission-opaque on a query asking about compensation. The same company can be described favorably on a Discovery-stage query and unfavorably on an Evaluation-stage query that probes a recent reorganization. The findings the CHRO needs to act on live in the variance across queries, models, personas, and stages -- not in the average sentiment.

Sample size is the variable that determines whether the variance is observable. Below the floor, the scan reports averaged sentiment and misses the asymmetries that drive candidate behavior. At the floor, the asymmetries are visible. Above the floor, the additional resolution helps for unusually large or unusually competitive companies but does not change the actionable findings for most.

## Where the Number Comes From: Four Stages × Ten Queries

The candidate-journey framework Antellion uses to structure the 40-query floor divides the decision into four stages, each of which produces materially different AI synthesis even on the same underlying company:

**Discovery.** The candidate is identifying which companies exist in a category, what they are known for, and whether they are worth a closer look. Discovery queries are open-ended and category-shaped: *"top companies hiring senior account executives in financial services right now,"* or *"who builds customer success software in healthcare."* AI synthesis at Discovery is dominated by category-level citation sources -- industry trade publications, vertical-specific newsletters, founder profiles, and a small number of consolidated rating platforms.

**Consideration.** The candidate has the company on a list and is forming an early impression of fit. Consideration queries are comparative: *"is [Company] or [Competitor] better for a senior product manager,"* or *"what's the difference between working at [Company] and [Competitor]."* AI synthesis at Consideration is where competitor co-mention patterns dominate and where the "talent competitor set" the AI sees often diverges from the talent competitor set the recruiting team is tracking.

**Evaluation.** The candidate is seriously considering accepting the recruiter outreach or applying directly. Evaluation queries probe specifics: *"what is the compensation structure at [Company] for a senior account executive,"* *"how is the engineering culture at [Company] in the last twelve months,"* *"what is the management like at [Company]."* AI synthesis at Evaluation is where citation sources concentrate on specialist surfaces, where named-leader narratives dominate, and where stale citations from twelve to twenty-four months ago can carry disproportionate weight.

**Commitment.** The candidate is preparing to interview, negotiate, or decline. Commitment queries are practical and tactical: *"how should I prepare for an interview at [Company],"* *"what should I ask in a final-round interview at [Company],"* *"is [Company] a good place to negotiate a sign-on bonus."* AI synthesis at Commitment depends on the densest, most idiosyncratic citation surfaces -- Blind, Glassdoor interview reports, Reddit threads about specific role experiences, Substack posts from specific named employees.

Ten queries per stage is the floor because below ten, the citation pattern within the stage is not yet observable. With seven queries on Evaluation, the analyst sees three citations to Comparably and four to specialist surfaces and concludes that specialist surfaces dominate. With ten or eleven queries on Evaluation, the analyst sees that the specialist surfaces concentrate on two sources, that one of those two has gone stale, and that the stale source is currently the highest-weighted citation in two of the four AI models. The finding moves from impressionistic to actionable somewhere between query seven and query ten. The marginal information from queries eleven through twenty exists but flattens.

Four stages times ten queries equals forty queries per scan. Four AI models per query equals 160 model responses. Three personas per company equals 480 scored responses in the corpus. That is the unit of work behind a single Diagnostic Report. Four hundred and eighty model responses, scored across visibility, sentiment, competitor co-mention, and citation source, is the data structure from which a Diagnostic finding gets drawn.

## What a Twelve-Query Scan Misses: A Worked Example

The fastest way to make the case for the floor is to walk through what a structured 40-query scan finds that a quick 12-query scan does not. The pattern below is drawn from a Diagnostic delivered in early 2026 for a mid-market services company. The pattern is anonymized but representative of what recurs across Diagnostics in companies of similar profile.

A 12-query scan would have covered three queries per stage across the four stages. The output: three citations to Glassdoor with mixed-positive sentiment, two citations to Comparably with positive sentiment, two citations to a 2024 LinkedIn post from a former employee with neutral sentiment, three citations to industry trade publications with positive sentiment, and two queries returning generic or no specific citation. Sentiment overall: positive-leaning. Co-mention: two named competitors. Citation source mix: standard.

The CHRO reading that 12-query scan output would have walked away thinking the AI surface was healthy. The competitors looked like the expected competitors. The sentiment leaned positive. The citation sources were the ones the employer brand team was already aware of. There would have been nothing surprising enough to act on.

What the 40-query scan surfaced for the same company, in the same week, with the same methodology applied at the right sample size:

**At Discovery, the talent competitor set diverged from the assumed competitor set.** Across ten Discovery queries, AI surfaced six named companies as adjacent. Two of those were direct product competitors. Four were companies the recruiting team had not been tracking -- two adjacent vertical-software companies, one PE-backed consolidator that had been on an aggressive hiring spree, and one regional firm that had recently re-positioned its growth narrative. The talent competitor set the AI saw was meaningfully larger than the one the recruiting team was monitoring. A CHRO who read this finding had a concrete question to bring to their talent acquisition leader: *who are we benchmarking compensation against, and is that set the right one?*

**At Consideration, the company's narrative on culture was anchored to a single citation source going stale.** Across ten Consideration queries, three of the four AI models cited a 2023 Glassdoor review thread describing a previous CEO's management style. The CEO had been replaced eleven months prior. The new CEO's narrative had not yet reached the citation surface AI was reading. Three of four models were synthesizing the company's current culture story from outdated leadership context. A CHRO who read this finding had a specific, scoped remediation: produce four to six content surfaces in the next ninety days featuring the new CEO's direct voice, on platforms AI re-indexes within a quarter.

**At Evaluation, the compensation narrative was diverging across models for one of the company's two highest-volume hiring personas.** Across ten Evaluation queries against the senior individual contributor persona, ChatGPT and Claude described the company's compensation as market-competitive. Gemini cited a 2024 thread describing the variable-comp structure as below-median and conservative. Perplexity returned a generic answer. A candidate who used Gemini before responding to a recruiter ping was reading a compensation picture materially different from a candidate who used ChatGPT. The CHRO had a concrete question: *which citation surface is producing the Gemini answer, and what is the lift to dilute it with two or three additional reference points?*

**At Commitment, AI returned no coherent answer for the company's career-path narrative for its second-highest-volume hiring persona.** Across ten Commitment queries probing growth, mobility, and tenure expectations for the persona, three of four models returned generic answers and one model returned content from a different company entirely. The company hired forty to sixty people into the persona each year. The candidate-facing narrative about what a career at the company looks like, for that persona, was effectively absent from AI. A CHRO who read this finding had a specific remediation category: career-path content production targeted at the persona's most-asked Commitment questions, on the surfaces AI was reading for similar companies.

Four findings. None of them visible in the 12-query scan. All of them visible at the 40-query floor. Each one mapped to a specific remediation category the company's existing employer brand, recruiting marketing, or content team could act on.

The 12-query scan did not produce a wrong picture. It produced an averaged picture. The averaging hid the asymmetries.

## Where the Curve Flattens: 40 Is the Floor, Not the Ceiling

It is fair to ask whether the right floor is sixty, or eighty, or two hundred queries instead of forty. The honest answer is that additional queries above the 40-query floor return additional resolution at a declining rate, and the rate flattens noticeably between query 60 and query 80.

In Diagnostic scans run at 80-query depth (twenty per stage), the additional twenty queries surface roughly two to three additional findings on average. Most of those incremental findings are refinements of findings already visible at the 40-query depth -- a second stale citation source contributing to the same narrative, or an additional persona-specific sub-pattern within a finding already identified. The number of new finding categories that emerge between query 40 and query 80 is, in our experience, one or fewer per scan.

At 120 queries, the marginal information returned tends to be sector-specific edge cases that would only matter for very large or very competitive talent markets. At 200 queries, the marginal information is statistical reinforcement of patterns already established at the floor, without surfacing new categories of finding.

The implication is that 40 queries is the floor below which findings are missed and not the ceiling above which findings would be richer. For companies in unusually competitive talent markets, in regulated sectors with concentrated citation surfaces, or in the middle of a major narrative shift -- a recent acquisition, a leadership change, a public crisis -- 60 to 80 queries can be justified. For most mid-market and enterprise companies running a first Diagnostic, 40 is the right unit of work.

The trade-off is real. More queries cost more analyst time, more model usage, and more scoring overhead per scan. Doubling the sample size does not double the findings. The methodology is calibrated to the inflection point where findings become reliably actionable, not to maximize total queries.

## Five Questions to Apply to Any Sample-Size Decision

Whether evaluating an internal scan, a vendor-run measurement, or any other AI visibility instrument, five questions surface most of what matters about whether the sample size is adequate:

1. **How many queries per candidate-journey stage?** A measurement that does not split queries by stage cannot surface stage-specific patterns. Fewer than ten queries in a stage will miss the asymmetries within it.

2. **Are queries persona-coded?** A measurement that averages across personas produces averaged findings. The candidate experience varies by persona; the measurement should too.

3. **How many AI models?** A single-model measurement cannot produce a sentiment-divergence finding, and divergence across the four leading models is one of the highest-signal observations in the corpus.

4. **How are queries selected?** A measurement that uses ten generic queries and calls it stage-balanced is not. Discovery, Consideration, Evaluation, and Commitment each have characteristic query shapes; the measurement should reflect them.

5. **What does the scoring framework produce on each response?** Visibility, sentiment, competitor co-mention, and citation source are the four primary measurements. A scan that scores only visibility produces a small fraction of the available signal.

Each of those questions has a specific answer in the Antellion Diagnostic methodology. The answers are published because the methodology is the measurement, and the measurement is what justifies the fee.

## The Next Step

The reason to know the 40-query floor as a number is that AI employer visibility is most often introduced as a topic before it is introduced as a measurement. A CHRO hears the question -- *what does AI tell candidates about us?* -- and the natural next step is to ask AI a few questions and see. That instinct is good. It produces a real first read. It does not produce a structured measurement.

The Antellion Diagnostic is the structured measurement. Forty candidate-intent queries across four AI models, three named candidate personas, four candidate-journey stages. Four hundred and eighty scored model responses per company. A Diagnostic Report with at least ten material findings, a Findings Brief shareable to a CEO or board, and a forty-five-minute Findings Review Call with the analyst who wrote the report. A fixed fee of $4,900 and a 10-business-day delivery clock.

Win Your Money Back. If we surface fewer than 10 material findings, full refund.

The next step for a CHRO who wants to see what this measurement produces against their own company is a single conversation to confirm the persona scoping and the named competitor benchmark set. After that, the 10-business-day clock starts.
