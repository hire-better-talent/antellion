import Link from "next/link";
import { prisma } from "@antellion/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardBody, Badge } from "@antellion/ui";
import { getOrganizationId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const organizationId = await getOrganizationId();

  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      domain: true,
      industry: true,
      _count: { select: { competitors: true, scanRuns: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Companies you're tracking for AI hiring visibility."
        action={
          <Link
            href="/clients/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add client
          </Link>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add a client to begin analyzing their AI hiring visibility."
          actionLabel="Add client"
          actionHref="/clients/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody>
                  <h3 className="font-medium text-gray-900">{client.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{client.domain}</p>
                  {client.industry && (
                    <p className="mt-2 text-xs text-gray-400">
                      {client.industry}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Badge>{client._count.competitors} competitors</Badge>
                    <Badge>{client._count.scanRuns} scans</Badge>
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
