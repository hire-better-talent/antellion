import { prisma, Prisma } from "@antellion/db";
import {
  analyzeResponse,
  parseCitations,
  computeResultConfidence,
  shouldAutoFlag,
  scoreQuerySignal,
  jaccardSimilarity,
  DUPLICATE_JACCARD_THRESHOLD,
  computeSnapshotSummary,
} from "@antellion/core";
import type { SignalYield, SnapshotResultData } from "@antellion/core";
import { queryLLM, mapProviderToEnum } from "./llm-client";

// ── Types ────────────────────────────────────────────────────

interface QueryRow {
  id: string;
  text: string;
}

interface ClientContext {
  name: string;
  domain: string;
  competitors: { name: string; domain: string }[];
}

// ── Delay helpers ────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Delay between batches (not between individual queries within a batch). */
const INTER_BATCH_DELAY_MS = 300;

/** Number of queries executed concurrently in each batch. */
const BATCH_SIZE = 5;

// ── Core execution ───────────────────────────────────────────

/**
 * Execute all pending queries for a scan run by calling the OpenAI API,
 * storing results identically to the manual `recordResult` server action.
 *
 * The scan must already be in RUNNING status with `metadata.automated = true`.
 * Results, citations, evidence, and confidence scoring are written in a
 * per-query transaction so progress is visible in real time.
 */
