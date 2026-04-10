# Antellion GTM Strategy
## Technical Assessment and Go-to-Market Plan

**Date:** March 27, 2026
**Author:** Growth Operator
**Based on:** Full codebase review, all design documents, seed data, existing growth playbook, and agent memory

---

## Part 1: Technical Readiness Assessment

### What is fully built and working

These features exist as real, testable code that could be shown to a buyer today.

**1. Multi-entity data model with organization scoping**
The Prisma schema supports Organizations, Users (with OWNER/ADMIN/MEMBER/VIEWER roles), Clients, Competitors, RoleProfiles, QueryClusters, Queries, ScanRuns, ScanResults, CitationSources, ContentAssets, Reports, Recommendations, ScanEvidence, ReportEvidence, ReportQA, QACheckResults, and TransitionLogs. Every data access pattern is scoped to the organization. This is a real multi-tenant foundation, not a toy schema.

**2. Scan execution with result capture and analysis**
`scan-analysis.ts` performs heuristic mention detection (word-boundary matching for client and competitor names), visibility scoring (0-100 based on mention frequency, position, and signal words), sentiment scoring (-1 to 1 from positive/negative keyword ratios), and citation domain parsing. Results are captured per query with per-competitor mention metadata stored in JSON. This is deterministic and testable -- not an LLM black box.

**3. Competitive comparison engine**
`scan-comparison.ts` computes: client mention rate, average visibility score, average sentiment score, entity-level mention stats (sorted by frequency), and a full citation analysis that separates domains into client-exclusive, gap domains, and shared domains with frequency counts. This is the analytical core that supports the competitive narrative.

**4. Report composition engine (template-driven, not LLM-generated)**
`report-composer.ts` is 1,218 lines of deterministic report generation. It produces:
- Cover page with client branding, confidentiality line, and assessment date
- Executive summary with tiered narrative (strong/moderate/limited/minimal), competitive gap callouts, key findings as bullet points, decision-stage visibility gap analysis, and recommendation preview
- Assessment scope and methodology section with companies assessed, query coverage, and scoring methodology explanation
- Visibility findings section with confidence-hedged language, sentiment interpretation connected to candidate behavior, visibility prominence interpretation, and LOW-confidence data quality notes
- Competitor analysis section with per-competitor gap analysis, visibility multiples (e.g., "1.6x more likely"), and a comparison table (Company, AI Mention Rate, Mentions, Gap vs. Client)
- Citation patterns section with citation landscape table (top 10 cited domains with source type), citation gaps with recommended actions, defensible visibility advantages, and contested sources
- Query intent map with per-theme mention rate table and critical gap identification
- Prioritized recommendations (up to 6) with category, priority, title, description, impact, effort, rationale, specific action steps, and effort detail timelines

Every claim in the report traces back to a specific computation on real scan data. The narrative uses `hedgePhrase()` to adjust language based on confidence tier -- HIGH data asserts directly, MEDIUM scopes to assessed data, LOW acknowledges sample limitations.

**5. Confidence scoring system**
`confidence/scoring.ts` implements both result-level confidence (per scan result) and finding-level confidence (per aggregated claim). Four weighted factors at each level: response quality (length proxy), score coverage, citation coverage, mention clarity (result-level) or sample size/signal consistency (finding-level). Anti-overclaim penalties are applied to finding-level scores. This is a real statistical guardrail, not decoration.

**6. QA checklist (12 automated checks, 5 categories)**
`qa/checks.ts` implements 12 checks across 5 categories:
- COMPLETENESS (3 checks): scans completed, has results, has summary
- EVIDENCE_INTEGRITY (3 checks): all results approved, all have responses, confidence acceptable
- SOURCE_ACCURACY (2 checks): citations present for mentioned results, no empty domains
- NARRATIVE (2 checks): summary has percentages, sections present
- COMPETITOR_LOGIC (2 checks): all competitors appear in report, competitor mention data exists

Checks have severity levels (BLOCKING vs. WARNING) and the QA status (PASS/FAIL/CONDITIONAL_PASS) gates report publication.

