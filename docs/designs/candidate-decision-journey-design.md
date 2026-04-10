# Candidate Decision Journey Assessment Framework

**Status:** Design proposal
**Author:** Architect
**Date:** March 27, 2026
**Scope:** Assessment methodology redesign -- query generation, scan comparison, report composition, data model, confidence scoring

---

## Problem statement

The current assessment uses six flat themes (reputation, compensation, culture, role\_expectations, hiring\_process, competitor\_comparison) that describe *what* candidates ask about but not *when* they ask it in their decision process. This creates three specific problems:

1. **No funnel narrative.** The report treats a Discovery query ("best tech companies to work for in Austin") identically to a Commitment query ("what's the interview process at Meridian"). But these queries have fundamentally different competitive dynamics: Discovery is about whether you make the list; Commitment is about whether you close the deal.

2. **Remediation is stage-blind.** A citation gap on Levels.fyi matters most at the Evaluation stage (compensation comparison). A citation gap on Built In matters most at the Discovery stage (employer lists). The current flat model cannot distinguish these, so recommendations are generic.

3. **The "$10K aha moment" is buried.** The most powerful finding in the current report is the theme-level variance table (Hiring Process 83%, Compensation 17%). But the report presents this as a flat grid. The journey model reframes it as: "You're strong once candidates decide to apply, but invisible during the stage where they decide whether to consider you at all." That story justifies the price.

---

## Design overview

This design adds a **decision stage** dimension to the existing theme system. It does not replace themes -- it layers stages on top of them, creating a two-dimensional query taxonomy:

```
                    Discovery   Consideration   Evaluation   Commitment
Reputation             x             x
Compensation                         x              x            x
Culture                x             x              x
Role Expectations                    x              x
Hiring Process                                                   x
Competitor Comp                                     x
```

Every query has both a `theme` (what topic) and a `stage` (where in the journey). The existing theme-level analysis continues to work. The new stage-level analysis adds the funnel narrative.

---

## Part 1: The 7-Layer Assessment Framework

### Layer 1: Decision Journey Mapping

Four stages, defined by candidate intent and competitive dynamics:

| Stage | Candidate question | AI behavior | What "visible" means |
|---|---|---|---|
| **Discovery** | "What companies should I consider?" | AI generates lists, rankings, recommendations | Being named in the list at all |
| **Consideration** | "Tell me about [Company]" | AI synthesizes a company profile from multiple sources | Being described accurately and favorably |
| **Evaluation** | "How does [Company] compare to [Competitor]?" | AI produces head-to-head comparison with tradeoffs | Being positioned favorably in the comparison |
| **Commitment** | "What's the interview/salary like at [Company]?" | AI provides specific, actionable details | Having accurate, encouraging details available |

**Key insight:** Each stage has a *conversion gate*. A candidate who doesn't find you in Discovery never reaches Consideration. A candidate who gets negative Consideration signals never reaches Evaluation. The funnel compounds -- a 50% drop at each stage means only 6% of AI-researching candidates reach Commitment.

**Stage transition dynamics:**

- Discovery -> Consideration: Triggered by the company appearing in a list. If absent, the candidate never searches for you by name.
- Consideration -> Evaluation: Triggered by the AI profile being sufficiently positive. If negative or thin, the candidate drops out.
- Evaluation -> Commitment: Triggered by favorable comparison against alternatives. If the competitor wins the comparison, the candidate moves to that competitor's Commitment stage instead.
- Commitment -> Application: Triggered by specific details (salary, interview process, culture signals) being encouraging. If absent or negative, the candidate abandons.

### Layer 2: Multi-Dimensional Query Design

Each query template is tagged with both a `theme` and a `stage`. The current 33 base templates plus 3 competitor templates map as follows, with new templates added to cover gaps:

**Discovery stage queries** (candidate does not know the company yet):

| Template | Theme | Current? |
|---|---|---|
| "best {industry} companies to work for in {geography}" | reputation | YES (existing) |
| "top companies for {role} in {geography}" | reputation | YES |
| "best paying companies for {role} in {geography}" | compensation | YES |
| "companies with strong engineering culture in {industry}" | culture | new |
| "fastest growing {industry} companies hiring {role}" | reputation | new |
| "best employers for {role} in {geography} 2026" | reputation | new |

**Consideration stage queries** (candidate knows the company name, researching it):

| Template | Theme | Current? |
|---|---|---|
| "what is it like to work at {company}" | reputation | YES |
| "{company} employee reviews" | reputation | YES |
| "is {company} a good company to work for" | reputation | YES |
| "{company} glassdoor rating" | reputation | YES |
| "{company} work life balance" | culture | YES |
| "{company} remote work policy" | culture | YES |
| "{company} diversity and inclusion" | culture | YES |
| "{company} career growth for {role}" | culture | YES |
| "{company} employer reputation {role}" | reputation | YES |
| "{company} engineering team culture" | culture | YES |
| "{company} tech stack for {role}" | role\_expectations | YES |
| "day in the life of a {role} at {company}" | role\_expectations | YES |
| "{company} {role} team structure" | role\_expectations | YES |
| "{company} engineering blog" | role\_expectations | YES |
| "what does a {role} do at {company}" | role\_expectations | YES |
| "{role} at {company} responsibilities" | role\_expectations | YES |
| "{company} benefits and perks" | compensation | YES |

**Evaluation stage queries** (candidate actively comparing options):

| Template | Theme | Current? |
|---|---|---|
| "{company} vs {competitor} for {role}" | competitor\_comparison | YES |
| "should I work at {company} or {competitor}" | competitor\_comparison | YES |
| "{company} compared to {competitor} engineering culture" | competitor\_comparison | YES |
| "{company} {role} compensation package" | compensation | YES |
| "{role} salary at {company}" | compensation | YES |
| "{role} salary {geography}" | compensation | YES |
| "{company} equity compensation for {role}" | compensation | YES |
| "does {company} allow remote {role}" | culture | YES |
| "{company} vs {competitor} salary for {role}" | compensation | new |
| "{company} vs {competitor} work life balance" | culture | new |

**Commitment stage queries** (candidate deciding whether to apply/accept):

| Template | Theme | Current? |
|---|---|---|
| "{company} {role} interview process" | hiring\_process | YES |
| "how to get hired at {company} as a {role}" | hiring\_process | YES |
| "{company} interview questions for {role}" | hiring\_process | YES |
| "{company} hiring timeline" | hiring\_process | YES |
| "{company} onboarding experience" | hiring\_process | YES |
| "{company} offer negotiation" | compensation | new |
| "what to expect first 90 days at {company}" | role\_expectations | new |

