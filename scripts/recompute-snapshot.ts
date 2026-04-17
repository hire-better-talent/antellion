import { prisma } from "../packages/db/src/index";
import { computeSnapshotSummary, type SnapshotResultData } from "../packages/core/src/snapshot-summary";

const CLUSTER_MAP: Record<string, SnapshotResultData["category"]> = {
  "Snapshot: Discovery Absence": "discovery",
  "Snapshot: Competitor Contrast": "competitor_contrast",
  "Snapshot: Reputation Probe": "reputation",
  "Snapshot: Citation & Source": "citation_source",
};

async function main() {
  const clientName = process.argv[2] ?? "ServiceTitan";

  const scan = await prisma.scanRun.findFirst({
    where: { queryDepth: "snapshot", client: { name: { contains: clientName } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, metadata: true },
  });
  if (!scan) { console.log("No snapshot found for", clientName); return; }

  const m = scan.metadata as Record<string, unknown>;
  const cl = await prisma.scanRun.findUnique({
    where: { id: scan.id },
    select: { client: { select: { competitors: { select: { name: true, domain: true } } } } },
  });
  const compNames = (m.competitors ?? []) as string[];
  const comp = (cl?.client.competitors ?? []).filter(c => compNames.includes(c.name));

  const results = await prisma.scanResult.findMany({
    where: { scanRunId: scan.id },
    select: {
      response: true, mentioned: true, visibilityScore: true, sentimentScore: true,
      citations: { select: { domain: true } },
      query: { select: { text: true, intent: true, queryCluster: { select: { name: true } } } },
    },
  });

  const data: SnapshotResultData[] = results.map(r => {
    const cat = CLUSTER_MAP[r.query.queryCluster.name] ?? "discovery";
    let cn: string | undefined;
    if (cat === "competitor_contrast" && r.query.intent) {
      const x = r.query.intent.match(/^competitor:(.+)$/);
      if (x) cn = x[1];
    }
    return {
      queryText: r.query.text, category: cat, competitorName: cn,
      prospectName: (m.prospectName as string) ?? clientName,
      prospectDomain: (m.prospectDomain as string) ?? undefined,
      industry: (m.industry as string) ?? undefined,
      competitors: comp, mentioned: r.mentioned,
      visibilityScore: r.visibilityScore, sentimentScore: r.sentimentScore,
      response: r.response,
      citationDomains: r.citations.map(c => c.domain).filter((d): d is string => d != null),
    };
  });

  const s = computeSnapshotSummary(data);
  await prisma.scanRun.update({
    where: { id: scan.id },
    data: { metadata: { ...m, snapshotSummary: s as unknown as Record<string, unknown> } },
  });

  console.log("=== HOOK ===");
  console.log(s.primaryHook.findingStrength, "|", s.primaryHook.category);
  console.log("Headline:", s.primaryHook.headline);
  console.log("Evidence:", s.primaryHook.evidence);
  console.log("Quotable:", s.primaryHook.quotableText?.slice(0, 250));
  console.log();
  console.log("=== DISCOVERY ===");
  console.log(s.discovery.prospectMentioned + "/" + s.discovery.queriesRun, "=", Math.round(s.discovery.mentionRate * 100) + "%");
  for (const c of s.discovery.competitorRanking) {
    console.log("  " + c.name + ":", c.mentioned + "/" + s.discovery.queriesRun, "=", Math.round(c.mentionRate * 100) + "%");
  }
  const g = s.discovery.topGapQueries[0];
  if (g) {
    console.log("\nTop gap:", g.queryText);
    console.log("  Competitors:", g.competitorsMentioned);
    console.log("  Excerpt:", g.responseExcerpt?.slice(0, 200));
  }
  console.log();
  console.log("=== CITATIONS ===");
  console.log("  Prospect employer citations:", s.citationGap.prospectEmployerCitations);
  console.log("  Competitor employer citations:", s.citationGap.competitorEmployerCitations);
  console.log("  Gap platforms:", s.citationGap.gapPlatforms);
  console.log("  Finding:", s.citationGap.finding);
  console.log();
  console.log("=== INTERPRETATION ===");
  console.log("Primary takeaway:", s.interpretation.primaryTakeaway);
  console.log();
  console.log(`[${s.interpretation.strength.label}] ${s.interpretation.strength.title}`);
  console.log("  ", s.interpretation.strength.detail);
  console.log("  Source:", s.interpretation.strength.source);
  console.log();
  for (const opp of s.interpretation.opportunities) {
    console.log(`[${opp.label}] ${opp.title}`);
    console.log("  ", opp.detail);
    console.log("  Source:", opp.source);
    console.log();
  }
  console.log("Bridge:", s.interpretation.bridge);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
