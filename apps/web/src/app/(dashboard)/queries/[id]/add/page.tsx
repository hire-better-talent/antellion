import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { QueryForm } from "@/components/query-form";
import { Card, CardBody } from "@antellion/ui";
import { addQuery } from "@/app/(dashboard)/actions/queries";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AddQueryPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const cluster = await prisma.queryCluster.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, name: true, client: { select: { name: true } } },
  });

  if (!cluster) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add query"
        description={`${cluster.client.name} · ${cluster.name}`}
      />
      <Card>
        <CardBody>
          <QueryForm
            action={addQuery}
            queryClusterId={cluster.id}
            submitLabel="Add query"
            cancelHref={`/queries/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
