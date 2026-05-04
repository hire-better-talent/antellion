import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { CreateScanForm } from "@/components/create-scan-form";
import { Card, CardBody } from "@antellion/ui";
import { createScan } from "@/app/(dashboard)/actions/scans";
import { getOrganizationId } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NewScanPage({ searchParams }: Props) {
  const organizationId = await getOrganizationId();
  const params = await searchParams;

  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      domain: true,
      queryClusters: {
        select: {
          id: true,
          name: true,
          reviewStatus: true,
          reviewedAt: true,
          createdAt: true,
          _count: { select: { queries: { where: { isActive: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      scanRuns: {
        select: {
          metadata: true,
        },
      },
      // Fetch the most recent role profile to auto-populate focus area
      roleProfiles: {
        select: { title: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const clientsWithCounts = clients.map((c) => {
    // Collect all cluster IDs that have been used in previous scans
    const scannedClusterIds = new Set<string>();
    for (const scan of c.scanRuns) {
      const meta = scan.metadata as Record<string, unknown> | null;
      const ids = meta?.queryClusterIds;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === "string") scannedClusterIds.add(id);
        }
      }
    }

    // Derive a focus area from the most recent role profile title.
    // The title is often something like "Senior Software Engineer" — strip
    // the seniority prefix to get a clean department-level label.
    const rawTitle = c.roleProfiles[0]?.title;
    const defaultFocusArea = rawTitle
      ? rawTitle
          .replace(
            /^(senior|junior|lead|principal|staff|associate|mid|entry.level)\s+/i,
            "",
          )
          .trim()
      : undefined;

    return {
      ...c,
      defaultFocusArea,
        queryClusters: c.queryClusters.map((qc) => ({
          id: qc.id,
          name: qc.name,
          reviewStatus: qc.reviewStatus,
          reviewedAt: qc.reviewedAt,
          queryCount: qc._count.queries,
          createdAt: qc.createdAt,
          scanned: scannedClusterIds.has(qc.id),
      })),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New scan"
        description="Select a client and query clusters to scan."
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
            <CreateScanForm
              action={createScan}
              clients={clientsWithCounts}
              preselectedClientId={params.clientId}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
