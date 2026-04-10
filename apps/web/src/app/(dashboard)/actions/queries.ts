"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@antellion/db";
import {
  validate,
  GenerateQueriesSchema,
  UpdateQueryClusterSchema,
  CreateQuerySchema,
  UpdateQuerySchema,
  generateQueryIntelligence,
  buildBusinessContext,
  classifyJobFamily,
  validateSupplementalQueries,
  verifySupplementalStages,
  deduplicateQueries,
} from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { optionalString } from "@/lib/actions";
import {
  getOrganizationId,
  requireOrgClient,
  requireOrgQueryCluster,
  requireOrgQuery,
} from "@/lib/auth";
import { supplementalQueryPrompt } from "@antellion/prompts";
import { generateStructuredJSON } from "@/lib/llm";

// ─── Role variant helpers ────────────────────────────────────

/**
 * Returns a list of role title variants for a given job family, excluding
 * the primary role title. Limited to 3 variants to keep query volume bounded.
 */
function getRoleVariants(roleTitle: string, family: string): string[] {
  const variants: Record<string, string[]> = {
    sales: ["Account Executive", "BDR", "SDR", "Sales Manager", "Enterprise Sales"],
    engineering: ["Backend Engineer", "Frontend Engineer", "Full Stack Engineer", "DevOps Engineer"],
    product: ["Product Manager", "Technical Program Manager", "Product Designer"],
    marketing: ["Growth Marketing Manager", "Content Marketing Manager", "Brand Marketing Manager", "Demand Generation Manager"],
    data: ["Data Scientist", "Data Analyst", "ML Engineer", "Analytics Engineer"],
    design: ["UX Designer", "Product Designer", "Visual Designer"],
    operations: ["HR Business Partner", "Recruiting Manager", "People Operations Manager"],
  };
  return (variants[family] ?? [])
    .filter((v) => v.toLowerCase() !== roleTitle.toLowerCase())
    .slice(0, 3);
}

// ─── Generation ─────────────────────────────────────────────