**Observation:** The existing templates naturally cluster into stages. Discovery queries lack the company name. Consideration queries name the company but not a competitor. Evaluation queries name both. Commitment queries name the company and ask for actionable specifics. The stage classification is largely derivable from template structure, not arbitrary tagging.

### Layer 3: Competitive Presence Mapping

At each stage, competitor visibility has different meaning:

| Stage | Presence type | What it means |
|---|---|---|
| Discovery | **Listed** vs. **Absent** | Was the competitor named in the AI-generated list? Binary. |
| Consideration | **Recommended** vs. **Mentioned** vs. **Warned** | How was the competitor characterized? Favorable, neutral, or cautionary? |
| Evaluation | **Preferred** vs. **Equal** vs. **Disadvantaged** | In head-to-head comparisons, which way does AI lean? |
| Commitment | **Detailed** vs. **Sparse** | Does AI have enough specific information to help the candidate commit? |

**Implementation approach:** The current `mentioned: boolean` and `sentimentScore: number` already capture the raw signal. The stage-level presence type is a derived classification computed from these values plus the stage context:

```typescript
function presenceType(stage: DecisionStage, mentioned: boolean, sentiment: number | null): PresenceType {
  if (!mentioned) return "absent";
  switch (stage) {
    case "discovery": return "listed";
    case "consideration":
      if (sentiment != null && sentiment > 0.3) return "recommended";
      if (sentiment != null && sentiment < -0.1) return "warned";
      return "mentioned";
    case "evaluation":
      if (sentiment != null && sentiment > 0.2) return "preferred";
      if (sentiment != null && sentiment < -0.2) return "disadvantaged";
      return "equal";
    case "commitment":
      // Proxy: longer responses with citations = detailed
      return "detailed"; // refined at implementation time with response length
  }
}
```

This is a report-time computation, not stored data. No schema change needed for this layer.

### Layer 4: Citation Ecosystem Analysis

Different stages cite different sources. The design maps expected citation patterns per stage:

| Stage | Primary citation sources | Why |
|---|---|---|
| Discovery | Best-of lists (Built In, Comparably), rankings (Glassdoor "Best Places"), press (TechCrunch, Forbes) | AI builds lists from aggregated ranking sources |
| Consideration | Review sites (Glassdoor, Indeed, Blind), company sites (careers page, blog), professional networks (LinkedIn) | AI synthesizes company profiles from review and first-party data |
| Evaluation | Compensation data (Levels.fyi, PayScale, Glassdoor Salaries), comparison content (Blind, Reddit) | AI needs quantitative data for comparisons |
| Commitment | Interview review sites (Glassdoor interviews, LeetCode), process descriptions (career pages), offer data (Levels.fyi) | AI needs specific, actionable details |

**Implementation:** The existing `CitationAnalysis` in `scan-comparison.ts` computes citation data flat across all results. The design extends this to compute per-stage citation analysis by filtering results by stage before calling `computeCitations()`. This is a pure computation change in report-composer.ts, not a schema change.

The report then tells a citation story per stage: "At the Discovery stage, AI cites Built In and Comparably -- platforms where Meridian has no presence. At the Evaluation stage, AI cites Levels.fyi -- where Meridian has no salary data."

### Layer 5: Narrative Positioning Analysis

Beyond mention detection, analyze *how* the client is described. The current system captures:
- `mentioned: boolean` -- present or absent
- `visibilityScore: number` -- prominence (0-100)
- `sentimentScore: number` -- tone (-1 to 1)

The narrative positioning layer derives a richer classification from these signals, contextualized by stage:

| Positioning | Criteria | Example |
|---|---|---|
| **Champion** | mentioned=true, visibility>=70, sentiment>0.3 | "Meridian Technologies is a top choice for backend engineers..." |
| **Contender** | mentioned=true, visibility>=40, sentiment>0 | "Meridian Technologies is building a platform engineering team..." |
| **Peripheral** | mentioned=true, visibility<40, sentiment>=0 | "...along with Meridian Technologies and others in the space" |
| **Cautionary** | mentioned=true, sentiment<0 | "Meridian Technologies has limited data available, some reviews suggest..." |
| **Invisible** | mentioned=false | Company not named in the response |

This is computed at report time from existing scan result data. No new data capture needed.

**Per-stage narrative summary:** The report produces a sentence like: "In Discovery queries, Meridian is positioned as a Contender (mentioned but not featured). In Evaluation queries, Meridian is Invisible -- candidates comparing options never encounter the company."

### Layer 6: Visibility Gap Diagnosis

This is the core "aha moment" deliverable. For each stage, compute:

```typescript
interface StageGapDiagnosis {
  stage: DecisionStage;
  clientMentionRate: number;
  clientAvgVisibility: number;
  clientAvgSentiment: number | null;
  topCompetitorMentionRate: number;
  topCompetitorName: string;
  gapPp: number;                        // percentage point gap vs top competitor
  queryCount: number;
  sampleConfidence: ConfidenceTier;
  citationGaps: string[];               // domains cited at this stage where client is absent
  narrativePositioning: PositioningTier; // dominant positioning at this stage
  funnelImpact: string;                 // "Candidates drop out before reaching Evaluation"
  remediationPriority: "critical" | "high" | "medium" | "low";
}
```

The gap diagnosis produces the funnel story:

> **Discovery (50% mention rate, Moderate):** Meridian appears in half of "best companies" queries. Apex appears in 83%. One in three candidates who start their AI research never learn Meridian exists.
>
> **Consideration (67% mention rate, Moderate):** When candidates search for Meridian by name, AI provides a reasonable profile. Sentiment is slightly positive. This is not where candidates are lost.
>
> **Evaluation (17% mention rate, Critical Gap):** When candidates compare employers on compensation and culture, Meridian is functionally invisible. Apex dominates. This is where the pipeline breaks -- candidates who discovered Meridian lose it at the comparison stage because AI has no compensation or comparison data to work with.
>
> **Commitment (83% mention rate, Strong):** Candidates who reach the point of asking about Meridian's interview process find good information. The problem is that too few candidates make it this far.

This is the story that justifies $10K+: the funnel model pinpoints *exactly where* in the candidate journey Meridian loses people, and the gap between stages makes the loss tangible.

### Layer 7: Prioritized Remediation Plan

Each stage's gaps map to specific, distinct remediation strategies:

| Stage | Gap type | Remediation |
|---|---|---|
| Discovery | Not appearing in "best of" lists | Get on ranking platforms (Built In, Comparably). Publish press coverage. Increase Glassdoor review volume. |
| Consideration | Thin or negative company profile | Improve Glassdoor presence. Complete employer profiles. Launch engineering blog. Employee advocacy. |
| Evaluation | Losing head-to-head comparisons | Publish salary data on Levels.fyi. Differentiate on compensation, culture, or technical stack in comparison-friendly formats. |
| Commitment | Missing interview/salary details | Populate interview review data. Publish transparent hiring process. Share salary ranges publicly. |

