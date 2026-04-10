/**
 * Supplemental query generation prompt — SUPPLEMENTAL_PROMPT_V1
 *
 * Purpose: generate 20-30 bespoke, strategically targeted queries for a
 * specific client after the Discovery scan has revealed the real competitive
 * landscape. These queries intentionally differ from standard template queries
 * and fill gaps that templates cannot reach.
 *
 * The existing queryGenerationPrompt (query-generation.ts) generates breadth;
 * this prompt generates depth. They serve different goals and are not
 * interchangeable.
 */

export interface SupplementalQueryPromptInput {
  clientName: string;
  clientDomain: string;
  industry: string;
  description?: string;
  roleTitle: string;
  geography?: string;
  competitors: Array<{ name: string; domain?: string }>;
  nicheKeywords?: string[];
  existingQueryTexts: string[];
  scanSummary?: {
    mentionRate: number;
    topThemes: string[];
    gapThemes: string[];
    competitorMentionRates: Record<string, number>;
  };
}

/**
 * Build the supplemental query generation prompt.
 *
 * Temperature: 0.7 (caller is responsible for setting this).
 * Max tokens: 4096 recommended to fit 25+ structured JSON items.
 */
export function supplementalQueryPrompt(
  input: SupplementalQueryPromptInput,
): string {
  const competitorList =
    input.competitors.length > 0
      ? input.competitors.map((c) => `- ${c.name}${c.domain ? ` (${c.domain})` : ""}`).join("\n")
      : "None configured.";

  const nicheSection =
    input.nicheKeywords && input.nicheKeywords.length > 0
      ? `\nNiche/industry keywords: ${input.nicheKeywords.join(", ")}`
      : "";

  const geographySection = input.geography
    ? `\nGeography: ${input.geography}`
    : "";

  const descriptionSection = input.description
    ? `\nCompany description: ${input.description}`
    : "";

  const existingQueriesSection =
    input.existingQueryTexts.length > 0
      ? `\n\nExisting template queries already in the assessment (DO NOT generate queries that duplicate these or are semantically equivalent to them):\n${input.existingQueryTexts.slice(0, 60).map((q) => `- ${q}`).join("\n")}`
      : "";

  const clientName = input.clientName;

  let scanSummarySection = "";
  if (input.scanSummary) {
    const { mentionRate, topThemes, gapThemes, competitorMentionRates } =
      input.scanSummary;

    const compRates = Object.entries(competitorMentionRates)
      .map(([name, rate]) => `  - ${name}: ${rate}%`)
      .join("\n");

    const gapLine =
      gapThemes.length > 0
        ? `The assessment currently has WEAK COVERAGE on these themes — prioritize queries that probe them: ${gapThemes.join(", ")}.`
        : "";

    const strongLine =
      topThemes.length > 0
        ? `Themes with strong existing coverage (generate fewer queries here): ${topThemes.join(", ")}.`
        : "";

    scanSummarySection = `

Discovery scan findings:
- ${clientName} mention rate: ${mentionRate}%
- Competitor mention rates:
${compRates}
- ${gapLine}
- ${strongLine}`.trimEnd();
  }

  return `You are a senior talent acquisition intelligence analyst. Your task is to generate 25 bespoke search queries that a strategically-minded recruiter, HR leader, or AI researcher would use to assess ${clientName}'s position in the talent market for ${input.roleTitle} roles.

CONTEXT
-------
Company: ${clientName} (${input.clientDomain})
Industry: ${input.industry}${descriptionSection}${geographySection}${nicheSection}

Talent competitors:
${competitorList}${scanSummarySection}${existingQueriesSection}

YOUR TASK
---------
Generate exactly 25 queries. Each query must:
1. Be written as a natural conversational search query — how a real person would type it into an AI assistant or search engine.
2. Add strategic depth that the existing template queries do not cover. Do NOT generate generic candidate questions.
3. NOT start with "${clientName}" — avoid branded queries that only work if the candidate already knows the company. Earned-visibility queries (Discovery/Evaluation) are the most valuable.
4. Be at least 5 words long.

PROHIBITED PATTERNS (these are covered by templates — do not generate them):
- "What is it like to work at ${clientName}"
- "${clientName} salary for [role]"
- "${clientName} interview process"
- "${clientName} reviews"
- Generic "best companies to work for" lists

ANGLES TO COVER (prioritize these):
- Industry-specific reputation signals: how does ${clientName} compare to peers in ${input.industry} on technical credibility, product maturity, or market position?
- Competitive dynamics between ${clientName} and its talent competitors — head-to-head comparisons that appear in AI responses
- Compensation benchmarking against the specific competitor set (not just generic salary queries)
- Leadership and engineering reputation signals that affect candidate perception
- Growth trajectory indicators (headcount, funding stage, product trajectory) that candidates research
- Remote/distributed work reputation versus competitors
- Career growth and promotion velocity compared to talent competitors
- Role-specific nuances for ${input.roleTitle}: what do candidates in this role specifically care about when choosing employers?
- Employer brand perception on niche platforms (Blind, Levels.fyi, specific subreddits)
- What AI models say about ${clientName} when asked about employers in ${input.industry}

STAGE DISTRIBUTION (aim for this balance):
- DISCOVERY (~8-10 queries): queries that do NOT mention ${clientName} by name — they reveal whether AI includes ${clientName} unprompted in employer lists, comparisons, or recommendations
- EVALUATION (~6-8 queries): queries comparing ${clientName} directly to specific competitors on compensation, culture, growth, or tech
- CONSIDERATION (~5-6 queries): queries that name ${clientName} and probe specific dimensions — leadership credibility, technical reputation, product quality signals
- COMMITMENT (~3-4 queries): queries about specific processes or signals that candidates research when close to deciding

VALID THEMES (use exactly one per query):
- reputation: employer brand, company reviews, industry ranking, market perception
- compensation: salary benchmarks, equity, benefits, total comp comparisons
- hiring_process: interview experience, process quality, offer competitiveness
- role_expectations: day-to-day work, tech stack, team structure, engineering quality
- culture: work-life balance, remote policy, DEI, psychological safety, team dynamics
- competitor_comparison: head-to-head employer comparisons, should-I-work-at comparisons

VALID STAGES:
- DISCOVERY, EVALUATION, CONSIDERATION, COMMITMENT

OUTPUT FORMAT
-------------
Respond with a JSON array only — no markdown, no explanation, no text before or after the array.

[
  {
    "text": "the exact query text",
    "theme": "one of the 6 themes above",
    "stage": "one of the 4 stages above",
    "rationale": "one sentence explaining what gap this fills beyond template queries"
  }
]`;
}
