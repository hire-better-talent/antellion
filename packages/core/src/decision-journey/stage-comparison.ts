import {
  DECISION_STAGES,
  type DecisionStage,
  type JourneyAnalysis,
  type PositioningTier,
  type StageVisibility,
  type VisibilityClassification,
} from "./types";

// ─── Input ───────────────────────────────────────────────────

export interface StageComparisonInput {
  clientName: string;
  results: Array<{
    queryId: string;
    /** Stage assigned to the query that produced this result. null = unclassified. */
    stage: DecisionStage | null;
    mentioned: boolean;
    visibilityScore: number;
    sentimentScore: number;
    metadata: unknown;
    citations: Array<{ domain: string | null }>;
  }>;
  competitors: Array<{ name: string }>;
}

// ─── Competitor mention extraction ───────────────────────────

interface CompetitorMentionEntry {
  name: string;
  mentioned: boolean;
}

function extractCompetitorMentions(
  metadata: unknown,
): CompetitorMentionEntry[] {
  if (
    metadata == null ||
    typeof metadata !== "object" ||
    !("competitorMentions" in metadata) ||
    !Array.isArray((metadata as Record<string, unknown>).competitorMentions)
  ) {
    return [];
  }

  const raw = (metadata as { competitorMentions: unknown[] })
    .competitorMentions;

  return raw.filter(
    (m): m is CompetitorMentionEntry =>
      m != null &&
      typeof m === "object" &&
      "name" in m &&
      "mentioned" in m &&
      typeof (m as Record<string, unknown>).name === "string" &&
      typeof (m as Record<string, unknown>).mentioned === "boolean",
  ) as CompetitorMentionEntry[];
}

// ─── Positioning classifier ──────────────────────────────────

/**
 * Classifies a positioning tier from three signals.
 *
 * Tiers in priority order:
 * - INVISIBLE:   mentionRate < 0.2
 * - CAUTIONARY:  mentioned but avg sentiment < -0.2
 * - PERIPHERAL:  mentioned but mentionRate < 0.4 OR avgVisibility < 30
 * - CHAMPION:    mentionRate >= 0.7 AND avgVisibility >= 60 AND sentiment > 0.2
 * - CONTENDER:   everything else (mentioned, reasonable visibility, neutral+ sentiment)
 */
export function classifyPositioning(
  mentionRate: number,
  avgVisibility: number,
  avgSentiment: number,
): PositioningTier {
  // Explicit zero check — 0% is always invisible regardless of other signals
  if (mentionRate === 0) return "INVISIBLE";
  if (mentionRate < 0.15) return "INVISIBLE";
  if (avgSentiment < -0.2) return "CAUTIONARY";
  if (mentionRate < 0.4 || avgVisibility < 30) return "PERIPHERAL";
  if (mentionRate >= 0.7 && avgVisibility >= 60 && avgSentiment > 0.2) {
    return "CHAMPION";
  }
  return "CONTENDER";
}

// ─── Helpers ─────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Stage metric type ────────────────────────────────────────

// Only Discovery is truly earned — the query does not name the company.
// Evaluation queries typically name the company ("X vs Y"), making them prompted.
// Evaluation is still labeled "visibility" metricType for report purposes but
// does NOT contribute to the earned visibility rate.
const EARNED_STAGES = new Set<DecisionStage>(["DISCOVERY"]);

function metricTypeForStage(stage: DecisionStage): "visibility" | "positioning" {
  return EARNED_STAGES.has(stage) ? "visibility" : "positioning";
}

// ─── Per-stage computation ───────────────────────────────────

function computeStageVisibility(
  stage: DecisionStage,
  stageResults: StageComparisonInput["results"],
): StageVisibility {
  const n = stageResults.length;

  const mentionedCount = stageResults.filter((r) => r.mentioned).length;
  const mentionRate = n > 0 ? mentionedCount / n : 0;

  const avgVisibility = mean(stageResults.map((r) => r.visibilityScore));
  const avgSentiment = mean(stageResults.map((r) => r.sentimentScore));

  const positioning = classifyPositioning(
    mentionRate,
    avgVisibility,
    avgSentiment,
  );

  // ── Top competitor at this stage ──
  const competitorCounts = new Map<string, number>();
  for (const result of stageResults) {
    const mentions = extractCompetitorMentions(result.metadata);
    for (const m of mentions) {
      if (m.mentioned) {
        competitorCounts.set(m.name, (competitorCounts.get(m.name) ?? 0) + 1);
      }
    }
  }

  let topCompetitor: StageVisibility["topCompetitor"] = null;
  if (competitorCounts.size > 0 && n > 0) {
    let topName = "";
    let topCount = 0;
    for (const [name, count] of competitorCounts) {
      if (count > topCount) {
        topCount = count;
        topName = name;
      }
    }
    topCompetitor = { name: topName, mentionRate: topCount / n };
  }

  const gapVsTopCompetitor =
    topCompetitor != null
      ? Math.max(0, topCompetitor.mentionRate - mentionRate)
      : 0;

  // ── Citation analysis ──
  // A domain is a "gap" only when the client is NEVER mentioned in any response
  // that cites it. If the client is mentioned in at least one response citing
  // the domain, then the client has a presence on that platform — the absence
  // in other queries is a query-specific miss, not a platform data gap.
  const citedDomainsSet = new Set<string>();
  const domainClientMentions = new Map<string, boolean>();

  for (const result of stageResults) {
    const domains = result.citations
      .map((c) => c.domain)
      .filter((d): d is string => d != null && d.length > 0);

    for (const domain of domains) {
      citedDomainsSet.add(domain);
      // Track whether the client has EVER been mentioned in a response citing this domain.
      // Once true, stays true.
      if (result.mentioned) {
        domainClientMentions.set(domain, true);
      } else if (!domainClientMentions.has(domain)) {
        domainClientMentions.set(domain, false);
      }
    }
  }

  // Gap = domains where the client was never mentioned in any citing response
  const gapDomainsSet = new Set<string>();
  for (const [domain, clientMentioned] of domainClientMentions) {
    if (!clientMentioned) {
      gapDomainsSet.add(domain);
    }
  }

  // ── Sourced rate ──
  const withCitations = stageResults.filter((r) => r.citations.length > 0).length;
  const sourcedRate = n > 0 ? withCitations / n : 0;

  return {
    stage,
    mentionRate,
    avgVisibility,
    avgSentiment,
    resultCount: n,
    positioning,
    topCompetitor,
    gapVsTopCompetitor,
    citedDomains: [...citedDomainsSet].sort(),
    gapDomains: [...gapDomainsSet].sort(),
    metricType: metricTypeForStage(stage),
    sourcedRate,
  };
}

