// ─── Types ──────────────────────────────────────────────────

/**
 * Stability classification for a query across multiple scan runs.
 * Reflects how consistently the client is mentioned when the same
 * query is posed to the AI model on separate occasions.
 */
export type StabilityClassification =
  | "STABLE_PRESENCE"   // mentioned in >=67% of runs
  | "VOLATILE_PRESENCE" // mentioned in >0% but <67% of runs
  | "STABLE_ABSENCE"    // never mentioned in any run
  | "UNVALIDATED";      // only 1 run (no stability data)

/**
 * A single result from one scan run for one query.
 */
export interface MultiRunResultInput {
  scanRunId: string;
  mentioned: boolean;
  visibilityScore: number | null;
  sentimentScore: number | null;
  citationDomains: string[];
  metadata: unknown;
}

/**
 * All results for a single query across multiple scan runs.
 */
export interface QueryResultSet {
  queryId: string;
  queryText: string;
  stage: string | null;
  clusterId: string;
  clusterName: string;
  results: MultiRunResultInput[];
}

/**
 * Aggregated metrics for a single query across multiple runs.
 */
export interface QueryAggregation {
  queryId: string;
  queryText: string;
  stage: string | null;
  clusterId: string;
  clusterName: string;
  runCount: number;
  mentionRate: number;
  avgVisibilityScore: number | null;
  avgSentimentScore: number | null;
  visibilityVariance: number;
  mentionConsistency: number;
  allCitationDomains: string[];
  stability: StabilityClassification;
  isValidated: boolean;
}

/**
 * Report-level summary of multi-run analysis.
 */
export interface MultiRunAnalysis {
  totalQueries: number;
  validatedQueryCount: number;
  validationRate: number;
  stabilityDistribution: Record<StabilityClassification, number>;
  perQueryAggregations: QueryAggregation[];
  stageSummaries: Array<{
    stage: string;
    totalQueries: number;
    stablePresence: number;
    volatilePresence: number;
    stableAbsence: number;
    unvalidated: number;
    avgMentionRate: number;
  }>;
  effectiveScanRunCount: number;
}

// ─── Constants ───────────────────────────────────────────────

const STABLE_PRESENCE_THRESHOLD = 0.67;
const EFFECTIVE_SCAN_VALIDATION_THRESHOLD = 0.7;

// ─── classifyStability ───────────────────────────────────────

/**
 * Classify the stability of a query based on its mention rate and run count.
 *
 * - runCount < 2  → UNVALIDATED (no cross-run evidence yet)
 * - mentionRate 0 → STABLE_ABSENCE
 * - mentionRate >= 0.67 → STABLE_PRESENCE
 * - else → VOLATILE_PRESENCE
 */
export function classifyStability(
  mentionRate: number,
  runCount: number,
): StabilityClassification {
  if (runCount < 2) return "UNVALIDATED";
  if (mentionRate === 0) return "STABLE_ABSENCE";
  if (mentionRate >= STABLE_PRESENCE_THRESHOLD) return "STABLE_PRESENCE";
  return "VOLATILE_PRESENCE";
}

// ─── aggregateQueryResults ───────────────────────────────────

/**
 * Compute all per-query metrics from the results array.
 */
export function aggregateQueryResults(
  resultSet: QueryResultSet,
): QueryAggregation {
  const { queryId, queryText, stage, clusterId, clusterName, results } =
    resultSet;

  const runCount = results.length;
  const mentionCount = results.filter((r) => r.mentioned).length;
  const mentionRate = runCount === 0 ? 0 : mentionCount / runCount;

  // Visibility score: average of non-null values only
  const visibilityValues = results
    .map((r) => r.visibilityScore)
    .filter((v): v is number => v !== null);

  const avgVisibilityScore =
    visibilityValues.length > 0
      ? visibilityValues.reduce((sum, v) => sum + v, 0) / visibilityValues.length
      : null;

  // Sentiment score: average of non-null values only
  const sentimentValues = results
    .map((r) => r.sentimentScore)
    .filter((v): v is number => v !== null);

  const avgSentimentScore =
    sentimentValues.length > 0
      ? sentimentValues.reduce((sum, v) => sum + v, 0) / sentimentValues.length
      : null;

  // Visibility variance: sample variance of non-null visibility scores
  // Returns 0 if fewer than 2 non-null values
  let visibilityVariance = 0;
  if (visibilityValues.length >= 2 && avgVisibilityScore !== null) {
    const squaredDiffs = visibilityValues.map(
      (v) => (v - avgVisibilityScore) ** 2,
    );
    visibilityVariance =
      squaredDiffs.reduce((sum, d) => sum + d, 0) / (visibilityValues.length - 1);
  }

  // Mention consistency: 1.0 if unanimous (all mentioned or all absent),
  // 0.0 if maximally split (50/50).
  // Formula: 1 - 2 * min(mentionRate, 1 - mentionRate)
  const mentionConsistency =
    runCount === 0 ? 1 : 1 - 2 * Math.min(mentionRate, 1 - mentionRate);

  // Citation domains: deduplicated union across all runs
  const domainSet = new Set<string>();
  for (const result of results) {
    for (const domain of result.citationDomains) {
      domainSet.add(domain);
    }
  }
  const allCitationDomains = Array.from(domainSet);

  const stability = classifyStability(mentionRate, runCount);
  const isValidated = runCount >= 2;

  return {
    queryId,
    queryText,
    stage,
    clusterId,
    clusterName,
    runCount,
    mentionRate,
    avgVisibilityScore,
    avgSentimentScore,
    visibilityVariance,
    mentionConsistency,
    allCitationDomains,
    stability,
    isValidated,
  };
}

