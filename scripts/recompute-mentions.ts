/**
 * One-time script to recompute mention detection for all scan results
 * using the fixed containsNameExclusive logic.
 *
 * Run: npx tsx scripts/recompute-mentions.ts
 */

import { PrismaClient } from "@prisma/client";
import { analyzeResponse } from "@antellion/core";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function main() {
  console.log("Recomputing mention detection for all scan results...\n");

  // Fetch all scan results with their scan run context
  const results = await prisma.scanResult.findMany({
    select: {
      id: true,
      response: true,
      mentioned: true,
      metadata: true,
      scanRun: {
        select: {
          client: {
            select: {
              name: true,
              domain: true,
              competitors: {
                select: { name: true, domain: true },
              },
            },
          },
        },
      },
    },
  });

  console.log(`Found ${results.length} scan results to recompute.\n`);

  let updated = 0;
  let mentionChanges = 0;
  let competitorChanges = 0;

  for (const result of results) {
    const client = result.scanRun.client;

    // Re-run analysis with the fixed mention detection
    const analysis = analyzeResponse({
      response: result.response,
      clientName: client.name,
      clientDomain: client.domain,
      competitors: client.competitors,
      rawCitedDomains: "", // citations don't need recomputation
    });

    // Check what changed
    const oldMentioned = result.mentioned;
    const newMentioned = analysis.clientMentioned;
    const mentionChanged = oldMentioned !== newMentioned;

    const oldMeta = result.metadata as Record<string, unknown> | null;
    const oldCompMentions = (oldMeta?.competitorMentions ?? []) as Array<{
      name: string;
      mentioned: boolean;
    }>;

    const compChanged = analysis.competitorMentions.some((newComp) => {
      const oldComp = oldCompMentions.find((o) => o.name === newComp.name);
      return oldComp ? oldComp.mentioned !== newComp.mentioned : false;
    });

    if (mentionChanged || compChanged) {
      // Update the result
      await prisma.scanResult.update({
        where: { id: result.id },
        data: {
          mentioned: newMentioned,
          // Preserve existing metadata, update competitorMentions
          metadata: {
            ...(typeof oldMeta === "object" && oldMeta !== null ? oldMeta : {}),
            competitorMentions: analysis.competitorMentions,
          },
        },
      });

      updated++;

      if (mentionChanged) {
        mentionChanges++;
        console.log(
          `  [CLIENT] ${result.id}: mentioned ${oldMentioned} → ${newMentioned}`,
        );
      }

      if (compChanged) {
        competitorChanges++;
        for (const newComp of analysis.competitorMentions) {
          const oldComp = oldCompMentions.find((o) => o.name === newComp.name);
          if (oldComp && oldComp.mentioned !== newComp.mentioned) {
            console.log(
              `  [COMP]   ${result.id}: "${newComp.name}" ${oldComp.mentioned} → ${newComp.mentioned}`,
            );
          }
        }
      }
    }
  }

  console.log(`\nDone.`);
  console.log(`  Total results: ${results.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Client mention changes: ${mentionChanges}`);
  console.log(`  Competitor mention changes: ${competitorChanges}`);
  console.log(`  Unchanged: ${results.length - updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
