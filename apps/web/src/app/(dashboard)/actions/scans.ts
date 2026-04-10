"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  TriggerScanSchema,
  ManualScanResultSchema,
  analyzeResponse,
  parseCitations,
  validateScanCompletion,
  validateScanDeletion,
  validateScanCancellation,
  shouldAutoFlag,
  computeResultConfidence,
  discoverCompetitors,
  scoreQuerySignal,
  jaccardSimilarity,
  DUPLICATE_JACCARD_THRESHOLD,
} from "@antellion/core";
import type { DiscoveredCompetitor } from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { getOrganizationId, requireOrgClient, requireOrgScan } from "@/lib/auth";

export async function createScan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const queryClusterIds = formData.getAll("queryClusterIds").map(String);

  const result = validate(TriggerScanSchema, {
    clientId: formData.get("clientId"),
    queryClusterIds,
    model: formData.get("aiModel") || "ChatGPT (GPT-4o)",
    queryDepth: formData.get("queryDepth") || "First Layer",
    focusArea: formData.get("focusArea") || undefined,
  });

  if (!result.success) return { errors: result.errors };

  const { clientId, model, queryDepth, focusArea } = result.data;
  const organizationId = await getOrganizationId();

  // Verify the client belongs to the current organization
  await requireOrgClient(clientId, organizationId);

  // Count queries in selected clusters (clusters are scoped through the client)
  const queryCount = await prisma.query.count({
    where: {
      queryClusterId: { in: queryClusterIds },
      isActive: true,
      queryCluster: { client: { organizationId } },
    },
  });

  if (queryCount === 0) {
    return { message: "Selected clusters contain no active queries." };
  }

  const scan = await prisma.scanRun.create({
    data: {
      clientId,
      status: "RUNNING",
      model: model ?? "ChatGPT (GPT-4o)",
      queryDepth: queryDepth ?? "First Layer",
      focusArea: focusArea ?? null,
      queryCount,
      startedAt: new Date(),
      metadata: { queryClusterIds },
    },
  });

  redirect(`/scans/${scan.id}`);
}

