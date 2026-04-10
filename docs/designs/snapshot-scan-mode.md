# Snapshot Scan Mode -- Design Document

**Author:** Architect Agent
**Date:** 2026-04-03
**Revised:** 2026-04-04 (v2 -- 100-query redesign)
**Status:** Draft

---

## 1. Snapshot Query Set Design

### Design Philosophy

The v1 snapshot asked: "What is the single most embarrassing gap we can find in under 2 minutes for under $5?" That question was wrong. A VP TA can open ChatGPT and type "best companies to work for in fintech" themselves. Twenty queries does not produce enough signal density to justify reaching out. There is nothing of value we can learn from 20 queries that the prospect could not, or has not, learned on their own.

The v2 snapshot asks a fundamentally different question: **"Across 100 systematic queries that simulate how candidates actually research employers in your industry, how often does AI recommend you -- and how often does it recommend your competitors instead?"**

The answer to that question is impossible to replicate by hand. No one is going to sit down and type 65 different variations of "best companies to work for in fintech" across different themes, phrasings, specificity levels, and framings, then tabulate mention rates. That systematic breadth is the product. It transforms a curiosity ("I wonder what ChatGPT says about us") into a statistically meaningful measurement ("You are mentioned in 12% of candidate discovery queries. Stripe is mentioned in 68%.").

### Why 100 Queries

| Count | Cost (gpt-4o-mini + web search) | Signal Density | Verdict |
|-------|------|---------|---------|
| 20 | ~$1.40 | Trivially reproducible. "0 of 8" is a data point, not a dataset. | **Dead. Too thin.** |
| 50 | ~$3.50 | Better, but discovery coverage (~30-35 queries) still leaves gaps in theme/phrasing variation. Competitor contrast limited. | Insufficient. |
| **100** | **~$7.00** | **65 discovery queries produce a statistically meaningful mention rate. 18 contrast queries cover 3-4 competitors across 6 dimensions. "We tested 100 queries" is a statement of authority in a DM.** | **Recommended.** |
| 150 | ~$10.50 | Diminishing returns. Additional discovery queries start to overlap in phrasing. Cost creeps toward the upper bound. | Overspend for v2. |

### Query Architecture: 100 Queries, 4 Categories

The snapshot uses a fixed 100-query budget. Queries are drawn from 4 categories with Discovery dominating the allocation.

| Category | Count | % of Budget | Purpose |
|----------|-------|-------------|---------|
| Discovery Absence | 65 | 65% | Mention rate with statistical weight |
| Competitor Contrast | 18 | 18% | Head-to-head across multiple competitors and dimensions |
| Reputation Probe | 10 | 10% | What AI says when asked directly |
| Citation & Source | 7 | 7% | Map the citation ecosystem |
| **Total** | **100** | **100%** | |

---

#### Category 1: Discovery Absence (65 queries)

**Purpose:** Produce a mention rate percentage that no one can replicate in 10 minutes with ChatGPT.
**DM finding type:** "Across 65 queries candidates ask AI about employers in your space, you are mentioned 12% of the time. Stripe is mentioned 68% of the time."
**Why this works:** At 8 queries, "0 of 8" is a talking point. At 65 queries, "8% mention rate vs. competitor's 65%" is a dataset. The volume is the product.

These queries NEVER mention the prospect company name. They are list-eliciting and recommendation-eliciting queries that test whether AI includes the prospect organically.

**What makes 65 discovery queries non-redundant:**

The query set is constructed as a matrix of **themes x phrasings x specificity levels x framings**. Each axis of variation produces genuinely different AI responses because the underlying retrieval and ranking changes with each combination.

##### Axis 1: Themes (10 themes)

Each theme probes a different employer value proposition dimension. AI surfaces different company lists depending on what attribute is being asked about.

| # | Theme | Why it produces different results |
|---|-------|----------------------------------|
| T1 | General reputation | Broadest signal -- "best employers" lists |
| T2 | Compensation & pay | Pay-focused queries surface different companies than culture queries |
| T3 | Culture & values | Companies known for culture vs. known for pay rarely overlap completely |
| T4 | Career growth & development | High-growth startups vs. established companies with structured paths |
| T5 | Work-life balance & flexibility | Remote-friendly companies dominate these results |
| T6 | Innovation & technology | Tech-forward companies surface here regardless of employer brand |
| T7 | Leadership & management | Queries about "best-managed companies" produce distinct lists |
| T8 | Diversity & inclusion | D&I-focused queries have their own ecosystem of top employers |
| T9 | Benefits & perks | Benefits-focused results differ from compensation results |
| T10 | Remote & hybrid work | Post-COVID, this is its own discovery category |

##### Axis 2: Phrasings (7 phrasing families)

The same intent expressed differently triggers different AI retrieval paths.

| # | Phrasing Family | Example Pattern |
|---|-----------------|-----------------|
| P1 | Best/top list | "best {industry} companies for {theme}" |
| P2 | Recommendation request | "I'm a {role} looking for {theme}, what companies should I consider" |
| P3 | Advice framing | "where should I work if I want {theme} in {industry}" |
| P4 | Known-for framing | "companies known for {theme} in {industry}" |
| P5 | Comparison without naming | "top {industry} employers for {role} compared" |
| P6 | Seniority-specific | "best {industry} companies for senior {role}" |
| P7 | Temporal/current | "best {industry} companies to work for right now" |

##### Axis 3: Specificity Levels (4 levels)

| # | Level | Example |
|---|-------|---------|
| S1 | Broad industry | "best fintech companies to work for" |
| S2 | Niche within industry | "best payments companies to work for" (when niche keywords available) |
| S3 | Role-specific | "best fintech companies for software engineers" |
| S4 | Seniority-specific | "best fintech companies for engineering managers" |

##### Axis 4: Query Framings (4 framings)

| # | Framing | Description |
|---|---------|-------------|
| F1 | List elicitation | "best X", "top X" -- asks for a ranked list |
| F2 | Recommendation | "I'm looking for...", "where should I work..." -- personal advice |
| F3 | Comparison (unnamed) | "how do {industry} companies compare for {theme}" -- no company named |
| F4 | Research | "which {industry} companies are {theme}" -- informational |

##### Template Construction: 65 Queries

Rather than enumerating all 1,120 possible combinations (10 x 7 x 4 x 4), the template engine selects 65 queries that maximize coverage across the matrix while ensuring no two queries share the same (theme, phrasing, specificity) triple. The selection is deterministic and rule-based.

**Core templates (always included, 30 queries):**

These cover every theme at least twice with varied phrasing.

