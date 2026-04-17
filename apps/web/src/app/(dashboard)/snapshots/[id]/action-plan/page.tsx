import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSnapshotActionPlan } from "@/app/(dashboard)/actions/snapshots";
import { getOrganizationId } from "@/lib/auth";
import { prisma } from "@antellion/db";
import { SnapshotActionPlanView } from "@/components/snapshot/action-plan/SnapshotActionPlanView";

// Belt-and-suspenders: not indexed, not linked from public surfaces.
// Actual access control is the org-scoped Prisma query in getSnapshotActionPlan.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SnapshotActionPlanPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  // Verify org membership before building the action plan.
  const scan = await prisma.scanRun.findFirst({
    where: { id, client: { organizationId }, queryDepth: "snapshot" },
    select: {
      id: true,
      client: { select: { name: true } },
      metadata: true,
    },
  });

  if (!scan) notFound();

  const meta = scan.metadata as Record<string, unknown> | null;
  const prospectName =
    (meta?.prospectName as string | undefined) ?? scan.client.name;

  let plan;
  try {
    plan = await getSnapshotActionPlan(id);
  } catch {
    // Summary not ready yet — scan may not be complete.
    notFound();
  }

  return (
    <SnapshotActionPlanView
      scanRunId={id}
      prospectName={prospectName}
      plan={plan}
    />
  );
}