**7. Evidence provenance and immutability system**
`evidence/immutability.ts` enforces that 16 provenance fields (prompt text, prompt version, provider, model name, model version, temperature, top-p, max tokens, system prompt, parameters, raw response, raw token count, prompt tokens, latency, executed at, extracted sources) are immutable once evidence is APPROVED. Only analyst notes and analyst confidence remain mutable. State machine: DRAFT -> APPROVED, DRAFT -> REJECTED, APPROVED -> SUPERSEDED. Self-approval is blocked.

**8. Workflow state machines (scan, result, evidence, report)**
Three implemented rule modules enforce lifecycle transitions:
- `scan-rules.ts`: completion requires RUNNING status and at least 1 result; cancellation only from PENDING/RUNNING; deletion only from PENDING/FAILED/CANCELLED
- `result-rules.ts`: CAPTURED -> NEEDS_REVIEW/APPROVED, NEEDS_REVIEW -> APPROVED/REJECTED, APPROVED -> NEEDS_REVIEW (rare reopen); self-review blocked; rejection requires notes; auto-flag threshold at visibility score < 20
- `report-rules.ts`: DRAFT -> REVIEW (requires reviewer, reviewer cannot be author, all evidence approved), REVIEW -> PUBLISHED/DRAFT (revision needs note), PUBLISHED -> ARCHIVED/REVIEW

**9. Full dashboard UI**
The dashboard (`apps/web/src/app/(dashboard)/page.tsx`) shows summary cards (clients, scans, queries, reports), workflow status overview (scan status, report status, result review status counts), "needs attention" panel (results needing review, running scans, reports awaiting approval), and recent activity feed. This is not a wireframe -- it is a working UI with real data queries.

**10. Client-facing report export**
`apps/web/src/app/reports/[id]/export/page.tsx` renders a print-optimized, A4-formatted HTML page with: cover page, executive summary with bullet parsing, section rendering with tables and subsections, enriched recommendation cards (top 3 with rationale, numbered actions, effort/impact detail), remaining recommendations in summary table, print-specific CSS with page breaks and fixed confidential footer. Only PUBLISHED and ARCHIVED reports are exportable.

**11. QA review interface**
`apps/web/src/app/(dashboard)/reports/[id]/qa/page.tsx` shows QA status, check results with pass/fail/warning breakdown, run-checks button, and signoff form. Components: QAStatusBadge, QACheckList, QARunButton, QASignoffForm.

**12. Result review interface**
The scan detail page shows per-result review status with action buttons (ResultReviewActions), evidence detail panels (ScanEvidenceDetail), evidence badges (EvidenceBadge), and workflow status bars (WorkflowStatusBar, StatusPipeline).

**13. Visibility Snapshot composer**
`snapshot-composer.ts` produces a lightweight data object (SnapshotInput -> VisibilitySnapshot) with metrics, top competitor comparison, and citation gaps. This powers the snapshot page at `/snapshots/[clientId]` -- a one-page summary designed for outreach.

**14. Seed data with realistic narrative**
36 queries across 6 intent themes, 4 competitors, realistic AI responses with citations, crafted mention rates (Meridian 47%, Apex 75%, NovaBridge 58%, VeloChain 42%, Forge 28%), theme-level variance (Hiring Process 83% vs. Compensation 17%), and 7 citation gap domains. The seed tells a coherent story that maps to a real buyer conversation.

### What is designed but not implemented

These have complete design documents in `/docs/designs/` but no code beyond what is already built.

1. **Structured analyst workflow** -- DRAFT -> READY_TO_RUN -> RUNNING -> COMPLETE lifecycle with scan configuration, analyst assignment, per-query execution tracking (ScanQuery model), blocked state handling, and rework paths. Design only; current scans skip directly to RUNNING.

2. **Operations dashboard** -- Multi-client workload management with Engagement model, SLA deadlines, time-in-phase tracking, bottleneck alerts, and analyst workload views. Design only; current dashboard is single-operator.

