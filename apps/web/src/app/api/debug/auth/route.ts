import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint — returns the raw auth() result plus the user's
 * org memberships, with all errors caught so we see exactly where the
 * auth flow is breaking on Vercel.
 *
 * Remove this endpoint before launch. Temporary debugging only.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    step: "start",
    timestamp: new Date().toISOString(),
  };

  try {
    diagnostics.step = "calling auth()";
    const authResult = await auth();
    diagnostics.auth = {
      userId: authResult.userId,
      orgId: authResult.orgId,
      orgRole: authResult.orgRole,
      sessionId: authResult.sessionId,
      actor: authResult.actor,
    };

    if (!authResult.userId) {
      diagnostics.step = "no userId — not signed in";
      return NextResponse.json(diagnostics, { status: 200 });
    }

    diagnostics.step = "calling clerkClient()";
    const client = await clerkClient();

    diagnostics.step = "fetching memberships";
    const memberships = await client.users.getOrganizationMembershipList({
      userId: authResult.userId,
    });

    diagnostics.memberships = memberships.data.map((m) => ({
      orgId: m.organization.id,
      orgName: m.organization.name,
      orgSlug: m.organization.slug,
      role: m.role,
    }));

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
