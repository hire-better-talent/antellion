// ── Snapshot Action Plan — Build function ─────────────────────
//
// Pure transform: SnapshotSummary → SnapshotActionPlan.
// No LLM calls. No DB access. Callers are responsible for fetching
// and validating the summary before calling this function.

import type { SnapshotSummary } from "../snapshot-summary";
import type {
  SnapshotActionPlan,
  SnapshotTalkingPoint,
  SnapshotReplyTemplate,
} from "./types";
import { PUSHBACK_RULES, selectQuestionsToAsk } from "./rules";

// ─── Helpers ──────────────────────────────────────────────────

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

// ─── Talking point builders ───────────────────────────────────

function buildTalkingPoints(summary: SnapshotSummary): SnapshotTalkingPoint[] {
  const points: SnapshotTalkingPoint[] = [];

  // 1. Discovery absence / low mention rate
  {
    const topComp = summary.discovery.competitorRanking.at(0);
    const hookScore = 1 - summary.discoveryMentionRate; // low mention = high hook
    const metric =
      topComp && topComp.mentionRate > summary.discoveryMentionRate
        ? `${pct(summary.discoveryMentionRate)} vs ${pct(topComp.mentionRate)} for ${topComp.name}`
        : `${pct(summary.discoveryMentionRate)} mention rate across ${summary.discovery.queriesRun} discovery queries`;
    points.push({
      label: "Discovery absence",
      detail: `${summary.prospectName} appears in ${pct(summary.discoveryMentionRate)} of AI discovery responses — candidates researching your category are not seeing you.`,
      metric,
      hookScore,
    });
  }

  // 2. Competitor contrast — worst performing competitor pair
  {
    const worstSummary = summary.competitorContrast.competitorSummaries
      .slice()
      .sort((a, b) => b.favorRate - a.favorRate)
      .at(0);

    if (worstSummary && worstSummary.queriesRun > 0) {
      const hookScore = worstSummary.favorRate;
      points.push({
        label: "Competitor contrast loss",
        detail: `When AI compares ${summary.prospectName} to ${worstSummary.competitorName}, ${summary.prospectName} is favored in only ${pct(1 - worstSummary.favorRate)} of responses.`,
        metric: `${worstSummary.competitorFavoredCount} of ${worstSummary.queriesRun} comparison queries favor ${worstSummary.competitorName}`,
        hookScore,
      });
    }
  }

  // 3. Citation gap — employer-platform citation gap
  {
    const gapCount = summary.citationGap.gapPlatforms.length;
    const platforms = summary.citationGap.gapPlatforms.slice(0, 2);
    const hookScore = Math.min(1, gapCount / 5);
    if (gapCount > 0) {
      points.push({
        label: "Citation platform gap",
        detail: `${summary.prospectName} is absent from ${gapCount} employer-relevant platform${gapCount === 1 ? "" : "s"} that AI models cite when recommending competitors.`,
        metric:
          platforms.length > 0
            ? `Missing from: ${platforms.join(", ")}${gapCount > 2 ? ` and ${gapCount - 2} more` : ""}`
            : `${gapCount} citation gap platform${gapCount === 1 ? "" : "s"} identified`,
        hookScore,
      });
    } else {
      // Fallback: reputation sentiment
      const sentimentHook = Math.max(0, -summary.reputation.avgSentiment);
      points.push({
        label: "Reputation signal",
        detail: `${summary.prospectName}'s reputation signal in AI responses is ${summary.reputation.narrativeConsistency} with an average sentiment of ${summary.reputation.avgSentiment.toFixed(2)}.`,
        metric: `Narrative consistency: ${summary.reputation.narrativeConsistency}`,
        hookScore: sentimentHook,
      });
    }
  }

  // 4. Primary hook as additional candidate (may not make top 3)
  {
    const hook = summary.primaryHook;
    const strengthToScore: Record<typeof hook.findingStrength, number> = {
      strong: 0.9,
      moderate: 0.6,
      weak: 0.3,
    };
    points.push({
      label: "Primary finding",
      detail: hook.headline,
      metric: hook.evidence,
      hookScore: strengthToScore[hook.findingStrength],
    });
  }

  // Sort descending by hookScore, cap at 3
  const sorted = points.slice().sort((a, b) => b.hookScore - a.hookScore);
  const top3: SnapshotTalkingPoint[] = [];
  for (const p of sorted) {
    if (top3.length >= 3) break;
    top3.push(p);
  }
  return top3;
}

