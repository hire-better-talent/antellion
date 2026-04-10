import { notFound } from "next/navigation";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { RecordResultForm } from "@/components/record-result-form";
import { Card, CardBody } from "@antellion/ui";
import { recordResult } from "@/app/(dashboard)/actions/scans";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string; queryId: string }>;
}

export default async function RecordResultPage({ params }: Props) {
  const { id: scanRunId, queryId } = await params;
  const organizationId = await getOrganizationId();

  const [scan, query] = await Promise.all([
    prisma.scanRun.findFirst({
      where: { id: scanRunId, client: { organizationId } },
      select: {
        id: true,
        status: true,
        client: { select: { name: true } },
      },
    }),
    prisma.query.findFirst({
      where: { id: queryId, queryCluster: { client: { organizationId } } },
      select: {
        id: true,
        text: true,
        intent: true,
        queryCluster: { select: { name: true } },
      },
    }),
  ]);

  if (!scan || !query) notFound();
  if (scan.status !== "RUNNING") notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record result"
        description={`${scan.client.name} — ${query.queryCluster.name}`}
      />
      <Card>
        <CardBody>
          <RecordResultForm
            action={recordResult}
            scanRunId={scanRunId}
            queryId={queryId}
            queryText={query.text}
            cancelHref={`/scans/${scanRunId}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}
