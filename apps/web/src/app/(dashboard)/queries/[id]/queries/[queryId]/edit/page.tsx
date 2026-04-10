import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { QueryForm } from "@/components/query-form";
import { Card, CardBody } from "@antellion/ui";
import { updateQuery } from "@/app/(dashboard)/actions/queries";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string; queryId: string }>;
}

export default async function EditQueryPage({ params }: Props) {
  const { id: clusterId, queryId } = await params;
  const organizationId = await getOrganizationId();

  const query = await prisma.query.findFirst({
    where: {
      id: queryId,
      queryClusterId: clusterId,
      queryCluster: { client: { organizationId } },
    },
    select: {
      id: true,
      text: true,
      intent: true,
      queryCluster: {
        select: { id: true, name: true, client: { select: { name: true } } },
      },
    },
  });

  if (!query) notFound();

  const updateAction = updateQuery.bind(null, queryId, clusterId);

  // Strip the [priority: X] suffix from intent for editing
  const cleanIntent = query.intent
    ?.replace(/\s*\[priority: \d+\]/, "")
    .trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit query"
        description={`${query.queryCluster.client.name} · ${query.queryCluster.name}`}
      />
      <Card>
        <CardBody>
          <QueryForm
            action={updateAction}
            defaultValues={{ text: query.text, intent: cleanIntent }}
            submitLabel="Save changes"
            cancelHref={`/queries/${clusterId}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