// ─── Reply template builders ──────────────────────────────────

function buildReplyTemplates(summary: SnapshotSummary): SnapshotReplyTemplate[] {
  const name = summary.prospectName;
  const topComp = summary.discovery.competitorRanking.at(0);
  const competitorLine = topComp
    ? `companies like ${topComp.name} are showing up consistently`
    : "your key competitors are showing up consistently";

  const interested: SnapshotReplyTemplate = {
    variant: "interested",
    label: "Interested in the full assessment",
    body: `Hey [Name],

Here is why I reached out — I ran a quick AI visibility scan on ${name} and found that ${competitorLine} in candidate discovery queries where ${name} isn't appearing. I figured that was worth a conversation.

The full assessment goes deeper: we map every stage of the candidate research journey, identify exactly which queries and platforms are driving the gap, and give you a specific remediation plan. Most clients find two or three things they can act on immediately without any new tooling.

Happy to walk you through the findings. Do you have 20 minutes this week?

Jordan Ellison
Founder, Antellion`,
  };

  const notNow: SnapshotReplyTemplate = {
    variant: "not_now",
    label: "Not the right time",
    body: `Hey [Name],

Totally understand — timing matters. Here is what I will do: I will hold onto the ${name} data and circle back in a few months. If anything shifts before then, feel free to reach out directly.

One thing worth keeping an eye on: AI-generated discovery responses tend to compound over time, so companies that get cited now build authority that is hard to close later. If that becomes a priority, we can move quickly.

Take care,
Jordan`,
  };

  return [interested, notNow];
}

// ─── Full assessment pitch ────────────────────────────────────

function buildFullAssessmentPitch(summary: SnapshotSummary): string {
  const name = summary.prospectName;
  const worstComp = summary.competitorContrast.competitorSummaries
    .slice()
    .sort((a, b) => b.favorRate - a.favorRate)
    .at(0);
  const gapCount = summary.citationGap.gapPlatforms.length;

  const competitorClause = worstComp
    ? `, where AI already favors ${worstComp.competitorName} in ${pct(worstComp.favorRate)} of comparisons,`
    : "";
  const citationClause =
    gapCount > 0
      ? ` and is absent from ${gapCount} platform${gapCount === 1 ? "" : "s"} AI models cite when recommending competitors`
      : "";

  return `${name}${competitorClause} appears in only ${pct(summary.discoveryMentionRate)} of AI discovery responses${citationClause} — a full assessment maps every gap and produces an actionable remediation plan.`;
}

// ─── Main entry point ─────────────────────────────────────────

/**
 * Build the Snapshot Action Plan from a SnapshotSummary.
 *
 * This is a pure function. The caller is responsible for:
 * 1. Fetching the ScanRun from the database (with org scoping).
 * 2. Extracting and validating metadata.snapshotSummary.
 * 3. Throwing if the summary is absent.
 *
 * @param scanRunId - Passed through into the output for caller convenience.
 * @param summary - The SnapshotSummary written by the scan worker.
 */
export function buildSnapshotActionPlan(
  scanRunId: string,
  summary: SnapshotSummary,
): SnapshotActionPlan {
  const talkingPoints = buildTalkingPoints(summary);
  const predictedPushback = PUSHBACK_RULES;
  const questionsToAsk = selectQuestionsToAsk(summary);
  const replyTemplates = buildReplyTemplates(summary);
  const fullAssessmentPitch = buildFullAssessmentPitch(summary);

  return {
    scanRunId,
    prospectName: summary.prospectName,
    generatedAt: new Date().toISOString(),
    talkingPoints,
    predictedPushback,
    questionsToAsk,
    replyTemplates,
    fullAssessmentPitch,
  };
}