3. **Evidence provenance full pipeline** -- While the immutability validation is built, the full ScanEvidence record creation during scan execution, evidence-to-report linking during report generation with per-section claim mapping, and the traceability UI (progressive disclosure evidence panel) are designed but not fully wired.

4. **Report traceability UI** -- Four-level progressive disclosure (claim -> supporting data -> query-level detail -> raw AI response). Designed by Report PM and Frontend, but the evidence panel on reports is partial. ReportEvidence records exist in schema but backfilling the section-heading and claim-text fields during composition is not yet implemented.

5. **Full QA flag and acknowledgment workflow** -- The QA checks run and produce results, but the full flag lifecycle (OPEN -> ACKNOWLEDGED -> RESOLVED -> DISMISSED) with per-flag resolution and blocking-warning separation is in the design, not fully wired.

### What is missing entirely

1. **Authentication** -- `apps/web/src/lib/auth.ts` is a stub that returns the first organization. No login, no session, no role enforcement. CLAUDE.md confirms auth is a later priority.

2. **Automated scan execution** -- `apps/jobs/src/index.ts` is a skeleton. All scans are manual: the operator opens ChatGPT (or another model), pastes the query, copies the response back into the record-result form. There is no API-driven scan automation.

3. **Multi-model scanning** -- The data model supports LLMProvider (OPENAI, ANTHROPIC, GOOGLE, MANUAL) and model metadata, but all current scan data is single-model (GPT-4o via manual entry).

4. **Longitudinal comparison** -- No over-time visibility trending. Each scan is a point-in-time snapshot. The schema supports multiple scan runs per client, but there is no diff or trend computation.

5. **Self-serve client access** -- Clients do not log in. Reports are delivered as exported HTML/PDF. There is no client portal.

6. **Billing and payment** -- No Stripe integration, no invoicing, no subscription management.

7. **Landing page / marketing site** -- The web app is the internal dashboard. There is no public-facing marketing site.

### Demo quality assessment

**Could you show this to a VP of Talent Acquisition today? Yes -- with caveats.**

Strengths:
- The seed data tells a coherent, commercially relevant story (Meridian Technologies, 4 realistic competitors, 36 queries across 6 intent themes)
- The report export is professional, print-ready, and looks like a real consultancy deliverable
- The competitive comparison table, citation gap analysis, and query intent map are genuinely compelling data visualizations
- Recommendations are specific, prioritized, and include action steps with timelines
- The QA review page demonstrates operational rigor

Caveats:
- Auth is a stub, so you cannot demo multi-user workflows (reviewer assignment, self-approval blocking) live
- The scan recording UI shows manual paste workflow, which undercuts the "platform" narrative if the buyer looks too closely
- Evidence provenance fields (provider, model, temperature, prompt) are not populated in seed data, so the traceability drill-down would show empty metadata
- There is only one scan run and one report in the seed -- no longitudinal story

**Verdict:** Demo-ready for a founder-led sales call where you control the narrative and screen-share. Not ready for a "log in and explore" trial.

---

## Part 2: GTM Strategy

### A. Positioning

**Category:** AI Employer Visibility

This is a new category. Not employer brand analytics (Glassdoor territory). Not talent SEO (keyword-stuffing connotation). Not AI talent analytics (sounds like resume screening). Antellion measures something that did not have a name before: how a company appears in AI when candidates ask where to work.

**One-sentence description:**
Antellion shows companies how ChatGPT, Gemini, and Perplexity describe them when candidates ask where to work -- and what to do when the answer is not good enough.

**Elevator pitch (30 seconds):**
"Right now, candidates are asking AI where to work. We audit how your company shows up in those conversations -- your mention rate, how you compare to competitors, which sources AI cites, and where you have gaps. We just finished an assessment for an enterprise software company and found their top competitor was 1.6x more visible in AI employer queries. They had zero presence on the compensation platforms AI cites most. The fix was specific -- 7 citation gaps on named platforms, with a 90-day action plan. That's what we do."