// ─── Orchestrator ────────────────────────────────────────────

/**
 * Computes the full candidate decision journey analysis for a set of scan
 * results that have been tagged with a DecisionStage.
 *
 * Results with a null stage are excluded from stage-level computation but do
 * not affect correctness of the results that have stages.
 */
export function computeJourneyAnalysis(
  input: StageComparisonInput,
): JourneyAnalysis {
  // Group results by stage (null-stage results are excluded)
  const byStage = new Map<DecisionStage, StageComparisonInput["results"]>();
  for (const stage of DECISION_STAGES) {
    byStage.set(stage, []);
  }

  for (const result of input.results) {
    if (result.stage != null) {
      byStage.get(result.stage)!.push(result);
    }
  }

  // Compute per-stage visibility for stages that have results
  const stages: StageVisibility[] = [];
  for (const stage of DECISION_STAGES) {
    const stageResults = byStage.get(stage)!;
    if (stageResults.length === 0) continue;
    stages.push(computeStageVisibility(stage, stageResults));
  }

  // Funnel throughput: product of each stage's mention rate
  const funnelThroughput =
    stages.length > 0
      ? stages.reduce((product, s) => product * s.mentionRate, 1)
      : 0;

  // Critical gap: stage with lowest mention rate below 0.3
  let criticalGapStage: DecisionStage | null = null;
  let lowestRate = 0.3; // threshold — only stages below this qualify
  for (const s of stages) {
    if (s.mentionRate < lowestRate) {
      lowestRate = s.mentionRate;
      criticalGapStage = s.stage;
    }
  }

  // Overall positioning from combined mention rate across all stages
  const allResults = input.results.filter((r) => r.stage != null);
  const overallMentionRate =
    allResults.length > 0
      ? allResults.filter((r) => r.mentioned).length / allResults.length
      : 0;
  const overallAvgVisibility = mean(allResults.map((r) => r.visibilityScore));
  const overallAvgSentiment = mean(allResults.map((r) => r.sentimentScore));
  const overallPositioning = classifyPositioning(
    overallMentionRate,
    overallAvgVisibility,
    overallAvgSentiment,
  );

  // ── Earned vs prompted classification ──
  const earnedStageResults = stages.filter((s) => EARNED_STAGES.has(s.stage));
  const positioningStageResults = stages.filter((s) => !EARNED_STAGES.has(s.stage));

  const earnedMentionRate =
    earnedStageResults.length > 0
      ? earnedStageResults.reduce((sum, s) => sum + s.mentionRate, 0) /
        earnedStageResults.length
      : 0;

  const promptedMentionRate =
    positioningStageResults.length > 0
      ? positioningStageResults.reduce((sum, s) => sum + s.mentionRate, 0) /
        positioningStageResults.length
      : 0;

  const visibility: VisibilityClassification = {
    earnedMentionRate,
    promptedMentionRate,
    earnedStages: earnedStageResults.map((s) => s.stage),
    positioningStages: positioningStageResults.map((s) => s.stage),
  };

  const earnedVisibilityRate = earnedMentionRate;

  const earnedVisibilityTier: JourneyAnalysis["earnedVisibilityTier"] =
    earnedVisibilityRate >= 0.5
      ? "strong"
      : earnedVisibilityRate >= 0.3
        ? "moderate"
        : earnedVisibilityRate >= 0.15
          ? "weak"
          : "invisible";

  return {
    stages,
    funnelThroughput,
    criticalGapStage,
    overallPositioning,
    visibility,
    earnedVisibilityRate,
    earnedVisibilityTier,
  };
}
