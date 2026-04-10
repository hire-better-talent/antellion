import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { SnapshotForm } from "@/components/snapshot-form";
import { Card, CardBody } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";

interface Props {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NewSnapshotPage({ searchParams }: Props) {
  const { clientId } = await searchParams;
  let prefill: {
    prospectName: string;
    prospectDomain: string;
    industry: string;
    nicheKeywords?: string;
    geography?: string;
    competitors: Array<{ name: string; domain: string }>;
  } | undefined;

  if (clientId) {
    const organizationId = await getOrganizationId();
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId },
      select: {
        name: true,
        domain: true,
        industry: true,
        nicheKeywords: true,
        headquarters: true,
        competitors: {
          select: { name: true, domain: true },
          orderBy: { createdAt: "asc" },
          take: 5,
        },
      },
    });

    if (client) {
      prefill = {
        prospectName: client.name,
        prospectDomain: client.domain,
        industry: client.industry ?? "",
        nicheKeywords: client.nicheKeywords ?? undefined,
        geography: client.headquarters ?? undefined,
        competitors: client.competitors.length > 0
          ? client.competitors
          : [{ name: "", domain: "" }, { name: "", domain: "" }],
      };
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New snapshot scan"
        description="Generate targeted queries and run an automated scan in one step."
      />

      <Card>
        <CardBody>
          <SnapshotForm prefill={prefill} />
        </CardBody>
      </Card>
    </div>
  );
}
