import Link from "next/link";
import type { ContentAssetType } from "@antellion/db";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardBody, Badge } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const assetTypeLabels: Record<ContentAssetType, string> = {
  CAREERS_PAGE: "Careers page",
  JOB_POSTING: "Job posting",
  BLOG_POST: "Blog post",
  PRESS_RELEASE: "Press release",
  SOCIAL_PROFILE: "Social profile",
  REVIEW_SITE: "Review site",
  OTHER: "Other",
};

export default async function ContentPage() {
  const organizationId = await getOrganizationId();

  const assets = await prisma.contentAsset.findMany({
    where: { client: { organizationId } },
    select: {
      id: true,
      url: true,
      title: true,
      assetType: true,
      lastCrawled: true,
      createdAt: true,
      client: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content"
        description="Tracked content assets that influence AI visibility and report recommendations."
        action={
          <Link
            href="/content/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add asset
          </Link>
        }
      />

      {assets.length === 0 ? (
        <EmptyState
          title="No content tracked"
          description="Add careers pages, blog posts, and other assets to improve report recommendations."
          actionLabel="Add asset"
          actionHref="/content/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Link key={asset.id} href={`/content/${asset.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-gray-900">
                        {asset.title ?? "Untitled"}
                      </h3>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {asset.client.name}
                      </p>
                    </div>
                    <Badge>{assetTypeLabels[asset.assetType]}</Badge>
                  </div>
                  <p className="mt-2 truncate text-xs text-gray-400">
                    {asset.url}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Added {formatDate(asset.createdAt)}
                    {asset.lastCrawled &&
                      ` · Crawled ${formatDate(asset.lastCrawled)}`}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