**Implementation:** The existing `generateRecommendations()` function produces recommendations based on overall metrics. The redesigned version groups recommendations by stage and prioritizes by funnel impact:

- A Discovery gap is CRITICAL if mention rate < 30% (candidates never enter the funnel)
- An Evaluation gap is HIGH if mention rate < 30% (candidates enter but are lost to competitors)
- A Commitment gap is MEDIUM unless it's the only gap (candidates are nearly there but not closing)
- A Consideration gap is HIGH if sentiment < 0 (company is known but perceived negatively)

This prioritization replaces the current flat priority logic, which is based solely on metric thresholds.

---

## Part 2: Detailed Stage Definitions

### Stage 1: Discovery

**Candidate intent:** "I want to find companies worth considering for my next role."

**Query patterns:**
- Generic: "best tech companies to work for in Austin"
- Role-specific: "top companies for backend engineers in supply chain tech"
- Compensation-driven: "best paying enterprise software companies for engineers"
- Culture-driven: "companies with strong engineering culture in Austin"

**Structural signal:** The query does NOT contain the client's company name. It contains a role, geography, or industry. It is a list-generation prompt.

**Visibility metric:** Binary -- are you on the list? The `mentioned` boolean is the primary signal. `visibilityScore` measures *where* on the list (early mention vs. trailing mention).

**Competitor dynamics:** Zero-sum. There are typically 3-7 companies in an AI-generated list. If you are not on it, a competitor took your slot. The slot count is fixed by AI response format.

**Citation patterns:** AI builds Discovery lists from:
- Best-of rankings (Built In "Best Places to Work", Comparably awards)
- Review aggregators (Glassdoor "Best Places", Indeed "Top Rated")
- Press coverage (TechCrunch, Forbes "Best Employers")
- Community reputation (Blind, Reddit)

**Failure mode:** The candidate never learns you exist. They build their shortlist from the AI response and proceed to Consideration for those companies only. You are not "rejected" -- you were never considered.

**Remediation strategies:**
1. Establish presence on best-of list platforms (Built In, Comparably)
2. Increase Glassdoor review volume to meet ranking thresholds
3. Generate press coverage in industry publications
4. Encourage employee advocacy on professional networks

**Meridian seed data example:**
Queries: "best enterprise software companies for backend engineers in Austin", "best tech companies to work for in Austin Texas 2025", "top engineering teams at mid-size enterprise software companies"
Results: Meridian mentioned in 3 of 6 culture/reputation queries (50%). Apex mentioned in 6 of 6 (100%).
Story: Meridian makes the list about half the time. One in two candidates starting their AI research never discover Meridian. Apex makes every list.

### Stage 2: Consideration

**Candidate intent:** "I know about [Company]. Tell me more."

**Query patterns:**
- Direct: "what is it like to work at Meridian Technologies"
- Review-seeking: "Meridian Technologies employee reviews"
- Specific aspects: "Meridian Technologies work life balance", "Meridian Technologies remote work policy"
- Role-specific: "Meridian Technologies tech stack for backend engineers"

**Structural signal:** The query contains the client's company name. It does NOT contain a competitor name or comparison language. It is a profile-generation prompt.

**Visibility metric:** `mentioned` should be nearly 100% (AI was asked about you directly). The real metric is `sentimentScore` and `visibilityScore` -- how favorably and thoroughly are you described?

**Competitor dynamics:** Competitors may appear unsolicited. When a candidate asks "what is it like to work at Meridian", AI may volunteer "compared to Apex, which has a stronger Glassdoor rating..." This is an ambush presence -- the competitor appears even when not asked about.

**Citation patterns:** AI builds Consideration profiles from:
- Review sites (Glassdoor, Indeed, Comparably, Blind)
- Company-owned content (careers page, engineering blog)
- Professional networks (LinkedIn company page)
- News and press (funding announcements, leadership profiles)

**Failure mode:** The candidate knows you exist but receives a thin, neutral, or negative profile. They proceed to Evaluation with low confidence, or drop you from consideration entirely. Negative sentiment at this stage is particularly damaging -- it's the AI equivalent of a bad first date.

**Remediation strategies:**
1. Improve Glassdoor review quality and management response rate
2. Publish a comprehensive careers page with culture narrative
3. Launch an engineering blog with technical content
4. Ensure LinkedIn company page is current and compelling
5. Address negative review themes directly (culture improvements, not review management)

**Meridian seed data example:**
Queries: "what is it like to work as an engineer at Meridian Technologies", "is Meridian Technologies a diverse workplace"
Results: When asked directly about Meridian, AI provides a reasonable but not enthusiastic profile. Sentiment is slightly positive (0.1-0.6 range). DEI question gets a lukewarm answer (sentiment 0.1).
Story: Meridian passes the Consideration stage -- candidates who search for it by name find something. But the profile is not compelling enough to create urgency. The DEI signal is a weakness.

### Stage 3: Evaluation

**Candidate intent:** "How does [Company] stack up against alternatives?"

**Query patterns:**
- Head-to-head: "Meridian Technologies vs Apex Cloud Systems for backend engineers"
- Decision: "should I work at Meridian Technologies or NovaBridge Analytics"
- Compensation comparison: "how does Meridian Technologies compensation compare to competitors"
- Category ranking: "best supply chain tech companies to work for compared"
- Salary benchmarking: "senior backend engineer salary enterprise SaaS Austin"

**Structural signal:** The query contains either (a) two company names with comparison language, or (b) compensation/benefit benchmarking terms, or (c) ranking language with an industry vertical.

**Visibility metric:** `mentioned` is critical -- are you in the comparison at all? `sentimentScore` determines whether you're positioned favorably. For compensation queries, specific salary data in the response indicates strong Evaluation presence.

**Competitor dynamics:** This is the decisive stage. AI explicitly compares companies and often expresses a preference ("Apex is larger with more established employer branding and higher reported compensation. Meridian offers more ownership..."). The competitor who is positioned more favorably at this stage wins the consideration.

**Citation patterns:** AI builds Evaluation comparisons from:
- Compensation databases (Levels.fyi, PayScale, Glassdoor Salaries)
- Anonymous comparison forums (Blind, Reddit)
- Review cross-references (Glassdoor, Comparably side-by-side)
- Industry coverage (TechCrunch, Built In company profiles)

**Failure mode:** The candidate is actively deciding between you and a competitor. If AI doesn't have your compensation data, it can't make a fair comparison -- the competitor wins by default. If AI has data but it's unfavorable, the competitor wins on merit. Either way, the candidate exits your funnel and enters the competitor's Commitment stage.