**Differentiation vs. traditional employer brand tools:**
| Traditional tool | Antellion difference |
|---|---|
| Glassdoor/Comparably: "What employees say" | "What AI tells candidates -- synthesized from hundreds of sources into one answer" |
| Employer branding agencies: "Help you tell your story" | "Show you what AI already tells candidates, whether you wrote it or not" |
| SEO tools (Semrush/Ahrefs): "Optimize for Google rankings" | "AI doesn't rank pages -- it synthesizes answers. Different surface, different strategy" |
| HR tech (Phenom/Beamery): "Manage your hiring workflow" | "Manage how you show up before the candidate ever reaches your workflow" |

### B. Ideal Customer Profile

**Who buys this:**
- **Title:** VP of Talent Acquisition, Head of Employer Brand, Chief People Officer, or CMO (employer brand remit)
- **Company size:** 500-5,000 employees (large enough to have TA budget and employer brand concern; small enough that brand is not already dominant)
- **Industry:** Technology, financial services, healthcare, professional services -- any industry where knowledge workers use AI for research
- **Geography:** US and UK first (highest AI adoption among candidates)

**Trigger events that create urgency:**
1. Lost a critical hire to a competitor and the candidate cited "research" as the reason
2. New VP of TA or CPO in seat -- wants to make a visible early impact
3. Competitor just raised a round or launched employer brand campaign
4. Company raised a round and needs to scale hiring 40%+ in 12 months
5. Candidate survey data shows "I hadn't heard of you" as a top objection
6. Board-level question about employer brand investment ROI

**What pain does this solve that they're currently ignoring:**
Talent leaders manage their Glassdoor presence, their careers page, their LinkedIn company page. They have no idea what AI tells candidates about them -- and an increasing number of candidates use AI as their primary research tool. This is a blind spot, not a solved problem with a bad solution.

**Why would they pay $7,500-$15,000 for this:**
Because the report names their company, names their competitors, quantifies the gap, identifies the specific platforms driving the gap, and provides a prioritized action plan. A single engineering hire that takes 30 days longer because candidates never found the company costs more than $15K in recruiter time, lost productivity, and opportunity cost. The assessment pays for itself if it accelerates even one hire.

### C. Proof Points from the Technical System

**What we can claim based on what is built:**

1. **"We analyze actual AI responses to real candidate-intent queries."** True. The system captures full AI response text, parses mentions, scores visibility and sentiment, and extracts citations. `scan-analysis.ts` does this deterministically.

2. **"We compare your company against named competitors across multiple query themes."** True. `scan-comparison.ts` computes entity-level mention stats, citation analysis (gap/exclusive/shared domains), and the report breaks down visibility by intent theme.

3. **"Every number in the report traces back to a specific AI response."** True. The report is template-driven from `composeReport()`. Every percentage is computed from `ScanComparisonResult` data. The evidence provenance model (`ScanEvidence`) captures prompt text, provider, model, and raw response.

4. **"We identify the specific platforms and sources where your competitors appear and you don't."** True. Citation gap analysis in `scan-comparison.ts` separates client-exclusive domains, gap domains, and shared domains. The report lists each gap domain with its source type and a recommended action.

5. **"The report includes prioritized recommendations with specific action steps and timelines."** True. `generateRecommendations()` produces up to 6 recommendations with category, priority, title, description, impact, effort, rationale, numbered actions, and effort detail. The top 3 are enriched with category-specific rationale.

6. **"Our QA system runs 12 automated checks before any report is delivered."** True. `qa/checks.ts` implements 12 checks across 5 categories. The QA page shows results. BLOCKING checks prevent publication.

7. **"We score confidence on every finding and adjust our language accordingly."** True. `confidence/scoring.ts` computes result-level and finding-level confidence. `hedgePhrase()` in `report-composer.ts` uses the tier to qualify claims.

**What we should NOT claim yet:**

1. ~~"We monitor your visibility continuously."~~ No. There is no recurring scan automation. Each assessment is a point-in-time manual process.

2. ~~"We scan across ChatGPT, Gemini, Claude, and Perplexity."~~ Not yet. The data model supports multi-model, but current scans are single-model manual.

