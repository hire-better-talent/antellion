# AI Visibility Diagnostic

**Tier:** Paid Attraction Offer
**Fee:** $4,900 (fixed, one-time)
**Delivery:** 10 business days from deposit
**Delivered by:** Hire Better Talent LLC, d/b/a Antellion
**Status:** Active — launch alongside updated full-assessment stack
**Last updated:** 2026-04-23

---

## A. Positioning

**One sentence.** A fixed-fee, 10-business-day audit that shows a CHRO exactly how their company appears to candidates asking AI about employment, benchmarked against their three closest competitors.

**One paragraph.** The Diagnostic exists in the gap between free visibility tools — which produce one-shot dashboards with no human interpretation — and multi-week strategic engagements that require procurement, a committee, and $75K+ budget. It is the first paid, analyst-delivered product in the AI employer visibility category sized for a single CHRO or VP of Talent Acquisition to authorize on a P-card or a simple PO, with a defined scope, a defined deliverable, and a defined guarantee. It is additive to existing employer brand, careers site, and recruitment marketing programs: it tells those teams what AI is currently citing about the company and what it is missing, so they can direct the content work they already do with more precision.

---

## B. What Antellion delivers (scope and methodology)

### Scope

| Dimension | Diagnostic |
|---|---|
| Candidate-intent queries | **40** (10 per stage × 4 stages) |
| Candidate journey stages | Discovery, Consideration, Evaluation, Commitment |
| AI models | **The four leading AI systems candidates use to research employers** — ChatGPT, Claude, Gemini, and Perplexity |
| Candidate personas | **3 personas**, scoped to the client's named job category |
| Conversational depth | **1 layer** (single-turn; no follow-up probing) |
| Competitors benchmarked | **3**, client-named |
| Total model responses captured | 40 queries × 4 models × 3 personas = **480 responses** |

### Candidate personas

Personas are scoped to the client's **named job category** (e.g., "Software Engineering," "Revenue," "Executive"), not drawn from a generic universal library. A persona reflects how a specific candidate archetype within that job category would actually phrase their research queries. This is what makes the Diagnostic's output relevant to the hiring problem the CHRO is actually trying to solve — audit data from a "mid-career ops generalist" persona is noise if the client is hiring ML engineers.

Each Diagnostic engagement uses **3 personas**, selected by Antellion in consultation with the client from the following 5 archetypes cross-applied to the client's job category:

| Archetype | Years of experience | Track |
|---|---|---|
| Early-career | 0-3 | Entry-level |
| Mid-career IC | 4-8 | Individual contributor |
| Senior IC | 8-15 | Specialist / principal |
| Manager | 5+ | People leadership |
| Executive | 12+ | VP / C-level |

**Worked example — Software Engineering job category:**

- *Early-career* → "New-grad SWE"
- *Mid-career IC* → "Senior applied ML engineer" (or "Senior backend engineer," "Senior product engineer")
- *Senior IC* → "Staff infrastructure engineer" (or "Principal platform engineer")
- *Manager* → "Engineering manager"
- *Executive* → "VP Engineering candidate" (or "CTO-track candidate")

The client names the job category. Antellion curates the specific persona labels and intent context per engagement, drawing on the archetype library. Clients may request custom phrasing for a specific persona without changing the 3-persona scope; those overrides live on the engagement record, not in the catalog, and are called out in the Diagnostic Report methodology section.

Persona is a **scan-matrix dimension**, not a metadata tag. Each persona's intent context parameterizes the query prompt at LLM-call time, producing genuinely different AI responses across personas rather than the same response re-labeled three times.

### Methodology

- Queries are drawn from the Antellion candidate-intent library, mapped to the four journey stages
- Each query is run independently across all four AI models with a neutral system prompt
- Each response is scored on: **visibility** (did the company appear), **sentiment** (positive / neutral / negative / contradictory), **co-mention rate** (which competitors appeared alongside), **citation sources** (which platforms AI drew from)
- Findings are surfaced by an Antellion analyst, not assembled by template

### Explicitly NOT included in the Diagnostic

