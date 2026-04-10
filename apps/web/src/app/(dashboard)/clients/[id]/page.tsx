import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardHeader, CardBody, Badge } from "@antellion/ui";
import { DeleteButton } from "@/components/delete-button";
import { deleteClient } from "@/app/(dashboard)/actions/clients";
import { deleteCompetitor } from "@/app/(dashboard)/actions/competitors";
import { deleteContentAsset } from "@/app/(dashboard)/actions/content";
import type { ContentAssetType } from "@antellion/db";
import { getOrganizationId } from "@/lib/auth";
import { GenerateStrategicQueriesButton } from "@/components/GenerateStrategicQueriesButton";

const assetTypeLabels: Record<ContentAssetType, string> = {
  CAREERS_PAGE: "Careers page",
  JOB_POSTING: "Job posting",
  BLOG_POST: "Blog post",
  PRESS_RELEASE: "Press release",
  SOCIAL_PROFILE: "Social profile",
  REVIEW_SITE: "Review site",
  OTHER: "Other",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const client = await prisma.client.findFirst({
    where: { id, organizationId },
    include: {
      competitors: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          domain: true,
          industry: true,
          description: true,
          careerUrl: true,
        },
      },
      contentAssets: {
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, title: true, assetType: true },
      },
      scanRuns: {
        where: { status: "COMPLETED" },
        take: 1,
        select: { id: true },
      },
      _count: {
        select: { scanRuns: true, queryClusters: true, reports: true },
      },
    },
  });

  if (!client) notFound();

  const latestSnapshot = await prisma.scanRun.findFirst({
    where: { clientId: id, queryDepth: "snapshot", status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const hasCompletedScan = client.scanRuns.length > 0;
  const hasCompetitors = client.competitors.length > 0;
  const showStrategicQueriesButton = hasCompletedScan && hasCompetitors;

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={client.name}
        description={client.domain}
        action={
          <div className="flex items-center gap-3">
            {latestSnapshot && (
              <Link
                href={`/snapshots/${latestSnapshot.id}`}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Snapshot
              </Link>
            )}
            <Link
              href={`/snapshots/new?clientId=${id}`}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Run snapshot
            </Link>
            <Link
              href={`/scans/new?clientId=${id}`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Start scan
            </Link>
            <Link
              href={`/queries/generate?clientId=${id}`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Generate queries
            </Link>
            {showStrategicQueriesButton && (
              <GenerateStrategicQueriesButton clientId={id} />
            )}
            <Link
              href={`/clients/${id}/edit`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <DeleteButton
              action={deleteClient.bind(null, id)}
              confirmMessage={`Delete ${client.name}? This will remove all competitors, scans, and reports associated with this client.`}
            />
          </div>
        }
      />

      {/* Details */}
      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Industry</p>
              <p className="mt-1 text-sm text-gray-900">
                {client.industry || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Career site</p>
              <p className="mt-1 text-sm text-gray-900">
                {client.careerUrl ? (
                  <a
                    href={client.careerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700 underline"
                  >
                    {client.careerUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Query clusters</p>
              <p className="mt-1 text-sm text-gray-900">
                {client._count.queryClusters}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Scans / Reports</p>
              <p className="mt-1 text-sm text-gray-900">
                {client._count.scanRuns} / {client._count.reports}
              </p>
            </div>
          </div>
          {client.description && (
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                {client.description}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Competitors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Competitors</h2>
            <p className="text-sm text-gray-500">
              Companies competing for the same talent pool.
            </p>
          </div>
          <Link
            href={`/clients/${id}/competitors/new`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add competitor
          </Link>
        </div>

        {client.competitors.length === 0 ? (
          <EmptyState
            title="No competitors yet"
            description="Add competitors to compare AI visibility across the talent market."
            actionLabel="Add competitor"
            actionHref={`/clients/${id}/competitors/new`}
          />
        ) : (
          <div className="space-y-3">
            {client.competitors.map((comp) => (
              <Card key={comp.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {comp.name}
                        </h3>
                        {comp.industry && (
                          <Badge>{comp.industry}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {comp.domain}
                        {comp.careerUrl && (
                          <span className="ml-2 text-gray-400">
                            &middot;{" "}
                            <a
                              href={comp.careerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-gray-600 underline"
                            >
                              careers
                            </a>
                          </span>
                        )}
                      </p>
                      {comp.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {comp.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/clients/${id}/competitors/${comp.id}/edit`}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        action={deleteCompetitor.bind(null, comp.id, id)}
                        confirmMessage={`Remove ${comp.name} as a competitor?`}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Content assets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Content assets
            </h2>
            <p className="text-sm text-gray-500">
              Tracked content that influences AI visibility and report
              recommendations.
            </p>
          </div>
          <Link
            href={`/content/new?clientId=${id}`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add asset
          </Link>
        </div>

        {client.contentAssets.length === 0 ? (
          <EmptyState
            title="No content assets"
            description="Add careers pages, blog posts, and other assets. These feed into report recommendations."
            actionLabel="Add asset"
            actionHref={`/content/new?clientId=${id}`}
          />
        ) : (
          <div className="space-y-3">
            {client.contentAssets.map((asset) => (
              <Card key={asset.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {asset.title ?? "Untitled"}
                        </h3>
                        <Badge>{assetTypeLabels[asset.assetType]}</Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {asset.url}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/content/${asset.id}`}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </Link>
                      <DeleteButton
                        action={deleteContentAsset.bind(null, asset.id)}
                        confirmMessage={`Delete ${asset.title ?? "this asset"}?`}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