**Remediation strategies:**
1. Publish salary data on Levels.fyi and Glassdoor
2. Ensure compensation competitiveness is documented on comparison platforms
3. Create differentiated positioning content (what makes you better, not just as good)
4. Develop comparison-friendly content (explicit "why us vs. them" narratives)
5. Address specific competitive disadvantages cited in AI comparisons

**Meridian seed data example:**
Queries: "senior backend engineer salary enterprise SaaS Austin Texas", "best paying enterprise software companies for engineers", "how does Meridian Technologies compensation compare to competitors"
Results: Meridian mentioned in 1 of 6 compensation queries (17%). In head-to-head comparisons, Meridian is described as having "less transparency around equity and total compensation compared to competitors." Comp query sentiment is -0.1 (slightly negative).
Story: This is the critical pipeline break. Candidates who discovered Meridian and liked the profile hit a wall at Evaluation: AI can't compare Meridian's compensation because the data doesn't exist on the platforms AI cites. Apex wins by default. The 17% mention rate at this stage means 83% of candidates evaluating options never see Meridian in the comparison.

### Stage 4: Commitment

**Candidate intent:** "I'm ready to apply. What should I expect?"

**Query patterns:**
- Process: "what is the interview process like at Meridian Technologies"
- Preparation: "Meridian Technologies interview questions for backend engineers"
- Logistics: "how long does it take to get hired at supply chain tech companies"
- Decision support: "Meridian Technologies onboarding experience"

**Structural signal:** The query contains the company name and asks about interview, hiring, onboarding, offer, or first-day specifics. It is an actionable-detail prompt.

**Visibility metric:** `mentioned` matters (is there Meridian-specific data?). Response detail is the key indicator -- short generic responses signal thin data; long specific responses signal strong presence.

**Competitor dynamics:** Less directly competitive. The candidate has already chosen you (or nearly so). But thin Commitment data creates last-minute doubt -- "if they don't even have interview process info available, are they a serious employer?"

**Citation patterns:** AI answers Commitment queries from:
- Interview reviews (Glassdoor interview section, LeetCode discuss)
- Career pages with process descriptions
- Offer and salary databases (Levels.fyi offers)
- Onboarding content (blog posts, LinkedIn posts from new hires)

**Failure mode:** The candidate was going to apply but gets cold feet because AI provides no details about the interview process, or provides outdated/negative information. This is the most preventable loss -- the candidate was yours to lose.

**Remediation strategies:**
1. Encourage interview experience reviews on Glassdoor
2. Publish transparent interview process descriptions on the careers page
3. Share onboarding experiences through employee content
4. Ensure hiring timeline information is accurate and available

**Meridian seed data example:**
Queries: "what is the interview process like at Meridian Technologies", "enterprise software companies with fast hiring processes", "best interview experiences at Austin tech companies"
Results: Meridian mentioned in 5 of 6 hiring process queries (83%). Sentiment is positive (0.4-0.7). Interview process is described as "2-3 weeks, faster than many enterprise companies."
Story: Commitment is Meridian's strength. Candidates who make it this far find encouraging information about the hiring process. The problem is the funnel above -- too few candidates reach this stage.

---

## Part 3: Data Model Changes

### Philosophy

The design adds a `stage` field to `QueryCluster` and a `stage` field to `Query`. This is an additive change. Existing queries without a stage are treated as "unclassified" and continue to work in the flat theme-based analysis. The stage field enables the new journey-based analysis layer.

### Prisma schema additions

```prisma
// Add to the enum section:
enum DecisionStage {
  DISCOVERY
  CONSIDERATION
  EVALUATION
  COMMITMENT
}

// Modify QueryCluster:
model QueryCluster {
  id            String         @id @default(cuid())
  clientId      String
  roleProfileId String?
  name          String
  intent        String?
  description   String?        @db.Text
  stage         DecisionStage? // NEW: nullable for backward compat
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  client      Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  roleProfile RoleProfile? @relation(fields: [roleProfileId], references: [id], onDelete: SetNull)
  queries     Query[]

  @@index([clientId])
  @@index([roleProfileId])
  @@index([clientId, stage])  // NEW: enables per-stage queries
  @@map("query_clusters")
}

// Modify Query:
model Query {
  id             String         @id @default(cuid())
  queryClusterId String
  text           String
  intent         String?
  stage          DecisionStage? // NEW: query-level stage override (nullable, inherits from cluster)
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  queryCluster QueryCluster @relation(fields: [queryClusterId], references: [id], onDelete: Cascade)
  scanResults  ScanResult[]

  @@index([queryClusterId])
  @@map("queries")
}
```

### Why nullable?

Both `stage` fields are nullable (`DecisionStage?`). This ensures:
1. Existing data continues to work without migration backfill
2. The query generation system can gradually adopt stages
3. Manual queries added by analysts don't require stage classification
4. The report composer handles the mixed state gracefully (stages present = journey analysis; stages absent = fall back to flat theme analysis)

### Why on both QueryCluster and Query?

- `QueryCluster.stage` is the default stage for all queries in that cluster. This is the primary classification mechanism. Most clusters naturally map to a single stage.
- `Query.stage` is an override for individual queries. This handles edge cases where a single cluster contains queries from multiple stages (e.g., a "Compensation" cluster might have both Evaluation and Commitment queries).
- Resolution: `query.stage ?? query.queryCluster.stage ?? null`. If neither is set, the query has no stage and is excluded from journey analysis.

### No new models needed

The design explicitly avoids creating a `DecisionStage` table or `StageConfig` model. The stage taxonomy is fixed (4 stages) and unlikely to change. Configuration (stage names, descriptions, priority weights) belongs in `packages/core` as typed constants, not in the database. This keeps the schema simple and avoids a join for every query fetch.

### Core type additions

```typescript
// packages/core/src/decision-stages.ts

export const DECISION_STAGES = [
  "discovery",
  "consideration",
  "evaluation",
  "commitment",
] as const;

export type DecisionStage = (typeof DECISION_STAGES)[number];

export interface StageConfig {
  name: string;
  description: string;
  candidateQuestion: string;
  funnelPosition: number; // 1-4, for ordering
  basePriority: number;   // higher = earlier funnel = more impact
}

export const STAGE_CONFIG: Record<DecisionStage, StageConfig> = {
  discovery: {
    name: "Discovery",
    description: "Candidate is building a shortlist of employers to research",
    candidateQuestion: "What companies should I consider for this role?",
    funnelPosition: 1,
    basePriority: 10,
  },
  consideration: {
    name: "Consideration",
    description: "Candidate is researching a specific company",
    candidateQuestion: "Tell me about this company as an employer",
    funnelPosition: 2,
    basePriority: 8,
  },
  evaluation: {
    name: "Evaluation",
    description: "Candidate is comparing companies head-to-head",
    candidateQuestion: "How does this company compare to alternatives?",
    funnelPosition: 3,
    basePriority: 9,
  },
  commitment: {
    name: "Commitment",
    description: "Candidate is deciding whether to apply or accept",
    candidateQuestion: "What should I expect if I pursue this company?",
    funnelPosition: 4,
    basePriority: 6,
  },
};
```

