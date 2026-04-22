"use server";

import { redirect } from "next/navigation";
import { prisma, Prisma } from "@antellion/db";
import type { RecommendationCategory, RecommendationPriority } from "@antellion/db";
import {
  validate,
  GenerateReportSchema,
  ReportStatus,
  computeScanComparison,
  composeReport,
  computeFindingConfidence,
  mapEvidenceToSections,
  validateReportGeneration,
  validateReportTransition,
  SECTION_VISIBILITY,
  SECTION_COMPETITOR,
  SECTION_CITATIONS,
  classifyQueryStage,
  computeJourneyAnalysis,
  generateStageRecommendations,
  buildJourneyMetadata,
  detectVisibilityBoundary,
  hasSufficientBoundaryData,
  filterBoundaryResults,
  computeCrossSegmentSummary,
  computeBaselineComparison,
  isEmployerRelevantDomain,
  assessReadiness,
  groupResultsByQuery,
  computeMultiRunAnalysis,
} from "@antellion/core";
import type {
  QueryThemeStats,
  AssessmentScope,
  DecisionStage,
  JourneyAnalysisInput,
  BaselineSnapshot,
  BaselineComparison as BaselineComparisonResult,
  ReadinessWarning,
  MultiRunAnalysis,
} from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { getAuthContext } from "@/lib/auth";
import { runReportQA } from "./qa";
import { generateProse } from "@/lib/llm";
import { executiveSummaryPrompt } from "@antellion/prompts";

/**
 * Check report readiness BEFORE generating. Returns warnings about data gaps
 * so the operator can decide whether to proceed or fix issues first.
 *
 * This is called by the UI before the form submits. If no warnings exist the
 * UI proceeds immediately. If warnings exist the UI shows them in a modal.
 */
export async function checkReportReadiness(
  clientId: string,
  scanRunIds: string[],
): Promise<ReadinessWarning[]> {
  const { organizationId } = await getAuthContext();

  // Verify client and scans belong to the org
  const scans = await prisma.scanRun.findMany({
    where: {
      id: { in: scanRunIds },
      client: { id: clientId, organizationId },
    },
    select: { id: true },
  });

  if (scans.length === 0) return [];

  // Fetch client for competitor count and niche keywords
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: {
      nicheKeywords: true,
      _count: { select: { competitors: true } },
    },
  });

  if (!client) return [];

  // Fetch approved results with stage data
  const approvedResults = await prisma.scanResult.findMany({
    where: { scanRunId: { in: scanRunIds }, status: "APPROVED" },
    select: {
      id: true,
      citations: { select: { id: true } },
      query: { select: { stage: true } },
    },
  });

  const totalApproved = approvedResults.length;
  const withCitations = approvedResults.filter(
    (r) => r.citations.length > 0,
  ).length;

  // Build stage distribution
  const stageDistribution: Record<string, number> = {};
  for (const r of approvedResults) {
    const stage = r.query?.stage;
    if (stage) {
      stageDistribution[stage] = (stageDistribution[stage] ?? 0) + 1;
    }
  }

  return assessReadiness(
    {
      discoveryQueryCount: stageDistribution["DISCOVERY"] ?? 0,
      evaluationQueryCount: stageDistribution["EVALUATION"] ?? 0,
      totalApprovedResults: totalApproved,
      competitorCount: client._count.competitors,
      citationRate:
        totalApproved > 0 ? withCitations / totalApproved : 0,
      scanCount: scanRunIds.length,
      hasNicheKeywords: !!(client.nicheKeywords && client.nicheKeywords.trim().length > 0),
      stageDistribution,
    },
    clientId,
  );
}