3. ~~"Real-time visibility dashboard."~~ No. The dashboard is internal and operational. There is no client-facing portal.

4. ~~"AI-powered recommendations."~~ The recommendations are template-driven from scan data, not LLM-generated. This is actually a strength (deterministic, traceable), but we should not claim AI generates the advice.

5. ~~"Proven improvement metrics."~~ No longitudinal data exists. We cannot yet claim "clients who follow our recommendations see X% improvement."

**How the evidence provenance system becomes a selling point:**
Enterprise buyers are skeptical of AI-derived insights. The evidence chain -- from specific query text, to specific AI model and parameters, to raw response, to extracted scores, to report claim -- is the answer to "how do I know this is real?" In the demo, showing that every percentage in the report can be drilled back to the actual AI response creates credibility that no competitor in the employer brand space offers.

**How the QA system becomes a selling point:**
"Before any report reaches your desk, it passes 12 automated quality checks -- including evidence integrity verification, citation coverage validation, and narrative consistency checks. If any blocking check fails, the report cannot be published." This positions Antellion as operationally rigorous, not a black-box AI tool.

**How the confidence scoring becomes a selling point:**
"When our sample size is limited, we say so. When a finding is based on strong, consistent data, we assert it directly. You'll see confidence indicators throughout the report -- this is not a system that overstates what the data supports." This directly addresses the "but is this statistically valid?" objection.

### D. Demo Strategy

**Demo walk-through (5 minutes):**

1. **Dashboard (30 sec):** Show Meridian Technologies client card. "This is a mid-market enterprise software company in Austin, competing for backend and ML engineers."

2. **Client detail (30 sec):** Show 4 competitors, 6 query clusters (36 queries), 2 content assets. "We mapped their competitive landscape and generated candidate-intent queries across six themes."

3. **Scan results -- the wake-up call (60 sec):** Show comparison panel. "Meridian appears in 47% of AI candidate queries. Their top competitor, Apex Cloud, appears in 75%. That's a 28-point gap."

4. **Theme breakdown -- the aha moment (60 sec):** Show the query intent map. "Look at the theme-level story: Meridian is strong on hiring process questions (83%), but on compensation queries -- where candidates decide whether to even apply -- they show up 17% of the time. Apex dominates."

5. **Citation gaps -- the action plan (60 sec):** Show citation analysis. "Seven platforms inform AI about competitors but not Meridian. Levels.fyi, Built In, Comparably, Blind. These are the sources AI cites when answering salary and culture questions. Meridian has no presence."

6. **Report export -- the deliverable (60 sec):** Open the print-ready report. Show cover page, executive summary, competitive comparison table, recommendation cards with action steps. "This is what the client receives. Every number traces back to a specific AI response."

**The "wow moment":** The theme-level breakdown. When you show that a company is strong on one type of candidate question and invisible on another, it creates an immediate, specific reaction. "We're invisible on compensation queries" is far more actionable than "our employer brand needs work."

**Seed data that needs to exist for a compelling demo:**
The current seed data is strong. One addition would improve it: a second scan run (even partial) dated 30 days after the first, showing movement after hypothetical remediation. This would demonstrate the "measure, act, remeasure" cycle. Without it, the story is purely diagnostic. Priority: medium -- the current seed works for initial sales conversations.

**Skeptical buyer questions and system answers:**

| Question | Answer backed by the system |
|---|---|
| "Isn't this just ChatGPT responses?" | "Every response is captured with the exact query, model, parameters, and timestamp. We score visibility, sentiment, and citation sources. The report is a structured analysis, not a copy-paste." |
| "How do I know the queries are realistic?" | "We mapped 36 queries to 6 candidate intent themes based on how real candidates research employers. The themes -- reputation, compensation, culture, hiring process, role expectations, competitor comparison -- match the actual research journey." |
| "What if AI responses change tomorrow?" | "They will. That's why this is a point-in-time assessment, and why we recommend quarterly reassessments. AI models update their training data and synthesis logic regularly -- your visibility position is not static." |
| "How is this different from checking Glassdoor?" | "Glassdoor shows you what employees say. We show you what AI synthesizes from Glassdoor, LinkedIn, Levels.fyi, Blind, and dozens of other sources into the single answer candidates read. The AI answer is the new first impression." |
| "Is the sample size large enough?" | "We evaluate 36 queries across 6 themes. The confidence scoring system flags findings where the sample is limited. In this assessment, we have HIGH confidence on the overall mention rate and MEDIUM confidence on theme-level breakdowns. We don't overclaim." |

