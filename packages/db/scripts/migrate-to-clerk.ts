/**
 * One-shot migration: swap cuid-based Organization and User IDs to Clerk IDs.
 *
 * Run AFTER populating .env.local with Clerk seed values:
 *   CLERK_SEED_USER_ID   — your Clerk user ID   (e.g. user_2aB3cD...)
 *   CLERK_SEED_ORG_ID    — your Clerk org ID    (e.g. org_2xY9zA...)
 *   CLERK_SEED_USER_EMAIL — your email address
 *
 * Usage:
 *   # Back up the database first:
 *   pg_dump "$DATABASE_URL" > dev-backup-pre-clerk.sql
 *
 *   # Then run the migration:
 *   pnpm tsx packages/db/scripts/migrate-to-clerk.ts
 *
 * This is ONE-WAY and irreversible without the backup. Back up first.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clerkUserId = process.env.CLERK_SEED_USER_ID;
  const clerkOrgId = process.env.CLERK_SEED_ORG_ID;
  const clerkUserEmail = process.env.CLERK_SEED_USER_EMAIL;

  if (!clerkUserId || !clerkOrgId || !clerkUserEmail) {
    console.error(
      "ERROR: CLERK_SEED_USER_ID, CLERK_SEED_ORG_ID, and CLERK_SEED_USER_EMAIL must all be set in your environment.",
    );
    process.exit(1);
  }

  console.log("Starting Clerk ID migration...");
  console.log(`  Clerk org ID:   ${clerkOrgId}`);
  console.log(`  Clerk user ID:  ${clerkUserId}`);
  console.log(`  Clerk email:    ${clerkUserEmail}`);

  // Find the existing (cuid-based) org and user
  const existingOrg = await prisma.organization.findFirst({
    where: { id: { not: clerkOrgId } },
    select: { id: true, name: true, slug: true },
  });

  const existingUser = await prisma.user.findFirst({
    where: { id: { not: clerkUserId } },
    select: { id: true },
  });

  if (!existingOrg) {
    console.log("No existing cuid-based organization found. Nothing to migrate.");
    process.exit(0);
  }

  const oldOrgId = existingOrg.id;
  const oldUserId = existingUser?.id ?? null;

  console.log(`  Old org ID:  ${oldOrgId}`);
  console.log(`  Old user ID: ${oldUserId ?? "(none)"}`);
  console.log("");
  console.log("Running migration transaction...");

  await prisma.$transaction(async (tx) => {
    // 1. Insert new Organization row with Clerk org ID
    await tx.organization.create({
      data: {
        id: clerkOrgId,
        name: existingOrg.name,
        slug: existingOrg.slug,
      },
    });
    console.log("  [1/6] Created new Organization row with Clerk org ID.");

    // 2. Migrate all Client rows to new org ID
    const clientUpdateResult = await tx.client.updateMany({
      where: { organizationId: oldOrgId },
      data: { organizationId: clerkOrgId },
    });
    console.log(`  [2/6] Updated ${clientUpdateResult.count} Client row(s) to Clerk org ID.`);

    // 3. Insert new User row with Clerk user ID
    await tx.user.create({
      data: {
        id: clerkUserId,
        organizationId: clerkOrgId,
        email: clerkUserEmail,
        name: clerkUserEmail.split("@")[0] ?? clerkUserId,
        role: "OWNER",
      },
    });
    console.log("  [3/6] Created new User row with Clerk user ID.");

    // 4. Update FK references from old user ID to new Clerk user ID
    if (oldUserId !== null) {
      // ScanRun.triggeredById
      const scanRunUpdate = await tx.scanRun.updateMany({
        where: { triggeredById: oldUserId },
        data: { triggeredById: clerkUserId },
      });
      console.log(`  [4a] Updated ${scanRunUpdate.count} ScanRun.triggeredById FK(s).`);

      // Report.generatedById
      const reportUpdate = await tx.report.updateMany({
        where: { generatedById: oldUserId },
        data: { generatedById: clerkUserId },
      });
      console.log(`  [4b] Updated ${reportUpdate.count} Report.generatedById FK(s).`);

      // ScanEvidence.approvedById
      const evidenceUpdate = await tx.scanEvidence.updateMany({
        where: { approvedById: oldUserId },
        data: { approvedById: clerkUserId },
      });
      console.log(`  [4c] Updated ${evidenceUpdate.count} ScanEvidence.approvedById FK(s).`);

      // ReportQA.signedOffById
      const qaUpdate = await tx.reportQA.updateMany({
        where: { signedOffById: oldUserId },
        data: { signedOffById: clerkUserId },
      });
      console.log(`  [4d] Updated ${qaUpdate.count} ReportQA.signedOffById FK(s).`);

      // TransitionLog.actorId (String? — no FK, just a plain string column)
      const logUpdate = await tx.transitionLog.updateMany({
        where: { actorId: oldUserId },
        data: { actorId: clerkUserId },
      });
      console.log(`  [4e] Updated ${logUpdate.count} TransitionLog.actorId value(s).`);

      console.log("  [4/6] All user FK references updated to Clerk user ID.");
    } else {
      console.log("  [4/6] No old user to migrate FKs from — skipped.");
    }

    // 5. Delete old User row (if it existed)
    if (oldUserId !== null) {
      await tx.user.delete({ where: { id: oldUserId } });
      console.log(`  [5/6] Deleted old User row (${oldUserId}).`);
    } else {
      console.log("  [5/6] No old User row to delete — skipped.");
    }

    // 6. Delete old Organization row
    await tx.organization.delete({ where: { id: oldOrgId } });
    console.log(`  [6/6] Deleted old Organization row (${oldOrgId}).`);
  });

  console.log("\nMigration complete.");
  console.log(`Organization is now: ${clerkOrgId}`);
  console.log(`User is now:         ${clerkUserId}`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
