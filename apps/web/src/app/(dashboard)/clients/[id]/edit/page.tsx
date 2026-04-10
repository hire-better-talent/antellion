import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/client-form";
import { Card, CardBody } from "@antellion/ui";
import { updateClient } from "@/app/(dashboard)/actions/clients";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const client = await prisma.client.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      name: true,
      domain: true,
      industry: true,
      description: true,
      nicheKeywords: true,
      careerUrl: true,
      employeeCount: true,
      headquarters: true,
      additionalLocations: true,
      publiclyTraded: true,
      revenueScale: true,
      knownFor: true,
    },
  });

  if (!client) notFound();

  const updateAction = updateClient.bind(null, client.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${client.name}`}
        description={client.domain}
      />
      <Card>
        <CardBody>
          <ClientForm
            action={updateAction}
            defaultValues={client}
            submitLabel="Save changes"
            cancelHref={`/clients/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
