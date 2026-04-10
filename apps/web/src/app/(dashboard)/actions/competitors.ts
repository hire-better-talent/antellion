"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  CreateCompetitorSchema,
  UpdateCompetitorSchema,
} from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { optionalString } from "@/lib/actions";
import {
  getOrganizationId,
  requireOrgClient,
  requireOrgCompetitor,
} from "@/lib/auth";
import { generateStructuredJSON } from "@/lib/llm";

export async function createCompetitor(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(CreateCompetitorSchema, {
    clientId,
    name: formData.get("name"),
    domain: formData.get("domain"),
    industry: optionalString(formData, "industry"),
    description: optionalString(formData, "description"),
    careerUrl: optionalString(formData, "careerUrl") || undefined,
  });

  if (!result.success) return { errors: result.errors };

  const organizationId = await getOrganizationId();

  // Verify the client belongs to the current organization
  await requireOrgClient(clientId, organizationId);

  try {
    await prisma.competitor.create({ data: result.data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        errors: [
          {
            field: "domain",
            message: "A competitor with this domain already exists for this client.",
          },
        ],
      };
    }
    throw e;
  }

  redirect(`/clients/${clientId}`);
}

export async function updateCompetitor(
  competitorId: string,
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(UpdateCompetitorSchema, {
    name: formData.get("name"),
    industry: optionalString(formData, "industry"),
    description: optionalString(formData, "description"),
    careerUrl: optionalString(formData, "careerUrl") || undefined,
  });

  if (!result.success) return { errors: result.errors };

  const organizationId = await getOrganizationId();

  // Verify the competitor belongs to the current organization (via its client)
  await requireOrgCompetitor(competitorId, organizationId);

  await prisma.competitor.update({
    where: { id: competitorId },
    data: result.data,
  });

  redirect(`/clients/${clientId}`);
}

export async function deleteCompetitor(
  competitorId: string,
  clientId: string,
): Promise<void> {
  const organizationId = await getOrganizationId();

  // Verify the competitor belongs to the current organization (via its client)
  await requireOrgCompetitor(competitorId, organizationId);

  await prisma.competitor.delete({ where: { id: competitorId } });
  redirect(`/clients/${clientId}`);
}

/**
 * Uses an LLM to auto-populate the Industry and Description fields for a
 * competitor based on its name and domain.
 *
 * Description is framed around employer brand and talent market positioning —
 * not a generic company summary — so it is immediately useful in Antellion's
 * competitive visibility analysis.
 *
 * Returns null on any failure (network, parse error, missing fields) so callers
 * can degrade gracefully without surfacing an error to the user.
 */
export async function enrichCompetitorProfile(
  name: string,
  domain: string,
): Promise<{ industry: string; description: string } | null> {
  try {
    const prompt = `You are analyzing a company for a competitive talent visibility platform.

Company name: ${name}
Domain: ${domain}

Return a JSON object with exactly two fields:
- "industry": A concise industry classification (e.g. "Enterprise Software", "Hospitality & Resorts", "Financial Services", "Healthcare Technology")
- "description": 1-3 sentences describing how this company competes for talent — their employer brand positioning, what they're known for as an employer, and their talent market. This is for competitive hiring visibility analysis, not a generic company description.

JSON only. No markdown, no explanation.`;

    const raw = await generateStructuredJSON(prompt, {
      temperature: 0.3,
      maxTokens: 512,
      timeoutMs: 10_000,
    });

    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).industry !== "string" ||
      typeof (parsed as Record<string, unknown>).description !== "string" ||
      !(parsed as Record<string, unknown>).industry ||
      !(parsed as Record<string, unknown>).description
    ) {
      return null;
    }

    const { industry, description } = parsed as {
      industry: string;
      description: string;
    };

    return { industry, description };
  } catch {
    return null;
  }
}

/**
 * Adds a discovered competitor by name from the scan discovery UI.
 * The domain is inferred from the name as a best-effort guess (lowercase + .com).
 * The operator can update the domain later from the client detail page.
 *
 * Returns an ActionState so the UI can handle conflicts gracefully (a competitor
 * with the same inferred domain may already exist).
 */
export async function addDiscoveredCompetitor(
  clientId: string,
  scanId: string,
  name: string,
): Promise<ActionState> {
  const organizationId = await getOrganizationId();

  // Verify the client belongs to the current organization
  await requireOrgClient(clientId, organizationId);

  // Infer a best-effort domain: strip non-alphanumeric, lowercase, append .com
  const inferredDomain =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 63) + ".com";

  const result = validate(CreateCompetitorSchema, {
    clientId,
    name,
    domain: inferredDomain,
  });

  if (!result.success) return { errors: result.errors };

  try {
    await prisma.competitor.create({ data: result.data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Duplicate domain — already tracked under this inferred domain.
      // Surface a friendly message; the operator can proceed without re-adding.
      return {
        message: `A competitor with the domain "${inferredDomain}" already exists for this client.`,
      };
    }
    throw e;
  }

  revalidatePath(`/scans/${scanId}`);
  revalidatePath(`/clients/${clientId}`);
  return { message: `${name} added as a competitor.` };
}
