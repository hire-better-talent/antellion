import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { ContentAssetForm } from "@/components/content-asset-form";
import { Card, CardBody } from "@antellion/ui";
import { createContentAsset } from "@/app/(dashboard)/actions/content";
import { getOrganizationId } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NewContentAssetPage({ searchParams }: Props) {
  const organizationId = await getOrganizationId();
  const params = await searchParams;

  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true, name: true, domain: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add content asset"
        description="Track a content asset that influences AI visibility for a client."
      />

      {clients.length === 0 ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          No clients found.{" "}
          <a href="/clients/new" className="font-medium underline">
            Add a client
          </a>{" "}
          first.
        </div>
      ) : (
        <Card>
          <CardBody>
            <ContentAssetForm
              action={createContentAsset}
              clients={clients}
              defaultValues={
                params.clientId
                  ? {
                      clientId: params.clientId,
                      url: "",
                      assetType: "",
                    }
                  : undefined
              }
              submitLabel="Add asset"
              cancelHref="/content"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