| # | Template | Theme | Phrasing | Specificity |
|---|----------|-------|----------|-------------|
| D1 | `best {industry} companies to work for` | T1 | P1 | S1 |
| D2 | `top companies hiring {role} in {industry}` | T1 | P1 | S3 |
| D3 | `best companies for {role}` | T1 | P1 | S3 |
| D4 | `I'm a {role} looking for my next job in {industry}, what companies should be on my radar` | T1 | P2 | S3 |
| D5 | `top rated {industry} employers` | T1 | P1 | S1 |
| D6 | `best {industry} companies for career growth` | T4 | P1 | S1 |
| D7 | `{industry} companies with the best career development programs` | T4 | P4 | S1 |
| D8 | `where should I work if I want to grow my career in {industry}` | T4 | P3 | S1 |
| D9 | `highest paying {industry} companies for {role}` | T2 | P1 | S3 |
| D10 | `which {industry} companies pay {role} the best right now` | T2 | P7 | S3 |
| D11 | `best paying employers in {industry}` | T2 | P1 | S1 |
| D12 | `best {industry} companies for work life balance` | T5 | P1 | S1 |
| D13 | `{industry} companies known for good work life balance` | T5 | P4 | S1 |
| D14 | `where should I work in {industry} if I want work life balance` | T5 | P3 | S1 |
| D15 | `best {industry} companies for company culture` | T3 | P1 | S1 |
| D16 | `which {industry} companies have the best culture for {role}` | T3 | P1 | S3 |
| D17 | `I want to work somewhere with great culture in {industry}, what are my options` | T3 | P2 | S1 |
| D18 | `most innovative {industry} companies to work for` | T6 | P1 | S1 |
| D19 | `{industry} companies known for cutting edge technology` | T6 | P4 | S1 |
| D20 | `best {industry} companies for {role} who want to work on interesting problems` | T6 | P2 | S3 |
| D21 | `best managed {industry} companies` | T7 | P1 | S1 |
| D22 | `{industry} companies with the best leadership` | T7 | P4 | S1 |
| D23 | `most diverse {industry} companies to work for` | T8 | P1 | S1 |
| D24 | `{industry} companies with the best diversity and inclusion programs` | T8 | P4 | S1 |
| D25 | `best {industry} companies for benefits and perks` | T9 | P1 | S1 |
| D26 | `which {industry} companies have the best employee benefits` | T9 | P1 | S1 |
| D27 | `best remote {industry} companies for {role}` | T10 | P1 | S3 |
| D28 | `{industry} companies that offer remote work for {role}` | T10 | P4 | S3 |
| D29 | `which {industry} companies have the happiest employees` | T3 | P1 | S1 |
| D30 | `I'm looking for a {role} job at a company that treats employees well in {industry}` | T1 | P2 | S3 |

**Phrasing variant templates (15 queries):**

These reuse the highest-value themes (reputation, compensation, culture, growth) with phrasings that simulate natural candidate language.

| # | Template | Theme | Phrasing |
|---|----------|-------|----------|
| D31 | `if I want to be a {role} in {industry}, which companies should be on my shortlist` | T1 | P2 |
| D32 | `what are the top {industry} companies that {role} recommend working at` | T1 | P5 |
| D33 | `companies in {industry} where {role} say they are happy` | T3 | P4 |
| D34 | `best {industry} employers for someone early in their {role} career` | T4 | P1 |
| D35 | `which {industry} companies promote {role} the fastest` | T4 | P1 |
| D36 | `{industry} companies with the best compensation packages for {role}` | T2 | P4 |
| D37 | `what {industry} companies should I avoid as a {role}` | T1 | P2 |
| D38 | `most respected {industry} companies to have on your resume` | T1 | P1 |
| D39 | `{industry} companies with the best engineering culture` | T6 | P4 |
| D40 | `where do the best {role} in {industry} work` | T1 | P3 |
| D41 | `top {industry} companies for {role} career opportunities right now` | T4 | P7 |
| D42 | `{industry} companies that invest in employee development` | T4 | P4 |
| D43 | `best {industry} companies for women in {role}` | T8 | P1 |
| D44 | `which companies in {industry} have the best remote work policies` | T10 | P1 |
| D45 | `I'm a senior {role} considering {industry}, which companies stand out` | T1 | P2 |

**Seniority variant templates (8 queries):**

The same intent at different seniority levels produces meaningfully different company lists.

| # | Template | Seniority |
|---|----------|-----------|
| D46 | `best {industry} companies for junior {role}` | junior |
| D47 | `best {industry} companies for senior {role}` | senior |
| D48 | `top {industry} companies for {role} managers` | manager |
| D49 | `best places to work as a {role} lead in {industry}` | lead |
| D50 | `{industry} companies hiring experienced {role} right now` | experienced |
| D51 | `where should a mid-career {role} work in {industry}` | mid-career |
| D52 | `best {industry} companies for {role} who want to move into management` | career transition |
| D53 | `top {industry} companies for new grad {role}` | new grad |

**Conditional templates (up to 12 queries, selected based on profile):**

These templates activate based on the input profile. The engine fills remaining slots (up to 65 total) from this pool.

| # | Template | Condition | Priority |
|---|----------|-----------|----------|
| D54 | `best {niche} companies to work for` | niche keywords | 10 |
| D55 | `top {niche} companies for {role}` | niche keywords | 10 |
| D56 | `{niche} companies known for treating employees well` | niche keywords | 9 |
| D57 | `best companies to work for in {niche} right now` | niche keywords | 9 |
| D58 | `best {industry} companies to work for in {geography}` | geography | 8 |
| D59 | `top {industry} employers in {geography} for {role}` | geography | 8 |
| D60 | `{industry} companies hiring {role} in {geography}` | geography | 7 |
| D61 | `best Fortune 500 companies for {role}` | enterprise/f500 | 9 |
| D62 | `most respected Fortune 500 employers in {industry}` | enterprise/f500 | 8 |
| D63 | `best {niche} startups to work for` | niche keywords + startup | 9 |
| D64 | `which {industry} companies in {geography} have the best culture` | geography + niche | 7 |
| D65 | `{industry} companies known for {niche} that are great employers` | niche keywords | 8 |

**Selection logic for conditional slots:**

The engine starts with the 53 fixed queries (D1-D53). It then fills the remaining 12 slots from the conditional pool (D54-D65) in priority order, filtering by which conditions are satisfied. If fewer than 12 conditional templates match, the engine fills remaining slots from a fallback pool of additional phrasing variants of the core themes (e.g., restatements of T1-T10 with phrasings not yet used). The result is always exactly 65 discovery queries.

**Fallback variants (used only if conditional pool is exhausted):**