// ─── computeMultiRunAnalysis ─────────────────────────────────

/**
 * Compute the full multi-run analysis for a report.
 * Maps each QueryResultSet through aggregateQueryResults, then
 * computes report-level summaries and stage breakdowns.
 */
export function computeMultiRunAnalysis(
  querySets: QueryResultSet[],
): MultiRunAnalysis {
  const totalQueries = querySets.length;
  const perQueryAggregations = querySets.map(aggregateQueryResults);

  const validatedQueryCount = perQueryAggregations.filter(
    (a) => a.isValidated,
  ).length;

  const validationRate =
    totalQueries === 0 ? 0 : validatedQueryCount / totalQueries;

  // Stability distribution
  const stabilityDistribution: Record<StabilityClassification, number> = {
    STABLE_PRESENCE: 0,
    VOLATILE_PRESENCE: 0,
    STABLE_ABSENCE: 0,
    UNVALIDATED: 0,
  };
  for (const agg of perQueryAggregations) {
    stabilityDistribution[agg.stability]++;
  }

  // Stage summaries — group by stage, using "UNKNOWN" for null stages
  const stageMap = new Map<
    string,
    {
      aggregations: QueryAggregation[];
    }
  >();

  for (const agg of perQueryAggregations) {
    const stageKey = agg.stage ?? "UNKNOWN";
    if (!stageMap.has(stageKey)) {
      stageMap.set(stageKey, { aggregations: [] });
    }
    stageMap.get(stageKey)!.aggregations.push(agg);
  }

  const stageSummaries = Array.from(stageMap.entries()).map(
    ([stage, { aggregations }]) => {
      const stageTotal = aggregations.length;
      const avgMentionRate =
        stageTotal === 0
          ? 0
          : aggregations.reduce((sum, a) => sum + a.mentionRate, 0) /
            stageTotal;

      return {
        stage,
        totalQueries: stageTotal,
        stablePresence: aggregations.filter(
          (a) => a.stability === "STABLE_PRESENCE",
        ).length,
        volatilePresence: aggregations.filter(
          (a) => a.stability === "VOLATILE_PRESENCE",
        ).length,
        stableAbsence: aggregations.filter(
          (a) => a.stability === "STABLE_ABSENCE",
        ).length,
        unvalidated: aggregations.filter(
          (a) => a.stability === "UNVALIDATED",
        ).length,
        avgMentionRate,
      };
    },
  );

  const effectiveScanRunCount =
    validationRate >= EFFECTIVE_SCAN_VALIDATION_THRESHOLD ? 2 : 1;

  return {
    totalQueries,
    validatedQueryCount,
    validationRate,
    stabilityDistribution,
    perQueryAggregations,
    stageSummaries,
    effectiveScanRunCount,
  };
}

// ─── groupResultsByQuery ─────────────────────────────────────

/**
 * Group flat scan result records into QueryResultSets suitable for
 * computeMultiRunAnalysis.
 *
 * Results for query IDs not found in queryLookup are silently skipped.
 * Citation nulls within a result's citation list are filtered out.
 */
export function groupResultsByQuery(
  results: Array<{
    queryId: string;
    scanRunId: string;
    mentioned: boolean;
    visibilityScore: number | null;
    sentimentScore: number | null;
    citations: Array<{ domain: string | null }>;
    metadata: unknown;
  }>,
  queryLookup: Map<
    string,
    {
      text: string;
      stage: string | null;
      clusterId: string;
      clusterName: string;
    }
  >,
): QueryResultSet[] {
  // Accumulate results per query ID
  const buckets = new Map<string, MultiRunResultInput[]>();

  for (const result of results) {
    if (!queryLookup.has(result.queryId)) continue;

    if (!buckets.has(result.queryId)) {
      buckets.set(result.queryId, []);
    }

    const citationDomains = result.citations
      .map((c) => c.domain)
      .filter((d): d is string => d !== null);

    buckets.get(result.queryId)!.push({
      scanRunId: result.scanRunId,
      mentioned: result.mentioned,
      visibilityScore: result.visibilityScore,
      sentimentScore: result.sentimentScore,
      citationDomains,
      metadata: result.metadata,
    });
  }

  // Build QueryResultSets in query lookup order (stable output)
  const querySets: QueryResultSet[] = [];
  for (const [queryId, queryInfo] of queryLookup) {
    const results = buckets.get(queryId);
    if (results === undefined) continue;

    querySets.push({
      queryId,
      queryText: queryInfo.text,
      stage: queryInfo.stage,
      clusterId: queryInfo.clusterId,
      clusterName: queryInfo.clusterName,
      results,
    });
  }

  return querySets;
}
