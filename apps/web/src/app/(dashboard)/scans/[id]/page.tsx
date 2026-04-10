import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@antellion/db";
import { computeScanComparison, discoverCompetitors } from "@antellion/core";
import { PageHeader } from "@/components/page-header";
import { ScanComparison } from "@/components/scan-comparison";
import { StatusPipeline } from "@/components/StatusPipeline";
import { WorkflowStatusBar } from "@/components/WorkflowStatusBar";
import { ResultReviewActions } from "@/components/ResultReviewActions";
import { CopyButton } from "@/components/CopyButton";
import { Card, CardHeader, Badge, StatusBadge } from "@antellion/ui";
import { DeleteButton } from "@/components/delete-button";
import { ScanProgressBar } from "@/components/ScanProgressBar";
import { AddDiscoveredCompetitorButton } from "@/components/AddDiscoveredCompetitorButton";
import { deleteScan } from "@/app/(dashboard)/actions/scans";
import { addDiscoveredCompetitor } from "@/app/(dashboard)/actions/competitors";
import { ScanEvidenceDetail } from "@/components/ScanEvidenceDetail";
import { ValidationScanSelector } from "@/components/ValidationScanSelector";
import { formatDateTime } from "@/lib/format";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

interface CompetitorMentionData {
  name: string;
  domain: string;
  mentioned: boolean;
}

interface SignalYieldData {
  score: number;
  tier: "high" | "medium" | "low" | "zero";
}

const SCAN_STEPS = ["PENDING", "RUNNING", "COMPLETED"];

const resultStatusVariant: Record<
  string,
  "default" | "success" | "warning" | "danger"
