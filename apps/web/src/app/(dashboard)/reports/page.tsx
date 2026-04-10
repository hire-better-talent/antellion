import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardBody, StatusBadge, Badge } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const organizationId = await getOrganizationId();

  const reports = await prisma.report.findMany({
    where: { client: { organizationId } },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      client: { select: { name: true } },
      _count: { select: { recommendations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Executive audit reports with competitive visibility analysis."
        action={
          <Link
            href="/reports/generate"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Generate report
          </Link>
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Generate a report from completed scans to surface visibility gaps."
          actionLabel="Generate report"
          actionHref="/reports/generate"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-gray-900">
                        {report.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {report.client.name}
                        {" · "}
                        {formatDate(report.createdAt)}
                        {" · "}
                        <span>{report._count.recommendations} recommendations</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge type="report" status={report.status} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
