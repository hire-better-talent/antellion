import { auth } from "@clerk/nextjs/server";
import { prisma } from "@antellion/db";
import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint — runs the exact DB queries the dashboard page makes,
 * one at a time, and reports which one fails. Helps pinpoint Prisma / schema
 * / connection issues on Vercel that don't surface locally.
 *
 * Remove this endpoint before launch. Temporary debugging only.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    step: "start",
    timestamp: new Date().toISOString(),
  };

  try {
    diagnostics.step = "auth";
    const { userId, orgId } = await auth();
    diagnostics.auth = { userId, orgId };
    if (!userId || !orgId) {
      return NextResponse.json(diagnostics, { status: 200 });
    }
    const organizationId = orgId;

    // Run each dashboard query individually, capturing its own error.
    const queries: Array<{ name: string; fn: () => Promise<unknown> }> = [
      { name: "client.count", fn: () => prisma.client.count({ where: { organizationId } }) },
      { name: "query.count", fn: () => prisma.query.count({ where: { queryCluster: { client: { organizationId } } } }) },
      { name: "report.count", fn: () => prisma.report.count({ where: { client: { organizationId } } }) },
      { name: "scanRun.groupBy", fn: () => prisma.scanRun.groupBy({ by: ["status"], where: { client: { organizationId } }, _count: true }) },
      { name: "report.groupBy", fn: () => prisma.report.groupBy({ by: ["status"], where: { client: { organizationId } }, _count: true }) },
      { name: "scanResult.groupBy", fn: () => prisma.scanResult.groupBy({ by: ["status"], where: { scanRun: { client: { organizationId } } }, _count: true }) },
      { name: "scanRun.findMany", fn: () => prisma.scanRun.findMany({ where: { client: { organizationId } }, take: 5, orderBy: { createdAt: "desc" } }) },
      { name: "report.findMany", fn: () => prisma.report.findMany({ where: { client: { organizationId } }, take: 5, orderBy: { createdAt: "desc" } }) },
      { name: "organization.upsert", fn: () => prisma.organization.upsert({ where: { id: organizationId }, update: {}, create: { id: organizationId, name: organizationId, slug: organizationId } }) },
      { name: "user.upsert", fn: () => prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, organizationId, email: `${userId}@clerk.placeholder`, name: userId, role: "ADMIN" } }) },
    ];

    const results: Array<{ name: string; ok: boolean; error?: string; elapsed_ms: number }> = [];
    for (const q of queries) {
      const start = Date.now();
      try {
        await q.fn();
        results.push({ name: q.name, ok: true, elapsed_ms: Date.now() - start });
      } catch (err) {
        results.push({
          name: q.name,
          ok: false,
          elapsed_ms: Date.now() - start,
          error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        });
      }
    }

    diagnostics.queries = results;
    diagnostics.step = "done";
    return NextResponse.json(diagnostics, { status: 200 });
  } catch (err) {
    diagnostics.error = {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 10) : undefined,
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
