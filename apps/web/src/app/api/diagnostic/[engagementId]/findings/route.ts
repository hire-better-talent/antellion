import { NextResponse } from "next/server";
import { prisma } from "@antellion/db";
import { getOrganizationId } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const { engagementId } = await params;
    const organizationId = await getOrganizationId();

    const engagement = await prisma.engagement.findFirst({
      where: { id: engagementId, organizationId },
      select: { id: true },
    });

    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found." }, { status: 404 });
    }

    const findings = await prisma.finding.findMany({
      where: { engagementId },
      select: {
        id: true,
        index: true,
        namedIssue: true,
        narrative: true,
        actionableCategory: true,
        stage: true,
        modelName: true,
        status: true,
        evidenceScanResultIds: true,
        evidenceCitations: true,
      },
      orderBy: [{ status: "asc" }, { index: "asc" }],
    });

    return NextResponse.json({ findings });
  } catch {
    return NextResponse.json({ error: "Unauthorized or server error." }, { status: 500 });
  }
}