### Zod schema updates

```typescript
// packages/core/src/schemas.ts

export const DecisionStage = z.enum([
  "DISCOVERY",
  "CONSIDERATION",
  "EVALUATION",
  "COMMITMENT",
]);
export type DecisionStage = z.infer<typeof DecisionStage>;

// Update CreateQueryClusterSchema:
export const CreateQueryClusterSchema = z.object({
  clientId: cuid,
  roleProfileId: cuid.optional(),
  name: shortText,
  intent: z.string().max(500).optional(),
  description: longText.optional(),
  stage: DecisionStage.optional(), // NEW
});

// Update CreateQuerySchema:
export const CreateQuerySchema = z.object({
  queryClusterId: cuid,
  text: z.string().min(1).max(1000),
  intent: z.string().max(500).optional(),
  stage: DecisionStage.optional(), // NEW: override
});
```

---

## Part 4: Report Structure Changes

### Current report structure:
1. Cover Page
2. Executive Summary
3. Assessment Scope & Methodology
4. Visibility Findings
5. Competitor Analysis
6. Citation Patterns
7. Query Intent Map (flat theme table)
8. Recommendations

### New report structure:
1. Cover Page (unchanged)
2. Executive Summary (rewritten around the journey narrative)
3. Assessment Scope & Methodology (add stage coverage)
4. **Candidate Decision Journey** (NEW -- the centerpiece section)
5. Visibility Findings (refocused as overall context)
6. Competitor Analysis (add per-stage competitive dynamics)
7. Citation Ecosystem (reframed per-stage)
8. Recommendations (organized by stage)

### Section 4: Candidate Decision Journey (NEW)

This is the new centerpiece. It replaces the "Query Intent Map" section with a richer, narrative-driven stage analysis.

**Structure:**

```
## Candidate Decision Journey

[Opening paragraph: explain the 4-stage framework and why it matters]

### Journey Summary Table

| Stage | Queries | Mention Rate | Positioning | Top Competitor | Gap | Status |
|---|---|---|---|---|---|---|
| Discovery | 8 | 50% | Contender | Apex (83%) | -33pp | Moderate |
| Consideration | 12 | 67% | Contender | Apex (83%) | -16pp | Moderate |
| Evaluation | 10 | 17% | Invisible | Apex (75%) | -58pp | Critical Gap |
| Commitment | 6 | 83% | Champion | Apex (67%) | +16pp | Strong |

### The Funnel Story
[Narrative paragraph connecting the stages: "Candidates enter the funnel at Discovery
where Meridian has moderate visibility. Those who discover Meridian find a reasonable
profile at Consideration. But the funnel breaks at Evaluation: when candidates compare
employers on compensation and culture, Meridian disappears. Only candidates who skip
the comparison stage entirely -- or who are already committed -- make it to Commitment,
where Meridian is strong. The net result: Meridian's pipeline is strong at the top and
bottom but collapses in the middle, where decisions are actually made."]

### Discovery: How candidates find you
[Per-stage detail: metrics, competitive dynamics, citation gaps, remediation]

### Consideration: What candidates learn about you
[Per-stage detail]

### Evaluation: How you compare
[Per-stage detail -- this is the "aha" section with the biggest gap]

### Commitment: Why candidates apply (or don't)
[Per-stage detail]
```

### Executive Summary changes

The opening statement changes from:

> "Meridian Technologies has moderate visibility in AI-driven candidate discovery, appearing in roughly two in five of evaluated candidate queries (47% mention rate across 36 scenarios)."

To:

> "Meridian Technologies has a broken candidate journey in AI-driven employer discovery. Candidates who start researching employers through AI encounter Meridian about half the time (Discovery: 50%). Those who search for Meridian by name find a reasonable profile (Consideration: 67%). But when candidates compare employers on compensation and culture -- the stage where decisions are actually made -- Meridian is functionally invisible (Evaluation: 17%). The candidate pipeline doesn't leak evenly; it collapses at the comparison stage."

The key findings section adds a "Journey Gap" bullet:

> **Critical Evaluation gap: 17% mention rate** -- candidates comparing employers never encounter Meridian on compensation or culture, creating a 58pp gap vs. Apex Cloud Systems at the exact stage where hiring decisions are made

### Recommendation changes

Recommendations are tagged with the stage they address. The priority logic shifts from flat metric thresholds to funnel-based prioritization:

1. **Discovery gaps** (CRITICAL if < 30%): "You can't convert candidates who never found you"
2. **Evaluation gaps** (HIGH if < 30%): "You're losing the comparison -- publish comp data on Levels.fyi"
3. **Consideration gaps** (HIGH if sentiment < 0): "You're known but disliked -- address root causes"
4. **Commitment gaps** (MEDIUM unless only gap): "Candidates are nearly there -- close the deal"

Each recommendation includes a "Stage impact" field explaining which part of the funnel it fixes.

---

## Part 5: Confidence Scoring Per Stage

### The problem

The current confidence system scores findings based on sample size. With 36 total queries, finding-level confidence is MEDIUM (near the 50/50 penalty zone for 47% mention rate on 36 results). Per-stage analysis splits this into subsets of 6-12 queries. A stage with 6 queries will hit the `scoreSampleSize(6) = 50` threshold and the `insufficient_sample` penalty (< 5) is avoided, but `near_fifty` penalty may apply.

### The approach

Per-stage confidence uses the existing `computeFindingConfidence()` function unchanged. The inputs are simply filtered to the stage's subset of results:

```typescript
function computeStageConfidence(
  allResults: FindingConfidenceInput["results"],
  stageQueries: Set<string>, // query IDs for this stage
  scanRunCount: number,
  totalQueryCount: number,
): ConfidenceScore {
  const stageResults = allResults.filter(r => stageQueries.has(r.queryId));
  return computeFindingConfidence({
    results: stageResults,
    scanRunCount,
    scanCompleteness: stageResults.length / totalQueryCount, // intentionally uses total denominator
  });
}
```

**Key design decision:** `scanCompleteness` uses total query count as denominator, not stage query count. This means a stage with 6 of 36 total queries will have scanCompleteness = 0.17, triggering the `incomplete_scan` penalty (-15 points). This is correct behavior -- a finding based on 6 queries out of 36 *should* have lower confidence than a finding based on all 36.

