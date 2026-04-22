"use server";

import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  CreateSnapshotSchema,
  generateSnapshotQueries,
  deriveStandardAssets,
} from "@antellion/core";
import { getAuthContext } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { nanoid } from "nanoid";
import { buildSnapshotActionPlan } from "@antellion/core";
import type { SnapshotActionPlan } from "@antellion/core";

// ─── Share token ─────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/**
 * Idempotently generate (or return the existing) share token for a ScanRun.
 *
 * Org-scoped: the scan run must belong to a Client in the caller's organization.
 * If a token already exists and is not revoked, it is returned as-is.
 */
export async function generateShareToken(
  scanRunId: string,
): Promise<{ token: string; url: string }> {
  if (!scanRunId || typeof scanRunId !== "string") {
    throw new Error("Invalid scanRunId");
  }

  const { organizationId } = await getAuthContext();

  // Org-scoped lookup: walk the relation chain ScanRun → Client → Organization.
  const scanRun = await prisma.scanRun.findFirst({
    where: {
      id: scanRunId,
      client: { organizationId },
    },
    select: {
      id: true,
      shareToken: true,
      shareTokenRevokedAt: true,
    },
  });

  if (!scanRun) {
    throw new Error("Scan run not found");
  }

  // Idempotent: return existing token if present and not revoked.
  if (scanRun.shareToken && !scanRun.shareTokenRevokedAt) {
    return {
      token: scanRun.shareToken,
      url: `${APP_URL}/s/${scanRun.shareToken}`,
    };
  }

  const token = nanoid(16);

  await prisma.scanRun.update({
    where: { id: scanRun.id },
    data: { shareToken: token, shareTokenRevokedAt: null },
  });

  return {
    token,
    url: `${APP_URL}/s/${token}`,
  };
}

// ─── getSnapshotActionPlan ───────────────────────────────────

/**
 * Fetch and build the SnapshotActionPlan for the given scan run.
 *
 * Org-scoped: the scan run must belong to a Client in the caller's organization.
 * Throws if the scan run is not found or if snapshotSummary is missing.
 */
export async function getSnapshotActionPlan(
  scanRunId: string,
): Promise<SnapshotActionPlan> {
  if (!scanRunId || typeof scanRunId !== "string") {
    throw new Error("Invalid scanRunId");
  }

  const { organizationId } = await getAuthContext();

  const scanRun = await prisma.scanRun.findFirst({
    where: {
      id: scanRunId,
      client: { organizationId },
    },
    select: { id: true, metadata: true },
  });

  if (!scanRun) {
    throw new Error("Scan run not found");
  }

  const meta = scanRun.metadata as Record<string, unknown> | null;

  if (!meta?.snapshotSummary) {
    throw new Error(
      `Scan run ${scanRunId} has no snapshotSummary. Ensure the scan is complete before generating the action plan.`,
    );
  }

  return buildSnapshotActionPlan(
    scanRun.id,
    meta.snapshotSummary as Parameters<typeof buildSnapshotActionPlan>[1],
  );
}

// ── Category → cluster name mapping ─────────────────────────

const SNAPSHOT_CLUSTER_NAMES = {
  discovery: "Snapshot: Discovery Absence",
  competitor_contrast: "Snapshot: Competitor Contrast",
  reputation: "Snapshot: Reputation Probe",
  citation_source: "Snapshot: Citation & Source",
} as const;

// ─── createSnapshotScan ──────────────────────────────────────

/**
 * Orchestrates the full snapshot creation in a single transaction:
 *
 * 1. Validate input via CreateSnapshotSchema.
 * 2. Create or reuse the Client record for this domain + org.
 * 3. Upsert each competitor (skip if already tracked for this client).
 * 4. Generate 100 snapshot queries via the pure template engine.
 * 5. Create one QueryCluster per category with its queries.
 * 6. Create the ScanRun in RUNNING status with automated + snapshot flags.
 *
 * Returns `{ scanId }` on success so the caller can redirect to the
 * findings card page, which polls for completion.
 *
 * Competitors arrive as a JSON string in a hidden form field so the form
 * can serialize the dynamic competitor list without repeating field names.
 */