- No Journey Action Map
- No prioritized remediation roadmap
- No multi-layer conversational probing
- No hallucination or source-drift analysis
- No cross-category pattern analysis
- No quarterly re-scans or monitoring
- No competitor deep-dive beyond co-mention and citation mapping
- No content asset production

These are available in Phase 1 Baseline and Phase 2 tiers.

---

## C. What the buyer receives

### 1. Diagnostic Report (PDF + interactive HTML)

**18-25 pages.** Covers:

1. Executive summary (2 pages)
2. Methodology and scope confirmation
3. Visibility index — overall score and per-model breakdown
4. Competitor co-mention map
5. Per-stage finding summaries (Discovery, Consideration, Evaluation, Commitment)
6. Citation source inventory — named platforms AI is drawing from
7. Narrative consistency flag list
8. 10+ specific findings, each with data evidence
9. Suggested next questions for a deeper engagement

### 2. Findings Brief (2-page executive summary)

A shareable document for circulation to the CEO, CMO, or board. No jargon. Scannable in 90 seconds.

### 3. Findings Review Call (45 minutes, recorded)

Scheduled within 5 business days of delivery. Client's primary contact plus up to 3 additional attendees. Walkthrough with the analyst who wrote the report. Screen-share of the interactive HTML view. Not a sales call.

### 4. Interactive HTML report (shareable via tokenized link)

Lives at `app.antellion.com/diagnostic/[token]`. No login required for viewers. Client can revoke the link at any time.

### Finding categories the Diagnostic surfaces (representative — most reports contain 10-15 findings drawn from this list)

1. **Zero-presence queries** — candidate-intent queries where the company does not appear in any of the 4 models
2. **Competitor dominance on own-name queries** — searches that include the company's name but return competitor narratives
3. **Stale or outdated narrative anchors** — AI citing company information that is 12+ months old (leadership, comp philosophy, hiring pace)
4. **Sentiment divergence across models** — Model A describes the company positively; Model B describes it negatively on identical queries
5. **Citation monoculture** — AI drawing from only one or two platforms (e.g., only Glassdoor) with high sentiment risk
6. **Persona-specific invisibility** — company appears for mid-career but is absent for early-career or executive queries
7. **Benefits and compensation narrative gaps** — candidate questions about pay, equity, or benefits return competitor data
8. **Remote/hybrid narrative contradiction** — different models describe the company's work model differently
9. **DEI narrative fragility** — diversity-related queries surface unrelated or contradictory sources
10. **Career growth narrative absence** — "will I grow at [company]" queries fail to surface any company-authored content
11. **Layoff narrative persistence** — prior workforce actions dominate search results disproportionately to recency
12. **Hallucinated facts about the company** — AI stating things that are factually incorrect
13. **Missing executive visibility** — CEO / CPO / CHRO absent from leadership-related candidate queries
14. **Role-specific competitor leak** — company loses specific roles (e.g., ML engineers) to a single competitor repeatedly
15. **Citation source Antellion would expect but AI is not using** — e.g., company newsroom, recent podcast, published benefits page

### Sample finding (verbatim quality bar)

> **Finding 7 — Sentiment divergence on compensation transparency (Consideration stage)**
>
> Across 10 Consideration-stage queries mentioning compensation or pay transparency, ChatGPT and Claude described the company as "aligned with market benchmarks" and cited a 2025 Payscale report; Perplexity returned a 2024 Glassdoor thread characterizing compensation as "below peer median" in 6 of 10 queries. Gemini produced no response in 4 of 10.
>
> **Data evidence.** Query IDs C-03, C-06, C-09; full transcripts in Appendix B. Perplexity citation stack: Glassdoor (4/10), Levels.fyi (3/10), Blind (2/10), Reddit r/cscareerquestions (1/10).
>
> **Recommendation category.** This is a citation-source problem, not a pay problem. The company's newsroom and engineering blog have three 2025 posts referencing comp philosophy that Perplexity is not surfacing. A Baseline Audit would map the full Perplexity citation ecosystem and identify which platforms need primary-source content to displace the Glassdoor-dominated narrative.