export async function executeScan(scanRunId: string): Promise<void> {
  // ── 1. Fetch scan context ────────────────────────────────
  const scan = await prisma.scanRun.findFirst({
    where: { id: scanRunId, status: "RUNNING" },
    select: {
      id: true,
      status: true,
      model: true,
      queryCount: true,
      resultCount: true,
      metadata: true,
      clientId: true,
      client: {
        select: {
          name: true,
          domain: true,
          competitors: { select: { name: true, domain: true } },
        },
      },
    },
  });

  if (!scan) {
    throw new Error(
      `Scan ${scanRunId} not found or is not in RUNNING status.`,
    );
  }

  const client: ClientContext = scan.client;
  const model = scan.model ?? undefined;

  // ── 2. Resolve queries ───────────────────────────────────
  const meta = scan.metadata as Record<string, unknown> | null;
  const explicitQueryIds = Array.isArray(meta?.queryIds) ? (meta.queryIds as string[]) : null;

  let allQueries: QueryRow[];

  if (explicitQueryIds?.length) {
    // Targeted re-run: load the explicit query list scoped to the scan's client
    allQueries = await prisma.query.findMany({
      where: {
        id: { in: explicitQueryIds },
        isActive: true,
        queryCluster: { clientId: scan.clientId },
      },
      select: { id: true, text: true },
    });
  } else {
    // Standard path: expand queries from cluster IDs stored in metadata
    const queryClusterIds = Array.isArray(meta?.queryClusterIds)
      ? (meta.queryClusterIds as string[])
      : [];

    if (queryClusterIds.length === 0) {
      throw new Error(
        `Scan ${scanRunId} has no queryClusterIds or queryIds in metadata. Cannot determine queries to run.`,
      );
    }

    const clusters = await prisma.queryCluster.findMany({
      where: { id: { in: queryClusterIds } },
      select: {
        queries: {
          where: { isActive: true },
          select: { id: true, text: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    allQueries = clusters.flatMap((c) => c.queries);
  }

  if (allQueries.length === 0) {
    console.warn(`Scan ${scanRunId}: no active queries found in clusters. Marking complete.`);
    await finalizeScan(scanRunId, scan.status);
    return;
  }

  // ── 3. Identify already-recorded queries ─────────────────
  const existingResults = await prisma.scanResult.findMany({
    where: { scanRunId, competitorId: null },
    select: { queryId: true },
  });
  const recordedQueryIds = new Set(existingResults.map((r) => r.queryId));

  const pendingQueries = allQueries.filter((q) => !recordedQueryIds.has(q.id));

  if (pendingQueries.length === 0) {
    console.log(`Scan ${scanRunId}: all queries already have results. Marking complete.`);
    await finalizeScan(scanRunId, scan.status);
    return;
  }

  console.log(
    `Scan ${scanRunId}: running ${pendingQueries.length} pending queries (${recordedQueryIds.size} already recorded).`,
  );

  // ── 4. Execute pending queries in concurrent batches ─────
  //
  // BATCH_SIZE queries run in parallel via Promise.all. A fixed
  // inter-batch delay (INTER_BATCH_DELAY_MS) gives the rate limiter
  // breathing room without serialising individual queries.
  let errorCount = 0;

  for (let batchStart = 0; batchStart < pendingQueries.length; batchStart += BATCH_SIZE) {
    const batch = pendingQueries.slice(batchStart, batchStart + BATCH_SIZE);
    const batchEnd = batchStart + batch.length;

    console.log(
      `  Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: queries ${batchStart + 1}–${batchEnd} of ${pendingQueries.length}`,
    );

    const results = await Promise.allSettled(
      batch.map((query) => executeQuery(scanRunId, query, client, model)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      if (result.status === "rejected") {
        errorCount++;
        const query = batch[j]!;
        console.error(`  Query ${query.id} failed:`, result.reason);

        const failureRate = errorCount / pendingQueries.length;
        if (failureRate > 0.2) {
          console.warn(
            `  Warning: ${errorCount}/${pendingQueries.length} queries failed (${Math.round(failureRate * 100)}%). Continuing.`,
          );
        }
      }
    }

    // Inter-batch pause — skip after the last batch
    if (batchEnd < pendingQueries.length) {
      await sleep(INTER_BATCH_DELAY_MS);
    }
  }

  // ── 5. Score all results ─────────────────────────────────
  try {
    await scoreAllResults(scanRunId);
  } catch (err) {
    // Scoring failure must not block scan completion — results are still valid
    console.error(`Scan ${scanRunId}: signal scoring failed, scan will still be marked complete.`, err);
  }

  // ── 6. Mark scan complete ────────────────────────────────
  await finalizeScan(scanRunId, scan.status);

  console.log(
    `Scan ${scanRunId} complete. ${errorCount > 0 ? `${errorCount} queries failed.` : "All queries succeeded."}`,
  );
}

// ── Per-query execution ──────────────────────────────────────

/**
 * Call the LLM for a single query, analyze the response, and write
 * ScanResult + CitationSource[] + ScanEvidence in a single transaction.
 *
 * Mirrors the logic in the manual `recordResult` server action exactly.
 */
async function executeQuery(
  scanRunId: string,
  query: QueryRow,
  client: ClientContext,
  model?: string,
): Promise<void> {
  // Soft guard: skip if another process already recorded this query.
  // This avoids wasting an LLM API call when we can cheaply detect the duplicate
  // before hitting the network. The @@unique([scanRunId, queryId]) constraint
  // below is the hard guarantee — this is just an optimistic fast-path.
  const existing = await prisma.scanResult.findFirst({
    where: { scanRunId, queryId: query.id, competitorId: null },
  });
  if (existing) {
    console.log(`  Skipping ${query.id} — result already exists.`);
    return;
  }

  // Call the LLM — use the model recorded on the scan run (falls back to gpt-4o)
  const llmResponse = await queryLLM(query.text, { model });

  // Analyze the response (same as manual flow)
  const analysis = analyzeResponse({
    response: llmResponse.text,
    clientName: client.name,
    clientDomain: client.domain,
    competitors: client.competitors,
    // Automated scans don't have a separate citation input — the response IS the source.
    // We extract citations directly from the response text via parseCitations below.
    rawCitedDomains: "",
  });

  // Determine initial result status
  const initialStatus = shouldAutoFlag(analysis.visibilityScore)
    ? "NEEDS_REVIEW"
    : "CAPTURED";

  // Extract citations: prefer structured annotations from the API response,
  // fall back to parsing from response text for providers that don't return annotations.
  const textParsed = parseCitations(llmResponse.text);
  const apiCitations = llmResponse.citations.map((c) => ({
    url: c.url,
    domain: c.url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase().trim(),
    title: c.title,
  }));

  // Merge: API citations first (higher quality), then text-parsed (deduped by domain)
  const seenDomains = new Set<string>();
  const allCitations: Array<{ url: string; domain: string; title: string | null }> = [];
  for (const c of [...apiCitations, ...textParsed]) {
    if (c.domain && !seenDomains.has(c.domain)) {
      seenDomains.add(c.domain);
      allCitations.push(c);
    }
  }

  // Write everything in a transaction.
  // The @@unique([scanRunId, queryId]) constraint on ScanResult guarantees
  // that if two processes race past the soft guard above, only one will
  // succeed — the other will get a P2002 unique-violation which we catch below.
  try {
  await prisma.$transaction(async (tx) => {
    const scanResult = await tx.scanResult.create({
      data: {
        scanRunId,
        queryId: query.id,
        response: llmResponse.text,
        status: initialStatus,
        visibilityScore: analysis.visibilityScore,
        sentimentScore: analysis.sentimentScore,
        mentioned: analysis.clientMentioned,
        tokenCount: llmResponse.tokenCount,
        latencyMs: llmResponse.latencyMs,
        metadata: {
          competitorMentions: analysis.competitorMentions as unknown as Prisma.JsonArray,
          source: "automated",
        } satisfies Prisma.InputJsonObject,
      },
    });

    // Create citation sources
    if (allCitations.length > 0) {
      await tx.citationSource.createMany({
        data: allCitations.map((c) => ({
          scanResultId: scanResult.id,
          url: c.url,
          domain: c.domain,
          title: c.title ?? undefined,
          sourceType: "cited",
        })),
      });
    }

    // Create evidence record with full LLM provenance
    const evidence = await tx.scanEvidence.create({
      data: {
        scanResultId: scanResult.id,
        version: 1,
        status: "DRAFT",
        promptText: query.text,
        provider: mapProviderToEnum(llmResponse.provider),
        modelName: llmResponse.model,
        temperature: 1,
        rawResponse: llmResponse.text,
        rawTokenCount: llmResponse.tokenCount,
        promptTokens: llmResponse.promptTokens,
        latencyMs: llmResponse.latencyMs,
        executedAt: new Date(),
      },
    });

    // Compute and store confidence score
    const confidence = computeResultConfidence({
      responseLength: llmResponse.text.length,
      hasVisibilityScore: analysis.visibilityScore != null,
      hasSentimentScore: analysis.sentimentScore != null,
      citationCount: allCitations.length,
      mentioned: analysis.clientMentioned,
    });

    await tx.scanEvidence.update({
      where: { id: evidence.id },
      data: { confidenceScore: confidence.score / 100 },
    });

    // Auto-flag transition log
    if (initialStatus === "NEEDS_REVIEW") {
      await tx.transitionLog.create({
        data: {
          entityType: "SCAN_RESULT",
          entityId: scanResult.id,
          fromStatus: "CAPTURED",
          toStatus: "NEEDS_REVIEW",
          action: "autoFlagResult",
          actorId: null,
          note: `Auto-flagged (automated scan): visibility score ${analysis.visibilityScore ?? "null"} below threshold.`,
        },
      });
    }

    // Increment the scan result counter so the UI shows live progress
    await tx.scanRun.update({
      where: { id: scanRunId },
      data: { resultCount: { increment: 1 } },
    });
  });
  } catch (err: unknown) {
    // Unique constraint violation: another process wrote this result first.
    // This is not an error — silently skip so the scan continues cleanly.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      console.log(
        `  Skipping ${query.id} — duplicate (another process recorded it).`,
      );
      return;
    }
    throw err;
  }
}

// ── Signal scoring ───────────────────────────────────────────

/**
 * Fetch all results for a completed scan, compute signal yield for each one,
 * and persist the score in `metadata.signalYield`.
 *
 * Novelty is computed by iterating results in creation order and tracking which
 * competitors and citation domains have already appeared. Duplicate detection uses
 * pairwise Jaccard similarity on response text (word-set intersection / union).
 *
 * This is called once per scan, just before marking COMPLETED. Each result's
 * metadata is updated in a batch — not in a transaction — so partial failures
 * do not block the scan from completing.
 */
async function scoreAllResults(scanRunId: string): Promise<void> {
  const results = await prisma.scanResult.findMany({
    where: { scanRunId },
    select: {
      id: true,
      response: true,
      mentioned: true,
      visibilityScore: true,
      sentimentScore: true,
      metadata: true,
      citations: { select: { domain: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (results.length === 0) return;

  // Track state across results to compute novelty
  const seenCompetitors = new Set<string>();
  const seenDomains = new Set<string>();

  // Pre-compute duplicate detection: for each result, check if any earlier
  // result has Jaccard similarity > 0.8. O(n²) but scan sizes are small (<200).
  const duplicateFlags = results.map((result, i) => {
    for (let j = 0; j < i; j++) {
      const sim = jaccardSimilarity(result.response, results[j]!.response);
      if (sim > DUPLICATE_JACCARD_THRESHOLD) return true;
    }
    return false;
  });

  // Process each result in order
  const updates: Array<{ id: string; signalYield: SignalYield }> = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const isDuplicate = duplicateFlags[i]!;

    // Extract competitor mentions from stored metadata
    const meta = result.metadata as {
      competitorMentions?: Array<{ name: string; mentioned: boolean }>;
    } | null;
    const competitorMentions = meta?.competitorMentions ?? [];

    // Determine novelty before updating the seen sets
    const mentionedCompetitors = competitorMentions
      .filter((c) => c.mentioned)
      .map((c) => c.name.toLowerCase());

    const isNovelCompetitorMention = mentionedCompetitors.some(
      (name) => !seenCompetitors.has(name),
    );

    const citationDomains = result.citations.map((c) => c.domain ?? "").filter(Boolean);
    const isNovelCitation = citationDomains.some((d) => !seenDomains.has(d));

    // Score this result
    const signalYield = scoreQuerySignal({
      mentioned: result.mentioned,
      visibilityScore: result.visibilityScore ?? 0,
      sentimentScore: result.sentimentScore ?? 0,
      citationCount: citationDomains.length,
      responseLength: result.response.length,
      competitorMentions,
      isNovelCompetitorMention,
      isNovelCitation,
      isDuplicateResponse: isDuplicate,
    });

    updates.push({ id: result.id, signalYield });

    // Update seen sets so subsequent results can detect novelty
    for (const name of mentionedCompetitors) seenCompetitors.add(name);
    for (const domain of citationDomains) seenDomains.add(domain);
  }

  // Persist all signal yields. Each update is independent; a single failure
  // does not block the rest.
  await Promise.all(
    updates.map(async ({ id, signalYield }) => {
      try {
        // Merge into existing metadata to preserve competitorMentions/source fields
        const current = await prisma.scanResult.findUnique({
          where: { id },
          select: { metadata: true },
        });
        const existingMeta = (current?.metadata as Record<string, unknown> | null) ?? {};

        await prisma.scanResult.update({
          where: { id },
          data: {
            metadata: {
              ...existingMeta,
              signalYield: signalYield as unknown as Prisma.InputJsonObject,
            } satisfies Prisma.InputJsonObject,
          },
        });
      } catch (err) {
        console.error(`scoreAllResults: failed to update result ${id}:`, err);
      }
    }),
  );

  const highCount = updates.filter((u) => u.signalYield.tier === "high").length;
  const mediumCount = updates.filter((u) => u.signalYield.tier === "medium").length;
  const lowCount = updates.filter((u) => u.signalYield.tier === "low").length;
  const zeroCount = updates.filter((u) => u.signalYield.tier === "zero").length;
  console.log(
    `Scan ${scanRunId}: signal scoring complete — high:${highCount} medium:${mediumCount} low:${lowCount} zero:${zeroCount}`,
  );
}

// ── Scan finalization ────────────────────────────────────────

async function finalizeScan(
  scanRunId: string,
  fromStatus: string,
): Promise<void> {
  // Fetch the scan metadata before the transaction so we know whether to
  // compute the snapshot summary after marking COMPLETED.
  const scanForMeta = await prisma.scanRun.findUnique({
    where: { id: scanRunId },
    select: { metadata: true },
  });
  const scanMeta = (scanForMeta?.metadata ?? null) as Record<string, unknown> | null;

  await prisma.$transaction(async (tx) => {
    await tx.scanRun.update({
      where: { id: scanRunId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        errorMessage: null, // clear the worker lock
      },
    });

    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RUN",
        entityId: scanRunId,
        fromStatus,
        toStatus: "COMPLETED",
        action: "automatedScanComplete",
        actorId: null,
        note: "Automated scan execution completed by job worker.",
      },
    });
  });

  // ── Snapshot summary computation ─────────────────────────
  // Run after the transaction so the summary write is isolated and
  // a failure here does not roll back the COMPLETED status update.
  if (scanMeta?.snapshot === true) {
    try {
      await computeAndStoreSnapshotSummary(scanRunId, scanMeta);
    } catch (err) {
      // Summary failure must not block the scan from appearing as COMPLETED
      // in the UI. The findings card will handle a missing summary gracefully.
      console.error(`Scan ${scanRunId}: snapshot summary computation failed.`, err);
    }
  }
}

// ── Snapshot summary helper ──────────────────────────────────

/**
 * Cluster name → SnapshotResultData category mapping.
 * Must mirror the names written by createSnapshotScan.
 */
const CLUSTER_NAME_TO_CATEGORY: Record<
  string,
  SnapshotResultData["category"]
> = {
  "Snapshot: Discovery Absence": "discovery",
  "Snapshot: Competitor Contrast": "competitor_contrast",
  "Snapshot: Reputation Probe": "reputation",
  "Snapshot: Citation & Source": "citation_source",
};

/**
 * Fetch all results for a completed snapshot scan, map them to
 * SnapshotResultData, run computeSnapshotSummary, and persist the result in
 * ScanRun.metadata.snapshotSummary.
 *
 * The prospect name and competitors array come from the scan metadata written
 * by createSnapshotScan. Each query's category is recovered from its cluster
 * name; the competitor name for contrast queries is recovered from the
 * "competitor:<name>" prefix stored in query.intent.
 */
async function computeAndStoreSnapshotSummary(
  scanRunId: string,
  scanMeta: Record<string, unknown>,
): Promise<void> {
  const prospectName =
    typeof scanMeta.prospectName === "string" ? scanMeta.prospectName : "Unknown";

  const prospectDomain =
    typeof scanMeta.prospectDomain === "string" ? scanMeta.prospectDomain : undefined;

  const industry =
    typeof scanMeta.industry === "string" ? scanMeta.industry : undefined;

  const competitorNames: string[] = Array.isArray(scanMeta.competitors)
    ? (scanMeta.competitors as unknown[]).filter(
        (c): c is string => typeof c === "string",
      )
    : [];

  // We need the client's competitors (name + domain) to populate the
  // SnapshotResultData.competitors array used for citation gap analysis.
  const scan = await prisma.scanRun.findUnique({
    where: { id: scanRunId },
    select: {
      clientId: true,
      client: {
        select: {
          competitors: { select: { name: true, domain: true } },
        },
      },
    },
  });

  // Filter competitors to only those that appear in the snapshot metadata
  // (the scan may have competitors from prior scans that were not included).
  const allClientCompetitors = scan?.client.competitors ?? [];
  const snapshotCompetitors =
    competitorNames.length > 0
      ? allClientCompetitors.filter((c) => competitorNames.includes(c.name))
      : allClientCompetitors;

  // Fetch all results with the data needed for summary computation.
  // We join through the query → queryCluster to get the cluster name.
  const results = await prisma.scanResult.findMany({
    where: { scanRunId },
    select: {
      response: true,
      mentioned: true,
      visibilityScore: true,
      sentimentScore: true,
      citations: { select: { domain: true } },
      query: {
        select: {
          text: true,
          intent: true,
          queryCluster: { select: { name: true } },
        },
      },
    },
  });

  if (results.length === 0) {
    console.warn(`Scan ${scanRunId}: no results for snapshot summary — skipping.`);
    return;
  }

  const resultData: SnapshotResultData[] = results.map((r) => {
    const clusterName = r.query.queryCluster.name;
    const category =
      CLUSTER_NAME_TO_CATEGORY[clusterName] ?? "discovery";

    // Recover the competitor name from the "competitor:<name>" intent prefix
    // stored by createSnapshotScan for contrast queries.
    let competitorName: string | undefined;
    if (category === "competitor_contrast" && r.query.intent) {
      const match = r.query.intent.match(/^competitor:(.+)$/);
      if (match) competitorName = match[1];
    }

    return {
      queryText: r.query.text,
      category,
      competitorName,
      prospectName,
      prospectDomain,
      industry,
      competitors: snapshotCompetitors,
      mentioned: r.mentioned,
      visibilityScore: r.visibilityScore,
      sentimentScore: r.sentimentScore,
      response: r.response,
      citationDomains: r.citations
        .map((c) => c.domain ?? "")
        .filter(Boolean),
    };
  });

  const summary = computeSnapshotSummary(resultData);

  // Merge the summary into the existing metadata to preserve all other fields.
  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      metadata: {
        ...scanMeta,
        snapshotSummary: summary as unknown as Prisma.InputJsonObject,
      } satisfies Prisma.InputJsonObject,
    },
  });

  console.log(
    `Scan ${scanRunId}: snapshot summary stored — primaryHook: ${summary.primaryHook.category} (${summary.primaryHook.findingStrength})`,
  );
}