| # | Template | Theme |
|---|----------|-------|
| F1 | `which companies are considered the best employers in {industry}` | T1 |
| F2 | `{industry} companies with the highest employee satisfaction` | T3 |
| F3 | `where do top {role} talent go in {industry}` | T1 |
| F4 | `{industry} companies that are great places to work` | T1 |
| F5 | `best {industry} companies for {role} compensation and equity` | T2 |
| F6 | `{industry} employers that {role} rate highly` | T1 |
| F7 | `top {industry} companies for work flexibility and remote options` | T10 |
| F8 | `which {industry} companies are known for strong mentorship programs` | T4 |
| F9 | `best {industry} companies for people who care about social impact` | T8 |
| F10 | `{industry} companies where {role} say leadership is excellent` | T7 |
| F11 | `what are the fastest growing {industry} companies to work for` | T6 |
| F12 | `{industry} companies with the strongest employer brand` | T1 |

**Why 65 Discovery queries (65% of budget):** This is where volume creates value. 8 discovery queries is trivially reproducible by anyone with a ChatGPT subscription. 65 discovery queries across 10 themes, 7 phrasing families, 4 specificity levels, and 4 framings produces a mention rate with statistical weight that no human will replicate in an afternoon. The resulting percentage (e.g., "mentioned in 12% of candidate queries") is a real metric, not a cherry-picked anecdote.

---

#### Category 2: Competitor Contrast (18 queries)

**Purpose:** Create direct, named head-to-head comparisons across multiple competitors and multiple dimensions.
**DM finding type:** "When candidates ask AI to compare you with [competitor] on [dimension], here is what it says."
**Why this works:** VP TAs know who they lose candidates to. Eighteen comparison queries across 3-4 competitors and 6 dimensions produces a competitor ranking table, not a single anecdote.

These queries use the top 3-4 competitors. Each produces a response that explicitly names both companies and often declares a preference.

**Dimensions covered (6 dimensions):**

| # | Dimension | Why it matters |
|---|-----------|---------------|
| CD1 | Overall ("should I work at X or Y") | The broadest comparison -- lets AI pick a winner |
| CD2 | Compensation | Pay is the #1 decision factor for most candidates |
| CD3 | Culture | Culture is the #1 differentiator candidates cite when choosing between similar-pay offers |
| CD4 | Career growth | Especially resonant for engineering/product roles |
| CD5 | Role-specific ("for {role}") | Makes the comparison concrete to the target audience |
| CD6 | Innovation/tech quality | Matters for technical roles -- "which company has better engineering" |

**Template construction (18 queries across competitors and dimensions):**

The engine distributes queries across competitors and dimensions to maximize coverage. With 3 competitors and 6 dimensions, the ideal is 18 queries (3 x 6). With 2 competitors, each gets 9 queries (2 x 6 = 12 unique + 6 phrasing variants). With 4+ competitors, the top 3 get full coverage and the 4th gets 3 queries replacing the lowest-priority phrasing variants.

| # | Template | Dimension | Competitor Slot |
|---|----------|-----------|-----------------|
| C1 | `should I work at {prospect} or {competitor_1}` | CD1 | comp 1 |
| C2 | `{prospect} vs {competitor_1} for {role}` | CD5 | comp 1 |
| C3 | `which company pays {role} better, {prospect} or {competitor_1}` | CD2 | comp 1 |
| C4 | `is {prospect} or {competitor_1} better for career growth` | CD4 | comp 1 |
| C5 | `{prospect} or {competitor_1}, which has better culture` | CD3 | comp 1 |
| C6 | `is the engineering better at {prospect} or {competitor_1}` | CD6 | comp 1 |
| C7 | `should I work at {prospect} or {competitor_2}` | CD1 | comp 2 |
| C8 | `{prospect} vs {competitor_2} for {role}` | CD5 | comp 2 |
| C9 | `which company pays {role} better, {prospect} or {competitor_2}` | CD2 | comp 2 |
| C10 | `is {prospect} or {competitor_2} better for career growth` | CD4 | comp 2 |
| C11 | `{prospect} or {competitor_2}, which has better culture` | CD3 | comp 2 |
| C12 | `which company has better technology, {prospect} or {competitor_2}` | CD6 | comp 2 |
| C13 | `I'm deciding between {prospect} and {competitor_3}, what should I know` | CD1 | comp 3 |
| C14 | `{prospect} vs {competitor_3} for {role}` | CD5 | comp 3 |
| C15 | `does {prospect} or {competitor_3} pay {role} better` | CD2 | comp 3 |
| C16 | `{prospect} vs {competitor_3} for career growth opportunities` | CD4 | comp 3 |
| C17 | `is the culture better at {prospect} or {competitor_3}` | CD3 | comp 3 |
| C18 | `{prospect} or {competitor_3} for {role}, which is more innovative` | CD6 | comp 3 |

**Fallback when fewer than 3 competitors:**
- 2 competitors: each gets 6 dimension queries (12 total) + 6 phrasing variants split evenly (e.g., "I'm choosing between X and Y for {theme}", "X or Y, which is the better fit for {role}").
- 1 competitor: that competitor gets all 6 dimension queries + 12 phrasing variants with different framings.

**Why 18 comparison queries (18% of budget):** Eighteen queries across 3 competitors and 6 dimensions produces a competitor ranking table sorted by "AI preference rate." The DM hook evolves from "AI says Stripe is better than you" (a single anecdote) to "AI prefers Stripe over you on 5 of 6 dimensions we tested, and prefers Square on 4 of 6" (a systematic assessment). The table is the deliverable.

---

#### Category 3: Reputation Probe (10 queries)

**Purpose:** Surface what AI says about the prospect as an employer when candidates research them directly, across multiple angles.
**DM finding type:** "We asked AI about you as an employer 10 different ways. Here's what stands out."
**Why this works:** Prospects are curious about what AI says about them. Ten queries across varied angles produces a narrative pattern, not a single response.

**Query templates:**

| # | Template | Angle |
|---|----------|-------|
| R1 | `what is it like to work at {prospect}` | general |
| R2 | `is {prospect} a good company to work for` | evaluation |
| R3 | `{prospect} reviews as an employer` | review-seeking |
| R4 | `what do current employees say about {prospect}` | employee voice |
| R5 | `{prospect} culture and work environment` | culture-specific |
| R6 | `pros and cons of working at {prospect}` | balanced evaluation |
| R7 | `should I accept a job offer from {prospect}` | decision-making |
| R8 | `{prospect} employer reputation in {industry}` | industry-contextualized |
| R9 | `what is {prospect} known for as an employer` | brand perception |
| R10 | `{prospect} career opportunities for {role}` | role-specific |

**Why 10 reputation queries (10% of budget):** Compared to 4 queries, 10 queries across varied angles (general, evaluative, review-seeking, decision-making, role-specific) produces a richer picture of the AI narrative. It reveals whether AI says the same thing from every angle (suggesting a thin information base) or surfaces different concerns depending on the question (suggesting AI has substantive but potentially problematic source material). Both patterns are DM-worthy findings.