export async function recordResult(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(ManualScanResultSchema, {
    scanRunId: formData.get("scanRunId"),
    queryId: formData.get("queryId"),
    response: formData.get("response"),
    citedDomains: formData.get("citedDomains") || undefined,
  });

  if (!result.success) return { errors: result.errors };

  const { scanRunId, queryId, response, citedDomains } = result.data;
  const organizationId = await getOrganizationId();

  // Fetch context for analysis, scoped to the current org
  const scan = await prisma.scanRun.findFirst({
    where: { id: scanRunId, client: { organizationId } },
    select: {
      client: {
        select: {
          name: true,
          domain: true,
          competitors: { select: { name: true, domain: true } },
        },
      },
    },
  });

  if (!scan) return { message: "Scan not found." };

  // Run analysis
  const analysis = analyzeResponse({
    response,
    clientName: scan.client.name,
    clientDomain: scan.client.domain,
    competitors: scan.client.competitors,
    rawCitedDomains: citedDomains ?? "",
  });

  // Check for existing result (prevent duplicates)
  const existing = await prisma.scanResult.findFirst({
    where: { scanRunId, queryId, competitorId: null },
  });

  if (existing) {
    return { message: "A result has already been recorded for this query." };
  }

  // Fetch the query text for use as the evidence prompt
  const query = await prisma.query.findUnique({
    where: { id: queryId },
    select: { text: true },
  });

  // Determine initial result status — auto-flag low-confidence results
  const initialStatus = shouldAutoFlag(analysis.visibilityScore)
    ? "NEEDS_REVIEW"
    : "CAPTURED";

  // Fetch prior results for this scan to compute novelty context
  // (manual recording happens one result at a time, so prior results are those
  //  already in the database for this scan run)
  const priorResults = await prisma.scanResult.findMany({
    where: { scanRunId },
    select: {
      response: true,
      metadata: true,
      citations: { select: { domain: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Compute novelty by scanning all prior results' competitor mentions and domains
  const seenCompetitors = new Set<string>();
  const seenDomains = new Set<string>();
  for (const prior of priorResults) {
    const priorMeta = prior.metadata as {
      competitorMentions?: Array<{ name: string; mentioned: boolean }>;
    } | null;
    for (const cm of priorMeta?.competitorMentions ?? []) {
      if (cm.mentioned) seenCompetitors.add(cm.name.toLowerCase());
    }
    for (const c of prior.citations) {
      if (c.domain) seenDomains.add(c.domain);
    }
  }

  const parsedCitationsForNovelty = parseCitations(citedDomains ?? "");
  const thisCompetitorNames = analysis.competitorMentions
    .filter((c) => c.mentioned)
    .map((c) => c.name.toLowerCase());
  const thisDomains = parsedCitationsForNovelty.map((c) => c.domain);

  const isNovelCompetitorMention = thisCompetitorNames.some(
    (name) => !seenCompetitors.has(name),
  );
  const isNovelCitation = thisDomains.some((d) => !seenDomains.has(d));
  const isDuplicateResponse = priorResults.some(
    (prior) => jaccardSimilarity(response, prior.response) > DUPLICATE_JACCARD_THRESHOLD,
  );

  const signalYield = scoreQuerySignal({
    mentioned: analysis.clientMentioned,
    visibilityScore: analysis.visibilityScore,
    sentimentScore: analysis.sentimentScore,
    citationCount: parsedCitationsForNovelty.length,
    responseLength: response.length,
    competitorMentions: analysis.competitorMentions.map((c) => ({
      name: c.name,
      mentioned: c.mentioned,
    })),
    isNovelCompetitorMention,
    isNovelCitation,
    isDuplicateResponse,
  });

  // Create result + citations + evidence in a transaction
  await prisma.$transaction(async (tx) => {
    const scanResult = await tx.scanResult.create({
      data: {
        scanRunId,
        queryId,
        response,
        status: initialStatus,
        visibilityScore: analysis.visibilityScore,
        sentimentScore: analysis.sentimentScore,
        mentioned: analysis.clientMentioned,
        metadata: {
          competitorMentions: analysis.competitorMentions as unknown as Prisma.JsonArray,
          source: "manual",
          signalYield: signalYield as unknown as Prisma.InputJsonObject,
        } satisfies Prisma.InputJsonObject,
      },
    });

    // Create citation sources — use full parsed citations to preserve URL and title
    const parsedCitations = parseCitations(citedDomains ?? "");
    if (parsedCitations.length > 0) {
      await tx.citationSource.createMany({
        data: parsedCitations.map((c) => ({
          scanResultId: scanResult.id,
          url: c.url,
          domain: c.domain,
          title: c.title ?? undefined,
          sourceType: "cited",
        })),
      });
    }

    // Create evidence record (version 1, DRAFT) alongside the result
    const evidence = await tx.scanEvidence.create({
      data: {
        scanResultId: scanResult.id,
        version: 1,
        status: "DRAFT",
        promptText: query?.text ?? queryId,
        provider: "MANUAL",
        modelName: "manual",
        rawResponse: response,
        executedAt: new Date(),
      },
    });

    // Compute and store result-level confidence on the evidence record
    const confidence = computeResultConfidence({
      responseLength: response.length,
      hasVisibilityScore: analysis.visibilityScore != null,
      hasSentimentScore: analysis.sentimentScore != null,
      citationCount: analysis.citedDomains.length,
      mentioned: analysis.clientMentioned,
    });
    await tx.scanEvidence.update({
      where: { id: evidence.id },
      data: { confidenceScore: confidence.score / 100 },
    });

    // Log the result creation (auto-flag is noteworthy)
    if (initialStatus === "NEEDS_REVIEW") {
      await tx.transitionLog.create({
        data: {
          entityType: "SCAN_RESULT",
          entityId: scanResult.id,
          fromStatus: "CAPTURED",
          toStatus: "NEEDS_REVIEW",
          action: "autoFlagResult",
          actorId: null,
          note: `Auto-flagged: visibility score ${analysis.visibilityScore ?? "null"} below threshold.`,
        },
      });
    }

    // Update result count on the scan
    await tx.scanRun.update({
      where: { id: scanRunId },
      data: {
        resultCount: { increment: 1 },
      },
    });
  });

  revalidatePath(`/scans/${scanRunId}`);
  redirect(`/scans/${scanRunId}`);
}

export async function completeScan(id: string): Promise<void> {
  const organizationId = await getOrganizationId();

  // Fetch the scan with org scoping to validate the transition
  const scan = await prisma.scanRun.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, status: true, queryCount: true, resultCount: true },
  });

  if (!scan) throw new Error("Scan not found.");

  const check = validateScanCompletion({
    status: scan.status,
    queryCount: scan.queryCount,
    resultCount: scan.resultCount,
  });

  if (!check.valid) {
    throw new Error(check.reason);
  }

  await prisma.$transaction(async (tx) => {
    await tx.scanRun.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RUN",
        entityId: id,
        fromStatus: scan.status,
        toStatus: "COMPLETED",
        action: "completeScan",
        actorId: null,
      },
    });
  });

  revalidatePath(`/scans/${id}`);
  redirect(`/scans/${id}`);
}

