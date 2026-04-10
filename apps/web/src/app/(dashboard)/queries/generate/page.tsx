import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { GenerateQueriesForm } from "@/components/generate-queries-form";
import { Card, CardBody } from "@antellion/ui";
import { generateQueries } from "@/app/(dashboard)/actions/queries";
import { getOrganizationId } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function GenerateQueriesPage({ searchParams }: Props) {
  const organizationId = await getOrganizationId();
  const params = await searchParams;

  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      domain: true,
      nicheKeywords: true,
      industry: true,
      description: true,
      knownFor: true,
      revenueScale: true,
      headquarters: true,
      employeeCount: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate queries"
        description="Create candidate-intent and employer-brand queries for a client. Queries are automatically clustered by theme and prioritized."
      />

      {clients.length === 0 ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          No clients found. <a href="/clients/new" className="font-medium underline">Add a client</a> first.
        </div>
      ) : (
        <Card>
          <CardBody>
            <GenerateQueriesForm
              action={generateQueries}
              clients={clients}
              preselectedClientId={params.clientId}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