---

#### Category 4: Citation & Source Probe (7 queries)

**Purpose:** Map the citation ecosystem -- what sources AI uses when talking about the prospect vs. competitors.
**DM finding type:** "AI pulls from 0 sources you control. Your competitors have 5 owned citations across careers pages, engineering blogs, and Glassdoor profiles."
**Why this works:** Citation gap is the most actionable finding. It translates directly into "you need to create/improve X content."

**Query templates:**

| # | Template | What it triggers |
|---|----------|-----------------|
| S1 | `{prospect} careers and employer reputation` | Broad employer search, triggers web results |
| S2 | `{prospect} engineering blog and tech culture` or `{prospect} company culture and careers blog` | Engineering-specific or general owned content (adapted by role) |
| S3 | `{prospect} employee reviews and company culture` | Review site citations |
| S4 | `{prospect} careers page and job opportunities` | Tests whether AI cites the prospect's own careers page |
| S5 | `{prospect} employer brand and hiring` | Employer brand content ecosystem |
| S6 | `what sources describe {prospect} as an employer` | Explicit source elicitation |
| S7 | `{prospect} vs {competitor_1} employer reputation sources` | Comparative citation elicitation |

For non-engineering roles, S2 becomes `{prospect} company culture and careers blog`.

**Why 7 citation queries (7% of budget):** Seven queries is enough to establish a clear citation pattern. The comparison against competitor citation counts from the discovery and contrast categories gives us additional data for free. The gap between prospect-owned citations and competitor-owned citations across all 100 queries is a powerful metric.

---

### Query Generation: Pure Template, No LLM

The snapshot query set is assembled by the template engine in `packages/core`, using `generateSnapshotQueries`. No LLM call is needed to produce the queries. The function takes a `SnapshotQueryInput` and returns a flat array of 100 `SnapshotQuery` objects tagged with their category.

Role title selection for the snapshot: The operator picks a single representative role (e.g., "Software Engineer"). The snapshot is not role-exhaustive -- that is the full assessment's job. One role is sufficient to demonstrate the gap, but seniority variants within that role (junior, senior, manager, lead) are used in discovery queries to increase breadth.

### Cost Model

#### Per-Query Cost: gpt-4o-mini with Web Search

The snapshot uses **gpt-4o-mini with web search**, not gpt-4o. This is the critical cost lever that makes 100 queries affordable.

**gpt-4o-mini pricing (as of April 2026):**
- Input tokens: $0.15 / 1M tokens
- Output tokens: $0.60 / 1M tokens
- Web search tool call: ~$0.025-0.035 per search call (based on observed OpenAI pricing for web search tool use)

**Per-query cost estimate:**
- Average input: ~300 tokens (query + system prompt + web search context) = ~$0.000045
- Average output: ~800 tokens (AI response with web results) = ~$0.00048
- Web search call: ~$0.03
- **Total per query: ~$0.03-0.04**

Note: These estimates are based on observed gpt-4o-mini web search costs. The web search component dominates per-query cost, not the token costs. If OpenAI's web search pricing changes, the total will shift accordingly. The $0.15/query assumption from v1 was based on gpt-4o with web search, which is approximately 4x more expensive.

#### Total Cost Breakdown

| Item | Count | Unit Cost | Total |
|------|-------|-----------|-------|
| Discovery queries (gpt-4o-mini + web search) | 65 | ~$0.035 | $2.28 |
| Competitor contrast queries | 18 | ~$0.035 | $0.63 |
| Reputation probe queries | 10 | ~$0.035 | $0.35 |
| Citation probe queries | 7 | ~$0.035 | $0.25 |
| LLM text extraction fallback (~15% of queries) | ~15 | ~$0.005 | $0.08 |
| Database writes (~110 rows across tables) | -- | -- | $0.00 |
| Compute (analysis, summary) | -- | -- | $0.00 |
| **Total per snapshot** | **100 queries + ~15 fallback** | | **~$3.59** |

**Conservative upper bound:** Even if per-query web search cost is $0.05 (high estimate), total = $5.00 + $0.08 = $5.08. Still well under the $10-15 target.

**Comparison to gpt-4o:**
- gpt-4o with web search: ~$0.15/query x 100 = $15.00 (at the upper bound of the budget)
- gpt-4o-mini with web search: ~$0.035/query x 100 = $3.50 (leaves significant headroom)

The quality tradeoff is minimal for this use case. Snapshot queries are retrieval-heavy (web search does the heavy lifting) and the analysis is done server-side by our heuristic pipeline, not by the model. What we need from the model is accurate list generation and faithful reporting of what it finds on the web -- tasks where gpt-4o-mini performs comparably to gpt-4o.

---

## 2. Snapshot Data Model

### Decision: Reuse ScanRun/ScanResult with metadata flags

A snapshot is a ScanRun. It uses the same tables, same worker, same analysis pipeline, same citation extraction. What makes it a snapshot is a metadata contract.

**Why not a separate model:**
- The scan worker, analysis pipeline, and citation extraction all operate on ScanRun/ScanResult. Duplicating these for snapshots is pure waste.
- The existing `metadata: Json?` field on ScanRun already holds scan configuration (queryClusterIds, automated flag). Adding snapshot metadata is the established pattern.
- If a snapshot produces a compelling result, the operator can later run a full assessment for the same client. The client/competitor/query records already exist.

### Schema Changes: One enum value + metadata contract

**Add a `queryDepth` convention:** The existing `ScanRun.queryDepth` field (currently free-text like "First Layer") gains a new value: `"snapshot"`. This is the primary discriminator. All UI queries for "show me snapshots" filter on `queryDepth = 'snapshot'`.

No Prisma schema migration needed. The `queryDepth` field is already `String?`. The new convention is pure application logic.

**Metadata contract for snapshot ScanRuns:**

```typescript
interface SnapshotScanMetadata {
  // Standard fields (already exist)
  automated: true;
  queryClusterIds?: string[];  // may be omitted if queries are embedded directly
  queryIds?: string[];         // explicit query IDs for the snapshot set

  // Snapshot-specific fields
  snapshot: true;              // primary flag
  snapshotVersion: 2;         // v2 = 100-query redesign
  prospectName: string;       // the company being scanned
  competitors: string[];       // competitor names used in the query set
  roleTitle: string;          // the role used for query generation
  industry: string;           // the industry context

  // v2 additions
  model: "gpt-4o-mini";       // which model was used (for cost tracking)
  queryBudget: 100;           // total queries (for future flexibility)
}
```

**`snapshotVersion` contract:** This field is **purely informational**. `snapshotVersion: 2` indicates the 100-query redesign. Existing v1 snapshots (if any were created) retain `snapshotVersion: 1` and their 20-query summaries. There is no migration path from v1 to v2 summaries. The summary computation code checks `snapshotVersion` only for display purposes (e.g., "100 queries" vs. "20 queries" in the findings card header).

