import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardBody, Badge } from "@antellion/ui";
import { DeleteButton } from "@/components/delete-button";
import {
  deleteQueryCluster,
  toggleQueryActive,
  deleteQuery,
} from "@/app/(dashboard)/actions/queries";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QueryClusterDetailPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  const cluster = await prisma.queryCluster.findFirst({
    where: { id, client: { organizationId } },
    include: {
      client: { select: { name: true } },
      roleProfile: { select: { title: true } },
      queries: {
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          text: true,
          intent: true,
          isActive: true,
          _count: { select: { scanResults: true } },
        },
      },
    },
  });

  if (!cluster) notFound();

  const activeCount = cluster.queries.filter((q) => q.isActive).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={cluster.name}
        description={
          `${cluster.client.name}` +
          (cluster.roleProfile ? ` · ${cluster.roleProfile.title}` : "")
        }
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/queries/${id}/add`}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add query
            </Link>
            <Link
              href={`/queries/${id}/edit`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Rename
            </Link>
            <DeleteButton
              action={deleteQueryCluster.bind(null, id)}
              confirmMessage={`Delete "${cluster.name}" and all its queries?`}
            />
          </div>
        }
      />

      {/* Cluster metadata */}
      {cluster.intent && (
        <div className="text-sm text-gray-500">{cluster.intent}</div>
      )}

      {/* Stats */}
      <div className="flex gap-4">
        <Badge>{cluster.queries.length} total</Badge>
        <Badge variant="success">{activeCount} active</Badge>
        {cluster.queries.length - activeCount > 0 && (
          <Badge>{cluster.queries.length - activeCount} inactive</Badge>
        )}
      </div>

      {/* Query list */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Queries</h2>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {cluster.queries.length === 0 ? (
            <CardBody>
              <p className="text-sm text-gray-500">
                No queries in this cluster.{" "}
                <Link
                  href={`/queries/${id}/add`}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  Add one.
                </Link>
              </p>
            </CardBody>
          ) : (
            cluster.queries.map((query) => {
              const cleanIntent = query.intent
                ?.replace(/\s*\[priority: \d+\]/, "")
                .trim();
              const priorityMatch = query.intent?.match(
                /\[priority: (\d+)\]/,
              );
              const priority = priorityMatch
                ? parseInt(priorityMatch[1], 10)
                : null;

              return (
                <div key={query.id} className="flex items-start gap-4 px-6 py-3">
                  {/* Toggle */}
                  <form
                    action={toggleQueryActive.bind(null, query.id, id)}
                    className="shrink-0 pt-0.5"
                  >
                    <button
                      type="submit"
                      title={query.isActive ? "Deactivate" : "Activate"}
                      className={`h-4 w-4 rounded border ${
                        query.isActive
                          ? "border-brand-600 bg-brand-600"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {query.isActive && (
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                  </form>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        query.isActive
                          ? "text-gray-900"
                          : "text-gray-400 line-through"
                      }`}
                    >
                      {query.text}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {cleanIntent && (
                        <span className="text-xs text-gray-400">
                          {cleanIntent}
                        </span>
                      )}
                      {priority !== null && (
                        <span
                          className={`rounded px-1 py-0.5 text-xs font-medium ${
                            priority >= 8
                              ? "bg-green-50 text-green-700"
                              : priority >= 6
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          P{priority}
                        </span>
                      )}
                      {query._count.scanResults > 0 && (
                        <span className="text-xs text-gray-400">
                          {query._count.scanResults} results
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/queries/${id}/queries/${query.id}/edit`}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Edit
                    </Link>
                    {query._count.scanResults === 0 ? (
                      <DeleteButton
                        action={deleteQuery.bind(null, query.id, id)}
                        confirmMessage={`Delete this query?`}
                        label="Remove"
                      />
                    ) : (
                      <span
                        className="text-xs text-gray-400"
                        title="Deactivate instead — this query has scan results"
                      >
                        Has results
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
