# Roadmap: Query Depth Audit Paths

**Status:** Proposed
**Author:** Architect
**Date:** 2026-03-31
**Priority:** Low (premium upsell feature -- not needed for standard assessments)

---

## Problem

The current assessment treats every query independently. Each query is sent to the AI in a fresh context, and the response is analyzed in isolation. But real candidates do not use AI this way. They follow conversational threads:

1. "What are the best companies for hospitality sales?" (Discovery)
2. "Tell me more about Marriott's sales program" (Consideration -- following up on AI's own recommendation)
3. "How does Marriott compare to Hilton Grand Vacations for sales careers?" (Evaluation -- comparing using AI's own candidate set)

In a real conversation, the AI's answer to query 2 is influenced by its answer to query 1, and query 3 is formed based on what appeared in queries 1 and 2. The current independent-query model misses this entirely.

This is not a flaw in the standard assessment -- independent queries are the correct methodology for measuring baseline visibility. But a "depth audit" that traces conversational paths would add a narrative dimension that independent queries cannot: **"A candidate asking about hospitality sales would see Marriott first, follow up on Marriott, and never encounter HGV in the conversation."**

That narrative is a premium deliverable.

---

## Concept: Depth Audit Path

A depth path is a sequence of 3-5 queries executed in the same AI conversation context (same session/thread), where each query is informed by the AI's response to the previous query.

### Path structure

```
Step 1 (DISCOVERY):  "best companies for [role] in [industry]"
                      -> AI lists Company A, Company B, Company C

Step 2 (CONSIDERATION): "tell me about [Company A from Step 1] as an employer"
                         -> AI describes Company A's employer proposition

Step 3 (EVALUATION): "how does [Company A] compare to [Company B from Step 1] for [role]"
                      -> AI compares the two companies it originally recommended
```

The critical property: the companies named in Steps 2 and 3 are extracted from the AI's Step 1 response, not injected by the operator. The path traces where the AI naturally leads the candidate.

### What this reveals

For the client, the depth audit answers:
1. **Do you appear in the initial list?** (Step 1 mention/no-mention)
2. **If you do, what does the AI say when the candidate digs in?** (Step 2 quality)
3. **If you don't, which competitors took your place?** (Step 1 competitor capture)
4. **When the AI compares you to its own recommended companies, how do you fare?** (Step 3 positioning)
5. **Does the conversation ever lead to you, or are you invisible throughout?** (path-level mention rate)

### Path templates

A path template defines the sequence of query templates and the extraction rules for each step:

```typescript
interface DepthPathTemplate {
  id: string;
  name: string;         // e.g., "Industry Discovery Path"
  description: string;
  steps: DepthPathStep[];
}

interface DepthPathStep {
  stepNumber: number;
  stage: DecisionStage;
  queryTemplate: string;  // template with {variables} and {step_N_entity} references
  extractionRule: ExtractionRule;
}

type ExtractionRule =
  | { type: "none" }                              // Step 1: no extraction needed
  | { type: "first_company_mentioned" }           // Pick first company from response
  | { type: "client_if_mentioned_else_first" }    // Pick client if present, else first
  | { type: "top_competitor_from_step"; step: number }  // Pick a competitor from a prior step's response
```

Example path template:

```
Step 1: "best companies for {role} in {industry}"
        extraction: none (seed query)

Step 2: "tell me about {step_1_entity} as an employer for {role}"
        extraction: first_company_mentioned from step 1

Step 3: "how does {step_1_entity} compare to {step_1_entity_2} for {role} careers"
        extraction: top two companies from step 1
```

---

## Data Model

### New models

```prisma
model DepthPath {
  id          String   @id @default(cuid())
  scanRunId   String
  templateId  String   // references a path template by ID
  name        String
  status      DepthPathStatus @default(PENDING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  scanRun ScanRun     @relation(fields: [scanRunId], references: [id], onDelete: Cascade)
  steps   DepthStep[]

  @@index([scanRunId])
  @@map("depth_paths")
}

model DepthStep {
  id            String   @id @default(cuid())
  depthPathId   String
  stepNumber    Int
  stage         DecisionStage
  queryText     String
  response      String?  @db.Text
  // Extracted entity from the previous step's response
  extractedEntity String?
  // Link to the ScanResult if this step was also recorded as a standard result
  scanResultId  String?
  metadata      Json?
  createdAt     DateTime @default(now())

  depthPath   DepthPath   @relation(fields: [depthPathId], references: [id], onDelete: Cascade)
  scanResult  ScanResult? @relation(fields: [scanResultId], references: [id], onDelete: SetNull)

  @@unique([depthPathId, stepNumber])
  @@index([depthPathId])
  @@map("depth_steps")
}

enum DepthPathStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

### Relationship to existing models

- A `DepthPath` belongs to a `ScanRun`. A scan run can have zero or many depth paths.
- Each `DepthStep` optionally links to a `ScanResult` via `scanResultId`. This means depth step responses can also be analyzed through the standard pipeline (visibility score, sentiment, competitor mentions). The standard analysis runs independently -- the depth path just adds the conversational linkage.
- The `ScanResult` model gains an optional back-reference: `depthSteps DepthStep[]`. This is a passive relation -- standard results are unaffected.

### No changes to existing models (except the relation)

The `ScanResult` model gets one new optional relation field. No field changes, no behavioral changes. Standard scans that do not use depth paths are completely unaffected.

---

## Execution Model

### Manual depth paths (v1)

In v1, depth paths are manually executed by the operator, following a guided workflow:

1. Operator selects a path template from a predefined set (5-10 templates covering common candidate journeys).
2. The system renders Step 1's query. The operator copies it into the AI, records the response.
3. The system analyzes the Step 1 response to extract mentioned companies. The operator confirms which entity to use for Step 2.
4. The system renders Step 2's query with the extracted entity substituted. Operator records the response.
5. Repeat for each step in the path.

This guided workflow is essentially the standard recording flow but with step-to-step context passing. The AI conversations themselves must happen in the same browser session/thread in the AI tool (ChatGPT, Claude, etc.) to maintain conversational context.

### Automated depth paths (future)

When LLM scan automation lands, depth paths become fully automatable:
- The system maintains a single AI conversation (using the API's conversation/thread ID).
- Each step is a follow-up message in the same conversation.
- Entity extraction from responses is automated via structured output parsing or a follow-up extraction prompt.

This is the natural extension of the LLM automation spec. The depth path data model is designed to support both manual and automated execution.

---

## Report Integration

### Path narrative section

A depth path produces a report section that tells a story:

> **Candidate Journey: Industry Discovery to Employer Comparison**
>
> A candidate asking ChatGPT "best companies for hospitality sales" received a list of five employers: Marriott Vacations, Wyndham Destinations, Bluegreen Vacations, Holiday Inn Club Vacations, and Travel + Leisure Co. **Hilton Grand Vacations was not mentioned.**
>
> Following up on Marriott Vacations, the candidate would learn about Marriott's commission structure, training program, and Glassdoor ratings. HGV does not appear in this follow-up conversation.
>
> When the candidate asked to compare Marriott Vacations with Wyndham Destinations, the AI provided a detailed employer comparison. HGV remains absent from the entire conversational thread.
>
> **Assessment:** A candidate who begins their search with an industry-level question will complete their consideration set without ever encountering HGV. This is an earned visibility gap at the Discovery stage.

This narrative is composed from the depth path data. The report composer needs a new section builder that:
1. Takes a `DepthPath` with its populated `DepthStep[]`
2. Generates a narrative per path
3. Highlights whether the client appeared at each step
4. Identifies which competitors captured the conversation

### Path summary metrics

For the executive summary:
- Number of depth paths where the client appeared at Step 1: X / Y
- Number of depth paths where the client appeared at any step: X / Y
- Average step at which the client first appears (or "never" if not mentioned in any step)

---

## Pricing

This is a premium tier feature:

| Tier | Independent queries | Depth paths |
|---|---|---|
| Standard | 60-100 queries | None |
| Premium | 60-100 queries | 10-15 depth paths (3-5 steps each = 30-75 additional queries) |

The depth paths represent 30-75 additional AI conversations, each requiring same-session context. This is meaningfully more work for both manual and automated execution, justifying a pricing premium.

---

## Implementation Phases

### Phase 1: Data model and guided recording (ship this)

- Add `DepthPath` and `DepthStep` models to the Prisma schema.
- Add depth path template definitions to `packages/core` (5-10 templates as a typed constant array, similar to `TEMPLATES` in `query-intelligence.ts`).
- Build a guided depth recording flow in `apps/web`: template selection, step-by-step recording, entity extraction confirmation.
- Entity extraction: reuse `containsName` from `scan-analysis.ts` against the client and competitor names to detect mentions, plus a simple regex to extract company names from list-formatted responses.
- Store results as `DepthStep` records linked to the `DepthPath`.
- Optionally create a standard `ScanResult` for each step (so it feeds into the normal analysis pipeline).

### Phase 2: Report integration

- Add a depth path narrative section builder to `report-composer.ts`.
- Add path summary metrics to the executive summary builder.
- Add a QA check: "depth paths present but incomplete" (any path with status != COMPLETED).

### Phase 3: Automated execution (depends on LLM automation spec)

- When the LLM scan automation pipeline exists, add a depth path execution mode that maintains same-session context.
- Entity extraction becomes an automated parsing step (structured output from the AI or a follow-up extraction prompt).
- The guided recording UI remains as a fallback for cases where automation fails or for ad-hoc paths.

---

## Risks and Tradeoffs

1. **Same-session requirement.** Depth paths require the AI conversation to maintain context between steps. In manual mode, the operator must keep the same chat session open. If they accidentally start a new session, the follow-up queries lose context and the path is meaningless. Mitigation: the recording UI should prominently warn about this requirement at each step. The system cannot enforce it -- it is an operator discipline issue.

2. **Entity extraction accuracy.** Extracting company names from free-text AI responses is imperfect. The AI might mention a company informally ("the Marriott family of brands" vs "Marriott Vacations Worldwide"). Mitigation: the operator confirms the extracted entity before proceeding to the next step. Automated extraction (Phase 3) can use a structured output prompt to ask the AI to list the companies it mentioned.

3. **Scope creep.** Depth paths are a rich feature that can expand in many directions (branching paths, A/B path comparison, multi-AI comparison). The spec intentionally limits v1 to linear 3-5 step paths with manual execution. Resist the urge to add branching or multi-AI support before validating that the linear path narrative adds value in reports.

4. **Data volume.** 15 depth paths at 5 steps each = 75 additional responses per assessment. This is a meaningful increase in data volume and recording time. Mitigation: depth paths are premium only. Standard assessments are unaffected.

5. **Schema complexity.** Two new models (`DepthPath`, `DepthStep`) and a new enum. This is the largest schema addition proposed in any current roadmap item. Mitigation: the models are cleanly scoped (owned by ScanRun, no cross-cutting relations), and the new enum follows the existing status pattern. The migration is additive with no impact on existing tables.

---

## Interaction with Other Specs

- **LLM scan automation:** Phase 3 depends on this. The automation spec should design its API conversation management to support depth paths (maintaining conversation context across multiple queries in the same session).
- **natural-query-language.md:** The Step 1 Discovery queries in depth paths should use natural conversational language from that spec. Depth path templates should reference the improved template patterns.
- **employment-framing-in-templates.md:** All depth path query templates must include employment framing.
- **template-rebalance.md:** Depth paths add queries outside the standard template count. The rebalance spec's target distribution applies to independent queries only, not depth path steps.
