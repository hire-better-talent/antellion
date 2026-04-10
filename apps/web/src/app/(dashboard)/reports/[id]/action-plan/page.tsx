import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@antellion/db";
import { buildOperatorActionPlan } from "@antellion/core";
import { getOrganizationId } from "@/lib/auth";
import { OperatorActionPlanView } from "@/components/report/action-plan/OperatorActionPlanView";

// Prevent search engine indexing — belt-and-suspenders.
// The actual access control is the org-scoped Prisma query below.
// Do not treat this meta tag as a security mechanism.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ActionPlanPage({ params }: Props) {
  const { id } = await params;
  const organizationId = await getOrganizationId();

  // Org-scoped fetch — same pattern as the report detail page.
  // If the report doesn't exist or belongs to a different org, notFound().
  // TODO: When multi-org auth ships, add a per-user role check here:
  // only users with role === "OPERATOR" or role === "OWNER" should see this tab.
  const report = await prisma.report.findFirst({
    where: { id, client: { organizationId } },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          contentAssets: { select: { url: true } },
        },
      },
    },
  });

  if (!report) notFound();

  // Extract content asset domains for trigger flag computation.
  const contentAssetDomains = report.client.contentAssets
    .map((a) => {
      try {
        return new URL(a.url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  // Build the action plan purely from existing report metadata —
  // no new LLM calls, no DB writes, no stored artifact.
  const plan = buildOperatorActionPlan({
    reportId: id,
    clientName: report.client.name,
    metadata: (report.metadata ?? {}) as Parameters<
      typeof buildOperatorActionPlan
    >[0]["metadata"],
    contentAssetDomains,
  });

  return (
    <OperatorActionPlanView
      reportId={id}
      reportTitle={report.title}
      plan={plan}
    />
  );
}
