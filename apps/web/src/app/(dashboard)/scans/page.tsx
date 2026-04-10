import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, StatusBadge } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const organizationId = await getOrganizationId();

  const scanRuns = await prisma.scanRun.findMany({
    where: { client: { organizationId } },
    select: {
      id: true,
      status: true,
      model: true,
      queryCount: true,
      resultCount: true,
      createdAt: true,
      client: { select: { name: true } },
      results: {
        select: {
          mentioned: true,
          visibilityScore: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scans"
        description="Visibility scan history across all clients."
        action={
          <Link
            href="/scans/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New scan
          </Link>
        }
      />

      {scanRuns.length === 0 ? (
        <EmptyState
          title="No scans yet"
          description="Start a visibility scan to evaluate how a client appears in AI responses."
          actionLabel="New scan"
          actionHref="/scans/new"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                  <th className="px-6 py-3 font-medium text-right">Mention rate</th>
                  <th className="px-6 py-3 font-medium text-right">Avg visibility</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scanRuns.map((scan) => {
                  const mentionCount = scan.results.filter((r) => r.mentioned).length;
                  const mentionRate = scan.results.length > 0
                    ? Math.round((mentionCount / scan.results.length) * 100)
                    : null;
                  const visScores = scan.results
                    .map((r) => r.visibilityScore)
                    .filter((v): v is number => v != null);
                  const avgVis = visScores.length > 0
                    ? Math.round(visScores.reduce((a, b) => a + b, 0) / visScores.length)
                    : null;

                  return (
                    <tr key={scan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {scan.client.name}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge type="scan" status={scan.status} />
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {scan.resultCount} / {scan.queryCount}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {mentionRate != null ? (
                          <span className={mentionRate >= 70 ? "text-green-700" : mentionRate >= 40 ? "text-yellow-700" : "text-red-700"}>
                            {mentionRate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {avgVis != null ? (
                          <span className={avgVis >= 50 ? "text-green-700" : avgVis > 0 ? "text-yellow-700" : "text-gray-500"}>
                            {avgVis}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(scan.createdAt)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/scans/${scan.id}`}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