### Expected confidence tiers by stage

Given the Meridian seed data (36 queries, 1 scan run, 6 queries per stage):

| Stage | Queries | Sample size score | Single scan penalty | Incomplete scan penalty | Expected tier |
|---|---|---|---|---|---|
| Discovery | 6-8 | 50 (n=6-8) | -10 | -15 (< 0.7) | LOW-MEDIUM |
| Consideration | 10-14 | 50-70 (n=10-14) | -10 | -15 (< 0.7) | MEDIUM |
| Evaluation | 8-10 | 50 (n=8-10) | -10 | -15 (< 0.7) | LOW-MEDIUM |
| Commitment | 6-8 | 50 (n=6-8) | -10 | -15 (< 0.7) | LOW-MEDIUM |

This means per-stage findings will be hedged with "Based on the queries evaluated" or "preliminary data" language. This is correct and honest -- 6 queries is a preliminary signal, not a definitive measurement.

### Report integration

The report composer uses `hedgePhrase()` already. Per-stage sections will use the stage-level confidence tier. The executive summary's journey narrative uses the overall confidence tier (unchanged).

The Journey Summary Table includes a "Confidence" column so the reader knows which stages have stronger data:

| Stage | Queries | Mention Rate | ... | Confidence |
|---|---|---|---|---|
| Discovery | 8 | 50% | ... | Medium |
| Commitment | 6 | 83% | ... | Low |

---

## Part 6: Migration Plan

### Phase 1: Schema + Core Types (non-breaking)

**Changes:**
1. Add `DecisionStage` enum to Prisma schema
2. Add nullable `stage` field to `QueryCluster` and `Query`
3. Add `DecisionStage` Zod enum and update `CreateQueryClusterSchema` / `CreateQuerySchema`
4. Create `packages/core/src/decision-stages.ts` with `DECISION_STAGES`, `STAGE_CONFIG`
5. Run `prisma migrate dev`

**Risk:** None. All changes are additive. Nullable fields have no default requirement. Existing code continues to work with `stage = null`.

**Effort:** 1-2 hours.

### Phase 2: Query Intelligence (stage-aware generation)

**Changes:**
1. Add `stage` field to `QueryTemplate` interface and tag each template
2. Add `stage` field to `GeneratedQuery` and `GeneratedCluster`
3. Update `generateQueryIntelligence()` to assign stages during generation
4. Add `classifyStage()` function as a fallback classifier (heuristic: no company name = Discovery, company name without competitor = Consideration, etc.)
5. Update seed data to include stage on each cluster and query

**Risk:** Low. Stage assignment augments existing query generation. The `classifyStage()` heuristic provides backward compatibility for manually entered queries.

**Effort:** 3-4 hours.

### Phase 3: Scan Comparison (per-stage computation)

**Changes:**
1. Add `ScanComparisonResult.stageBreakdown?: StageComparisonResult[]` to the output type
2. Implement `computeStageComparison()` that filters results by stage and runs existing comparison logic
3. Call this from `computeScanComparison()` when stage data is available

**Risk:** Low. The existing flat comparison continues to be computed. Stage breakdown is additive output.

**Effort:** 2-3 hours.

### Phase 4: Report Composer (journey narrative)

**Changes:**
1. Add `composeDecisionJourneySection()` to replace `composeQueryIntentMapSection()`
2. Update `composeSummary()` to use journey framing when stage data is available
3. Update `generateRecommendations()` to include stage context
4. Add per-stage gap diagnosis computation
5. Fall back to existing theme-based report when no stage data exists

**Risk:** Medium. This is the largest change and the most subjective (narrative quality). Should be reviewed by the Report PM agent.

**Effort:** 6-8 hours.

### Phase 5: Seed Data Update

**Changes:**
1. Update seed script to assign stages to existing clusters:
   - "Engineering Culture & Reputation" -> mixed (Discovery + Consideration) -- split into two clusters
   - "Compensation & Benefits" -> Evaluation
   - "Hiring Process & Candidate Experience" -> Commitment
   - "Role Expectations & Impact" -> Consideration
   - "Culture & Work-Life Balance" -> Consideration
   - "Competitor Comparison" -> Evaluation
2. Some queries need reassignment. For example, "best enterprise software companies for backend engineers in Austin" is a Discovery query currently in the "Engineering Culture & Reputation" cluster. It should move to a Discovery cluster or get a query-level stage override.

**Seed cluster restructuring:**

| New Cluster | Stage | Queries (from existing) |
|---|---|---|
| Employer Discovery | DISCOVERY | "best enterprise software companies for backend engineers in Austin", "best tech companies to work for in Austin Texas 2025", "top engineering teams at mid-size enterprise software companies", "enterprise software companies known for great developer experience", "top employers in logistics and supply chain technology", "best supply chain tech companies to work for compared" |
| Company Research | CONSIDERATION | "what is it like to work as an engineer at Meridian Technologies", "companies with strong engineering culture in supply chain tech", "is Meridian Technologies a diverse workplace", "work-life balance at enterprise software companies in Austin", "Meridian Technologies remote work policy (new)", "what do backend engineers work on at supply chain software companies", "day in the life of a supply chain tech engineer", "companies where engineers have high impact on product" |
| Competitive Evaluation | EVALUATION | "senior backend engineer salary enterprise SaaS Austin Texas", "best paying enterprise software companies for engineers", "companies with strong equity packages for mid-career engineers", "how does Meridian Technologies compensation compare to competitors", "should I work at Meridian Technologies or Apex Cloud Systems", "Meridian Technologies vs NovaBridge Analytics for ML engineers", "how does Meridian Technologies compare to other Austin tech companies" |
| Application Readiness | COMMITMENT | "what is the interview process like at Meridian Technologies", "enterprise software companies with fast hiring processes", "best interview experiences at Austin tech companies", "how long does it take to get hired at supply chain tech companies", "companies with transparent engineering interview processes", "backend engineer interview questions at enterprise SaaS companies" |