> = {
  CAPTURED: "default",
  NEEDS_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function ScanDetailPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const scan = await prisma.scanRun.findFirst({
    where: { id, client: { organizationId } },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          domain: true,
          competitors: { select: { name: true } },
        },
      },
      results: {
        select: {
          id: true,
          queryId: true,
          response: true,
          visibilityScore: true,
          sentimentScore: true,
          mentioned: true,
          metadata: true,
          status: true,
          createdAt: true,
          citations: {
            select: { id: true, domain: true, url: true },
          },
        },
      },
      parentScan: {
        select: { id: true },
      },
      validationScans: {
        select: { id: true, status: true, createdAt: true, queryCount: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!scan) notFound();

  // Batch-fetch all evidence records for this scan in a single query.
  // This avoids the N+1 connection exhaustion pattern where each result
  // component opens its own DB connection.
  const resultIds = scan.results.map((r) => r.id);
  const evidenceRecords = resultIds.length > 0
    ? await prisma.scanEvidence.findMany({
        where: { scanResultId: { in: resultIds } },
        select: {
          id: true,
          scanResultId: true,
          version: true,
          status: true,
          provider: true,
          modelName: true,
          temperature: true,
          executedAt: true,
          confidenceScore: true,
          promptText: true,
          rawResponse: true,
          extractedSources: true,
          analystNotes: true,
          approvedAt: true,
          approvedBy: { select: { name: true, email: true } },
          scanResult: {
            select: {
              query: { select: { text: true } },
            },
          },
        },
        orderBy: { version: "desc" },
      })
    : [];

  // Keep only the highest-version evidence per scanResultId
  const evidenceByResultId = new Map<string, (typeof evidenceRecords)[number]>();
  for (const ev of evidenceRecords) {
    if (!evidenceByResultId.has(ev.scanResultId)) {
      evidenceByResultId.set(ev.scanResultId, ev);
    }
  }

  // Get queries for this scan from metadata
  const meta = scan.metadata as { queryClusterIds?: string[]; automated?: boolean } | null;
  const queryClusterIds = meta?.queryClusterIds ?? [];
  const isAutomated = meta?.automated === true;

  const clusters = await prisma.queryCluster.findMany({
    where: { id: { in: queryClusterIds } },
    select: {
      id: true,
      name: true,
      queries: {
        where: { isActive: true },
        select: { id: true, text: true, intent: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build lookups
  const resultsByQuery = new Map(
    scan.results.map((r) => [r.queryId, r]),
  );

  const allQueries = clusters.flatMap((c) => c.queries);
  const pendingCount = allQueries.filter(
    (q) => !resultsByQuery.has(q.id),
  ).length;

  const isRunning = scan.status === "RUNNING";

  // Compute comparison from results
  const comparison = computeScanComparison(
    scan.client.name,
    scan.results.map((r) => ({
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore,
      sentimentScore: r.sentimentScore,
      metadata: r.metadata,
      citations: r.citations,
    })),
    scan.queryCount,
  );

  // Discover potential competitors from AI responses (only for completed scans)
  const discoveredCompetitors =
    scan.status === "COMPLETED"
      ? discoverCompetitors(
          scan.results,
          scan.client.name,
          scan.client.competitors.map((c) => c.name),
        )
      : [];

  // Build the query list for the ValidationScanSelector
  const validationScanQueries = clusters.flatMap((cluster) =>
    cluster.queries.map((query) => {
      const result = resultsByQuery.get(query.id);
      const resultMeta = result?.metadata as {
        signalYield?: SignalYieldData;
      } | null;
      return {
        id: query.id,
        text: query.text,
        clusterName: cluster.name,
        hasResult: !!result,
        mentioned: result?.mentioned ?? null,
        signalTier: resultMeta?.signalYield?.tier ?? null,
      };
    }),
  );

  // Determine pipeline step: exclude FAILED/CANCELLED from standard flow
  const pipelineStatus =
    scan.status === "FAILED" || scan.status === "CANCELLED"
      ? scan.status
      : scan.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Scan — ${scan.client.name}`}
        description={`Started ${formatDateTime(scan.startedAt ?? scan.createdAt)}`}
        action={
          <div className="flex items-center gap-3">
            {scan.status === "COMPLETED" && (
              <Link
                href={`/reports/generate?clientId=${scan.client.id}`}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Generate report
              </Link>
            )}
            <DeleteButton
              action={deleteScan.bind(null, id)}
              confirmMessage="Delete this scan and all its results?"
            />
          </div>
        }
      />

      {/* Parent scan link (shown when this is a validation scan) */}
      {scan.parentScan && (
        <div className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm">
          <span className="text-blue-600 font-medium">Validation scan.</span>
          <span className="text-blue-500">Based on:</span>
          <Link
            href={`/scans/${scan.parentScan.id}`}
            className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            Parent scan
          </Link>
        </div>
      )}

      {/* Status pipeline */}
      {scan.status !== "FAILED" && scan.status !== "CANCELLED" ? (
        <StatusPipeline steps={SCAN_STEPS} currentStep={scan.status} />
      ) : (
        <div className="flex items-center gap-2">
          <StatusBadge type="scan" status={scan.status} />
          {scan.status === "FAILED" && (
            <p className="text-sm text-gray-500">
              This scan encountered an error and could not complete.
            </p>
          )}
        </div>
      )}

      {/* Workflow status bar */}
      <WorkflowStatusBar
        entityType="scan"
        status={scan.status}
        entityId={id}
        resultCount={scan.resultCount}
        queryCount={scan.queryCount}
        isAutomated={isAutomated}
      />

      {/* Live progress bar */}
      {scan.queryCount > 0 && (
        <ScanProgressBar
          scanId={id}
          initialResultCount={scan.resultCount}
          queryCount={scan.queryCount}
          polling={scan.status === "RUNNING" && isAutomated}
        />
      )}

      {/* Assessment parameters */}
      {(scan.model || scan.queryDepth || scan.focusArea) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {scan.model && scan.model !== "manual" && (
            <span>
              <span className="font-medium text-gray-700">AI Model:</span>{" "}
              {scan.model}
            </span>
          )}
          {scan.queryDepth && (
            <span>
              <span className="font-medium text-gray-700">Query Depth:</span>{" "}
              {scan.queryDepth}
            </span>
          )}
          {scan.focusArea && (
            <span>
              <span className="font-medium text-gray-700">Focus Area:</span>{" "}
              {scan.focusArea}
            </span>
          )}
        </div>
      )}

      {/* Comparison panel */}
      <ScanComparison comparison={comparison} />

      {/* Discovered competitors (shown only when scan is COMPLETED and candidates exist) */}
      {discoveredCompetitors.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-medium text-gray-900">
                Talent Competitors Discovered
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                These employers appeared frequently in AI responses. Add the
                relevant ones as competitors to generate comparison queries for
                a second scan pass.
              </p>
            </div>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {discoveredCompetitors.map((competitor) => (
              <div
                key={competitor.name}
                className="flex items-center justify-between gap-4 px-6 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    {competitor.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    mentioned in {competitor.mentionCount}{" "}
                    {competitor.mentionCount === 1 ? "response" : "responses"}
                  </span>
                  {competitor.mentionContexts[0] && (
                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                      {competitor.mentionContexts[0]}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <AddDiscoveredCompetitorButton
                    competitorName={competitor.name}
                    action={addDiscoveredCompetitor.bind(
                      null,
                      scan.client.id,
                      id,
                      competitor.name,
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Validation scan selector */}
      <ValidationScanSelector
        scanId={id}
        scanStatus={scan.status}
        queries={validationScanQueries}
      />

      {/* Validation scans created from this scan */}
      {scan.validationScans.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <span className="font-medium text-gray-700">Validation scans:</span>
          {scan.validationScans.map((vs) => (
            <Link
              key={vs.id}
              href={`/scans/${vs.id}`}
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
            >
              <span className="underline underline-offset-2">
                {vs.queryCount} {vs.queryCount === 1 ? "query" : "queries"}
              </span>
              <span className="text-gray-400">
                &middot; {vs.status}
              </span>
              <span className="text-xs text-gray-400">
                ({formatDateTime(vs.createdAt)})
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Results by cluster */}
      {clusters.map((cluster) => (
        <Card key={cluster.id}>
          <CardHeader>
            <h3 className="font-medium text-gray-900">{cluster.name}</h3>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {cluster.queries.map((query) => {
              const result = resultsByQuery.get(query.id);
              const resultMeta = result?.metadata as {
                competitorMentions?: CompetitorMentionData[];
                signalYield?: SignalYieldData;
              } | null;
              const compMentions = resultMeta?.competitorMentions;
              const signalYield = resultMeta?.signalYield;

              return (
                <div key={query.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm font-medium text-gray-900">
                          {query.text}
                        </p>
                        <CopyButton text={query.text} />
                      </div>

                      {result ? (
                        <div className="mt-3 space-y-3">
                          {/* Result status + review actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                resultStatusVariant[result.status] ?? "default"
                              }
                            >
                              {result.status.replace(/_/g, " ")}
                            </Badge>
                            {(result.status === "CAPTURED" ||
                              result.status === "NEEDS_REVIEW") && (
                              <ResultReviewActions
                                resultId={result.id}
                                currentStatus={result.status}
                              />
                            )}
                          </div>

                          {/* Scores row */}
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={
                                result.mentioned ? "success" : "default"
                              }
                            >
                              {result.mentioned
                                ? "Client mentioned"
                                : "Not mentioned"}
                            </Badge>
                            {result.visibilityScore !== null && (
                              <Badge
                                variant={
                                  result.visibilityScore >= 50
                                    ? "success"
                                    : result.visibilityScore > 0
                                      ? "warning"
                                      : "default"
                                }
                              >
                                Visibility: {result.visibilityScore}
                              </Badge>
                            )}
                            {result.sentimentScore !== null && (
                              <Badge
                                variant={
                                  result.sentimentScore > 0
                                    ? "success"
                                    : result.sentimentScore < 0
                                      ? "danger"
                                      : "default"
                                }
                              >
                                Sentiment:{" "}
                                {result.sentimentScore > 0 ? "+" : ""}
                                {result.sentimentScore}
                              </Badge>
                            )}
                            {signalYield && (
                              <Badge
                                variant={
                                  signalYield.tier === "high"
                                    ? "success"
                                    : signalYield.tier === "medium"
                                      ? "warning"
                                      : signalYield.tier === "zero"
                                        ? "danger"
                                        : "default"
                                }
                              >
                                {signalYield.tier === "high"
                                  ? "High signal"
                                  : signalYield.tier === "medium"
                                    ? "Medium signal"
                                    : signalYield.tier === "low"
                                      ? "Low signal"
                                      : "Zero signal"}
                              </Badge>
                            )}
                          </div>

                          {/* Competitor mentions */}
                          {compMentions && compMentions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {compMentions.map((cm) => (
                                <span
                                  key={cm.name}
                                  className={`inline-flex rounded px-1.5 py-0.5 text-xs ${
                                    cm.mentioned
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-gray-50 text-gray-400"
                                  }`}
                                >
                                  {cm.name}:{" "}
                                  {cm.mentioned ? "mentioned" : "absent"}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Citations */}
                          {result.citations.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {result.citations.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
                                >
                                  {c.domain}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Truncated response */}
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {result.response}
                          </p>

                          {/* Evidence record */}
                          <ScanEvidenceDetail evidence={evidenceByResultId.get(result.id) ?? null} />
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-400">
                          No result recorded
                        </p>
                      )}
                    </div>

                    {/* Record action */}
                    <div className="shrink-0">
                      {result ? (
                        result.status === "APPROVED" ? (
                          <Badge variant="success">Approved</Badge>
                        ) : result.status === "REJECTED" ? (
                          <Badge variant="danger">Rejected</Badge>
                        ) : (
                          <Badge variant="default">Recorded</Badge>
                        )
                      ) : isRunning ? (
                        <Link
                          href={`/scans/${id}/record/${query.id}`}
                          className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                        >
                          Record
                        </Link>
                      ) : (
                        <Badge>Skipped</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
