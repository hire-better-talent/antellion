import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardBody, Badge, StatusBadge } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// ─── Snapshot metadata shape ─────────────────────────────────

interface SnapshotSummaryMeta {
  hookHeadline?: string;
  findingStrength?: string;
  discoveryMentionCount?: number;
  discoveryQueryCount?: number;
}

function parseSnapshotSummary(metadata: unknown): SnapshotSummaryMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  const summary = meta.snapshotSummary;
  if (!summary || typeof summary !== "object") return null;
  const s = summary as Record<string, unknown>;

  const primaryHook =
    s.primaryHook && typeof s.primaryHook === "object"
      ? (s.primaryHook as Record<string, unknown>)
      : null;

  const discovery =
    s.discovery && typeof s.discovery === "object"
      ? (s.discovery as Record<string, unknown>)
      : null;

  return {
    hookHeadline:
      typeof primaryHook?.headline === "string" ? primaryHook.headline : undefined,
    findingStrength:
      typeof primaryHook?.findingStrength === "string"
        ? primaryHook.findingStrength
        : undefined,
    discoveryMentionCount:
      typeof s.discoveryMentionCount === "number" ? s.discoveryMentionCount : undefined,
    discoveryQueryCount:
      typeof discovery?.queriesRun === "number" ? discovery.queriesRun : undefined,
  };
}

// ─── Finding strength badge ──────────────────────────────────

function FindingStrengthBadge({ strength }: { strength: string }) {
  const lower = strength.toLowerCase();
  let variant: "success" | "warning" | "danger" | "default" = "default";
  if (lower === "strong") variant = "success";
  else if (lower === "moderate") variant = "warning";
  else if (lower === "weak") variant = "danger";

  return <Badge variant={variant}>{strength}</Badge>;
}

// ─── Page ────────────────────────────────────────────────────

export default async function SnapshotsPage() {
  const organizationId = await getOrganizationId();

  const snapshots = await prisma.scanRun.findMany({
    where: {
      client: { organizationId },
      queryDepth: "snapshot",
    },
    include: {
      client: {
        select: { id: true, name: true, domain: true, industry: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Snapshots"
        description="Quick AI visibility scans for cold outreach."
        action={
          <Link
            href="/snapshots/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New Snapshot
          </Link>
        }
      />

      {snapshots.length === 0 ? (
        <EmptyState
          title="No snapshots yet"
          description="Run your first snapshot scan to generate cold outreach findings."
          actionLabel="New Snapshot"
          actionHref="/snapshots/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snapshots.map((scan) => {
            const summary = parseSnapshotSummary(scan.metadata);
            const isCompleted = scan.status === "COMPLETED";

            return (
              <Link key={scan.id} href={`/snapshots/${scan.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody>
                    {/* Company header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-gray-900">
                          {scan.client.name}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-gray-500">
                          {scan.client.domain}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge type="scan" status={scan.status} />
                      </div>
                    </div>

                    {/* Industry */}
                    {scan.client.industry && (
                      <p className="mt-2 text-xs text-gray-400">
                        {scan.client.industry}
                      </p>
                    )}

                    {/* Completed findings */}
                    {isCompleted && summary ? (
                      <div className="mt-4 space-y-2.5">
                        {summary.hookHeadline && (
                          <p className="text-sm leading-snug text-gray-700">
                            {summary.hookHeadline}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {summary.findingStrength && (
                            <FindingStrengthBadge
                              strength={summary.findingStrength}
                            />
                          )}
                          {summary.discoveryMentionCount != null &&
                            summary.discoveryQueryCount != null && (
                              <span className="text-xs text-gray-500">
                                {summary.discoveryMentionCount}/
                                {summary.discoveryQueryCount} discovery queries
                              </span>
                            )}
                        </div>
                      </div>
                    ) : isCompleted ? (
                      <p className="mt-4 text-sm text-gray-400">
                        Findings processing.
                      </p>
                    ) : null}

                    {/* Date */}
                    <p className="mt-4 text-xs text-gray-400">
                      {formatDate(scan.createdAt)}
                    </p>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
