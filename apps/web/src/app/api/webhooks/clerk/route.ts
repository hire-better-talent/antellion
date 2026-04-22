import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@antellion/db";
import type { UserRole } from "@antellion/db";

// ── Clerk webhook event types (minimal — only the fields we use) ────────────

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ClerkOrganizationData {
  id: string;
  name: string;
  slug: string | null;
}

interface ClerkOrganizationMembershipData {
  organization: { id: string };
  public_user_data: { user_id: string };
  role: string;
}

type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserData }
  | { type: "user.updated"; data: ClerkUserData }
  | { type: "organization.created"; data: ClerkOrganizationData }
  | { type: "organizationMembership.created"; data: ClerkOrganizationMembershipData }
  | { type: string; data: unknown };

// ── Role mapping ─────────────────────────────────────────────────────────────

function mapClerkRole(clerkRole: string | null | undefined): UserRole {
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

// ── Helper: resolve primary email ────────────────────────────────────────────

function resolvePrimaryEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? "unknown@example.com";
}

function resolveDisplayName(data: ClerkUserData): string {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : data.id;
}

// ── Webhook route ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Read the raw body and headers for svix verification
  const body = await req.text();
  const headerPayload = await headers();

  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Signature verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error("[clerk-webhook] Handler error for event", event.type, err);
    return new Response("Internal error processing webhook", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleEvent(event: ClerkWebhookEvent): Promise<void> {
  switch (event.type) {
    case "user.created": {
      const data = event.data as ClerkUserData;
      const email = resolvePrimaryEmail(data);
      const name = resolveDisplayName(data);

      // user.created fires before organizationMembership.created, so we may
      // not have an org yet. Upsert without organizationId for now — the
      // membership event will set it, and the lazy upsert in getAuthContext
      // covers any remaining gap.
      //
      // To satisfy the FK constraint, we only create the user row if we can
      // find an organization to attach it to. If no org exists yet, the
      // membership event (or getAuthContext lazy upsert) will create the row.
      const anyOrg = await prisma.organization.findFirst({ select: { id: true } });
      if (anyOrg) {
        await prisma.user.upsert({
          where: { id: data.id },
          update: { email, name },
          create: {
            id: data.id,
            organizationId: anyOrg.id,
            email,
            name,
            role: "MEMBER",
          },
        });
      }
      break;
    }

    case "user.updated": {
      const data = event.data as ClerkUserData;
      const email = resolvePrimaryEmail(data);
      const name = resolveDisplayName(data);

      // Only update if the row exists (it may not yet if user.created beat us
      // here before the org was created, which is handled by getAuthContext).
      await prisma.user.updateMany({
        where: { id: data.id },
        data: { email, name },
      });
      break;
    }

    case "organization.created": {
      const data = event.data as ClerkOrganizationData;
      await prisma.organization.upsert({
        where: { id: data.id },
        update: { name: data.name, slug: data.slug ?? data.id },
        create: { id: data.id, name: data.name, slug: data.slug ?? data.id },
      });
      break;
    }

    case "organizationMembership.created": {
      const data = event.data as ClerkOrganizationMembershipData;
      const orgId = data.organization.id;
      const userId = data.public_user_data.user_id;
      const role = mapClerkRole(data.role);

      // Ensure org shadow row exists (webhook delivery order is not guaranteed)
      await prisma.organization.upsert({
        where: { id: orgId },
        update: {},
        create: { id: orgId, name: orgId, slug: orgId },
      });

      // Upsert the user with org membership and role.
      // email/name will be filled by user.created; use placeholders if that
      // event hasn't fired yet.
      await prisma.user.upsert({
        where: { id: userId },
        update: { organizationId: orgId, role },
        create: {
          id: userId,
          organizationId: orgId,
          // Unique placeholder until user.updated fires with real email.
          email: `${userId}@clerk.placeholder`,
          name: userId,
          role,
        },
      });
      break;
    }

    default:
      // Silently ignore unhandled events (user.deleted, organization.deleted, etc.)
      break;
  }
}
