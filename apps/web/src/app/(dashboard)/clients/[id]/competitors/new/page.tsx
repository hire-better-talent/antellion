import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { CompetitorForm } from "@/components/competitor-form";
import { Card, CardBody } from "@antellion/ui";
import { createCompetitor } from "@/app/(dashboard)/actions/competitors";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewCompetitorPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const client = await prisma.client.findFirst({
    where: { id, organizationId },
    select: { id: true, name: true },
  });

  if (!client) notFound();

  const createAction = createCompetitor.bind(null, client.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add competitor"
        description={`Add a competitor for ${client.name}.`}
      />
      <Card>
        <CardBody>
          <CompetitorForm
            action={createAction}
            submitLabel="Add competitor"
            cancelHref={`/clients/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
