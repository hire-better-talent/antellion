import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { SummaryCard } from "@/components/summary-card";
import { RecentActivity } from "@/components/recent-activity";
import type { ActivityItem } from "@/components/recent-activity";
import { getOrganizationId } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, CardBody, Badge, StatusBadge } from "@antellion/ui";

export const dynamic = "force-dynamic";

// ── Status count pill ─────────────────────────────────────────────────────────

function StatusCount({
  label,
  count,
  variant = "default",
}: {
  label: string;
  count: number;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={variant}>{count}</Badge>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

// ── Attention item ────────────────────────────────────────────────────────────

type AttentionItem =
  | {
      kind: "result";
      id: string;
      scanRunId: string;
      queryText: string;
      clientName: string;
      status: string;
    }
  | {
      kind: "scan";
      id: string;
      clientName: string;
      resultCount: number;
      queryCount: number;
    }
  | {
      kind: "report";
      id: string;
      title: string;
      clientName: string;
    };

export default async function DashboardPage() {
  const organizationId = await getOrganizationId();

  const [
    clientCount,
    queryCount,
    reportCount,
    scanStatusCounts,
    reportStatusCounts,
    resultStatusCounts,
    needsReviewResults,
    runningScans,
    reviewReports,
    recentScans,
    recentReports,
  ] = await Promise.all([
    // Summary counts
    prisma.client.count({ where: { organizationId } }),
    prisma.query.count({
      where: { queryCluster: { client: { organizationId } } },
    }),
    prisma.report.count({
      where: { client: { organizationId } },
    }),

    // Scan status breakdown
    prisma.scanRun.groupBy({
      by: ["status"],
      where: { client: { organizationId } },
      _count: true,
    }),

    // Report status breakdown
    prisma.report.groupBy({
      by: ["status"],
      where: { client: { organizationId } },
      _count: true,
    }),

    // Result status breakdown
    prisma.scanResult.groupBy({
      by: ["status"],
      where: { scanRun: { client: { organizationId } } },
      _count: true,
    }),

    // Attention: results needing review
    prisma.scanResult.findMany({
      where: {
        status: "NEEDS_REVIEW",
        scanRun: { client: { organizationId } },
      },
      select: {
        id: true,
        scanRunId: true,
        status: true,
        query: { select: { text: true } },
        scanRun: { select: { client: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),

    // Attention: running scans
    prisma.scanRun.findMany({
      where: {
        status: "RUNNING",
        client: { organizationId },
      },
      select: {
        id: true,
        resultCount: true,
        queryCount: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),

    // Attention: reports in review
    prisma.report.findMany({
      where: {
        status: "REVIEW",
        client: { organizationId },
      },
      select: {
        id: true,
        title: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),

    // Recent activity
    prisma.scanRun.findMany({
      where: { client: { organizationId } },
      select: {
        id: true,
        status: true,
        queryCount: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.report.findMany({
      where: { client: { organizationId } },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Build status count maps
  const scanCounts = Object.fromEntries(
    scanStatusCounts.map((r) => [r.status, r._count]),
  );
  const reportCounts = Object.fromEntries(
    reportStatusCounts.map((r) => [r.status, r._count]),
  );
  const resultCounts = Object.fromEntries(
    resultStatusCounts.map((r) => [r.status, r._count]),
  );

  const totalScans = Object.values(scanCounts).reduce((a, b) => a + b, 0);

  // Build attention list in priority order
  const attentionItems: AttentionItem[] = [
    ...needsReviewResults.map(
      (r): AttentionItem => ({
        kind: "result",
        id: r.id,
        scanRunId: r.scanRunId,
        queryText: r.query.text,
        clientName: r.scanRun.client.name,
        status: r.status,
      }),
    ),
    ...runningScans.map(
      (s): AttentionItem => ({
        kind: "scan",
        id: s.id,
        clientName: s.client.name,
        resultCount: s.resultCount,
        queryCount: s.queryCount,
      }),
    ),
    ...reviewReports.map(
      (r): AttentionItem => ({
        kind: "report",
        id: r.id,
        title: r.title,
        clientName: r.client.name,
      }),
    ),
  ];

  // Recent activity feed
  const activity: ActivityItem[] = [
    ...recentScans.map((s) => {
      const t = timeAgo(s.createdAt);
      return {
        kind: "scan" as const,
        id: s.id,
        clientName: s.client.name,
        status: s.status,
        queryCount: s.queryCount,
        timestamp: t.label,
        _sortKey: t.sortKey,
      };
    }),
    ...recentReports.map((r) => {
      const t = timeAgo(r.createdAt);
      return {
        kind: "report" as const,
        id: r.id,
        clientName: r.client.name,
        title: r.title,
        status: r.status,
        timestamp: t.label,
        _sortKey: t.sortKey,
      };
    }),
  ]
    .sort((a, b) => a._sortKey - b._sortKey)
    .map(({ _sortKey: _, ...rest }) => rest);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="AI hiring visibility overview across all clients."
        action={
          <Link
            href="/clients/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add client
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Clients"
          value={clientCount}
          detail="Companies tracked"
        />
        <SummaryCard
          label="Scans"
          value={totalScans}
          detail="All time"
        />
        <SummaryCard
          label="Queries"
          value={queryCount}
          detail="Across all clusters"
        />
        <SummaryCard
          label="Reports"
          value={reportCount}
          detail="Generated to date"
        />
      </div>

      {/* Workflow status overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Scan status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Scans</h2>
              <Link
                href="/scans"
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <StatusCount
                label="Pending"
                count={scanCounts.PENDING ?? 0}
              />
              <StatusCount
                label="Running"
                count={scanCounts.RUNNING ?? 0}
                variant={scanCounts.RUNNING > 0 ? "warning" : "default"}
              />
              <StatusCount
                label="Completed"
                count={scanCounts.COMPLETED ?? 0}
                variant="success"
              />
              <StatusCount
                label="Failed"
                count={scanCounts.FAILED ?? 0}
                variant={scanCounts.FAILED > 0 ? "danger" : "default"}
              />
            </div>
          </CardBody>
        </Card>

        {/* Report status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Reports</h2>
              <Link
                href="/reports"
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <StatusCount
                label="Draft"
                count={reportCounts.DRAFT ?? 0}
              />
              <StatusCount
                label="In review"
                count={reportCounts.REVIEW ?? 0}
                variant={reportCounts.REVIEW > 0 ? "warning" : "default"}
              />
              <StatusCount
                label="Published"
                count={reportCounts.PUBLISHED ?? 0}
                variant="success"
              />
              <StatusCount
                label="Archived"
                count={reportCounts.ARCHIVED ?? 0}
              />
            </div>
          </CardBody>
        </Card>

        {/* Result review status */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">
              Result review
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <StatusCount
                label="Captured"
                count={resultCounts.CAPTURED ?? 0}
              />
              <StatusCount
                label="Needs review"
                count={resultCounts.NEEDS_REVIEW ?? 0}
                variant={resultCounts.NEEDS_REVIEW > 0 ? "warning" : "default"}
              />
              <StatusCount
                label="Approved"
                count={resultCounts.APPROVED ?? 0}
                variant="success"
              />
              <StatusCount
                label="Rejected"
                count={resultCounts.REJECTED ?? 0}
                variant={resultCounts.REJECTED > 0 ? "danger" : "default"}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Items needing attention */}
      {attentionItems.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">
              Needs attention
            </h2>
          </CardHeader>
          <ul className="divide-y divide-gray-100">
            {attentionItems.map((item) => {
              if (item.kind === "result") {
                return (
                  <li key={item.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.clientName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {item.queryText}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <Badge variant="warning">Review required</Badge>
                      <Link
                        href={`/scans/${item.scanRunId}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        View scan
                      </Link>
                    </div>
                  </li>
                );
              }

              if (item.kind === "scan") {
                return (
                  <li key={item.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.clientName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.resultCount} / {item.queryCount} results recorded
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <StatusBadge type="scan" status="RUNNING" />
                      <Link
                        href={`/scans/${item.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Continue
                      </Link>
                    </div>
                  </li>
                );
              }

              // report
              return (
                <li key={item.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.clientName}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <Badge variant="warning">Approve to publish</Badge>
                    <Link
                      href={`/reports/${item.id}`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Recent activity */}
      <RecentActivity items={activity} />
    </div>
  );
}