export async function generateQueries(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(GenerateQueriesSchema, {
    clientId: formData.get("clientId"),
    roleTitle: formData.get("roleTitle"),
    geography: formData.get("geography") || undefined,
    businessContext: optionalString(formData, "businessContext"),
  });

  if (!result.success) return { errors: result.errors };

  const { clientId, roleTitle, geography, businessContext } = result.data;
  const organizationId = await getOrganizationId();

  // Verify the client belongs to the current organization
  await requireOrgClient(clientId, organizationId);

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: {
      name: true,
      industry: true,
      description: true,
      nicheKeywords: true,
      revenueScale: true,
      knownFor: true,
      headquarters: true,
      employeeCount: true,
      publiclyTraded: true,
      competitors: { select: { name: true } },
    },
  });

  if (!client) return { message: "Client not found." };

  // Auto-build business context from profile fields if the form field is empty
  const effectiveContext = businessContext?.trim()
    || buildBusinessContext(client)
    || undefined;

  // Parse niche keywords and pass them into the unified query generator.
  const nicheKeywords = (client.nicheKeywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const jobFamily = classifyJobFamily(roleTitle);
  const roleVariants = getRoleVariants(roleTitle, jobFamily);

  const intelligence = generateQueryIntelligence({
    companyName: client.name,
    roleTitle,
    geography,
    industry: client.industry ?? undefined,
    businessContext: effectiveContext,
    competitors: client.competitors.map((c) => c.name),
    nicheKeywords,
    revenueScale: (client.revenueScale as "startup" | "growth" | "mid-market" | "enterprise" | "fortune500") ?? undefined,
    knownFor: client.knownFor ?? undefined,
    skipDedup: true, // automated scanning removes the volume constraint
    roleVariants,
  });

  let roleProfile = await prisma.roleProfile.findFirst({
    where: { clientId, title: roleTitle },
  });

  if (!roleProfile) {
    roleProfile = await prisma.roleProfile.create({
      data: {
        clientId,
        title: roleTitle,
        description: businessContext ?? undefined,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const cluster of intelligence.clusters) {
      await tx.queryCluster.create({
        data: {
          clientId,
          roleProfileId: roleProfile!.id,
          name: cluster.name,
          intent: cluster.intent,
          queries: {
            create: cluster.queries.map((q) => ({
              text: q.text,
              // Discovery queries with a specificity tag use the boundary: prefix
              // so the boundary detector can classify them without a schema column.
              intent: q.specificity
                ? `boundary:${q.specificity}`
                : `${q.intent} [priority: ${q.priority}]`,
              stage: q.stage,
              source: "template",
            })),
          },
        },
      });
    }
  });

  redirect("/queries");
}

// ─── Supplemental query generation ──────────────────────────

/**
 * Generate 20-30 LLM-based strategic queries for a client using Anthropic.
 *
 * Prerequisites (soft, not enforced here):
 *  - Client should have at least one completed scan so competitors are confirmed.
 *  - Client should have competitors configured.
 *
 * On success: creates a new QueryCluster named "AI-Generated — Strategic Depth"
 * with all surviving queries tagged source: "llm". Returns the count created.
 *
 * On LLM failure: returns an error message. Assessment is unaffected — template
 * queries already exist independently of this action.
 */
export async function generateSupplementalQueries(
  clientId: string,
): Promise<ActionState & { queryCount?: number; clusterId?: string }> {
  const organizationId = await getOrganizationId();
  await requireOrgClient(clientId, organizationId);

  // Load the client with full profile context, competitors, and existing queries.
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: {
      name: true,
      domain: true,
      industry: true,
      description: true,
      nicheKeywords: true,
      competitors: { select: { name: true, domain: true } },
      queryClusters: {
        select: {
          queries: {
            where: { isActive: true },
            select: { text: true },
          },
        },
      },
      // Latest completed scan for optional summary context.
      scanRuns: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: {
          metadata: true,
          results: {
            where: { status: "APPROVED" },
            select: {
              visibilityScore: true,
              query: { select: { stage: true } },
            },
          },
        },
      },
      roleProfiles: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, title: true },
      },
    },
  });

  if (!client) return { message: "Client not found." };
  if (!client.industry) return { message: "Client must have an industry configured before generating strategic queries." };

  // Flatten all existing query texts for prompt-level dedup context.
  const existingQueryTexts = client.queryClusters
    .flatMap((c) => c.queries.map((q) => q.text))
    .filter(Boolean);

  const nicheKeywords = (client.nicheKeywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  // Derive role title: use the most recent role profile or fall back to a generic.
  const roleTitle = client.roleProfiles[0]?.title ?? "Software Engineer";
  const roleProfileId = client.roleProfiles[0]?.id ?? null;

  // Attempt to build a scan summary from the latest scan metadata if present.
  let scanSummary: {
    mentionRate: number;
    topThemes: string[];
    gapThemes: string[];
    competitorMentionRates: Record<string, number>;
  } | undefined;

  const latestScan = client.scanRuns[0];
  if (latestScan?.metadata && typeof latestScan.metadata === "object") {
    const meta = latestScan.metadata as Record<string, unknown>;
    const approvedResults = latestScan.results;
    if (approvedResults.length > 0) {
      const mentionCount = approvedResults.filter(
        (r) => r.visibilityScore !== null && r.visibilityScore > 0,
      ).length;
      scanSummary = {
        mentionRate: Math.round((mentionCount / approvedResults.length) * 100),
        topThemes: Array.isArray(meta.topThemes) ? (meta.topThemes as string[]) : [],
        gapThemes: Array.isArray(meta.gapThemes) ? (meta.gapThemes as string[]) : [],
        competitorMentionRates: (meta.competitorMentionRates ?? {}) as Record<string, number>,
      };
    }
  }

  // Build the supplemental query prompt.
  const prompt = supplementalQueryPrompt({
    clientName: client.name,
    clientDomain: client.domain,
    industry: client.industry,
    description: client.description ?? undefined,
    roleTitle,
    competitors: client.competitors,
    nicheKeywords,
    existingQueryTexts,
    scanSummary,
  });

  // Call Claude Sonnet with a 30-second timeout.
  let rawResponse: string;
  try {
    rawResponse = await generateStructuredJSON(prompt, {
      temperature: 0.7,
      maxTokens: 4096,
      timeoutMs: 30_000,
    });
  } catch (err) {
    console.error("[generateSupplementalQueries] LLM call failed:", err);
    return { message: "The AI query generation failed. Template queries are unaffected." };
  }

  if (!rawResponse.trim()) {
    return { message: "The AI returned an empty response. Template queries are unaffected." };
  }

  // Validate and filter the LLM output.
  const validated = validateSupplementalQueries(rawResponse, client.name);

  if (validated.length === 0) {
    console.error(
      "[generateSupplementalQueries] No valid queries after validation. Raw response:",
      rawResponse.slice(0, 500),
    );
    return { message: "The AI response did not contain any valid queries. Template queries are unaffected." };
  }

  // Stage verification — override CONSIDERATION→DISCOVERY when classifier is certain.
  const competitorNames = client.competitors.map((c) => c.name);
  const { queries: stageVerified, disagreements } = verifySupplementalStages(
    validated,
    client.name,
    competitorNames,
  );

  if (disagreements.length > 0) {
    console.info(
      `[generateSupplementalQueries] ${disagreements.length} stage disagreement(s) for client ${clientId}:`,
      disagreements,
    );
  }

  // Dedup against existing template queries using standard mode.
  // Existing queries are passed first so they form the protected set —
  // deduplicateQueries keeps the first occurrence, so existing queries always win.
  type MinimalQuery = { text: string; source?: string; stage?: string; theme?: string; intent?: string; priority?: number; specificity?: string };
  const existingAsMinimal: MinimalQuery[] = existingQueryTexts.map((text) => ({ text }));
  const candidatesAsMinimal: MinimalQuery[] = stageVerified.map((q) => ({
    text: q.text,
    stage: q.stage,
    theme: q.theme,
    source: q.source,
  }));

  const combined = [...existingAsMinimal, ...candidatesAsMinimal];
  const dedupResult = deduplicateQueries(combined, "standard");

  // Extract only the supplemental candidates that survived dedup.
  const existingCount = existingAsMinimal.length;
  const survivingSupplemental = dedupResult.surviving
    .slice(existingCount)
    .filter((q) => q.source === "llm")
    .map((q) => stageVerified.find((s) => s.text === q.text)!)
    .filter(Boolean);

  if (survivingSupplemental.length === 0) {
    return { message: "All generated queries were duplicates of existing template queries. No new cluster was created." };
  }

  // Persist as a new QueryCluster with audit metadata in the description.
  const auditPayload = JSON.stringify({
    promptVersion: "SUPPLEMENTAL_PROMPT_V1",
    generatedAt: new Date().toISOString(),
    rawResponsePreview: rawResponse.slice(0, 500),
    totalValidated: validated.length,
    totalAfterStageVerification: stageVerified.length,
    totalAfterDedup: survivingSupplemental.length,
  });

  const cluster = await prisma.queryCluster.create({
    data: {
      clientId,
      roleProfileId: roleProfileId ?? undefined,
      name: "AI-Generated — Strategic Depth",
      intent: "LLM-generated queries targeting gaps and competitive dynamics not covered by standard templates.",
      description: auditPayload,
      // stage: null — this cluster spans all stages
      queries: {
        create: survivingSupplemental.map((q) => ({
          text: q.text,
          intent: `supplemental:llm`,
          stage: q.stage,
          source: "llm",
        })),
      },
    },
    select: { id: true, _count: { select: { queries: true } } },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/queries");

  return { queryCount: cluster._count.queries, clusterId: cluster.id };
}

// ─── Cluster CRUD ───────────────────────────────────────────

export async function updateQueryCluster(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(UpdateQueryClusterSchema, {
    name: formData.get("name"),
    intent: optionalString(formData, "intent"),
  });

  if (!result.success) return { errors: result.errors };

  const organizationId = await getOrganizationId();

  // Verify the cluster belongs to the current organization (via its client)
  await requireOrgQueryCluster(id, organizationId);

  await prisma.queryCluster.update({
    where: { id },
    data: result.data,
  });

  redirect(`/queries/${id}`);
}

export async function deleteQueryCluster(id: string): Promise<void> {
  const organizationId = await getOrganizationId();

  // Verify the cluster belongs to the current organization (via its client)
  await requireOrgQueryCluster(id, organizationId);

  await prisma.queryCluster.delete({ where: { id } });
  redirect("/queries");
}

// ─── Query CRUD ─────────────────────────────────────────────

export async function addQuery(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(CreateQuerySchema, {
    queryClusterId: formData.get("queryClusterId"),
    text: formData.get("text"),
    intent: optionalString(formData, "intent"),
  });

  if (!result.success) return { errors: result.errors };

  const organizationId = await getOrganizationId();

  // Verify the target cluster belongs to the current organization (via its client)
  await requireOrgQueryCluster(result.data.queryClusterId, organizationId);

  await prisma.query.create({ data: result.data });

  redirect(`/queries/${result.data.queryClusterId}`);
}

export async function updateQuery(
  queryId: string,
  clusterId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(UpdateQuerySchema, {
    text: formData.get("text"),
    intent: optionalString(formData, "intent"),
  });

  if (!result.success) return { errors: result.errors };

  const organizationId = await getOrganizationId();

  // Verify the query belongs to the current organization (via queryCluster → client)
  await requireOrgQuery(queryId, organizationId);

  await prisma.query.update({
    where: { id: queryId },
    data: result.data,
  });

  redirect(`/queries/${clusterId}`);
}

export async function toggleQueryActive(
  queryId: string,
  clusterId: string,
): Promise<void> {
  const organizationId = await getOrganizationId();

  // Verify the query belongs to the current organization (via queryCluster → client)
  await requireOrgQuery(queryId, organizationId);

  const query = await prisma.query.findUnique({
    where: { id: queryId },
    select: { isActive: true },
  });

  if (!query) return;

  await prisma.query.update({
    where: { id: queryId },
    data: { isActive: !query.isActive },
  });

  revalidatePath(`/queries/${clusterId}`);
  redirect(`/queries/${clusterId}`);
}

export async function deleteQuery(
  queryId: string,
  clusterId: string,
): Promise<void> {
  const organizationId = await getOrganizationId();

  // Verify the query belongs to the current organization (via queryCluster → client)
  await requireOrgQuery(queryId, organizationId);

  await prisma.query.delete({ where: { id: queryId } });
  revalidatePath(`/queries/${clusterId}`);
  redirect(`/queries/${clusterId}`);
}
