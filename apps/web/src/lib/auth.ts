import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@antellion/db";

// ── Auth context ─────────────────────────────────────────────

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
};

/**
 * Resolves the current authenticated user and organization from Clerk.
 *
 * Performs a lazy upsert of both the Organization and User shadow rows in
 * Prisma on every call. This covers webhook delivery race conditions: if
 * user.created fires after the first page load, the row will still exist.
 *
 * If Clerk returns no active organization on the session (common right after
 * sign-in on a fresh domain, where active-org state has not yet been set),
 * falls back to the user's first organization membership. For single-org
 * users (Antellion's default case) this resolves transparently. If the user
 * has zero memberships, throws "No organization" so the caller can redirect
 * to an onboarding flow.
 *
 * Throws "Unauthorized" if userId is absent (unauthenticated request that
 * slipped past middleware — should not happen in practice).
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  let activeOrgId = orgId;
  let activeOrgRole: string | null | undefined = orgRole;

  // Fallback: look up first org membership if session has no active org.
  if (!activeOrgId) {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
    });
    const first = memberships.data[0];
    if (!first) {
      throw new Error(
        "No organization. User must be a member of at least one organization.",
      );
    }
    activeOrgId = first.organization.id;
    activeOrgRole = first.role;
  }

  const role = mapClerkRole(activeOrgRole);

  // Lazy upsert: ensure shadow rows exist before any FK write.
  // Organization first (User.organizationId FK requires it to exist).
  await prisma.organization.upsert({
    where: { id: activeOrgId },
    update: {},
    create: { id: activeOrgId, name: activeOrgId, slug: activeOrgId },
  });

  await prisma.user.upsert({
    where: { id: userId },
    update: { role },
    create: {
      id: userId,
      organizationId: activeOrgId,
      // Unique placeholder until webhook delivers the real email.
      // The webhook handler's user.updated event will overwrite this.
      email: `${userId}@clerk.placeholder`,
      name: userId,
      role,
    },
  });

  return { userId, organizationId: activeOrgId, role };
}

/**
 * Maps a Clerk org role string to the Prisma UserRole enum value.
 * Falls back to MEMBER for any unrecognized or absent role.
 */
function mapClerkRole(
  clerkRole: string | null | undefined,
): AuthContext["role"] {
  switch (clerkRole) {
    case "org:admin":
      return "ADMIN";
    case "org:owner":
      return "OWNER";
    case "org:viewer":
      return "VIEWER";
    default:
      return "MEMBER";
  }
}

/**
 * Convenience wrapper for page server components that only need the org ID.
 * Delegates to getAuthContext so all auth flows through a single path.
 */
export async function getOrganizationId(): Promise<string> {
  const { organizationId } = await getAuthContext();
  return organizationId;
}

// ── Org-scoped resource guards ───────────────────────────────
//
// These helpers verify that a given resource belongs to the current
// organization. All return the queried record on success and throw
// (fail closed) if the resource is missing or out of scope.
//
// They accept organizationId from the caller (resolved via getAuthContext)
// so they do not call auth() a second time — keeping each action to one
// auth round-trip.

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
