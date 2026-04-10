import { notFound } from "next/navigation";
import Link from "next/link";
import type { ContentAssetType } from "@antellion/db";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, Badge } from "@antellion/ui";
import { DeleteButton } from "@/components/delete-button";
import { deleteContentAsset } from "@/app/(dashboard)/actions/content";
import { formatDate } from "@/lib/format";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

const assetTypeLabels: Record<ContentAssetType, string> = {
  CAREERS_PAGE: "Careers page",
  JOB_POSTING: "Job posting",
  BLOG_POST: "Blog post",
  PRESS_RELEASE: "Press release",
  SOCIAL_PROFILE: "Social profile",
  REVIEW_SITE: "Review site",
  OTHER: "Other",
};

export default async function ContentAssetDetailPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const asset = await prisma.contentAsset.findFirst({
    where: { id, client: { organizationId } },
    include: {
      client: { select: { id: true, name: true, domain: true } },
    },
  });

  if (!asset) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={asset.title ?? "Untitled asset"}
        description={`${asset.client.name} · ${assetTypeLabels[asset.assetType]}`}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/content/${id}/edit`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <DeleteButton
              action={deleteContentAsset.bind(null, id)}
              confirmMessage={`Delete this content asset?`}
            />
          </div>
        }
      />

      <Card>
        <CardBody className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Client</p>
              <Link
                href={`/clients/${asset.client.id}`}
                className="mt-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {asset.client.name}
              </Link>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Asset type</p>
              <div className="mt-1">
                <Badge>{assetTypeLabels[asset.assetType]}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Added</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(asset.createdAt)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">URL</p>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-brand-600 hover:text-brand-700"
            >
              {asset.url}
            </a>
          </div>

          {asset.lastCrawled && (
            <div>
              <p className="text-sm font-medium text-gray-500">Last crawled</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(asset.lastCrawled)}
              </p>
            </div>
          )}

          {asset.content && (
            <div>
              <p className="text-sm font-medium text-gray-500">
                Content / Notes
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                {asset.content}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Report impact note */}
      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Content assets influence report recommendations. The report composer
        checks for careers pages, blog posts, and social profiles to determine
        whether to recommend content improvements.
      </div>
    </div>
  );
}