### Query Storage Strategy

Snapshot queries are stored as regular `QueryCluster` + `Query` records, tagged with a cluster name that signals their purpose: `"Snapshot: Discovery Absence"`, `"Snapshot: Competitor Contrast"`, etc.

This means:
- The existing scan worker resolves queries via `queryClusterIds` in metadata -- no special path needed.
- The queries are visible in the client's query list if the operator wants to inspect or reuse them.
- If the same prospect later gets a full assessment, the snapshot clusters remain as historical artifacts (they do not pollute the full assessment because the full assessment uses its own clusters).

**Alternative considered and rejected:** Embedding query text directly in `metadata.queries[]` and skipping the QueryCluster/Query tables. This would save 100 DB writes but would break the scan worker's query resolution path (which expects `queryId` references), require a parallel code path, and lose traceability. Not worth it.

---

## 3. Snapshot Summary Computation

After the scan completes, `computeSnapshotSummary` in `packages/core` processes the 100 results and produces a structured summary optimized for DM authoring.

**Storage:** The `SnapshotSummary` is stored in `ScanRun.metadata.snapshotSummary` as JSON. This is consistent with the "reuse ScanRun" philosophy throughout the design. The summary is ~5-15KB of JSON (larger than v1 due to more `allResults` entries), still a negligible addition to the metadata field.

**Computation timing:** After the scan worker marks the scan as COMPLETED, the `finalizeScan` function calls `computeSnapshotSummary` and writes the result to `ScanRun.metadata.snapshotSummary`. This keeps summary computation in the worker process, not in the UI request path.

### Output Structure

```typescript
interface SnapshotSummary {
  // ── Top-level scoreboard ──
  prospectName: string;
  totalQueries: number;                // 100
  discoveryMentionRate: number;        // e.g., 0.12 (8/65)
  discoveryMentionCount: number;       // e.g., 8 of 65
  overallMentionRate: number;          // across all 100 queries

  // ── Discovery findings ──
  discovery: {
    queriesRun: number;                // 65
    prospectMentioned: number;         // e.g., 8
    /** Competitor mention counts across all discovery queries, ranked by frequency */
    competitorRanking: Array<{
      name: string;
      mentionCount: number;
      mentionRate: number;             // e.g., 0.68 (44/65)
    }>;
    topCompetitorName: string;         // e.g., "Stripe"
    topCompetitorMentioned: number;    // e.g., 44
    /** Top 5 most damning discovery queries (prospect absent, most competitors present) */
    topGapQueries: Array<{
      queryText: string;
      competitorsMentioned: string[];  // which competitors appeared
      prospectMentioned: boolean;      // always false for gap queries
      responseExcerpt: string;
    }>;
    /** Theme-level breakdown: mention rate by theme across discovery queries */
    themeBreakdown: Array<{
      theme: string;                   // e.g., "compensation", "culture"
      queriesRun: number;
      prospectMentioned: number;
      mentionRate: number;
    }>;
    /** All discovery query results for the detail view */
    allResults: Array<{
      queryText: string;
      prospectMentioned: boolean;
      competitorsMentioned: string[];
    }>;
  };

  // ── Competitor contrast findings ──
  competitorContrast: {
    queriesRun: number;                // 18
    /** Per-competitor summary across all dimensions */
    competitorSummaries: Array<{
      competitorName: string;
      queriesRun: number;
      competitorFavoredCount: number;  // how many queries AI preferred competitor
      prospectFavoredCount: number;    // how many queries AI preferred prospect
      neutralCount: number;            // how many queries were balanced
      favorRate: number;               // competitorFavoredCount / queriesRun
      /** Per-dimension results */
      dimensions: Array<{
        dimension: string;             // "overall", "compensation", "culture", etc.
        competitorFavored: boolean;
        responseExcerpt: string;
      }>;
    }>;
    /** The single most damaging comparison (AI clearly favors competitor) */
    worstComparison: {
      queryText: string;
      competitorName: string;
      responseExcerpt: string;
      prospectSentiment: number;
      competitorFavored: boolean;
    } | null;
    allResults: Array<{
      queryText: string;
      competitorName: string;
      prospectSentiment: number;
      responseExcerpt: string;
      competitorFavored: boolean;
    }>;
  };

  // ── Reputation findings ──
  reputation: {
    queriesRun: number;                // 10
    avgSentiment: number;
    /** Narrative consistency: do all 10 queries say essentially the same thing? */
    narrativeConsistency: "consistent" | "varied" | "contradictory";
    /** Key themes AI raises across reputation queries */
    recurringThemes: string[];         // e.g., ["product-focused", "outdated info", "Glassdoor reviews"]
    /** The most problematic reputation response */
    worstResponse: {
      queryText: string;
      responseExcerpt: string;
      sentiment: number;
      keyIssue: string;
    } | null;
  };

  // ── Citation gap findings ──
  citationGap: {
    prospectOwnedCitations: number;
    prospectTotalCitations: number;
    competitorOwnedCitations: number;
    /** Gap domains: sources cited for competitors but never for prospect */
    gapPlatforms: string[];
    finding: string;
  };

  // ── DM-ready hook ──
  primaryHook: {
    category: "discovery_absence" | "competitor_contrast" | "reputation" | "citation_gap";
    headline: string;
    evidence: string;
    quotableText: string;
    findingStrength: "strong" | "moderate" | "weak";
  };

  // ── DM template ──
  dmTemplate: string;
}
```

### Key Changes from v1 Summary

1. **`discovery.topGapQueries` (array of 5)** replaces `discovery.bestGapQuery` (single). With 65 discovery queries, we can surface the 5 most damning gaps instead of just 1. This gives the operator multiple DM angles.

2. **`discovery.competitorRanking`** is new. With 65 queries, we can rank all competitors by mention rate. This produces the competitor visibility table that is the centerpiece of the findings card.

3. **`discovery.themeBreakdown`** is new. Shows mention rate per theme (compensation, culture, growth, etc.), revealing which dimensions the prospect is weakest on.

4. **`competitorContrast.competitorSummaries`** replaces the flat `allResults` as the primary structure. With 18 queries across 3 competitors and 6 dimensions, the data is best organized per-competitor with per-dimension drill-down.

5. **`reputation.narrativeConsistency`** and **`reputation.recurringThemes`** are new. With 10 reputation queries, we can detect whether AI repeats the same narrative (thin information base) or surfaces varied concerns.

### Hook Scoring Updates

The hook scoring algorithm is unchanged in structure but the thresholds shift because the data is richer.

**Updated constants:**