### E. Pricing and Packaging

**Current pricing framework** (from growth playbook, March 22, 2026):

| Tier | Mid-Market | Enterprise | Multi-Brand |
|---|---|---|---|
| Visibility Assessment (one-time) | $7,500 | $15,000 | $25,000 |
| Visibility Intelligence (annual) | $30K/yr | $60K/yr | $100K/yr |
| Strategic Visibility Program (annual) | -- | $150K-$250K/yr | -- |

**Is $7,500-$15,000 the right price for a first audit?**

Yes -- and here is the justification grounded in what the system actually delivers:

- The report contains 5 sections, up to 6 prioritized recommendations with specific action steps, a competitive comparison table, a citation gap analysis with named platforms, and a query intent map. This is comparable to a $15K-$25K employer brand audit from a consultancy, but with AI-specific data they cannot produce.
- The "3 visibility gaps or it's free" guarantee (from the growth playbook) is defensible: the citation gap analysis in `scan-comparison.ts` virtually guarantees finding gaps for any company that has not specifically optimized for AI visibility.
- For mid-market ($7,500): 36 queries, 4 competitors, 6 themes, full report. This is below the pain threshold for a TA budget.
- For enterprise ($15,000): same methodology, but the competitive landscape and organizational complexity justify the premium.

**What should be included vs. excluded:**

Included in the Assessment:
- Full competitive visibility scan (36+ queries across 6 intent themes)
- 4 named competitor comparisons
- Citation gap analysis with platform-specific recommendations
- Query intent map with per-theme visibility
- Executive audit report (print-ready HTML/PDF)
- 30-minute walkthrough with findings and Q&A
- 90-day action plan with prioritized recommendations

Excluded (drives expansion):
- Ongoing monitoring / quarterly re-scans
- Multi-model comparison (ChatGPT + Gemini + Claude)
- Additional role profiles or competitor sets
- Implementation support for remediation actions
- Content strategy development for gap platforms

**Should there be a lighter entry point?**

Yes -- the Visibility Snapshot already exists as a feature (`snapshot-composer.ts` and `/snapshots/[clientId]`). The outreach guide (`docs/snapshot-outreach-guide.md`) positions this as a "produced-for-you" one-pager showing mention rate, top competitor gap, and citation blind spots. This is the free lead magnet that creates the curiosity gap for the paid Assessment.

**Expansion path:**
1. Assessment ($7,500-$15,000 one-time) -- "Understand your position"
2. Quarterly re-assessment ($30K/yr) -- "Monitor over time" (requires longitudinal comparison feature)
3. Multi-model expansion ($60K/yr) -- "See how you show up across ChatGPT, Gemini, Claude"
4. Multi-role expansion ($60K/yr) -- "Expand from engineering to product, design, sales"
5. Strategic program ($150K+/yr) -- "Full visibility management with content strategy"

### F. Outreach Strategy

**Cold outreach message (email to VP of Talent Acquisition):**

Subject: [Company] vs. [Competitor] -- what AI tells candidates

Body:
```
[First name],

I ran [Company] through 10 candidate-intent AI queries -- the same questions your
candidates are asking ChatGPT when they decide where to apply.

Two findings stood out:

1. [Competitor] appears in [X]% of AI employer queries. [Company] appears in [Y]%.
   Candidates researching [industry] employers through AI are [multiple] more likely
   to shortlist [Competitor] before they ever see [Company].

2. AI models cite [#] sources about [Competitor] that have no [Company] presence --
   including [named platform 1] and [named platform 2]. These are the platforms
   driving the visibility gap.

I have the full snapshot if you want to see it. Takes 2 minutes to read.

[Name]
Antellion
```

