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

interface PersonaContext {
  id: string;
  label: string;
  seedContext: string | null;
}

/** A single cell in the (query × model × persona) scan matrix. */
interface MatrixCell {
  query: QueryRow;
  model: string;
  persona: PersonaContext | null;
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
  const meta = scan.metadata as Record<string, unknown> | null;

  // ── 2. Resolve models (single or multi) ──────────────────
  // Diagnostic scans pass metadata.models: string[] for the matrix.
  // Snapshot/standard scans use a single model from scan.model.
  const modelList: string[] = Array.isArray(meta?.models)
    ? (meta.models as string[])
    : [(scan.model ?? "gpt-4o")];

  // ── 3. Resolve personas (empty for non-Diagnostic scans) ──
  const personaIds: string[] = Array.isArray(meta?.personaIds)
    ? (meta.personaIds as string[])
    : [];

  let personas: PersonaContext[] = [];
  if (personaIds.length > 0) {
    const rows = await prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { id: true, label: true, seedContext: true },
    });
    personas = rows;
  }

  // ── 4. Resolve queries ───────────────────────────────────
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

  // ── 5. Expand the scan matrix ────────────────────────────
  // For Diagnostic: (query × model × persona) = up to 40×4×3=480 cells.
  // For snapshot/standard: (query × model × [null]) = N×1×1 cells.
  const matrixCells: MatrixCell[] = [];
  const personaList: Array<PersonaContext | null> = personas.length > 0
    ? personas
    : [null];

  for (const query of allQueries) {
    for (const model of modelList) {
      for (const persona of personaList) {
        matrixCells.push({ query, model, persona });
      }
    }
  }

  // ── 6. Identify already-completed cells ──────────────────
  // For backward compat: legacy scans have no modelName/personaId.
  // We check existing results and build a composite key set.
  const existingResults = await prisma.scanResult.findMany({
    where: { scanRunId, competitorId: null },
    select: { queryId: true, modelName: true, personaId: true },
  });

  const recordedCellKeys = new Set(
    existingResults.map((r) =>
      `${r.queryId}::${r.modelName ?? ""}::${r.personaId ?? ""}`,
    ),
  );

  const pendingCells = matrixCells.filter((cell) => {
    const key = `${cell.query.id}::${cell.model ?? ""}::${cell.persona?.id ?? ""}`;
    return !recordedCellKeys.has(key);
  });

  if (pendingCells.length === 0) {
    console.log(`Scan ${scanRunId}: all matrix cells already have results. Marking complete.`);
    await finalizeScan(scanRunId, scan.status);
    return;
  }

  console.log(
    `Scan ${scanRunId}: running ${pendingCells.length} pending cells (${recordedCellKeys.size} already recorded). Matrix: ${allQueries.length}q × ${modelList.length}m × ${personaList.length}p`,
  );

  // ── 7. Execute pending cells in concurrent batches ────────
  //
  // BATCH_SIZE cells run in parallel via Promise.all. A fixed
  // inter-batch delay (INTER_BATCH_DELAY_MS) gives the rate limiter
  // breathing room without serialising individual queries.
  let errorCount = 0;

  for (let batchStart = 0; batchStart < pendingCells.length; batchStart += BATCH_SIZE) {
    const batch = pendingCells.slice(batchStart, batchStart + BATCH_SIZE);
    const batchEnd = batchStart + batch.length;

    console.log(
      `  Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: cells ${batchStart + 1}–${batchEnd} of ${pendingCells.length}`,
    );

    const results = await Promise.allSettled(
      batch.map((cell) => executeMatrixCell(scanRunId, cell, client)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      if (result.status === "rejected") {
        errorCount++;
        const cell = batch[j]!;
        console.error(`  Cell q:${cell.query.id} m:${cell.model} p:${cell.persona?.id ?? "none"} failed:`, result.reason);

        const failureRate = errorCount / pendingCells.length;
        if (failureRate > 0.2) {
          console.warn(
            `  Warning: ${errorCount}/${pendingCells.length} cells failed (${Math.round(failureRate * 100)}%). Continuing.`,
          );
        }
      }
    }

    // Inter-batch pause — skip after the last batch
    if (batchEnd < pendingCells.length) {
      await sleep(INTER_BATCH_DELAY_MS);
    }
  }

  // ── 8. Score all results ─────────────────────────────────
  try {
    await scoreAllResults(scanRunId);
  } catch (err) {
    // Scoring failure must not block scan completion — results are still valid
    console.error(`Scan ${scanRunId}: signal scoring failed, scan will still be marked complete.`, err);
  }

  // ── 9. Mark scan complete ────────────────────────────────
  await finalizeScan(scanRunId, scan.status);

  console.log(
    `Scan ${scanRunId} complete. ${errorCount > 0 ? `${errorCount} cells failed.` : "All cells succeeded."}`,
  );
}

// ── Per-cell execution ───────────────────────────────────────

/**
 * Render the persona seed context into the query prompt.
 * The persona's intent context is prepended as a role-framing prefix.
 * The fully-rendered prompt is stored on ScanEvidence for provenance.
 */
function renderPrompt(queryText: string, persona: PersonaContext | null): string {
  if (!persona?.seedContext) return queryText;
  return `${persona.seedContext}\n\n${queryText}`;
}

/**
 * Execute a single (query, model, persona) matrix cell: call the LLM,
 * analyze the response, and write ScanResult + CitationSource[] + ScanEvidence
 * in a single transaction.
 *
 * For non-Diagnostic (persona=null) scans this behaves identically to the
 * previous single-model executeQuery — backward compatible.
 */
async function executeMatrixCell(
  scanRunId: string,
  cell: MatrixCell,
  client: ClientContext,
): Promise<void> {
  const { query, model, persona } = cell;

  // Soft guard: skip if another process already recorded this cell.
  // The @@unique([scanRunId, queryId, modelName, personaId]) constraint
  // is the hard guarantee — this is an optimistic fast-path check.
  const existing = await prisma.scanResult.findFirst({
    where: {
      scanRunId,
      queryId: query.id,
      competitorId: null,
      modelName: model,
      personaId: persona?.id ?? null,
    },
  });
  if (existing) {
    console.log(`  Skipping q:${query.id} m:${model} p:${persona?.id ?? "none"} — result already exists.`);
    return;
  }

  // Render the prompt: persona seed context is woven in at call time.
  const renderedPrompt = renderPrompt(query.text, persona);

  // Call the LLM with the specified model for this matrix cell.
  const llmResponse = await queryLLM(renderedPrompt, { model });

  // Analyze the response (same as manual flow)
  const analysis = analyzeResponse({
    response: llmResponse.text,
    clientName: client.name,
    clientDomain: client.domain,
    competitors: client.competitors,
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

  try {
    await prisma.$transaction(async (tx) => {
      const scanResult = await tx.scanResult.create({
        data: {
          scanRunId,
          queryId: query.id,
          // Diagnostic matrix dimensions
          modelName: model,
          personaId: persona?.id ?? null,
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
            personaLabel: persona?.label ?? null,
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

      // Create evidence record with full LLM provenance.
      // promptText stores the FULLY RENDERED prompt (with persona seed context)
      // so the audit trail shows exactly what was sent to the model.
      const evidence = await tx.scanEvidence.create({
        data: {
          scanResultId: scanResult.id,
          version: 1,
          status: "DRAFT",
          promptText: renderedPrompt,
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
    // Unique constraint violation: another process wrote this cell first.
    // This is not an error — silently skip so the scan continues cleanly.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      console.log(
        `  Skipping q:${query.id} m:${model} p:${persona?.id ?? "none"} — duplicate (another process recorded it).`,
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