```typescript
const DISCOVERY_BASE = 100;
const CONTRAST_BASE = 80;
const CITATION_BASE = 70;
const REPUTATION_BASE = 60;

// Discovery bonuses adjust for 65-query denominator
const TOTAL_ABSENCE_BONUS = 30;
const COMPETITOR_DOMINANCE_THRESHOLD = 30;  // was 4 (of 8); now 30 (of 65)
const COMPETITOR_DOMINANCE_BONUS = 20;
const GAP_MULTIPLIER = 50;                  // unchanged; applied to rate difference

// Contrast bonuses adjust for per-competitor analysis
const COMPETITOR_FAVORED_BONUS = 40;
const MULTI_COMPETITOR_FAVORED_BONUS = 15;  // NEW: bonus when 2+ competitors favored
const STRONG_SENTIMENT_THRESHOLD = 0.3;
const STRONG_SENTIMENT_BONUS = 20;

// Reputation and citation unchanged
const NEGATIVE_FRAMING_BONUS = 40;
const PRODUCT_FOCUS_BONUS = 30;
const ZERO_OWNED_CITATIONS_BONUS = 40;
const RICH_COMPETITOR_CITATIONS_THRESHOLD = 3;
const RICH_COMPETITOR_CITATIONS_BONUS = 20;
```

**Updated discovery headline generation:**

The headline now uses percentages instead of fractions, reflecting the statistical nature of the data:

```
// v1: "Stripe appeared in 6 of 8 AI discovery queries — your company appeared in none."
// v2: "Across 65 candidate discovery queries, Stripe is mentioned 68% of the time. Your company: 12%."
```

**Updated finding strength thresholds:**

The thresholds remain at 130/90 but are more likely to fire at "strong" because the richer data produces larger gap multipliers. With 65 discovery queries, even a moderate gap (prospect 15% vs. competitor 60%) produces a GAP_MULTIPLIER of 0.45 * 50 = 22.5, pushing discovery to 122.5 before any bonuses.

### Quotable Text Extraction

Same rules as v1. With more queries, the heuristic rules (1-3) will fire more often, reducing dependence on the LLM extraction fallback (Rule 4). Estimated fallback rate drops from ~20% to ~15% because more varied responses increase the probability of finding a heuristic-matchable sentence.

---

## 4. DM-Ready Output View

### Layout: Snapshot Findings Card

This is NOT the report page. It is a dedicated `/snapshots/{id}` view. The page has a single purpose: let the operator craft a DM in 60 seconds.

```
+------------------------------------------------------------------+
|  SNAPSHOT: {Prospect Name}                                        |
|  {industry} | {role scanned} | {date} | 100 queries | ~$3.50     |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  PRIMARY FINDING                                          [Copy]  |
|                                                                    |
|  "{headline from primaryHook}"                                     |
|                                                                    |
|  {evidence from primaryHook}                                       |
|                                                                    |
|  AI quote: "{quotableText}"                                       |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  DISCOVERY SCORECARD                                              |
|                                                                    |
|  Mention Rate: {prospect} mentioned in {X}% of 65 queries         |
|                                                                    |
|  +-------------------+--------+----------+                        |
|  | Company           | Rate   | Mentions |                        |
|  +-------------------+--------+----------+                        |
|  | {competitor_1}    | 68%    | 44/65    |                        |
|  | {competitor_2}    | 52%    | 34/65    |                        |
|  | {competitor_3}    | 41%    | 27/65    |                        |
|  | ** {prospect} **  | 12%    |  8/65    |                        |
|  +-------------------+--------+----------+                        |
|                                                                    |
|  Top 5 Gap Queries:                                               |
|  1. "best fintech companies for engineers"                        |
|     AI listed: Stripe, Square, Robinhood, Plaid... (not you)     |
|  2. "highest paying fintech companies"                            |
|     AI listed: Stripe, Coinbase, Square... (not you)             |
|  3. "fintech companies with best culture"                         |
|     AI listed: Stripe, Affirm, Chime... (not you)               |
|  4. "where should a senior engineer work in fintech"              |
|     AI listed: Stripe, Square, Coinbase... (not you)             |
|  5. "top fintech employers right now"                             |
|     AI listed: Stripe, Robinhood, Square... (not you)            |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  COMPETITOR CONTRAST TABLE                                        |
|                                                                    |
|  +-------------------+--------+--------+-------+--------+        |
|  | Competitor        | Favored| Neutral| You   | Rate   |        |
|  +-------------------+--------+--------+-------+--------+        |
|  | {competitor_1}    | 4/6    | 1/6    | 1/6   | 67%    |        |
|  | {competitor_2}    | 3/6    | 2/6    | 1/6   | 50%    |        |
|  | {competitor_3}    | 5/6    | 1/6    | 0/6   | 83%    |        |
|  +-------------------+--------+--------+-------+--------+        |
|                                                                    |
|  Worst comparison:                                                 |
|  Q: "should I work at {prospect} or {competitor_3}"               |
|  A: "{competitor_3} is widely regarded as the stronger            |
|      choice for engineering careers..."                            |
+------------------------------------------------------------------+

+-------------------------------+-----------------------------------+
|  REPUTATION                   |  CITATION GAP                     |
|                               |                                   |
|  10 queries | Avg: -0.15      |  {prospect}: 0 owned citations    |
|  Narrative: consistent        |  {competitor_1}: 5 citations      |
|  (AI repeats same thin info)  |  {competitor_2}: 3 citations      |
|                               |                                   |
|  Recurring: product-focused,  |  Missing from:                    |
|  outdated Glassdoor data      |  glassdoor.com, levels.fyi        |
|                               |  builtin.com, linkedin.com        |
|  Worst:                       |                                   |
|  Q: "pros and cons of working |                                   |
|     at {prospect}"            |                                   |
|  A: "primarily known for      |                                   |
|     their product..."         |                                   |
+-------------------------------+-----------------------------------+

+------------------------------------------------------------------+
|  DM TEMPLATE                                              [Copy]  |
|                                                                    |
|  Hi {first_name},                                                  |
|                                                                    |
|  We tested 100 queries that candidates ask AI about employers      |
|  in {industry} -- {primaryHook.headline}                           |
|                                                                    |
|  {primaryHook.evidence}                                            |
|                                                                    |
|  The data includes a competitor ranking, gap analysis, and         |
|  specific queries where you are missing. Happy to walk you         |
|  through the findings if useful.                                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  ALL 100 QUERY RESULTS (expandable)                               |
|  [Discovery (65)] [Contrast (18)] [Reputation (10)] [Citations(7)]|
|                                                                    |
|  Each row: query text | mentioned? | competitors found | excerpt   |
+------------------------------------------------------------------+
```

### Key Changes from v1 Findings Card

1. **Competitor ranking table** replaces the simple "X: 6/8, Y: 4/8" display. With 65 discovery queries, the table is a proper ranking sorted by mention rate. This is the centerpiece visual.