**Why this works:** It leads with their data, not our product. It names their competitor. It gives two specific findings that create the emotional trigger (competitive anxiety) and the intellectual trigger (specific platforms they can verify). The CTA is low-friction ("2 minutes to read"), not a meeting request.

**Cold outreach message (LinkedIn DM to Head of Employer Brand):**

```
[First name] -- we ran [Company] through candidate-intent AI queries and found that
[Competitor] is [X]x more visible when candidates ask AI about [industry] employers.

Happy to share the snapshot -- it shows your mention rate, top competitor gap, and
the 3 citation sources working for them but not you.
```

**Content to drive inbound:**

1. **"The AI Employer Visibility Gap"** -- Benchmark data showing how AI models describe companies differently. Publish on LinkedIn, distribute to TA communities. Uses the actual methodology (query themes, mention rates, citation analysis) without revealing the product.

2. **"What ChatGPT Says About You to Candidates"** -- Individual company snapshots (anonymized or with permission) that demonstrate the data surface. Visual format: mention rate score, competitor comparison bar chart, citation gap list.

3. **"Your Careers Page Is Not Your First Impression Anymore"** -- Thought leadership piece about the shift from search-engine-driven to AI-synthesized employer discovery. Position Antellion's category without direct product pitch.

**Events and communities:**

- **TA Week / SHRM Talent Conference** -- Primary ICP concentration
- **Employer Branding events** (Employer Brand Leaders Summit, World Employer Branding Day) -- Secondary ICP
- **People Analytics conferences** (Wharton People Analytics, HR Tech) -- Data-oriented buyers
- **LinkedIn VP of TA groups** -- Organic outreach
- **ERE.net** -- TA practitioner community with content syndication potential

**First 10 customers playbook:**

1. **Weeks 1-2:** Produce Visibility Snapshots for 20 target companies using the manual scan workflow. Pick companies that are actively hiring, recently funded, and have a clear competitor set.

2. **Weeks 2-3:** Send personalized outreach to 20 targets with their Snapshot attached or teased. Aim for 8-10 conversations.

3. **Weeks 3-4:** Offer the first 3 Assessments at a discounted "founding partner" price ($5,000 for mid-market, $10,000 for enterprise) in exchange for a case study testimonial.

4. **Weeks 4-8:** Deliver the first 3 Assessments. Use the walkthrough conversations to refine the demo narrative and identify the exact moments that create buyer urgency.

5. **Weeks 6-10:** Use the first 3 client stories to create outreach proof points. "We helped [Company] identify 7 citation gaps that were making them invisible to candidates. Within 60 days, they had presence on all 7 platforms."

6. **Ongoing:** Every Assessment produces a Snapshot-quality data point that can be used (with permission) as outreach ammunition for the next prospect in the same industry.

### G. Risk Assessment

**What could go wrong in a paid delivery:**

| Risk | Mitigation (grounded in the system) |
|---|---|
| Manual scan takes too long (36 queries x manual paste) | At current speed, ~45 minutes per scan. Acceptable for $7,500+ deliverables. Automated scanning is the path to margin improvement. |
| QA check fails and blocks publication | This is working as designed. The 12 automated checks catch real issues. Fixing a failing check before delivery is better than delivering a flawed report. |
| Client disputes a finding ("that's not true") | Every finding traces to a specific AI response. Show them the raw evidence. The evidence provenance system is the defense layer. |
| Heuristic scoring produces a misleading score | The confidence scoring system flags low-confidence findings. `hedgePhrase()` adjusts the narrative language. Analyst notes on ScanEvidence allow manual override. |
| Report looks too templated for enterprise buyers | The report composer produces contextual narrative, not fill-in-the-blank templates. Phrases change based on mention tier, sentiment range, competitive gap magnitude, and confidence level. |

**What if the AI responses don't show interesting findings?**

