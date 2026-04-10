import { prisma } from "@antellion/db";

/**
 * Returns the current organization ID.
 *
 * TODO: Replace with real auth session lookup.
 * For now, uses the first organization in the database (created by seed).
 */
export async function getOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    select: { id: true },
  });

  if (!org) {
    throw new Error(
      "No organization found. Run `pnpm db:seed` to create demo data.",
    );
  }

  return org.id;
}

/**
 * Verifies a client belongs to the current organization.
 * Throws if not found (fail closed).
 */
export async function requireOrgClient(
  clientId: string,
  organizationId: string,
): Promise<{ id: string }> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) throw new Error("Client not found.");
  return client;
}

/**
 * Verifies a scan run belongs to the current organization (via its client).
 * Throws if not found (fail closed).
 */
export async function requireOrgScan(
  scanId: string,
  organizationId: string,
): Promise<{ id: string; status: string; clientId: string }> {
  const scan = await prisma.scanRun.findFirst({
    where: { id: scanId, client: { organizationId } },
    select: { id: true, status: true, clientId: true },
  });
  if (!scan) throw new Error("Scan not found.");
  return scan;
}

/**
 * Verifies a competitor belongs to the current organization (via its client).
 * Throws if not found (fail closed).
 */
export async function requireOrgCompetitor(
  competitorId: string,
  organizationId: string,
): Promise<{ id: string; clientId: string }> {
  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, client: { organizationId } },
    select: { id: true, clientId: true },
  });
  if (!competitor) throw new Error("Competitor not found.");
  return competitor;
}

/**
 * Verifies a content asset belongs to the current organization (via its client).
 * Throws if not found (fail closed).
 */
export async function requireOrgContentAsset(
  contentAssetId: string,
  organizationId: string,
): Promise<{ id: string; clientId: string }> {
  const asset = await prisma.contentAsset.findFirst({
    where: { id: contentAssetId, client: { organizationId } },
    select: { id: true, clientId: true },
  });
  if (!asset) throw new Error("Content asset not found.");
  return asset;
}

/**
 * Verifies a query cluster belongs to the current organization (via its client).
 * Throws if not found (fail closed).
 */
export async function requireOrgQueryCluster(
  clusterId: string,
  organizationId: string,
): Promise<{ id: string; clientId: string }> {
  const cluster = await prisma.queryCluster.findFirst({
    where: { id: clusterId, client: { organizationId } },
    select: { id: true, clientId: true },
  });
  if (!cluster) throw new Error("Query cluster not found.");
  return cluster;
}

/**
 * Verifies a query belongs to the current organization
 * (via query → queryCluster → client → organization).
 * Throws if not found (fail closed).
 */
export async function requireOrgQuery(
  queryId: string,
  organizationId: string,
): Promise<{ id: string; queryClusterId: string }> {
  const query = await prisma.query.findFirst({
    where: { id: queryId, queryCluster: { client: { organizationId } } },
    select: { id: true, queryClusterId: true },
  });
  if (!query) throw new Error("Query not found.");
  return query;
}
