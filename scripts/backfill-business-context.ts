/**
 * One-time script to backfill business context descriptions for existing clients
 * that have profile fields but no description.
 *
 * Run: pnpm --filter @antellion/db exec tsx ../../scripts/backfill-business-context.ts
 */

import { PrismaClient } from "@prisma/client";
import { buildBusinessContext } from "@antellion/core";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main() {
  console.log("Backfilling business context for clients...\n");

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      industry: true,
      revenueScale: true,
      headquarters: true,
      employeeCount: true,
      knownFor: true,
      nicheKeywords: true,
      publiclyTraded: true,
    },
  });

  console.log(`Found ${clients.length} clients.\n`);

  let updated = 0;

  for (const client of clients) {
    const context = buildBusinessContext(client);

    if (!context) {
      console.log(`  ${client.name}: no profile data to build context from — skipped`);
      continue;
    }

    // Only update if the client doesn't already have a description
    // or if the current description is shorter than what we'd generate
    if (!client.description || client.description.length < context.length) {
      const action = client.description ? "enriched" : "created";
      await prisma.client.update({
        where: { id: client.id },
        data: { description: context },
      });
      updated++;
      console.log(`  ${client.name}: ${action} (${context.length} chars)`);
    } else {
      console.log(`  ${client.name}: already has description (${client.description.length} chars) — skipped`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${clients.length} clients.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