---

## D. Explicit exclusions (margin protection for Phase 1 Baseline)

| Capability | Diagnostic | Baseline ($14K) |
|---|---|---|
| Query volume | 40 | 300-400 |
| Conversational depth layers | 1 | 1 (multi-layer in Phase 2) |
| Journey Action Map | No | Yes (1-2 page strategic scorecard) |
| Prioritized remediation roadmap | No | Yes (5+ actions, effort × impact) |
| Source attribution analysis | Surface-level citation inventory | Full attribution + influence ranking |
| Written report length | 18-25 pages | 40+ pages |
| Executive readout call | 45 minutes | 60 minutes |
| Follow-up Q&A session | Included in readout | Separate 30-min session within 30 days |
| Delivery | 10 business days | 2 weeks |

---

## E. Risk reversal — "Win Your Money Back"

**Guarantee.** If the Diagnostic Report does not include at least **10 material findings**, Customer receives a full refund of the $4,900 fee within 10 business days.

**Definition of "material finding".** A material finding is an observation in the final Report that satisfies all three criteria:

1. **Specific named issue** — the finding identifies a specific query, persona, model, competitor, or citation source;
2. **Data evidence** — the finding cites at least one captured model response or citation (not generic commentary); and
3. **Actionable category** — the finding indicates a remediation direction (e.g., "citation source X is missing," "narrative contradicts across models," "persona Y invisibility").

Antellion includes a Finding Audit Appendix in every Diagnostic Report that numbers each finding and enumerates how it satisfies the three criteria. The buyer does not need to interpret the definition or adjudicate the count — it is presented in the deliverable.

**This guarantee is Antellion-controlled.** It is tied to what Antellion ships. It is not tied to what the company does after delivery, to AI-visibility improvement, to hiring outcomes, or to any customer-side action.

**Factual accuracy.** If a factual error is identified in the Diagnostic, Antellion corrects it within 48 hours of written notice or refunds the fee.

---

## F. Rollover clause

**100% of the $4,900 Diagnostic fee credits toward any of the following engagements signed within 60 days of Diagnostic delivery:**

- Phase 1 Baseline Audit ($14,000 → **$9,100 net** after credit)
- Baseline + Action Brief ($24,000 → **$19,100 net** after credit)
- Any Phase 2 engagement (Focused, Strategic, or Enterprise)

The rollover is recorded in the Diagnostic SOW as a credit memo. It is applied against the deposit invoice for the subsequent engagement, not refunded in cash.

If Customer does not proceed to a further engagement within 60 days of Diagnostic delivery, the credit expires. Customer retains the Diagnostic deliverables in perpetuity.

---

## G. Sales page copy (use in response templates, pitch decks, post-Snapshot follow-ups — not on the public marketing site)

### Headline

**See exactly where you stand in AI-driven candidate discovery. In 10 business days.**

### Subhead

A fixed-fee AI Visibility Diagnostic from Antellion. 40 candidate-intent queries tested across the four leading AI systems candidates use to research employers — ChatGPT, Claude, Gemini, and Perplexity — across 3 candidate personas scoped to your job category, benchmarked against 3 named competitors. $4,900.

### Three value bullets

- **Delivered by an analyst, not a dashboard.** You receive an 18-25 page report with 10+ named findings, each backed by captured AI responses and citation evidence — written to be circulated to your CEO, CMO, or board without further translation.
- **Built to complement your employer brand program, not replace it.** The Diagnostic identifies which citations AI is currently drawing from and which it is missing, so the work your brand, content, and recruitment marketing teams already do gets directed with more precision.
- **Full refund if we surface fewer than 10 material findings.** The guarantee is tied to what we ship, not to what you do afterward. If the Diagnostic warrants deeper work, the $4,900 credits 100% toward a Baseline Audit.

### Single CTA

**Request a Diagnostic scoping call** — jordan@antellion.com

---

## H. Internal operator checklist (day-by-day delivery plan)

> Hours are target budgets. Variance beyond 20% is a signal to retune.