export async function cancelScan(id: string): Promise<void> {
  const organizationId = await getOrganizationId();

  const scan = await prisma.scanRun.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, status: true },
  });

  if (!scan) throw new Error("Scan not found.");

  const validation = validateScanCancellation(scan);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  await prisma.$transaction([
    prisma.scanRun.update({
      where: { id },
      data: { status: "CANCELLED", completedAt: new Date() },
    }),
    prisma.transitionLog.create({
      data: {
        entityType: "SCAN_RUN",
        entityId: id,
        fromStatus: scan.status,
        toStatus: "CANCELLED",
        action: "cancelScan",
        actorId: null,
      },
    }),
  ]);

  revalidatePath(`/scans/${id}`);
  redirect(`/scans/${id}`);
}

export async function deleteScan(id: string): Promise<void> {
  const organizationId = await getOrganizationId();

  const scan = await prisma.scanRun.findFirst({
    where: { id, client: { organizationId } },
    select: { id: true, status: true },
  });

  if (!scan) throw new Error("Scan not found.");

  const deletionCheck = validateScanDeletion({ status: scan.status });
  if (!deletionCheck.valid) {
    throw new Error(deletionCheck.reason);
  }

  await prisma.scanRun.delete({ where: { id } });
  redirect("/scans");
}

/**
 * Marks a RUNNING scan as automated so the job worker picks it up and
 * executes all pending queries via the OpenAI API. This is additive — the
 * manual "Record" path remains available for queries the worker may have
 * skipped due to errors.
 *
 * The worker polls for scans where `metadata.automated = true`. This action
 * sets that flag; the worker does the rest.
 */
export async function startAutomatedScan(scanId: string): Promise<void> {
  const organizationId = await getOrganizationId();

  const scan = await prisma.scanRun.findFirst({
    where: { id: scanId, client: { organizationId } },
    select: { id: true, status: true, metadata: true },
  });

  if (!scan) throw new Error("Scan not found.");
  if (scan.status !== "RUNNING") {
    throw new Error(
      `Cannot automate a scan in ${scan.status} status. Scan must be in RUNNING status.`,
    );
  }

  // Merge automated flag into existing metadata (preserve queryClusterIds etc.)
  const existingMeta =
    (scan.metadata as Record<string, unknown> | null) ?? {};
  const updatedMeta = { ...existingMeta, automated: true };

  await prisma.$transaction(async (tx) => {
    await tx.scanRun.update({
      where: { id: scanId },
      data: { metadata: updatedMeta },
    });

    await tx.transitionLog.create({
      data: {
        entityType: "SCAN_RUN",
        entityId: scanId,
        fromStatus: scan.status,
        toStatus: scan.status, // status doesn't change — automation is a metadata flag
        action: "startAutomatedScan",
        actorId: null,
        note: "Scan queued for automated execution by job worker.",
      },
    });
  });

  revalidatePath(`/scans/${scanId}`);
}

