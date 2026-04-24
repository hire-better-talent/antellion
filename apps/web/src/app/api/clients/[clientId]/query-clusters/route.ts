import { NextResponse } from "next/server";
import { prisma } from "@antellion/db";
import { getOrganizationId } from "@/lib/auth";

/**
 * GET /api/clients/[clientId]/query-clusters
 *
 * Returns the query clusters for a client, grouped by journey stage.
 * Used by the diagnostic scan-trigger panel to let operators pick clusters.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const organizationId = await getOrganizationId();

    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const clusters = await prisma.queryCluster.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        intent: true,
        stage: true,
        queries: { select: { id: true }, where: { isActive: true } },
      },
      orderBy: [{ stage: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ clusters });
  } catch {
    return NextResponse.json({ error: "Unauthorized or server error." }, { status: 500 });
  }
}
