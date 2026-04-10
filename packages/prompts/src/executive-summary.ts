/**
 * Prompt template for LLM-generated executive summary prose.
 *
 * Generates two blocks:
 *   - situation: 2-3 sentence paragraph written in an advisor voice
 *   - topRecommendation: 1-2 sentence framing of the single highest-priority action
 *
 * The output is intended to replace template-driven fill-in-the-blank prose with
 * language that reads as if a senior analyst wrote it. No hedge words, no system
 * language, no bullet lists.
 *
 * Expected response format: JSON object { situation: string; topRecommendation: string }
 */

export interface ExecutiveSummaryProseInput {
  clientName: string;
  industry?: string;
  earnedVisibilityRate: number;
  earnedVisibilityTier: string;
  criticalGapStage: string | null;
  funnelThroughput: number;
  stages: Array<{
    stage: string;
    label: string;
    mentionRate: number;
  }>;
  topCompetitor: {
    name: string;
    overallRate: number;
  } | null;
  topRecommendation: {
    title: string;
    targetPlatforms: string[];
    timeframe: string;
    whyItMatters: string;
  } | null;
}

export function executiveSummaryPrompt(input: ExecutiveSummaryProseInput): string {
  const pct = (r: number) => `${Math.round(r * 100)}%`;

  const stageLines = input.stages
    .map((s) => `  - ${s.label}: ${pct(s.mentionRate)}`)
    .join("\n");

  const competitorLine = input.topCompetitor
    ? `Top competitor: ${input.topCompetitor.name} at ${pct(input.topCompetitor.overallRate)} overall mention rate`
    : "No tracked competitors";

  const criticalGapLine = input.criticalGapStage
    ? `Critical gap stage: ${input.criticalGapStage}`
    : "No single critical gap stage identified";

  const topRecLines = input.topRecommendation
    ? [
        `Title: ${input.topRecommendation.title}`,
        input.topRecommendation.targetPlatforms.length > 0
          ? `Platform: ${input.topRecommendation.targetPlatforms[0]}`
          : null,
        `Timeframe: ${input.topRecommendation.timeframe}`,
        `Why it matters: ${input.topRecommendation.whyItMatters}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "No specific recommendation available";

  return `You are a senior talent market analyst briefing a VP of Talent Acquisition. Write two short sections of executive prose from the data below. Your language should be direct, advisor-grade, and free of system-language or hedge phrases like "this assessment found" or "the data indicates."

Assessment data:
- Client: ${input.clientName}${input.industry ? ` (${input.industry})` : ""}
- Earned visibility rate: ${pct(input.earnedVisibilityRate)} (tier: ${input.earnedVisibilityTier})
- Funnel throughput: ${pct(input.funnelThroughput)} (candidates who encounter the company across the full decision journey)
- ${criticalGapLine}
- ${competitorLine}

Stage-by-stage mention rates:
${stageLines}

Top priority action:
${topRecLines}

Write exactly two JSON fields:

1. "situation": 2-3 sentences that name the specific stage where pipeline breaks, name the competitor advantage if present, and state the business consequence. Start with ${input.clientName} — not with "the company" or "our client." Be concrete: use percentages, stage names, and competitor names. Do not open with "Currently" or "At present."

2. "topRecommendation": 1-2 sentences that name the specific platform, the timeframe, and why this action moves the needle more than any other. Frame it as a directive: "Publish..." or "Claim and complete..." — not "It is recommended that..."

Respond only with valid JSON in this exact format, no markdown, no explanation:
{"situation":"...","topRecommendation":"..."}`;
}
