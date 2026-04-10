import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { GenerateReportForm } from "@/components/generate-report-form";
import { Card, CardBody } from "@antellion/ui";
import { generateReport } from "@/app/(dashboard)/actions/reports";
import { getOrganizationId } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function GenerateReportPage({ searchParams }: Props) {
  const organizationId = await getOrganizationId();
  const params = await searchParams;

  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      domain: true,
      scanRuns: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          queryCount: true,
          resultCount: true,
          focusArea: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const clientsForForm = clients.map((c) => ({
    ...c,
    scans: c.scanRuns.map((s) => ({
      id: s.id,
      queryCount: s.queryCount,
      resultCount: s.resultCount,
      focusArea: s.focusArea ?? undefined,
      createdAt: formatDate(s.createdAt),
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate report"
        description="Create an executive audit report from completed visibility scans."
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
            <GenerateReportForm
              action={generateReport}
              clients={clientsForForm}
              preselectedClientId={params.clientId}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