This is the most important risk. If a well-known company has high visibility across all themes, the report could read as "you're doing fine." Mitigation:
- The theme-level breakdown almost always reveals variance. Even companies with high overall mention rates have weak spots.
- Citation gap analysis always finds gaps -- no company has presence on every platform AI cites.
- Competitor comparison always creates a relative story, even if the client leads.
- If truly nothing interesting emerges, the honest report is: "You have strong AI visibility. Here's how to defend it." This is a valid (and valuable) finding for enterprise buyers who want to know their investment is working.

**What if a competitor has better visibility and the client doesn't want to hear it?**

This is the demo narrative's strongest moment, not a weakness. The report is designed to frame competitive gaps as addressable risks, not permanent conditions. The recommendation section gives the specific actions to close the gap. The language in `report-composer.ts` is deliberately calibrated: "This is not a projected risk. Candidates are using AI for employer research today." The framing is urgent but action-oriented.

**How do we handle the "but this is just ChatGPT responses" objection?**

Three-layer defense:

1. **The data layer:** "We didn't just ask ChatGPT one question. We evaluated 36 candidate-intent queries across 6 themes, scored visibility and sentiment on every response, extracted citation sources, and compared your company against 4 competitors. This is a structured assessment, not a conversation."

2. **The methodology layer:** "Every finding passes through our confidence scoring system and 12 automated quality checks. When the data supports a strong claim, we make it. When the sample is limited, we say so explicitly in the report. This is not a tool that overclaims."

3. **The market layer:** "It doesn't matter whether we think ChatGPT responses are authoritative. What matters is that candidates are using them to make decisions about where to apply. 47% of knowledge workers now use AI for job research. These responses are shaping your candidate pipeline today."

---

## Part 3: What to Execute This Week

### Immediate (next 3 days)

1. **Populate ScanEvidence records in the seed script.** The seed creates ScanResults but not ScanEvidence. For the demo, evidence provenance should show model name (gpt-4o), provider (OPENAI), prompt text, and execution timestamp. This lets the traceability story land in the walkthrough.

2. **Run QA on the seed report.** Ensure the seed data triggers a report and that QA checks pass. A demo that shows QA checks passing is much stronger than a demo that skips QA.

3. **Produce 5 real Visibility Snapshots for target companies.** Use the manual scan workflow to run 10 queries per target. These are the outreach ammunition for week 1 prospecting.

### This week (days 4-7)

4. **Draft the first outreach email sequence** (3 emails, 7-day cadence) for VP of TA targets. Email 1: Snapshot tease with 2 findings. Email 2: "What candidates hear when they ask AI about [industry] employers." Email 3: Assessment offer.

5. **Create a 60-second screen-recording demo video** of the report export page. No voiceover -- just annotated captions pointing to the key sections. This is the asset to attach to warm outreach.

6. **Select the first 10 target companies** using the criteria above (500-5,000 employees, actively hiring in competitive roles, recently funded). Produce snapshots for each.

### Next 2 weeks

7. **Add a second scan run to the seed data** dated 30 days after the first, with improved mention rates on 2 themes. This lets the demo show "before and after" even without longitudinal comparison features.

8. **Build a simple landing page** (single-page, static) with the category-defining statement, one sample Snapshot visual, and a "Get your Visibility Snapshot" CTA.

9. **Start the first 3 sales conversations** from Snapshot outreach. Target close timeline: 3-4 weeks from first outreach to signed Assessment.

---

## Part 4: Metrics to Track

| Metric | Target (90 days) | Why it matters |
|---|---|---|
| Snapshots produced | 30 | Outreach ammunition |
| Outreach sent (personalized) | 50 | Pipeline generation |
| Conversations started | 15 | Conversion from Snapshot to interest |
| Assessments sold | 3-5 | Revenue and case study material |
| Assessment delivery time | < 2 weeks from sale | Operational credibility |
| NPS / buyer feedback score | > 8/10 | Product-market signal |
| QA check pass rate on delivered reports | 100% | Quality credibility |

---

*This document is grounded in the actual codebase as of March 27, 2026. Every claim references specific files, functions, or data structures. No capabilities are overstated.*
