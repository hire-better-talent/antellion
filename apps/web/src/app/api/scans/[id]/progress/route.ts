import { NextResponse } from "next/server";
import { prisma } from "@antellion/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const scan = await prisma.scanRun.findUnique({
    where: { id },
    select: {
      resultCount: true,
      queryCount: true,
      status: true,
    },
  });

  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    resultCount: scan.resultCount,
    queryCount: scan.queryCount,
    status: scan.status,
  });
}