2. **Top 5 gap queries** replaces "worst gap query." Five examples gives the operator multiple DM angles and demonstrates the breadth of the scan.

3. **Competitor contrast table** replaces the single "worst comparison" display. With 18 queries across 3 competitors and 6 dimensions, the per-competitor favor rate is a meaningful metric.

4. **Reputation section** adds narrative consistency and recurring themes. With 10 queries, the pattern detection adds real value.

5. **DM template** is updated to lead with "We tested 100 queries" (see below).

### Interaction Details

- **[Copy] buttons** on the primary finding and DM template for one-click clipboard.
- The DM template is pre-populated but rendered in an editable textarea. The operator can modify before copying. The stored summary retains the original generated template; operator edits are transient (client-side only, not persisted).
- The primary finding is highlighted with a colored left border (red for discovery absence, orange for competitor contrast, yellow for reputation, blue for citation gap).
- The "ALL 100 QUERY RESULTS" section defaults to collapsed. Each category tab shows the raw data.
- Every AI response excerpt links to the full response (click to expand inline).
- The competitor ranking table and contrast table are the primary visual anchors. They should render prominently without scrolling.

### Route Structure

```
/snapshots          -- list of all snapshots (filtered ScanRun list)
/snapshots/new      -- creation flow (see Section 5)
/snapshots/{id}     -- findings card (this section)
```

These are NOT nested under `/scans`. Snapshots are a distinct workflow with a distinct purpose.

---

## 5. Snapshot Creation Flow

### Single-Page Flow

The snapshot creation is a single page at `/snapshots/new` with 4 sequential steps, all on one page.

```
Step 1: PROSPECT DETAILS
+----------------------------------------------------------+
|  Company name:    [__________________________]           |
|  Domain:          [__________________________]           |
|  Industry:        [________ dropdown ________]           |
|  Niche keywords:  [__________________________] (optional)|
|  Geography:       [__________________________] (optional)|
+----------------------------------------------------------+

Step 2: COMPETITORS (minimum 2, recommended 3+)
+----------------------------------------------------------+
|  Competitor 1:    [name] [domain]                        |
|  Competitor 2:    [name] [domain]                        |
|  Competitor 3:    [name] [domain]                        |
|  + Add competitor (up to 5)                               |
|                                                           |
|  More competitors = richer contrast data. 3 competitors   |
|  fills the full 18-query contrast matrix. 2 is the       |
|  minimum; queries will be redistributed.                  |
+----------------------------------------------------------+

Step 3: TARGET ROLE
+----------------------------------------------------------+
|  Role title:      [Software Engineer_______]             |
|  (used to scope queries -- pick the role you'd mention   |
|   in the DM)                                              |
+----------------------------------------------------------+

Step 4: CONFIRM & SCAN
+----------------------------------------------------------+
|  100 queries will be generated and scanned automatically. |
|  Model: gpt-4o-mini with web search                      |
|  Estimated cost: ~$3.50                                   |
|  Estimated time: 3-5 minutes                              |
|                                                           |
|        [Run Snapshot Scan]                                |
+----------------------------------------------------------+
```

### What Happens on Submit

1. **Create Client** (if not exists): Uses `createClient` action. If a client with this domain already exists, reuse it.

2. **Create Competitors**: For each competitor, call the existing competitor creation action. Skip if already exists for this client.

3. **Generate Snapshot Queries**: Call `generateSnapshotQueries()` in packages/core. This returns 100 `SnapshotQuery` objects. Persist them as QueryCluster + Query records under the client.

4. **Create ScanRun**: Create a ScanRun with:
   - `queryDepth: "snapshot"`
   - `status: "RUNNING"`
   - `metadata: { automated: true, snapshot: true, snapshotVersion: 2, model: "gpt-4o-mini", queryBudget: 100, ... }`
   - `queryClusterIds` pointing to the snapshot clusters

5. **Redirect to `/snapshots/{id}`**: The findings card page polls for completion. During the ~3-5 minute scan, the page displays the existing `ScanProgressBar` component with per-query progress (e.g., "Running query 34 of 100..."). This infrastructure already exists for full scans; snapshots reuse it as-is.

### Server Action: `createSnapshotScan`

This is a single server action in `apps/web/src/app/(dashboard)/actions/snapshots.ts` that orchestrates steps 1-4 as a transaction (or sequential calls with rollback-on-failure). Zod schema:

```typescript
const CreateSnapshotSchema = z.object({
  // Prospect
  prospectName: z.string().min(1).max(255),
  prospectDomain: domain,
  industry: z.string().min(1).max(255),
  nicheKeywords: z.string().max(1000).optional(),
  geography: z.string().max(255).optional(),
  // Competitors (2-5)
  competitors: z.array(z.object({
    name: z.string().min(1).max(255),
    domain: domain,
  })).min(2).max(5),
  // Role
  roleTitle: z.string().min(1).max(255),
});
```

Unchanged from v1 except the displayed cost and time estimates in the confirmation step.

### Implementation Boundary

The server action calls into `packages/core` for query generation. It calls into existing Prisma operations for client/competitor/query/scan creation. The only new core logic is the expanded `generateSnapshotQueries`. Everything else is orchestration of existing building blocks.

---

## 6. Cost Analysis

### Per-Snapshot Cost Breakdown

| Item | Cost |
|------|------|
| 100 gpt-4o-mini web search queries | ~$3.50 |
| LLM text extraction fallback (est. 15% of queries = ~15 calls x $0.005) | ~$0.08 |
| Database writes (~110 rows across tables) | $0.00 (negligible) |
| Compute (analysis, summary) | $0.00 (CPU-only) |
| **Total per snapshot** | **~$3.58** |

### Comparison to v1

| Metric | v1 (20 queries, gpt-4o) | v2 (100 queries, gpt-4o-mini) |
|--------|-------------------------|-------------------------------|
| Query count | 20 | 100 |
| Per-query cost | ~$0.15 | ~$0.035 |
| Total cost | ~$3.04 | ~$3.58 |
| Discovery queries | 8 | 65 |
| Signal density | Trivially reproducible | Statistically meaningful |
| DM hook | "0 of 8 queries" | "12% of 65 queries" |

The cost increase is ~$0.54 (+18%). The signal density increase is 5x. This is the single best cost/value tradeoff available.

### Margin Analysis

| Metric | Value |
|--------|-------|
| Cost per snapshot | ~$3.58 |
| Budget cap | $15.00 |
| Headroom for retries/multi-model | ~$11.42 |
| Conversion rate assumption | 5-10% of DMs get meetings |
| Meetings per $100 spend | 1.4-2.8 (at 28 snapshots per $100) |
| Deal size | $10,000+ |
| Required conversion to break even | 0.4% (1 deal per 280 snapshots / $1,000 spend) |