export async function createSnapshotScan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { scanId?: string }> {
  // ── 1. Parse and validate input ──────────────────────────

  let competitorsRaw: unknown;
  try {
    const raw = formData.get("competitors");
    competitorsRaw = raw ? JSON.parse(String(raw)) : [];
  } catch {
    return { message: "Invalid competitors format — expected JSON." };
  }

  const result = validate(CreateSnapshotSchema, {
    prospectName: formData.get("prospectName"),
    prospectDomain: formData.get("prospectDomain"),
    industry: formData.get("industry"),
    nicheKeywords: formData.get("nicheKeywords") || undefined,
    geography: formData.get("geography") || undefined,
    competitors: competitorsRaw,
    roleTitle: formData.get("roleTitle"),
  });

  if (!result.success) return { errors: result.errors };

  const {
    prospectName,
    prospectDomain,
    industry,
    nicheKeywords,
    geography,
    competitors,
    roleTitle,
  } = result.data;

  // ── 2. Resolve organizationId ────────────────────────────

  const { organizationId } = await getAuthContext();

  // ── 3. Generate snapshot queries (pure, no LLM) ──────────

  // nicheKeywords arrives as a comma- or newline-delimited string from the
  // form; split it into the array the query generator expects.
  const nicheArray = nicheKeywords
    ? nicheKeywords
        .split(/[,\n]+/)
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  const snapshotQueries = generateSnapshotQueries({
    prospectName,
    prospectDomain,
    industry,
    roleTitle,
    competitors,
    nicheKeywords: nicheArray,
    geography: geography || undefined,
  });

  // ── 4. Orchestrate the full creation in a transaction ────

  let scanId: string;

  try {
    scanId = await prisma.$transaction(async (tx) => {
      // ── 4a. Create or reuse the client ──────────────────

      let client = await tx.client.findFirst({
        where: { organizationId, domain: prospectDomain },
        select: { id: true, name: true, industry: true },
      });

      if (!client) {
        // New client — create with the 6 standard content asset stubs.
        const standardAssets = deriveStandardAssets(prospectName, prospectDomain);

        const created = await tx.client.create({
          data: {
            organizationId,
            name: prospectName,
            domain: prospectDomain,
            industry,
          },
          select: { id: true, name: true, industry: true },
        });

        await tx.contentAsset.createMany({
          data: standardAssets.map((asset) => ({
            clientId: created.id,
            title: asset.title,
            url: asset.url,
            assetType: asset.assetType,
          })),
          skipDuplicates: true,
        });

        client = created;
      } else {
        // Existing client — patch name and industry if they differ from
        // what the operator entered for this snapshot.
        const nameChanged = client.name !== prospectName;
        const industryChanged = !!industry && client.industry !== industry;

        if (nameChanged || industryChanged) {
          await tx.client.update({
            where: { id: client.id },
            data: {
              ...(nameChanged ? { name: prospectName } : {}),
              ...(industryChanged ? { industry } : {}),
            },
          });
        }
      }

      const clientId = client.id;

      // ── 4b. Upsert competitors ───────────────────────────

      for (const competitor of competitors) {
        const existing = await tx.competitor.findFirst({
          where: { clientId, domain: competitor.domain },
          select: { id: true },
        });

        if (!existing) {
          await tx.competitor.create({
            data: {
              clientId,
              name: competitor.name,
              domain: competitor.domain,
            },
          });
        }
      }

      // ── 4c. Create query clusters and queries ────────────

      // Group generated queries by category so each category gets its own
      // named cluster (the worker resolves them via queryClusterIds in metadata).
      const byCategory = {
        discovery: snapshotQueries.filter((q) => q.category === "discovery"),
        competitor_contrast: snapshotQueries.filter(
          (q) => q.category === "competitor_contrast",
        ),
        reputation: snapshotQueries.filter((q) => q.category === "reputation"),
        citation_source: snapshotQueries.filter(
          (q) => q.category === "citation_source",
        ),
      } as const;

      const clusterIds: string[] = [];

      for (const [category, queries] of Object.entries(byCategory) as Array<
        [keyof typeof byCategory, typeof snapshotQueries]
      >) {
        if (queries.length === 0) continue;

        const cluster = await tx.queryCluster.create({
          data: {
            clientId,
            name: SNAPSHOT_CLUSTER_NAMES[category],
          },
          select: { id: true },
        });

        clusterIds.push(cluster.id);

        // For contrast queries, store competitorName in the intent field using
        // a "competitor:<name>" prefix so the summary worker can recover it
        // without re-parsing query text.
        await tx.query.createMany({
          data: queries.map((q) => ({
            queryClusterId: cluster.id,
            text: q.text,
            intent: q.competitorName ? `competitor:${q.competitorName}` : undefined,
            source: "snapshot",
          })),
        });
      }

      // ── 4d. Create the ScanRun ───────────────────────────

      const scan = await tx.scanRun.create({
        data: {
          clientId,
          status: "RUNNING",
          startedAt: new Date(),
          model: "gpt-4o-mini",
          queryDepth: "snapshot",
          queryCount: snapshotQueries.length,
          metadata: {
            automated: true,
            snapshot: true,
            snapshotVersion: 2,
            queryClusterIds: clusterIds,
            prospectName,
            prospectDomain,
            competitors: competitors.map((c) => c.name),
            roleTitle,
            industry,
          } satisfies Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      return scan.id;
    });
  } catch (e) {
    console.error("createSnapshotScan failed:", e);
    return { message: "Failed to create snapshot scan. Please try again." };
  }

  return { scanId };
}