This restructuring preserves all 36 existing queries. Some queries move between clusters but stay in the same scan results (query IDs don't change, only cluster membership).

**Risk:** Medium. Changing cluster structure means the seed needs to be re-run, which drops and recreates query/result data. This is acceptable for seed data but would need a different approach for production data.

**Effort:** 2-3 hours.

### Phase 6: UI Integration

**Changes:**
1. Update the query cluster list UI to show stage badges
2. Update the report detail page to render the new Decision Journey section
3. Update the report export page to render the journey summary table and per-stage subsections
4. Update the scan detail page to allow filtering by stage

**Risk:** Low. UI changes are presentational. The data flows through existing channels.

**Effort:** 4-6 hours.

### Implementation order:

```
Phase 1 (Schema)
    |
Phase 2 (Query Intelligence)
    |
Phase 3 (Scan Comparison)  <-- can demo per-stage data at this point
    |
Phase 4 (Report Composer)  <-- can demo the full journey report at this point
    |
Phase 5 (Seed Data)        <-- demo-ready with the new narrative
    |
Phase 6 (UI)               <-- full product integration
```

Total effort estimate: 18-26 hours across all phases.

---

## Part 7: Worked Example -- Meridian Technologies

Using the existing seed data, here is how the assessment looks under the new framework. The 36 existing queries are reclassified into stages:

### Stage assignment of existing seed queries

**Discovery (8 queries):**
1. "best enterprise software companies for backend engineers in Austin" -- mentioned: YES
2. "best tech companies to work for in Austin Texas 2025" -- mentioned: YES
3. "top engineering teams at mid-size enterprise software companies" -- mentioned: NO
4. "enterprise software companies known for great developer experience" -- mentioned: NO
5. "best paying enterprise software companies for engineers" -- mentioned: NO
6. "best supply chain tech companies to work for compared" -- mentioned: NO
7. "top employers in logistics and supply chain technology" -- mentioned: NO
8. "mid-size enterprise software companies vs startups for engineers" -- mentioned: NO

**Discovery mention rate: 2/8 = 25% (Limited)**

**Consideration (10 queries):**
1. "what is it like to work as an engineer at Meridian Technologies" -- mentioned: YES, sentiment: 0.6
2. "companies with strong engineering culture in supply chain tech" -- mentioned: NO
3. "is Meridian Technologies a diverse workplace" -- mentioned: YES, sentiment: 0.1
4. "work-life balance at enterprise software companies in Austin" -- mentioned: NO
5. "best company cultures in supply chain technology" -- mentioned: NO
6. "remote work policies at mid-size enterprise software companies" -- mentioned: NO
7. "what do backend engineers work on at supply chain software companies" -- mentioned: YES, sentiment: 0.6
8. "companies where engineers have high product impact" -- mentioned: YES, sentiment: 0.5
9. "day in the life of an engineer at a supply chain tech company" -- mentioned: YES, sentiment: 0.5
10. "enterprise software companies with interesting technical challenges" -- mentioned: YES, sentiment: 0.6

**Consideration mention rate: 6/10 = 60% (Moderate)**

**Evaluation (12 queries):**
1. "senior backend engineer salary enterprise SaaS Austin Texas" -- mentioned: NO
2. "companies with strong equity packages for mid-career engineers" -- mentioned: NO
3. "enterprise software companies with best engineering benefits" -- mentioned: NO
4. "how does Meridian Technologies compensation compare to competitors" -- mentioned: YES, sentiment: -0.1
5. "supply chain tech companies that pay engineers well" -- mentioned: NO
6. "should I work at Meridian Technologies or Apex Cloud Systems" -- mentioned: YES, sentiment: 0.3
7. "Meridian Technologies vs NovaBridge Analytics for ML engineers" -- mentioned: YES, sentiment: 0.4
8. "how does Meridian Technologies compare to other Austin tech companies" -- mentioned: YES, sentiment: 0.3
9. "enterprise software companies with inclusive engineering teams" -- mentioned: NO
10. "companies with good work-life balance for ML engineers" -- mentioned: NO
11. "best enterprise software companies for engineers who want ownership" -- mentioned: NO
12. "companies building AI-powered supply chain products for engineers" -- mentioned: NO

**Evaluation mention rate: 4/12 = 33% (Limited)**

**Commitment (6 queries):**
1. "what is the interview process like at Meridian Technologies" -- mentioned: YES, sentiment: 0.7
2. "enterprise software companies with fast hiring processes" -- mentioned: YES, sentiment: 0.5
3. "best interview experiences at Austin tech companies" -- mentioned: YES, sentiment: 0.6
4. "how long does it take to get hired at supply chain tech companies" -- mentioned: YES, sentiment: 0.4
5. "companies with transparent engineering interview processes" -- mentioned: YES, sentiment: 0.6
6. "backend engineer interview questions at enterprise SaaS companies" -- mentioned: NO

**Commitment mention rate: 5/6 = 83% (Strong)**

### The Journey Summary

| Stage | Queries | Mention Rate | Avg Sentiment | Top Competitor | Gap vs Top | Status |
|---|---|---|---|---|---|---|
| Discovery | 8 | 25% | n/a | Apex (75%) | -50pp | **Limited** |
| Consideration | 10 | 60% | +0.47 | Apex (80%) | -20pp | Moderate |
| Evaluation | 12 | 33% | +0.22 | Apex (67%) | -34pp | **Limited** |
| Commitment | 6 | 83% | +0.56 | Apex (50%) | +33pp | **Strong** |

### The Narrative

> Meridian Technologies has a leaky funnel in AI-driven candidate discovery. The leak is concentrated at two critical points:
>
> **Discovery (25% mention rate, Limited):** Three out of four candidates who start their AI employer research will build a shortlist that does not include Meridian. Apex Cloud Systems appears in 75% of these same queries. This is not a consideration gap -- it is an awareness gap. Candidates who never discover Meridian cannot evaluate, compare, or apply to it. This is the single largest pipeline leak in the assessment.
>
> **Evaluation (33% mention rate, Limited):** Candidates who make it past Discovery and Consideration hit a second wall when they compare employers. AI lacks the compensation, culture, and comparison data needed to position Meridian favorably. In compensation benchmarking queries specifically, Meridian appears in only 1 of 6 queries (17%), and the one response that mentions Meridian carries slightly negative sentiment ("less transparency around equity and total compensation compared to competitors").
>
> **Consideration (60% mention rate, Moderate):** When candidates search for Meridian by name, they find a reasonable profile. Sentiment is positive. This is not where candidates are lost.
>
> **Commitment (83% mention rate, Strong):** Candidates who survive the funnel and ask about Meridian's interview process find encouraging, detailed information. This is Meridian's strongest stage -- but only a fraction of potential candidates ever reach it.
>
> The compound effect: if 100 candidates start AI employer research in Meridian's space, approximately 25 discover Meridian (Discovery: 25%), approximately 15 form a positive impression (Consideration: 60% of 25), approximately 5 see Meridian in a favorable comparison (Evaluation: 33% of 15), and approximately 4 proceed to application readiness (Commitment: 83% of 5). The funnel converts 4% of potential AI-researching candidates. Apex's equivalent funnel converts approximately 20%.

### Per-Stage Citation Gaps

| Stage | Gap sources | Impact |
|---|---|---|
| Discovery | builtin.com, comparably.com, techcrunch.com, wellfound.com | Meridian absent from best-of list platforms |
| Consideration | comparably.com, teamblind.com | Limited culture signal |
| Evaluation | levels.fyi, payscale.com, teamblind.com, wellfound.com | No compensation data on the platforms AI cites for comparison |
| Commitment | leetcode.com | Minor -- limited interview prep data |

### Journey-Prioritized Recommendations

1. **[Discovery, CRITICAL] Establish presence on employer ranking platforms.** Built In, Comparably, and Wellfound are the primary sources AI uses to generate "best companies" lists. Meridian has no profile on any of them. Creating and completing profiles on these 3 platforms is the single highest-leverage action.

2. **[Evaluation, CRITICAL] Publish compensation data on Levels.fyi and Glassdoor Salaries.** AI cannot compare Meridian's compensation because the data does not exist. This is a factual gap, not a perception gap -- publish salary ranges and total comp data to enable fair comparison.

3. **[Discovery, HIGH] Increase Glassdoor review volume.** AI employer ranking queries heavily weight Glassdoor data. Meridian's review volume is insufficient to trigger consistent inclusion in best-of lists.

4. **[Evaluation, HIGH] Develop differentiated comparison content.** When AI compares Meridian to Apex, it defaults to "Apex is larger with more established branding." Give AI a better answer: what Meridian offers that Apex doesn't (ownership, impact, technical depth, growth stage).

5. **[Consideration, MEDIUM] Address DEI perception gap.** The one Consideration-stage weakness is the DEI signal. Publish diversity data, ERG information, and inclusion initiatives.

6. **[Commitment, LOW] Maintain interview process visibility.** Commitment is Meridian's strength. Continue encouraging interview reviews and publishing process descriptions.

---

## Tradeoffs and Risks

### 1. Stage classification subjectivity

Some queries sit at the boundary between stages. "Companies with strong engineering culture in supply chain tech" could be Discovery (building a list) or Consideration (evaluating a known space). The design handles this with:
- Heuristic rule: if the query does NOT contain the client name, it's Discovery or Evaluation (list/comparison generation). If it contains the client name without a competitor, it's Consideration. If it contains both client and competitor names, it's Evaluation.
- Override mechanism: `Query.stage` allows per-query override when the heuristic is wrong.
- Tolerance: the funnel narrative is robust to +/- 1 query reclassification per stage. The story doesn't change if Consideration is 55% vs. 60%.

### 2. Small per-stage sample sizes

6-12 queries per stage produces LOW-MEDIUM confidence. The design addresses this by:
- Using the existing confidence system without modification (per-stage penalties apply correctly)
- Hedging per-stage claims with appropriate language
- Framing the journey narrative as directional ("the funnel breaks at Evaluation") rather than precise ("33.3% at Evaluation")
- Recommending larger query sets in the methodology section ("A follow-up assessment with 15+ queries per stage would provide HIGH-confidence stage-level measurement")

### 3. Backward compatibility

Existing deployments with theme-only data will not benefit from journey analysis until stages are assigned. The design handles this by:
- Making stages nullable everywhere
- Falling back to the existing theme-based "Query Intent Map" section when no stages are present
- Providing `classifyStage()` as a heuristic backfill for existing queries (can be run as a one-time migration or at report composition time)

### 4. Cluster restructuring

The seed data currently groups queries by theme (6 clusters of 6 queries). The journey model suggests grouping by stage (4 clusters of 8-12 queries). This is a philosophical tension:
- **Theme clusters** reflect the topic being assessed
- **Stage clusters** reflect the candidate journey position

**Resolution:** Keep `QueryCluster.name` as the display name (can be anything). Add `stage` as a classification field. The cluster can be named "Compensation & Benefits" and have `stage = EVALUATION`. The UI groups clusters by stage for journey analysis and by name for query management.

### 5. The heuristic stage classifier may produce surprising results

The `classifyStage()` function uses structural signals (company name present/absent, competitor name present/absent, comparison language). Edge cases:
- "companies with strong equity packages" -- has no company name, so classified as Discovery, but it's really Evaluation. Solution: template-assigned stage takes precedence over heuristic.
- "Meridian Technologies glassdoor rating" -- company name present, no competitor, classified as Consideration. But the user might consider this Evaluation. Solution: the classification is defensible (the candidate is researching Meridian specifically, not comparing). Trust the heuristic.

### 6. Report length increases

Adding a 4-subsection Decision Journey section adds approximately 800-1200 words to the report. The current report is already substantial. The design mitigates this by:
- Replacing the "Query Intent Map" section (not adding to it)
- Keeping per-stage subsections concise (2-3 paragraphs each)
- Using the Journey Summary Table as a visual anchor that reduces prose needed

---

## Dependencies

| Dependency | Owner | Status |
|---|---|---|
| Prisma schema migration | Backend | Phase 1 |
| Query intelligence update | Backend | Phase 2 |
| Scan comparison extension | Backend | Phase 3 |
| Report composer rewrite | Backend + Report PM | Phase 4 |
| Seed data restructure | Backend | Phase 5 |
| UI integration | Frontend | Phase 6 |
| Confidence scoring | No changes needed (existing system handles per-stage) | N/A |
| Report export | Frontend | Phase 6 (minor CSS additions for journey table) |

---

## What this does NOT change

1. **Scan execution** -- scans still run per-query, per-model. No stage awareness needed at scan time.
2. **Result analysis** -- `scan-analysis.ts` (mention detection, visibility scoring, sentiment scoring) is unchanged. Stages are a classification layer, not an analysis layer.
3. **Evidence provenance** -- `ScanEvidence` model and immutability rules are unchanged.
4. **QA checks** -- existing 12 checks continue to apply. Stage-level QA checks could be added later but are not required for v1.
5. **Authentication or authorization** -- no impact.
6. **Content asset management** -- unchanged.
7. **Snapshot composer** -- the lightweight snapshot does not use stages (too little data for per-stage breakdown).

---

## Success criteria

1. **The demo "aha" moment is clearer.** The journey summary table + funnel narrative should provoke a stronger reaction than the current flat theme table.
2. **Recommendations are more actionable.** "Close citation gaps on compensation platforms to fix your Evaluation stage" is more actionable than "Close citation gaps on key career and compensation platforms."
3. **The report justifies $10K+ pricing.** A 7-layer framework with per-stage analysis, funnel math, and stage-specific remediation feels like a sophisticated methodology, not a ChatGPT wrapper.
4. **No existing functionality breaks.** All current tests pass. Reports without stage data render correctly using the fallback.
5. **Per-stage confidence is honest.** Small samples are hedged appropriately. The framework does not overclaim.
