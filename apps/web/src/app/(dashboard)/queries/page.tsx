import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardHeader, CardBody, Badge } from "@antellion/ui";
import { DeleteButton } from "@/components/delete-button";
import { CopyButton } from "@/components/CopyButton";
import { deleteQueryCluster } from "@/app/(dashboard)/actions/queries";
import { getOrganizationId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QueriesPage() {
  const organizationId = await getOrganizationId();

  const clusters = await prisma.queryCluster.findMany({
    where: { client: { organizationId } },
    select: {
      id: true,
      name: true,
      intent: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      roleProfile: { select: { title: true } },
      queries: {
        select: { id: true, text: true, intent: true, isActive: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Query clusters"
        description="Candidate-intent queries grouped by theme. These drive your visibility scans."
        action={
          <Link
            href="/queries/generate"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Generate queries
          </Link>
        }
      />

      {clusters.length === 0 ? (
        <EmptyState
          title="No query clusters"
          description="Generate candidate-intent queries for a client to get started."
          actionLabel="Generate queries"
          actionHref="/queries/generate"
        />
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {cluster.name}
                      </h3>
                      <Badge>{cluster.queries.length} queries</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {cluster.client.name}
                      {cluster.roleProfile &&
                        ` · ${cluster.roleProfile.title}`}
                    </p>
                    {cluster.intent && (
                      <p className="mt-1 text-sm text-gray-400">
                        {cluster.intent}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/queries/${cluster.id}`}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      action={deleteQueryCluster.bind(null, cluster.id)}
                      confirmMessage={`Delete "${cluster.name}" and its ${cluster.queries.length} queries?`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-1.5">
                {cluster.queries.map((query) => {
                  // Extract priority from intent if present
                  const priorityMatch = query.intent?.match(
                    /\[priority: (\d+)\]/,
                  );
                  const priority = priorityMatch
                    ? parseInt(priorityMatch[1], 10)
                    : null;
                  const cleanIntent = query.intent
                    ?.replace(/\s*\[priority: \d+\]/, "")
                    .trim();

                  return (
                    <div
                      key={query.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p
                            className={`flex-1 ${
                              query.isActive
                                ? "text-gray-700"
                                : "text-gray-400 line-through"
                            }`}
                          >
                            {query.text}
                          </p>
                          <CopyButton text={query.text} />
                        </div>
                        {cleanIntent && (
                          <p className="text-xs text-gray-400">
                            {cleanIntent}
                          </p>
                        )}
                      </div>
                      {priority !== null && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                            priority >= 8
                              ? "bg-green-100 text-green-700"
                              : priority >= 6
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {priority}
                        </span>
                      )}
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
