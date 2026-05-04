import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { QueryClusterForm } from "@/components/query-cluster-form";
import { Card, CardBody } from "@antellion/ui";
import { updateQueryCluster } from "@/app/(dashboard)/actions/queries";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditQueryClusterPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const cluster = await prisma.queryCluster.findFirst({
    where: { id, client: { organizationId } },
    select: {
      id: true,
      name: true,
      intent: true,
      reviewNotes: true,
      client: { select: { name: true } },
    },
  });

  if (!cluster) notFound();

  const updateAction = updateQueryCluster.bind(null, cluster.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Rename cluster`}
        description={`${cluster.client.name} · ${cluster.name}`}
      />
      <Card>
        <CardBody>
          <QueryClusterForm
            action={updateAction}
            defaultValues={{
              name: cluster.name,
              intent: cluster.intent,
              reviewNotes: cluster.reviewNotes,
            }}
            cancelHref={`/queries/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