**Day 0 — Scoping call (0.75 hr)**
- 45-minute call: confirm 3 competitors, 3 personas (from standard list), job category, company context
- Send SOW, $4,900 Stripe invoice (full payment up-front), data-handling DPA if requested

**Day 1 — Setup (1.5 hr)**
- Pull 40 candidate-intent queries from library (10 per stage), tailor 4-5 to customer job category and industry
- Create run matrix in internal scan tool: 40 queries × 4 models × 3 personas = 480 runs
- Competitor disambiguation: confirm exact legal names and common aliases for 3 competitors

**Days 2-3 — Scan execution (automated + 1.5 hr analyst oversight)**
- Run full matrix (480 responses). Automated via scan runner.
- Analyst spot-checks 20 responses per model for anomalies (rate limits, refusals, misattributions)

**Days 4-5 — Scoring pass (4 hr)**
- Code each response for visibility, sentiment, co-mention, citation sources
- First-pass finding candidates flagged (target: 20-25 candidate findings to filter down to 10-15)
- Citation source normalization (dedupe across domains)

**Day 6 — Synthesis (3 hr)**
- Filter candidate findings against material-finding criteria
- Draft 10-15 findings in final format with evidence citations
- Identify 2-3 findings where a Baseline-depth analysis would meaningfully extend the insight (for rollover conversation)

**Day 7 — Report drafting (4 hr)**
- Draft 18-25 page report against template
- Write 2-page Findings Brief
- Render interactive HTML view

**Day 8 — QA and polish (2 hr)**
- Self-review against finding-audit criteria
- Spot-check 3 findings for factual accuracy against source materials
- Accessibility and formatting pass on PDF and HTML

**Day 9 — Delivery (0.5 hr)**
- Send PDF, Findings Brief, and tokenized HTML link to client
- Schedule 45-min readout within 5 business days
- Tag in CRM: rollover window opens, 60-day clock starts

**Day 10 (or within 5 business days of delivery) — Readout call (1 hr)**
- 45-min call + 15-min prep
- Present interactive view, walk through 3-5 findings live
- BAMFAM: book Baseline scoping call on the calendar before hanging up

**Total analyst time per Diagnostic: ~18 hours**

---

## I. Unit economics

| Line item | Cost |
|---|---|
| LLM API usage (480 responses × ~1,500 tokens in/out average across 4 models, including retries) | ~$60-90 |
| Scan infrastructure (share of monthly infra allocated per Diagnostic) | ~$25 |
| Analyst time (18 hrs × $150/hr loaded cost) | ~$2,700 |
| Payment processing (Stripe, 2.9% + $0.30) | ~$145 |
| **Total delivery cost** | **~$2,930-2,960** |
| **Revenue** | **$4,900** |
| **Contribution margin** | **~$1,940-1,970 (~40%)** |

**Analysis.** The Diagnostic clears margin at $4,900 as a standalone offer — it is not a loss leader. If the buyer never proceeds to Baseline, Antellion still makes ~$1,950 per delivery on ~18 analyst hours. With expected rollover conversion of 30-50% to Baseline or higher, blended economics improve substantially: a 40% rollover rate turns the effective revenue per Diagnostic to ~$10,500 before any Phase 2 upsell.

**Capacity.** At 18 hours per Diagnostic and roughly 120 billable analyst hours per month solo, the ceiling is ~6-7 Diagnostics per month without compromising Baseline/Phase 2 delivery. Target mix: 4 Diagnostics + 3 Baselines + 1 Focused per month pre-hire = ~$85K monthly revenue from assessment work alone, before rollovers compound.

---

## Related files

- `docs/full-assessment-offer-stack.md` — canonical tier reference
- `docs/sow-template.md` — SOW structure; Diagnostic uses lightweight variant (see Stripe/Ops checklist)
- `docs/msa-template.md` — required for enterprise customers; not required for sub-$10K Diagnostic signed under a short-form services agreement
- `docs/response-templates.md` — add Diagnostic language to post-Snapshot follow-up templates
