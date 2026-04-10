import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { ContentAssetForm } from "@/components/content-asset-form";
import { Card, CardBody } from "@antellion/ui";
import { updateContentAsset } from "@/app/(dashboard)/actions/content";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditContentAssetPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const asset = await prisma.contentAsset.findFirst({
    where: { id, client: { organizationId } },
    select: {
      id: true,
      url: true,
      title: true,
      assetType: true,
      content: true,
      client: { select: { name: true } },
    },
  });

  if (!asset) notFound();

  const updateAction = updateContentAsset.bind(null, asset.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${asset.title ?? "content asset"}`}
        description={`${asset.client.name} · ${asset.url}`}
      />
      <Card>
        <CardBody>
          <ContentAssetForm
            action={updateAction}
            defaultValues={{
              url: asset.url,
              title: asset.title,
              assetType: asset.assetType,
              content: asset.content,
            }}
            submitLabel="Save changes"
            cancelHref={`/content/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