At ~$3.58 per snapshot, this remains an extraordinarily efficient top-of-funnel channel. The higher query count does not meaningfully change the unit economics.

### Latency Budget

With the scan worker processing queries in parallel batches and ~3-5 second response times per web search query:

| Component | Time |
|-----------|------|
| 100 queries at 5 concurrent x ~4s avg | ~80s |
| 100 queries at 10 concurrent x ~4s avg | ~40s |
| Summary computation | <2s |
| DB writes (parallel where possible) | <3s |
| **Total (5 concurrent)** | **~85 seconds** |
| **Total (10 concurrent)** | **~45 seconds** |

gpt-4o-mini is faster than gpt-4o (lower latency per request), and web search latency is dominated by the search provider, not the model. Targeting 10 concurrent requests to finish within 60 seconds. With 5 concurrent, still well under the 5-minute maximum. The scan worker already supports configurable concurrency.

---

## 7. DM Template

### Updated Template

The DM template reflects the authority of 100 queries:

```
Hi {first_name},

We tested 100 queries that candidates ask AI about employers in {industry} — {primaryHook.headline}

{primaryHook.evidence}

The full data includes a competitor ranking across 65 discovery queries, head-to-head comparisons on 6 dimensions, and specific queries where {prospect} is absent. Happy to walk you through the findings if useful.
```

**Why this template is stronger than v1:**

- "We tested 100 queries" is a statement of authority. It implies systematic methodology, not a casual experiment.
- "65 discovery queries" and "6 dimensions" signal depth that the prospect cannot replicate.
- "competitor ranking" and "head-to-head comparisons" promise structured deliverables, not anecdotes.
- The offer is to "walk through the findings" not "share the full picture" -- more specific, implies there is something concrete to show.

### DM Hook Examples by Finding Type

**Discovery absence (most common, strongest):**

> We tested 100 queries that candidates ask AI about employers in fintech -- across 65 discovery queries, Stripe appears 68% of the time. Plaid appears 12%.
>
> The gap is largest on compensation queries (Stripe: 80%, Plaid: 5%) and career growth queries (Stripe: 72%, Plaid: 8%). Your company is absent from 57 of 65 queries where at least one of your competitors appears.
>
> The full data includes a competitor ranking across 65 discovery queries, head-to-head comparisons on 6 dimensions, and specific queries where Plaid is absent. Happy to walk you through the findings if useful.

**Competitor contrast:**

> We tested 100 queries that candidates ask AI about employers in fintech -- when candidates compare you head-to-head with Stripe, AI favors Stripe on 5 of 6 dimensions we tested.
>
> The comparison covers overall fit, compensation, culture, career growth, role-specific, and innovation. Stripe wins on compensation, culture, career growth, role-specific, and innovation. The only dimension where AI sees you as competitive is overall fit.
>
> The full data includes a competitor ranking across 65 discovery queries, head-to-head comparisons on 6 dimensions, and specific queries where Plaid is absent. Happy to walk you through the findings if useful.

---

## Implementation Plan

### Phase 1: Core Query Generation (packages/core)

1. Expand `generateSnapshotQueries(input: SnapshotQueryInput): SnapshotQuery[]` to produce 100 queries using the template matrix approach.
2. Update `SnapshotQuery` type to include optional `theme` and `dimension` fields for downstream analysis.
3. Update `computeSnapshotSummary(results: SnapshotResultData[]): SnapshotSummary` for the new output structure (competitor ranking, top 5 gaps, theme breakdown, contrast summaries, narrative consistency).
4. Update hook scoring constants (`COMPETITOR_DOMINANCE_THRESHOLD` to 30, add `MULTI_COMPETITOR_FAVORED_BONUS`).
5. Update `buildDmTemplate` for the new template text.

### Phase 2: Server Action + Scan Integration (apps/web)

6. Update `createSnapshotScan` server action for the new metadata contract (`snapshotVersion: 2`, `model: "gpt-4o-mini"`, `queryBudget: 100`).
7. Configure the scan worker to use gpt-4o-mini for snapshot scans (check `metadata.model`).
8. No other scan worker changes needed -- snapshots still use `metadata.automated = true`.

### Phase 3: UI (apps/web)

9. `/snapshots/new` -- update confirmation text ("100 queries", "~$3.50", "3-5 minutes").
10. `/snapshots/{id}` -- redesign findings card (competitor ranking table, top 5 gaps, contrast table, updated reputation section).
11. `/snapshots` -- list view unchanged.

### Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| 65 discovery queries produce redundant responses | Medium | The template matrix is designed to vary across 4 axes. Even if some responses overlap, the mention-rate calculation absorbs redundancy gracefully. We need mention counts, not unique responses. |
| gpt-4o-mini produces lower-quality responses than gpt-4o | Low | For retrieval-heavy queries (web search does the work), model quality matters less. The model is generating lists from search results, not reasoning. Test 20 queries on both models and compare. |
| 100 queries triggers rate limiting | Medium | The scan worker already handles 429s with exponential backoff. gpt-4o-mini has higher rate limits than gpt-4o. Configurable concurrency (5-10) provides a dial. |
| Cost exceeds estimates | Low | Even at $0.05/query (high estimate), total is ~$5.08. Well under the $15 cap. Monitor actual per-query costs on first 10 snapshots. |
| Scan takes >5 minutes | Low | At 10 concurrent requests, estimated 45 seconds. At 5 concurrent, ~85 seconds. Only extreme rate limiting could push past 5 minutes. |
| Competitor names not recognized by AI | Low | Same as v1. Operator responsibility. Entering obscure competitors produces weak contrast findings -- which is itself a data point. |
| Summary computation is too slow for 100 results | Very Low | Summary computation is CPU-only heuristic analysis. 100 results vs. 20 adds negligible time (<1 second delta). No LLM calls in the hot path. |

### What This Design Does NOT Include

- **Multi-model scanning** (running queries on Claude and Gemini too). The $11.42 headroom under the $15 cap makes this viable. Run the top 10 discovery queries on a second model for ~$0.50 more. Natural Phase 2.
- **Automated DM sending.** The operator writes/sends the DM manually.
- **Snapshot-to-assessment upgrade flow.** A "Run Full Assessment" button on the findings card is a nice Phase 2 addition.
- **Batch snapshot execution.** Running 20+ snapshots at once for a prospect list. The current design is one-at-a-time.
- **Batch snapshot execution via CSV import.** Natural scale-up path for day two.
- **Conversion tracking.** Tracking whether a snapshot resulted in a meeting or deal.
- **A/B testing of DM templates.** With 100 queries producing richer data, there are multiple plausible DM framings. A/B testing which framing converts best is the natural optimization after v2 proves the concept.
