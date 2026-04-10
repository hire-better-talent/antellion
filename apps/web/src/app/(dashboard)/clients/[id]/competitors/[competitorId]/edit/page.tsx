import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { CompetitorForm } from "@/components/competitor-form";
import { Card, CardBody } from "@antellion/ui";
import { updateCompetitor } from "@/app/(dashboard)/actions/competitors";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string; competitorId: string }>;
}

export default async function EditCompetitorPage({ params }: Props) {
  const { id, competitorId } = await params;
  const organizationId = await getOrganizationId();

  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, clientId: id, client: { organizationId } },
    select: {
      id: true,
      clientId: true,
      name: true,
      domain: true,
      industry: true,
      description: true,
      careerUrl: true,
    },
  });

  if (!competitor) notFound();

  const updateAction = updateCompetitor.bind(null, competitor.id, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${competitor.name}`}
        description={competitor.domain}
      />
      <Card>
        <CardBody>
          <CompetitorForm
            action={updateAction}
            defaultValues={competitor}
            submitLabel="Save changes"
            cancelHref={`/clients/${id}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