/**
 * Creates a targeted validation scan scoped to a specific set of query IDs.
 *
 * The new scan records the parent relationship and embeds the query IDs in
 * metadata so the automated worker resolves them directly — bypassing the
 * normal cluster-expansion path. The scan is created in PENDING status and
 * the caller is expected to redirect the user to the new scan page.
 *
 * The parent scan must be COMPLETED and must belong to the caller's org.
 * queryIds must be non-empty and contain at most 50 entries.
 */
export async function createValidationScan(
  parentScanId: string,
  queryIds: string[],
): Promise<{ scanId: string } | { error: string }> {
  const organizationId = await getOrganizationId();

  // Fetch and verify the parent scan belongs to this org and is completed
  const parentScan = await prisma.scanRun.findFirst({
    where: { id: parentScanId, client: { organizationId } },
    select: {
      id: true,
      clientId: true,
      status: true,
      model: true,
      queryDepth: true,
      focusArea: true,
    },
  });

  if (!parentScan) return { error: "Parent scan not found." };
  if (parentScan.status !== "COMPLETED") {
    return { error: `Parent scan must be COMPLETED. Current status: ${parentScan.status}.` };
  }

  if (!queryIds || queryIds.length === 0) {
    return { error: "At least one query ID is required." };
  }
  if (queryIds.length > 50) {
    return { error: "Validation scans are limited to 50 queries at a time." };
  }

  // Verify all provided query IDs are active and belong to the parent scan's client
  const validQueryCount = await prisma.query.count({
    where: {
      id: { in: queryIds },
      isActive: true,
      queryCluster: { clientId: parentScan.clientId },
    },
  });
  if (validQueryCount !== queryIds.length) {
    return { error: "One or more selected queries do not belong to this client." };
  }

  try {
    const scan = await prisma.scanRun.create({
      data: {
        clientId: parentScan.clientId,
        parentScanRunId: parentScan.id,
        status: "RUNNING",
        model: parentScan.model,
        queryDepth: parentScan.queryDepth,
        focusArea: parentScan.focusArea,
        queryCount: queryIds.length,
        startedAt: new Date(),
        metadata: {
          queryIds,
          automated: true,
        },
      },
      select: { id: true },
    });

    revalidatePath("/scans");
    return { scanId: scan.id };
  } catch (err) {
    console.error("createValidationScan failed:", err);
    return { error: "Failed to create validation scan." };
  }
}

/**
 * Discovers potential competitor names by scanning AI response texts from a
 * completed scan. Returns a ranked list of company-like names that appeared
 * in responses but are not yet tracked as competitors for this client.
 *
 * This is heuristic — the operator reviews and selects which to add.
 */
export async function discoverCompetitorsFromScan(
  scanId: string,
): Promise<DiscoveredCompetitor[]> {
  const organizationId = await getOrganizationId();

  // Fetch scan with org scoping, pulling response texts and client context
  const scan = await prisma.scanRun.findFirst({
    where: { id: scanId, client: { organizationId } },
    select: {
      client: {
        select: {
          name: true,
          competitors: { select: { name: true } },
        },
      },
      results: {
        select: {
          response: true,
          mentioned: true,
          metadata: true,
        },
      },
    },
  });

  if (!scan) throw new Error("Scan not found.");

  return discoverCompetitors(
    scan.results,
    scan.client.name,
    scan.client.competitors.map((c) => c.name),
  );
}