export async function generateReport(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const scanRunIds = formData.getAll("scanRunIds").map(String);

  const result = validate(GenerateReportSchema, {
    clientId: formData.get("clientId"),
    title: formData.get("title") || undefined,
    scanRunIds,
  });

  if (!result.success) return { errors: result.errors };

  const { clientId, title } = result.data;
  const { organizationId, userId } = await getAuthContext();

  // Fetch the selected scans with org scoping and enough data to validate generation
  const scans = await prisma.scanRun.findMany({
    where: {
      id: { in: scanRunIds },
      client: { id: clientId, organizationId },
    },
    select: {
      id: true,
      status: true,
      queryCount: true,
      model: true,
      queryDepth: true,
      focusArea: true,
      _count: {
        select: {
          results: {
            where: { status: "APPROVED" },
          },
        },
      },
    },
  });

  if (scans.length === 0) {
    return { message: "No matching scans found for this client." };
  }

  // Enforce: all scans must be COMPLETED and at least 1 approved result must exist
  const generationCheck = validateReportGeneration(
    scans.map((s) => ({
      id: s.id,
      status: s.status,
      approvedResultCount: s._count.results,
    })),
  );

  if (!generationCheck.valid) {
    return { message: generationCheck.reason };
  }

  // Fetch client context (org-scoped — clientId already verified above via scan query)
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: {
      name: true,
      domain: true,
      industry: true,
      nicheKeywords: true,
      competitors: { select: { name: true, domain: true } },
      contentAssets: { select: { assetType: true, url: true } },
    },
  });

  if (!client) return { message: "Client not found." };

  // Generate a default title when the user did not supply one.
  // Format: "[Client] - AI Visibility Audit - [Month] [Day], [Year]"
  const defaultTitle = `${client.name} - AI Visibility Audit - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  const reportTitle = title?.trim() || defaultTitle;
  const existingAssetUrls = client.contentAssets.map((a) => a.url);

  // Collect assessment parameters from the first scan. When multiple scans are
  // included, the first scan's parameters are used as the report-level summary.
  // All scans in a single report are expected to use the same model/depth/focus.
  const assessmentParameters = {
    aiModel: scans[0]?.model ?? "Not specified",
    queryDepth: scans[0]?.queryDepth ?? "First Layer",
    focusArea: scans[0]?.focusArea ?? "General",
    queryCount: 0, // filled after scanResults are fetched
    scanCount: scanRunIds.length,
    assessmentDate: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };

  // Fetch APPROVED results from the selected scans, including query cluster name for theme breakdown.
  // CAPTURED, NEEDS_REVIEW, and REJECTED results are excluded — they have not been approved for
  // inclusion in a report and must not influence mention rates, scores, or confidence calculations.
  const scanResults = await prisma.scanResult.findMany({
    where: { scanRunId: { in: scanRunIds }, status: "APPROVED" },
    select: {
      id: true,
      scanRunId: true,
      mentioned: true,
      visibilityScore: true,
      sentimentScore: true,
      response: true,
      metadata: true,
      competitorId: true,
      citations: { select: { domain: true } },
      query: {
        select: {
          id: true,
          text: true,
          stage: true,
          intent: true,
          queryCluster: {
            select: { id: true, name: true, stage: true },
          },
        },
      },
    },
  });

  // Guard: if no approved results exist at all, report generation is meaningless.
  // validateReportGeneration already checks approvedResultCount via the _count query,
  // but this catches any edge-case divergence between the count and the actual fetch.
  if (scanResults.length === 0) {
    return {
      message:
        "Cannot generate report: no approved scan results found. Review and approve scan results first.",
    };
  }

  // Now that scanResults are known, fill the count
  assessmentParameters.queryCount = scanResults.length;

  // ── Assessment readiness warnings ─────────────────────────────────────
  // Computed here (after scan data is loaded) and stored in report metadata
  // so the operator can see what data gaps existed when the report was generated.
  const stageDistributionForReadiness: Record<string, number> = {};
  for (const r of scanResults) {
    const stage = r.query?.stage;
    if (stage) {
      stageDistributionForReadiness[stage] =
        (stageDistributionForReadiness[stage] ?? 0) + 1;
    }
  }

  const readinessWarnings = assessReadiness(
    {
      discoveryQueryCount: stageDistributionForReadiness["DISCOVERY"] ?? 0,
      evaluationQueryCount: stageDistributionForReadiness["EVALUATION"] ?? 0,
      totalApprovedResults: scanResults.length,
      competitorCount: client.competitors.length,
      citationRate:
        scanResults.length > 0
          ? scanResults.filter((r) => r.citations.length > 0).length /
            scanResults.length
          : 0,
      scanCount: scanRunIds.length,
      hasNicheKeywords: !!(client.nicheKeywords && client.nicheKeywords.trim().length > 0),
      stageDistribution: stageDistributionForReadiness,
    },
    clientId,
  );

  // ── Multi-run aggregation ──────────────────────────────────────────────────
  // Groups APPROVED results by query across all selected scan runs and computes
  // per-query stability classifications and report-level summaries.
  //
  // effectiveScanRunCount is used in place of scanRunIds.length when computing
  // finding confidence — this lifts the single-scan penalty once cross-run
  // validation has been established for >= 70% of queries.
  //
  // Reports generated from a single scan run will show all queries as
  // UNVALIDATED and effectiveScanRunCount will remain 1 (no change to behavior).
  const multiRunQueryLookup = new Map<
    string,
    { text: string; stage: string | null; clusterId: string; clusterName: string }
  >();
  for (const r of scanResults) {
    const q = r.query;
    if (!q?.id || !q.queryCluster?.id) continue;
    if (multiRunQueryLookup.has(q.id)) continue;
    multiRunQueryLookup.set(q.id, {
      text: q.text,
      stage: q.stage ?? null,
      clusterId: q.queryCluster.id,
      clusterName: q.queryCluster.name,
    });
  }

  const multiRunResultInputs = scanResults
    .filter((r) => r.query?.id !== undefined)
    .map((r) => ({
      queryId: r.query!.id,
      scanRunId: r.scanRunId,
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore,
      sentimentScore: r.sentimentScore,
      citations: r.citations,
      metadata: r.metadata,
    }));

  const multiRunQuerySets = groupResultsByQuery(multiRunResultInputs, multiRunQueryLookup);
  const multiRunAnalysis: MultiRunAnalysis = computeMultiRunAnalysis(multiRunQuerySets);

  const totalQueries = scans.reduce((sum, s) => sum + s.queryCount, 0);

  // Compute comparison (strip query relation — computeScanComparison only needs core fields)
  const comparisonInputs = scanResults.map((r) => ({
    mentioned: r.mentioned,
    visibilityScore: r.visibilityScore,
    sentimentScore: r.sentimentScore,
    metadata: r.metadata,
    citations: r.citations,
  }));
  const comparison = computeScanComparison(client.name, comparisonInputs, totalQueries);

  // Compute per-theme breakdown from query cluster names
  const themeMap = new Map<string, { queryCount: number; mentionCount: number }>();
  for (const r of scanResults) {
    const theme = r.query?.queryCluster?.name;
    if (!theme) continue;
    const existing = themeMap.get(theme) ?? { queryCount: 0, mentionCount: 0 };
    existing.queryCount += 1;
    if (r.mentioned) existing.mentionCount += 1;
    themeMap.set(theme, existing);
  }

  const queryThemeBreakdown: QueryThemeStats[] = [...themeMap.entries()].map(
    ([theme, stats]) => ({
      theme,
      queryCount: stats.queryCount,
      mentionCount: stats.mentionCount,
      mentionRate: stats.queryCount > 0 ? stats.mentionCount / stats.queryCount : 0,
    }),
  );

  // ── Per-theme competitor mention rates ──────────────────────────────────
  // For each theme, find the top competitor's mention rate so the report can
  // show e.g. "Apex beats you on compensation queries (72% vs your 15%)."
  const themeCompetitorRates = queryThemeBreakdown.map((theme) => {
    // Find scan results belonging to this theme
    const themeResults = scanResults.filter(
      (r) => r.query?.queryCluster?.name === theme.theme,
    );
    // For each competitor, count how many theme results mention them
    const topCompRate = client.competitors.reduce(
      (best, comp) => {
        const compMentions = themeResults.filter((r) => {
          const meta = r.metadata as Record<string, unknown> | null;
          if (!meta || !Array.isArray(meta.competitorMentions)) return false;
          return (meta.competitorMentions as Array<{ name: string; mentioned: boolean }>).some(
            (cm) => cm.name === comp.name && cm.mentioned,
          );
        }).length;
        const rate = themeResults.length > 0 ? compMentions / themeResults.length : 0;
        return rate > best.rate ? { name: comp.name, rate } : best;
      },
      { name: "", rate: 0 },
    );
    return { ...theme, topCompetitor: topCompRate };
  });

  // Build assessment scope
  const assessmentScope: AssessmentScope = {
    competitorNames: client.competitors.map((c) => c.name),
    totalQueries,
    completedQueries: scanResults.length,
    queryThemes: [...themeMap.keys()],
    scanDateRange: null,
    aiModels: [],
  };

  // ── Journey analysis ──────────────────────────────────────────────────────
  // Classify each result into a decision stage. Use query.stage first, then
  // queryCluster.stage, then runtime classification via classifyQueryStage().
  const competitorNamesForClassify = client.competitors.map((c) => c.name);

  const journeyResultInputs = scanResults.map((r) => {
    const queryStage = r.query?.stage as DecisionStage | null | undefined;
    const clusterStage = r.query?.queryCluster?.stage as DecisionStage | null | undefined;
    const stage: DecisionStage | null =
      queryStage ??
      clusterStage ??
      (r.query?.text
        ? classifyQueryStage(r.query.text, client.name, competitorNamesForClassify)
        : null);

    return {
      queryId: r.query?.id ?? r.id,
      stage,
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore ?? 0,
      sentimentScore: r.sentimentScore ?? 0,
      metadata: r.metadata,
      citations: r.citations?.map((c) => ({ domain: c.domain })) ?? [],
    };
  });

  // Check if at least one result has a stage — if none do, skip journey analysis
  const hasAnyStage = journeyResultInputs.some((r) => r.stage !== null);

  let journeyMetadataForReport: ReturnType<typeof buildJourneyMetadata> | null = null;
  let visibilityBoundary: ReturnType<typeof detectVisibilityBoundary> | null = null;

  // journeyAnalysisForComposer is set before composeReport() so the narrative
  // can lead with earned visibility rather than the aggregate mention rate.
  let journeyAnalysisForComposer: JourneyAnalysisInput | undefined;

  if (hasAnyStage) {
    const journeyAnalysis = computeJourneyAnalysis({
      clientName: client.name,
      results: journeyResultInputs,
      competitors: client.competitors.map((c) => ({ name: c.name })),
    });

    // Extract the fields the composer needs — isolate from the full JourneyAnalysis type
    journeyAnalysisForComposer = {
      earnedVisibilityRate: journeyAnalysis.earnedVisibilityRate,
      earnedVisibilityTier: journeyAnalysis.earnedVisibilityTier,
      criticalGapStage: journeyAnalysis.criticalGapStage ?? null,
      funnelThroughput: journeyAnalysis.funnelThroughput,
      stages: journeyAnalysis.stages.map((s) => ({
        stage: s.stage,
        mentionRate: s.mentionRate,
        positioning: s.positioning,
        metricType: s.metricType,
      })),
    };

    // Build per-competitor, per-stage mention rates from scan result metadata.
    // Competitor mentions are stored in result metadata by the scan analysis layer.
    const competitorStageRates = new Map<string, Map<DecisionStage, { mentioned: number; total: number }>>();
    for (const r of journeyResultInputs) {
      if (r.stage === null) continue;
      const meta = r.metadata;
      if (
        meta == null ||
        typeof meta !== "object" ||
        !("competitorMentions" in (meta as Record<string, unknown>))
      ) {
        continue;
      }
      const mentions = (meta as { competitorMentions: unknown[] }).competitorMentions;
      if (!Array.isArray(mentions)) continue;

      for (const m of mentions) {
        if (
          m == null ||
          typeof m !== "object" ||
          !("name" in (m as Record<string, unknown>)) ||
          !("mentioned" in (m as Record<string, unknown>))
        ) {
          continue;
        }
        const entry = m as { name: string; mentioned: boolean };
        if (typeof entry.name !== "string" || typeof entry.mentioned !== "boolean") continue;

        if (!competitorStageRates.has(entry.name)) {
          competitorStageRates.set(entry.name, new Map());
        }
        const stageMap = competitorStageRates.get(entry.name)!;
        const existing = stageMap.get(r.stage) ?? { mentioned: 0, total: 0 };
        existing.total += 1;
        if (entry.mentioned) existing.mentioned += 1;
        stageMap.set(r.stage, existing);
      }
    }

    // Convert counts to rates
    const competitorStageRatesResolved = new Map<string, Map<DecisionStage, number>>();
    for (const [name, stageMap] of competitorStageRates) {
      const rateMap = new Map<DecisionStage, number>();
      for (const [stage, counts] of stageMap) {
        rateMap.set(stage, counts.total > 0 ? counts.mentioned / counts.total : 0);
      }
      competitorStageRatesResolved.set(name, rateMap);
    }

    // Parse niche keywords once — used for both recommendations and boundary analysis
    const clientNicheKeywords = (client.nicheKeywords ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const stageRecs = generateStageRecommendations({
      journey: journeyAnalysis,
      comparison: {
        clientMentionRate: comparison.clientMentionRate,
        avgSentimentScore: comparison.avgSentimentScore,
        entityMentions: comparison.entityMentions,
        citationAnalysis: {
          gapDomains: comparison.citations.domainFrequency
            .filter((d) => comparison.citations.gapDomains.includes(d.domain))
            .map((d) => ({ domain: d.domain, count: d.count })),
          clientExclusiveDomains: comparison.citations.domainFrequency
            .filter((d) => comparison.citations.clientExclusiveDomains.includes(d.domain))
            .map((d) => ({ domain: d.domain, count: d.count })),
        },
      },
      client: {
        name: client.name,
        contentAssetTypes: client.contentAssets.map((a) => a.assetType),
        existingAssetUrls,
        competitors: client.competitors.map((c) => ({ name: c.name })),
        nicheKeywords: clientNicheKeywords.length > 0 ? clientNicheKeywords : undefined,
        industry: client.industry ?? undefined,
      },
    });

    // ── Visibility boundary analysis ────────────────────────────────────────
    // Computed before buildJourneyMetadata so the Discovery narrative can
    // reference at what specificity level the company appears.
    //
    // Two sources of boundary data are combined:
    //   1. Explicitly boundary-tagged results (intent contains "boundary:{level}") —
    //      these come from the "Visibility Boundary — Discovery" cluster.
    //   2. All other Discovery-stage results — classified heuristically from
    //      query text using client niche keywords and industry, so that pass-1
    //      scan data contributes to boundary analysis even without boundary tags.

    // Boundary-tagged results (existing path)
    const boundaryTaggedInputs = filterBoundaryResults(
      scanResults.map((r) => ({
        intent: r.query?.intent ?? "",
        queryText: r.query?.text ?? undefined,
        stage: r.query?.stage ?? undefined,
        mentioned: r.mentioned,
        metadata: r.metadata,
      })),
    );

    // All Discovery-stage results (non-boundary)
    const discoveryNonBoundaryInputs = scanResults
      .filter((r) => {
        const stage = r.query?.stage ?? r.query?.queryCluster?.stage;
        return stage === "DISCOVERY" && !(r.query?.intent ?? "").includes("boundary:");
      })
      .map((r) => ({
        intent: r.query?.intent ?? "",
        queryText: r.query?.text ?? undefined,
        stage: (r.query?.stage ?? r.query?.queryCluster?.stage ?? "DISCOVERY") as string,
        mentioned: r.mentioned,
        metadata: r.metadata,
      }));

    const boundaryResultInputs = [...boundaryTaggedInputs, ...discoveryNonBoundaryInputs];

    const boundaryContext = {
      clientName: client.name,
      nicheKeywords: clientNicheKeywords,
      industry: client.industry ?? undefined,
    };

    if (hasSufficientBoundaryData(boundaryResultInputs, boundaryContext)) {
      visibilityBoundary = detectVisibilityBoundary({
        results: boundaryResultInputs,
        clientName: client.name,
        competitors: client.competitors.map((c) => ({ name: c.name })),
        nicheKeywords: clientNicheKeywords.length > 0 ? clientNicheKeywords : undefined,
        industry: client.industry ?? undefined,
      });
    }

    // Build per-stage response texts for qualitative theme extraction.
    // Uses the classified stage from journeyResultInputs and the response text
    // from the corresponding scanResult.
    const stageResponseTexts = new Map<DecisionStage, string[]>();
    for (let i = 0; i < journeyResultInputs.length; i++) {
      const stage = journeyResultInputs[i].stage;
      if (!stage) continue;
      const response = scanResults[i]?.response;
      if (!response) continue;
      if (!stageResponseTexts.has(stage)) stageResponseTexts.set(stage, []);
      stageResponseTexts.get(stage)!.push(response);
    }

    journeyMetadataForReport = buildJourneyMetadata({
      clientName: client.name,
      clientOverallRate: comparison.clientMentionRate,
      journey: journeyAnalysis,
      remediationPlan: stageRecs,
      competitorStageRates: competitorStageRatesResolved,
      competitorNames: client.competitors.map((c) => c.name),
      visibilityBoundary: visibilityBoundary ?? undefined,
      stageResponseTexts,
    });
  }

  // ── Per-segment analysis ───────────────────────────────────────────────────
  // Group scan results by the focusArea of their parent ScanRun.
  // Scans with null or empty focusArea are grouped under "General".
  // Normalise keys: case-insensitive trim so "Software Engineer" and
  // "software engineer" collapse into one segment.
  const segmentMap = new Map<string, typeof scanResults>();

  for (const result of scanResults) {
    const scanRun = scans.find((s) => s.id === result.scanRunId);
    const rawArea = scanRun?.focusArea?.trim() ?? "";
    const segmentKey = rawArea.length > 0 ? rawArea : "General";
    // Use lowercased key for dedup, but preserve original casing on first encounter
    const canonicalKey = segmentKey.toLowerCase();

    // Find existing entry by canonical key
    let existingKey: string | undefined;
    for (const k of segmentMap.keys()) {
      if (k.toLowerCase() === canonicalKey) {
        existingKey = k;
        break;
      }
    }

    const mapKey = existingKey ?? segmentKey;
    const existing = segmentMap.get(mapKey) ?? [];
    existing.push(result);
    segmentMap.set(mapKey, existing);
  }

  // Only compute per-segment data when there are 2+ distinct focusArea groups.
  // Single-segment reports remain identical to today's behavior.
  type SegmentEntry = {
    name: string;
    scanRunIds: string[];
    journeyAnalysis: ReturnType<typeof buildJourneyMetadata>["journeyAnalysis"] | null;
    clientOverallRate: number;
    competitors: ReturnType<typeof buildJourneyMetadata>["competitors"];
    remediationPlan: ReturnType<typeof buildJourneyMetadata>["remediationPlan"] | null;
    visibilityBoundary: ReturnType<typeof detectVisibilityBoundary> | null;
    overallThemes: ReturnType<typeof buildJourneyMetadata>["overallThemes"] | null;
    assessmentParameters: {
      aiModel: string;
      queryDepth: string;
      focusArea: string;
      queryCount: number;
      scanCount: number;
      assessmentDate: string;
    };
    confidence: ReturnType<typeof computeFindingConfidence>;
  };

  const computedSegments: SegmentEntry[] = [];
  const clientNicheKeywordsForSegment = (client.nicheKeywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (segmentMap.size >= 2) {
    for (const [segmentName, segmentResults] of segmentMap) {
      // Build journey result inputs for this segment
      const segJourneyInputs = segmentResults.map((r) => {
        const queryStage = r.query?.stage as DecisionStage | null | undefined;
        const clusterStage = r.query?.queryCluster?.stage as DecisionStage | null | undefined;
        const stage: DecisionStage | null =
          queryStage ??
          clusterStage ??
          (r.query?.text
            ? classifyQueryStage(r.query.text, client.name, competitorNamesForClassify)
            : null);

        return {
          queryId: r.query?.id ?? r.id,
          stage,
          mentioned: r.mentioned,
          visibilityScore: r.visibilityScore ?? 0,
          sentimentScore: r.sentimentScore ?? 0,
          metadata: r.metadata,
          citations: r.citations?.map((c) => ({ domain: c.domain })) ?? [],
        };
      });

      const segHasStage = segJourneyInputs.some((r) => r.stage !== null);

      let segJourneyMeta: ReturnType<typeof buildJourneyMetadata> | null = null;
      let segBoundary: ReturnType<typeof detectVisibilityBoundary> | null = null;

      if (segHasStage) {
        const segJourney = computeJourneyAnalysis({
          clientName: client.name,
          results: segJourneyInputs,
          competitors: client.competitors.map((c) => ({ name: c.name })),
        });

        // Competitor stage rates for this segment
        const segCompetitorStageRates = new Map<string, Map<DecisionStage, { mentioned: number; total: number }>>();
        for (const r of segJourneyInputs) {
          if (r.stage === null) continue;
          const meta = r.metadata;
          if (
            meta == null ||
            typeof meta !== "object" ||
            !("competitorMentions" in (meta as Record<string, unknown>))
          ) {
            continue;
          }
          const mentions = (meta as { competitorMentions: unknown[] }).competitorMentions;
          if (!Array.isArray(mentions)) continue;

          for (const m of mentions) {
            if (
              m == null ||
              typeof m !== "object" ||
              !("name" in (m as Record<string, unknown>)) ||
              !("mentioned" in (m as Record<string, unknown>))
            ) {
              continue;
            }
            const entry = m as { name: string; mentioned: boolean };
            if (typeof entry.name !== "string" || typeof entry.mentioned !== "boolean") continue;

            if (!segCompetitorStageRates.has(entry.name)) {
              segCompetitorStageRates.set(entry.name, new Map());
            }
            const stageMap = segCompetitorStageRates.get(entry.name)!;
            const existing = stageMap.get(r.stage!) ?? { mentioned: 0, total: 0 };
            existing.total += 1;
            if (entry.mentioned) existing.mentioned += 1;
            stageMap.set(r.stage!, existing);
          }
        }

        const segCompetitorStageRatesResolved = new Map<string, Map<DecisionStage, number>>();
        for (const [name, stageMap] of segCompetitorStageRates) {
          const rateMap = new Map<DecisionStage, number>();
          for (const [stage, counts] of stageMap) {
            rateMap.set(stage, counts.total > 0 ? counts.mentioned / counts.total : 0);
          }
          segCompetitorStageRatesResolved.set(name, rateMap);
        }

        // Comparison for this segment
        const segTotalQueries = new Set(segmentResults.map((r) => r.scanRunId)).size > 0
          ? scans
              .filter((s) => new Set(segmentResults.map((r) => r.scanRunId)).has(s.id))
              .reduce((sum, s) => sum + s.queryCount, 0)
          : segmentResults.length;

        const segComparison = computeScanComparison(
          client.name,
          segmentResults.map((r) => ({
            mentioned: r.mentioned,
            visibilityScore: r.visibilityScore,
            sentimentScore: r.sentimentScore,
            metadata: r.metadata,
            citations: r.citations,
          })),
          segTotalQueries,
        );

        // Recommendations for this segment
        const segRecs = generateStageRecommendations({
          journey: segJourney,
          comparison: {
            clientMentionRate: segComparison.clientMentionRate,
            avgSentimentScore: segComparison.avgSentimentScore,
            entityMentions: segComparison.entityMentions,
            citationAnalysis: {
              gapDomains: segComparison.citations.domainFrequency
                .filter((d) => segComparison.citations.gapDomains.includes(d.domain))
                .map((d) => ({ domain: d.domain, count: d.count })),
              clientExclusiveDomains: segComparison.citations.domainFrequency
                .filter((d) => segComparison.citations.clientExclusiveDomains.includes(d.domain))
                .map((d) => ({ domain: d.domain, count: d.count })),
            },
          },
          client: {
            name: client.name,
            contentAssetTypes: client.contentAssets.map((a) => a.assetType),
            existingAssetUrls,
            competitors: client.competitors.map((c) => ({ name: c.name })),
            nicheKeywords: clientNicheKeywordsForSegment.length > 0 ? clientNicheKeywordsForSegment : undefined,
            industry: client.industry ?? undefined,
          },
        });

        // Visibility boundary for this segment
        const segBoundaryTaggedInputs = filterBoundaryResults(
          segmentResults.map((r) => ({
            intent: r.query?.intent ?? "",
            queryText: r.query?.text ?? undefined,
            stage: r.query?.stage ?? undefined,
            mentioned: r.mentioned,
            metadata: r.metadata,
          })),
        );

        const segDiscoveryNonBoundaryInputs = segmentResults
          .filter((r) => {
            const stage = r.query?.stage ?? r.query?.queryCluster?.stage;
            return stage === "DISCOVERY" && !(r.query?.intent ?? "").includes("boundary:");
          })
          .map((r) => ({
            intent: r.query?.intent ?? "",
            queryText: r.query?.text ?? undefined,
            stage: (r.query?.stage ?? r.query?.queryCluster?.stage ?? "DISCOVERY") as string,
            mentioned: r.mentioned,
            metadata: r.metadata,
          }));

        const segBoundaryInputs = [...segBoundaryTaggedInputs, ...segDiscoveryNonBoundaryInputs];

        const segBoundaryContext = {
          clientName: client.name,
          nicheKeywords: clientNicheKeywordsForSegment,
          industry: client.industry ?? undefined,
        };

        if (hasSufficientBoundaryData(segBoundaryInputs, segBoundaryContext)) {
          segBoundary = detectVisibilityBoundary({
            results: segBoundaryInputs,
            clientName: client.name,
            competitors: client.competitors.map((c) => ({ name: c.name })),
            nicheKeywords: clientNicheKeywordsForSegment.length > 0 ? clientNicheKeywordsForSegment : undefined,
            industry: client.industry ?? undefined,
          });
        }

        // Stage response texts for this segment
        const segStageResponseTexts = new Map<DecisionStage, string[]>();
        for (let i = 0; i < segJourneyInputs.length; i++) {
          const stage = segJourneyInputs[i].stage;
          if (!stage) continue;
          const response = segmentResults[i]?.response;
          if (!response) continue;
          if (!segStageResponseTexts.has(stage)) segStageResponseTexts.set(stage, []);
          segStageResponseTexts.get(stage)!.push(response);
        }

        segJourneyMeta = buildJourneyMetadata({
          clientName: client.name,
          clientOverallRate: segComparison.clientMentionRate,
          journey: segJourney,
          remediationPlan: segRecs,
          competitorStageRates: segCompetitorStageRatesResolved,
          competitorNames: client.competitors.map((c) => c.name),
          visibilityBoundary: segBoundary ?? undefined,
          stageResponseTexts: segStageResponseTexts,
        });
      }

      // Confidence for this segment
      const segResultInputs = segmentResults.map((r) => ({
        mentioned: r.mentioned,
        visibilityScore: r.visibilityScore ?? null,
        sentimentScore: r.sentimentScore ?? null,
        citationCount: r.citations?.length ?? 0,
        responseLength: r.response?.length ?? 0,
      }));
      const segScanRunIds = [...new Set(segmentResults.map((r) => r.scanRunId))];
      const segScanTotalQueries = scans
        .filter((s) => segScanRunIds.includes(s.id))
        .reduce((sum, s) => sum + s.queryCount, 0);
      const segConfidence = computeFindingConfidence({
        scanRunCount: segScanRunIds.length,
        scanCompleteness: Math.min(1, segmentResults.length / Math.max(segScanTotalQueries, 1)),
        results: segResultInputs,
      });

      // Collect the focusArea-matching scan for assessmentParameters
      const segScan = scans.find((s) => segScanRunIds.includes(s.id));

      computedSegments.push({
        name: segmentName,
        scanRunIds: segScanRunIds,
        journeyAnalysis: segJourneyMeta?.journeyAnalysis ?? null,
        clientOverallRate: segJourneyMeta?.clientOverallRate ?? 0,
        competitors: segJourneyMeta?.competitors ?? [],
        remediationPlan: segJourneyMeta?.remediationPlan ?? null,
        visibilityBoundary: segBoundary,
        overallThemes: segJourneyMeta?.overallThemes ?? null,
        assessmentParameters: {
          aiModel: segScan?.model ?? "Not specified",
          queryDepth: segScan?.queryDepth ?? "First Layer",
          focusArea: segmentName,
          queryCount: segmentResults.length,
          scanCount: segScanRunIds.length,
          assessmentDate: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        },
        confidence: segConfidence,
      });
    }
  }

  // Cross-segment summary — only built when 2+ segments were computed
  type CrossSegment = ReturnType<typeof computeCrossSegmentSummary>;
  let crossSegmentSummary: CrossSegment | null = null;

  if (computedSegments.length >= 2) {
    const segmentSummaryInputs = computedSegments.map((seg) => ({
      name: seg.name,
      earnedVisibilityRate: seg.journeyAnalysis?.earnedVisibilityRate ?? 0,
      earnedVisibilityTier: seg.journeyAnalysis?.earnedVisibilityTier ?? "invisible",
      gapDomains: (seg.journeyAnalysis?.stages ?? [])
        .flatMap((st) => (st as { gapDomains?: string[] }).gapDomains ?? []),
      overallPositioning: seg.journeyAnalysis?.overallPositioning ?? "INVISIBLE",
    }));

    crossSegmentSummary = computeCrossSegmentSummary(client.name, segmentSummaryInputs);
  }

  // Compute finding-level confidence from the fetched scan data.
  // scanResults.response is fetched above; fall back to 0 if somehow absent.
  const totalQueryCount = Math.max(totalQueries, 1); // guard against 0
  const totalResultCount = scanResults.length;

  const allResultInputs = scanResults.map((r) => ({
    mentioned: r.mentioned,
    visibilityScore: r.visibilityScore ?? null,
    sentimentScore: r.sentimentScore ?? null,
    citationCount: r.citations?.length ?? 0,
    responseLength: r.response?.length ?? 0,
  }));

  // Use effectiveScanRunCount so the single-scan confidence penalty is lifted
  // when cross-run validation is established (>= 70% of queries validated).
  const baseFindingInput = {
    scanRunCount: multiRunAnalysis.effectiveScanRunCount,
    scanCompleteness: totalResultCount / totalQueryCount,
  };

  const overallConfidence = computeFindingConfidence({
    ...baseFindingInput,
    results: allResultInputs,
  });

  // Visibility: all results
  const visibilityConfidence = overallConfidence;

  // Competitor: results that have a competitorId
  const competitorResults = scanResults
    .filter((r) => r.competitorId !== null)
    .map((r) => ({
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore ?? null,
      sentimentScore: r.sentimentScore ?? null,
      citationCount: r.citations?.length ?? 0,
      responseLength: r.response?.length ?? 0,
    }));
  const competitorConfidence =
    competitorResults.length > 0
      ? computeFindingConfidence({ ...baseFindingInput, results: competitorResults })
      : null;

  // Citation: results that have at least one citation
  const citationResults = scanResults
    .filter((r) => (r.citations?.length ?? 0) > 0)
    .map((r) => ({
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore ?? null,
      sentimentScore: r.sentimentScore ?? null,
      citationCount: r.citations?.length ?? 0,
      responseLength: r.response?.length ?? 0,
    }));
  const citationConfidence =
    citationResults.length > 0
      ? computeFindingConfidence({ ...baseFindingInput, results: citationResults })
      : null;

  // Build per-section confidence map using the same keys as metadata storage
  const perSectionConfidence: Record<string, { score: number; tier: string }> = {
    [SECTION_VISIBILITY]: { score: visibilityConfidence.score, tier: visibilityConfidence.tier },
    ...(competitorConfidence !== null
      ? { [SECTION_COMPETITOR]: { score: competitorConfidence.score, tier: competitorConfidence.tier } }
      : {}),
    ...(citationConfidence !== null
      ? { [SECTION_CITATIONS]: { score: citationConfidence.score, tier: citationConfidence.tier } }
      : {}),
  };

  // Compose the report with confidence data for narrative hedging.
  // journeyAnalysisForComposer is set above (before this call) so composeSummary
  // can lead with earned visibility rather than the aggregate mention rate.
  const composed = composeReport({
    clientName: client.name,
    clientDomain: client.domain,
    industry: client.industry ?? undefined,
    scanComparison: comparison,
    competitors: client.competitors,
    contentAssetTypes: client.contentAssets.map((a) => a.assetType),
    existingAssetUrls,
    queryThemeBreakdown: queryThemeBreakdown.length > 0 ? queryThemeBreakdown : undefined,
    assessmentScope,
    confidence: {
      overall: { score: overallConfidence.score, tier: overallConfidence.tier },
      perSection: perSectionConfidence,
    },
    journeyAnalysis: journeyAnalysisForComposer,
    overallThemes: journeyMetadataForReport?.overallThemes ?? undefined,
  });

  // ── Executive summary prose — LLM-generated at report time ───────────────
  // Called after journey analysis so we have all structured data available.
  // Stored as metadata.executiveSummaryProse.
  // Fails gracefully: if the LLM call errors or returns empty text, the
  // ExecutiveSummaryCard will fall back to template-driven prose.
  let executiveSummaryProse: { situation: string; topRecommendation: string } | null = null;

  if (journeyMetadataForReport !== null && process.env.ANTHROPIC_API_KEY) {
    try {
      const jm = journeyMetadataForReport;
      const topRec = jm.remediationPlan.recommendations.find(
        (r) => r.priority === "CRITICAL",
      ) ?? jm.remediationPlan.recommendations[0];
      const primaryComp = jm.competitors.find((c) => c.threatLevel === "Primary") ?? jm.competitors[0];

      const prompt = executiveSummaryPrompt({
        clientName: jm.clientName,
        industry: client.industry ?? undefined,
        earnedVisibilityRate: jm.journeyAnalysis.earnedVisibilityRate ?? jm.clientOverallRate,
        earnedVisibilityTier: jm.journeyAnalysis.earnedVisibilityTier ?? "invisible",
        criticalGapStage: jm.journeyAnalysis.criticalGapStage ?? null,
        funnelThroughput: jm.journeyAnalysis.funnelThroughput,
        stages: jm.journeyAnalysis.stages.map((s) => ({
          stage: s.stage,
          label: s.label,
          mentionRate: s.mentionRate,
        })),
        topCompetitor: primaryComp
          ? { name: primaryComp.name, overallRate: primaryComp.overallRate }
          : null,
        topRecommendation: topRec
          ? {
              title: topRec.title,
              targetPlatforms: topRec.targetPlatforms,
              timeframe: topRec.timeframe,
              whyItMatters: topRec.whyItMatters,
            }
          : null,
      });

      const raw = await generateProse(prompt);

      if (raw.trim()) {
        // Strip any markdown code fences the model may have added
        const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        const parsed = JSON.parse(cleaned) as { situation?: unknown; topRecommendation?: unknown };
        if (
          typeof parsed.situation === "string" &&
          parsed.situation.length > 20 &&
          typeof parsed.topRecommendation === "string" &&
          parsed.topRecommendation.length > 20
        ) {
          executiveSummaryProse = {
            situation: parsed.situation,
            topRecommendation: parsed.topRecommendation,
          };
        }
      }
    } catch {
      // Non-fatal: template fallback handles missing prose in the card component
    }
  }

  // ── Longitudinal benchmarking — baseline snapshot & comparison ────────
  // Prepare baseline metrics from this assessment for persistence.
  // Also fetch the most recent previous baseline for this client to compute
  // a before/after comparison (stored in report metadata).

  const journeyStages = journeyMetadataForReport?.journeyAnalysis?.stages ?? [];
  const discoveryStage = journeyStages.find(
    (s: { stage: string }) => s.stage === "DISCOVERY",
  );
  const evaluationStage = journeyStages.find(
    (s: { stage: string }) => s.stage === "EVALUATION",
  );
  const considerationStage = journeyStages.find(
    (s: { stage: string }) => s.stage === "CONSIDERATION",
  );
  const commitmentStage = journeyStages.find(
    (s: { stage: string }) => s.stage === "COMMITMENT",
  );

  // Top competitor from journey metadata competitors list
  const baselineTopCompetitor =
    (journeyMetadataForReport?.competitors ?? []).find(
      (c: { threatLevel: string }) => c.threatLevel === "Primary",
    ) ?? (journeyMetadataForReport?.competitors ?? [])[0] ?? null;

  // Employer-relevant gap domains — filter the total gap domains list
  const allGapDomains = comparison.citations.gapDomains;
  const employerRelevantGapDomains = allGapDomains.filter((d) =>
    isEmployerRelevantDomain(d),
  );

  const baselineData = {
    earnedVisibilityRate:
      journeyMetadataForReport?.journeyAnalysis?.earnedVisibilityRate ??
      comparison.clientMentionRate,
    discoveryMentionRate: (discoveryStage as { mentionRate?: number } | undefined)?.mentionRate ?? null,
    evaluationMentionRate: (evaluationStage as { mentionRate?: number } | undefined)?.mentionRate ?? null,
    considerationMentionRate: (considerationStage as { mentionRate?: number } | undefined)?.mentionRate ?? null,
    commitmentMentionRate: (commitmentStage as { mentionRate?: number } | undefined)?.mentionRate ?? null,
    overallMentionRate: comparison.clientMentionRate,
    avgSentiment: comparison.avgSentimentScore ?? null,
    topCompetitorName: baselineTopCompetitor?.name ?? null,
    topCompetitorRate: baselineTopCompetitor?.overallRate ?? null,
    competitorGapPp: baselineTopCompetitor
      ? Math.round(
          ((baselineTopCompetitor.overallRate ?? 0) - comparison.clientMentionRate) * 100,
        )
      : null,
    totalGapDomains: allGapDomains.length,
    employerGapDomains: employerRelevantGapDomains.length,
    overallPositioning:
      journeyMetadataForReport?.journeyAnalysis?.overallPositioning ?? null,
    queryCount: scanResults.length,
    focusArea: scans[0]?.focusArea ?? null,
    stageData: journeyMetadataForReport?.journeyAnalysis?.stages ?? null,
  };

  // Fetch previous baseline for this client (if any)
  const previousBaseline = await prisma.assessmentBaseline.findFirst({
    where: { clientId },
    orderBy: { assessmentDate: "desc" },
  });

  let baselineComparisonResult: BaselineComparisonResult | null = null;

  if (previousBaseline) {
    // Extract stability snapshot from stageData if it was stored there by a previous run.
    // Older baselines store stageData as a plain array (or null) — handle both shapes safely.
    const prevStageData = previousBaseline.stageData as Record<string, unknown> | unknown[] | null;
    const prevStabilitySnapshot =
      prevStageData !== null &&
      !Array.isArray(prevStageData) &&
      typeof prevStageData === "object" &&
      "stabilitySnapshot" in prevStageData
        ? (prevStageData.stabilitySnapshot as {
            stabilityDistribution: {
              STABLE_PRESENCE: number;
              VOLATILE_PRESENCE: number;
              STABLE_ABSENCE: number;
              UNVALIDATED: number;
            };
            validatedQueryRate: number;
          })
        : null;

    const prevSnapshot: BaselineSnapshot = {
      earnedVisibilityRate: previousBaseline.earnedVisibilityRate,
      discoveryMentionRate: previousBaseline.discoveryMentionRate,
      evaluationMentionRate: previousBaseline.evaluationMentionRate,
      considerationMentionRate: previousBaseline.considerationMentionRate,
      commitmentMentionRate: previousBaseline.commitmentMentionRate,
      overallMentionRate: previousBaseline.overallMentionRate,
      avgSentiment: previousBaseline.avgSentiment,
      topCompetitorName: previousBaseline.topCompetitorName,
      topCompetitorRate: previousBaseline.topCompetitorRate,
      competitorGapPp: previousBaseline.competitorGapPp,
      totalGapDomains: previousBaseline.totalGapDomains,
      employerGapDomains: previousBaseline.employerGapDomains,
      overallPositioning: previousBaseline.overallPositioning,
      queryCount: previousBaseline.queryCount,
      assessmentDate: previousBaseline.assessmentDate,
      ...(prevStabilitySnapshot !== null
        ? {
            stabilityDistribution: prevStabilitySnapshot.stabilityDistribution,
            validatedQueryRate: prevStabilitySnapshot.validatedQueryRate,
          }
        : {}),
    };

    const currSnapshot: BaselineSnapshot = {
      earnedVisibilityRate: baselineData.earnedVisibilityRate,
      discoveryMentionRate: baselineData.discoveryMentionRate,
      evaluationMentionRate: baselineData.evaluationMentionRate,
      considerationMentionRate: baselineData.considerationMentionRate,
      commitmentMentionRate: baselineData.commitmentMentionRate,
      overallMentionRate: baselineData.overallMentionRate,
      avgSentiment: baselineData.avgSentiment,
      topCompetitorName: baselineData.topCompetitorName,
      topCompetitorRate: baselineData.topCompetitorRate,
      competitorGapPp: baselineData.competitorGapPp,
      totalGapDomains: baselineData.totalGapDomains,
      employerGapDomains: baselineData.employerGapDomains,
      overallPositioning: baselineData.overallPositioning,
      queryCount: baselineData.queryCount,
      assessmentDate: new Date(),
      stabilityDistribution: multiRunAnalysis.stabilityDistribution,
      validatedQueryRate: multiRunAnalysis.validationRate,
    };

    baselineComparisonResult = computeBaselineComparison(prevSnapshot, currSnapshot);
  }

  // Store report + recommendations in a transaction
  const report = await prisma.$transaction(async (tx) => {
    const r = await tx.report.create({
      data: {
        clientId,
        title: reportTitle,
        status: "DRAFT",
        summary: composed.summary,
        generatedAt: new Date(),
        metadata: {
          scanRunIds,
          sections: composed.sections as unknown as Prisma.JsonArray,
          coverPage: composed.coverPage as unknown as Prisma.InputJsonObject,
          recommendations: composed.recommendations as unknown as Prisma.JsonArray,
          confidence: {
            overall: overallConfidence as unknown as Prisma.InputJsonObject,
            perSection: {
              [SECTION_VISIBILITY]: visibilityConfidence as unknown as Prisma.InputJsonObject,
              ...(competitorConfidence !== null
                ? { [SECTION_COMPETITOR]: competitorConfidence as unknown as Prisma.InputJsonObject }
                : {}),
              ...(citationConfidence !== null
                ? { [SECTION_CITATIONS]: citationConfidence as unknown as Prisma.InputJsonObject }
                : {}),
            },
          },
          // Journey analysis: present when at least one result had stage data.
          // The frontend JourneyReportRenderer activates when this key is present.
          // null means all stages were unclassifiable — fallback to legacy renderer.
          ...(journeyMetadataForReport !== null
            ? {
                journeyAnalysis: journeyMetadataForReport.journeyAnalysis as unknown as Prisma.InputJsonObject,
                clientName: journeyMetadataForReport.clientName,
                clientOverallRate: journeyMetadataForReport.clientOverallRate,
                competitors: journeyMetadataForReport.competitors as unknown as Prisma.JsonArray,
                remediationPlan: journeyMetadataForReport.remediationPlan as unknown as Prisma.InputJsonObject,
              }
            : {}),
          // Visibility boundary: present when at least 2 specificity levels
          // have boundary-tagged scan results. Rendered by the JourneyReportRenderer
          // as a subsection within the Candidate Decision Journey section.
          ...(visibilityBoundary !== null
            ? {
                visibilityBoundary: visibilityBoundary as unknown as Prisma.InputJsonObject,
              }
            : {}),
          // Assessment parameters: captured from scan creation fields so the
          // report introduction can describe exactly how the assessment was run.
          assessmentParameters: assessmentParameters as unknown as Prisma.InputJsonObject,
          // Readiness warnings: recorded at generation time so the operator can
          // see what data gaps existed when the report was produced.
          ...(readinessWarnings.length > 0
            ? {
                readinessWarnings: readinessWarnings as unknown as Prisma.InputJsonArray,
              }
            : {}),
          // Per-theme competitor rates: shows which competitor dominates which
          // query theme, enabling "Apex beats you on compensation (72% vs 15%)".
          ...(themeCompetitorRates.length > 0
            ? {
                themeCompetitorRates: themeCompetitorRates as unknown as Prisma.InputJsonArray,
              }
            : {}),
          // Per-segment analysis: only present when 2+ distinct focusAreas exist.
          // Each entry mirrors the shape of the top-level journey keys.
          // Single-segment reports omit these keys for backward compatibility.
          ...(computedSegments.length >= 2
            ? {
                segments: computedSegments as unknown as Prisma.InputJsonArray,
                crossSegmentSummary: crossSegmentSummary as unknown as Prisma.InputJsonObject,
              }
            : {}),
          // LLM-generated executive summary prose — present when the LLM call succeeded.
          // The ExecutiveSummaryCard falls back to template text when absent.
          ...(executiveSummaryProse !== null
            ? {
                executiveSummaryProse: executiveSummaryProse as unknown as Prisma.InputJsonObject,
              }
            : {}),
          // Longitudinal benchmarking — before/after comparison with previous assessment.
          // Present only when a previous AssessmentBaseline exists for this client.
          // The JourneyReportRenderer renders a comparison section when this key is present.
          ...(baselineComparisonResult !== null
            ? {
                baselineComparison: baselineComparisonResult as unknown as Prisma.InputJsonObject,
              }
            : {}),
          // Multi-run aggregation — per-query stability classification and report-level
          // summary across all selected scan runs. Always present (never null).
          // All queries show as UNVALIDATED when only a single scan run was used,
          // preserving backward compatibility with single-scan reports.
          multiRunAnalysis: multiRunAnalysis as unknown as Prisma.InputJsonObject,
        } as Prisma.InputJsonObject,
      },
    });

    if (composed.recommendations.length > 0) {
      await tx.recommendation.createMany({
        data: composed.recommendations.map((rec, i) => ({
          reportId: r.id,
          category: rec.category as RecommendationCategory,
          priority: rec.priority as RecommendationPriority,
          title: rec.title,
          description: rec.description,
          impact: rec.impact,
          effort: rec.effort,
          sortOrder: i,
        })),
      });
    }

    // Link APPROVED evidence to the report.
    // Only APPROVED evidence records are linked — DRAFT, SUPERSEDED, and REJECTED
    // evidence must not appear in a published report. Pick the highest-version
    // approved record per result so ReportEvidence always points to a locked, immutable record.
    const resultIds = scanResults.map((sr) => sr.id);
    const evidenceRows = await tx.scanEvidence.findMany({
      where: {
        scanResultId: { in: resultIds },
        status: "APPROVED",
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        scanResultId: true,
      },
    });

    // Pick the highest-version approved evidence record per result (orderBy: version desc means
    // the first row for each scanResultId is already the latest).
    const evidenceByResult = new Map<string, string>();
    for (const ev of evidenceRows) {
      if (!evidenceByResult.has(ev.scanResultId)) {
        evidenceByResult.set(ev.scanResultId, ev.id);
      }
    }

    if (evidenceByResult.size > 0) {
      // Build parallel arrays for section mapping
      const orderedResults = scanResults.filter((sr) =>
        evidenceByResult.has(sr.id),
      );
      const orderedEvidenceIds = orderedResults.map(
        (sr) => evidenceByResult.get(sr.id)!,
      );

      const assignments = mapEvidenceToSections(
        orderedEvidenceIds,
        orderedResults.map((sr) => ({
          id: sr.id,
          mentioned: sr.mentioned,
          competitorId: sr.competitorId ?? null,
          citations: sr.citations,
        })),
      );

      // Deduplicate by (reportId, scanEvidenceId, sectionHeading) to avoid
      // unique constraint violations when a result maps to the same section twice
      const seen = new Set<string>();
      const dedupedAssignments = assignments.filter((a) => {
        const key = `${a.evidenceId}|${a.sectionHeading}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (dedupedAssignments.length > 0) {
        await tx.reportEvidence.createMany({
          data: dedupedAssignments.map((a) => ({
            reportId: r.id,
            scanEvidenceId: a.evidenceId,
            sectionHeading: a.sectionHeading,
            sortOrder: a.sortOrder,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Audit log the report creation
    await tx.transitionLog.create({
      data: {
        entityType: "REPORT",
        entityId: r.id,
        fromStatus: "",
        toStatus: "DRAFT",
        action: "generateReport",
        actorId: userId,
      },
    });

    // Create a PENDING QA record for the new report
    await tx.reportQA.create({
      data: {
        reportId: r.id,
        status: "PENDING",
      },
    });

    // Persist the assessment baseline snapshot for longitudinal benchmarking.
    // This record enables before/after comparison in future assessments.
    await tx.assessmentBaseline.create({
      data: {
        clientId,
        reportId: r.id,
        earnedVisibilityRate: baselineData.earnedVisibilityRate,
        discoveryMentionRate: baselineData.discoveryMentionRate,
        evaluationMentionRate: baselineData.evaluationMentionRate,
        considerationMentionRate: baselineData.considerationMentionRate,
        commitmentMentionRate: baselineData.commitmentMentionRate,
        overallMentionRate: baselineData.overallMentionRate,
        avgSentiment: baselineData.avgSentiment,
        topCompetitorName: baselineData.topCompetitorName,
        topCompetitorRate: baselineData.topCompetitorRate,
        competitorGapPp: baselineData.competitorGapPp,
        totalGapDomains: baselineData.totalGapDomains,
        employerGapDomains: baselineData.employerGapDomains,
        overallPositioning: baselineData.overallPositioning,
        queryCount: baselineData.queryCount,
        focusArea: baselineData.focusArea,
        // stageData stores both journey stage metrics and the stability snapshot.
        // Encoding them together avoids a schema migration while keeping both
        // readable on the next assessment run.
        stageData: {
          stages: (baselineData.stageData as unknown as Prisma.InputJsonValue) ?? null,
          stabilitySnapshot: {
            stabilityDistribution: multiRunAnalysis.stabilityDistribution,
            validatedQueryRate: multiRunAnalysis.validationRate,
          },
        } as unknown as Prisma.InputJsonValue,
        assessmentDate: new Date(),
      },
    });

    return r;
  });

  redirect(`/reports/${report.id}`);
}

export async function updateReportStatus(
  id: string,
  status: string,
): Promise<void> {
  const parsed = ReportStatus.safeParse(status);
  if (!parsed.success) {
    throw new Error(`Invalid report status: ${status}`);
  }

  const { organizationId, userId } = await getAuthContext();
  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, status: true },
  });
  if (!report) throw new Error("Report not found.");

  const currentStatus = report.status;
  const targetStatus = parsed.data;

  // For DRAFT -> REVIEW transitions, check unapproved evidence count.
  // Count unapproved evidence for the DRAFT -> REVIEW gate.
  // validateReportTransition will block if any unapproved evidence exists.
  // Reviewer assignment checks require a future auth integration; for now we pass
  // hasReviewer: true so the gate does not block the current semi-manual workflow.
  let unapprovedEvidenceCount = 0;
  if (currentStatus === "DRAFT" && targetStatus === "REVIEW") {
    unapprovedEvidenceCount = await prisma.scanEvidence.count({
      where: {
        reportLinks: { some: { reportId: id } },
        status: { not: "APPROVED" },
      },
    });
  }

  const transitionCheck = validateReportTransition(currentStatus as string, targetStatus as string, {
    actorId: null,
    hasReviewer: true, // TODO: real reviewer check once auth is wired
    reviewerIsAuthor: false, // TODO: real check
    unapprovedEvidenceCount,
  });

  if (!transitionCheck.valid) {
    throw new Error(transitionCheck.reason);
  }

  // Auto-run QA when transitioning to REVIEW; block if QA status is FAIL
  if (targetStatus === "REVIEW") {
    const qaResult = await runReportQA(id);
    if (qaResult.success && qaResult.result?.status === "FAIL") {
      throw new Error(
        "QA checks failed. Resolve blocking issues before submitting for review.",
      );
    }
  }

  // Gate: PUBLISHED requires QA to be passing and signed off.
  // All four conditions are checked independently with explicit error messages so
  // the caller knows exactly what is missing rather than getting a generic block.
  if (targetStatus === "PUBLISHED") {
    const qa = await prisma.reportQA.findUnique({
      where: { reportId: id },
    });

    if (!qa) {
      throw new Error(
        "Cannot publish: no QA record exists. Run QA checks first.",
      );
    }
    if (qa.status === "PENDING") {
      throw new Error(
        "Cannot publish: QA checks have not been completed. Run QA checks first.",
      );
    }
    if (qa.status === "FAIL") {
      throw new Error(
        "Cannot publish: QA status is FAIL. Resolve all blocking issues and re-run QA.",
      );
    }
    // TODO(auth): Once real auth is implemented, require BOTH signedOffById AND signedOffAt.
    // Pre-auth: signedOffById is always null because there is no user session.
    // We gate on signedOffAt alone, which is set by signoffQA when a reviewer signs off.
    if (!qa.signedOffAt) {
      throw new Error(
        "Cannot publish: QA has not been signed off. A reviewer must sign off before publishing.",
      );
    }
  }

  const data: Record<string, unknown> = { status: targetStatus };
  if (targetStatus === "PUBLISHED") data.publishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.report.update({ where: { id }, data });

    await tx.transitionLog.create({
      data: {
        entityType: "REPORT",
        entityId: id,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        action: "updateReportStatus",
        actorId: userId,
      },
    });
  });

  redirect(`/reports/${id}`);
}

export async function deleteReport(id: string): Promise<void> {
  const { organizationId } = await getAuthContext();
  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, status: true },
  });
  if (!report) throw new Error("Report not found.");

  // Block deletion of terminal/published reports — they carry audit trail
  // and are referenced by external evidence links. Only DRAFT and REVIEW
  // reports that have not yet been approved for delivery may be deleted.
  if (report.status === "PUBLISHED" || report.status === "ARCHIVED") {
    throw new Error(
      `Cannot delete a report in ${report.status} status. Only DRAFT or REVIEW reports may be deleted.`,
    );
  }

  await prisma.report.delete({ where: { id } });
  redirect("/reports");
}
