"use server";

import { redirect } from "next/navigation";
import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  CreateClientSchema,
  UpdateClientSchema,
  deriveStandardAssets,
} from "@antellion/core";
import { getOrganizationId, requireOrgClient } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { optionalString } from "@/lib/actions";

// ── Form field parsers ──────────────────────────────────────

function parseEmployeeCount(formData: FormData): number | undefined {
  const raw = formData.get("employeeCount");
  if (!raw || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function parseEmployeeCountForUpdate(formData: FormData): number | null | undefined {
  const raw = formData.get("employeeCount");
  if (raw === null || raw === undefined) return undefined;
  if (raw === "") return null; // explicit clear
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function parseRevenueScale(formData: FormData): string | undefined {
  const raw = optionalString(formData, "revenueScale");
  return raw || undefined;
}

function parseRevenueScaleForUpdate(formData: FormData): string | null | undefined {
  const raw = formData.get("revenueScale");
  if (raw === null || raw === undefined) return undefined;
  const str = String(raw).trim();
  return str === "" ? null : str;
}

function parseCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

// ── Actions ─────────────────────────────────────────────────

export async function createClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const organizationId = await getOrganizationId();

  const result = validate(CreateClientSchema, {
    organizationId,
    name: formData.get("name"),
    domain: formData.get("domain"),
    industry: optionalString(formData, "industry"),
    description: optionalString(formData, "description"),
    nicheKeywords: optionalString(formData, "nicheKeywords"),
    careerUrl: optionalString(formData, "careerUrl") || undefined,
    employeeCount: parseEmployeeCount(formData),
    headquarters: optionalString(formData, "headquarters"),
    additionalLocations: optionalString(formData, "additionalLocations"),
    publiclyTraded: parseCheckbox(formData, "publiclyTraded"),
    revenueScale: parseRevenueScale(formData),
    knownFor: optionalString(formData, "knownFor"),
  });

  if (!result.success) return { errors: result.errors };

  const { name, domain } = result.data;
  const standardAssets = deriveStandardAssets(name, domain);

  let clientId: string;
  try {
    clientId = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({ data: result.data });

      await tx.contentAsset.createMany({
        data: standardAssets.map((asset) => ({
          clientId: client.id,
          title: asset.title,
          url: asset.url,
          assetType: asset.assetType,
        })),
        skipDuplicates: true,
      });

      return client.id;
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        errors: [
          {
            field: "domain",
            message: "A client with this domain already exists.",
          },
        ],
      };
    }
    throw e;
  }

  redirect(`/clients/${clientId}`);
}

export async function updateClient(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(UpdateClientSchema, {
    name: formData.get("name"),
    industry: optionalString(formData, "industry"),
    description: optionalString(formData, "description"),
    nicheKeywords: optionalString(formData, "nicheKeywords"),
    careerUrl: optionalString(formData, "careerUrl") || undefined,
    employeeCount: parseEmployeeCountForUpdate(formData),
    headquarters: optionalString(formData, "headquarters"),
    additionalLocations: optionalString(formData, "additionalLocations"),
    publiclyTraded: parseCheckbox(formData, "publiclyTraded"),
    revenueScale: parseRevenueScaleForUpdate(formData),
    knownFor: optionalString(formData, "knownFor"),
  });

  if (!result.success) return { errors: result.errors };

  const organizationId = await getOrganizationId();

  // Verify the client belongs to the current organization
  await requireOrgClient(id, organizationId);

  await prisma.client.update({
    where: { id },
    data: result.data,
  });

  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string): Promise<void> {
  const organizationId = await getOrganizationId();

  // Verify the client belongs to the current organization
  await requireOrgClient(id, organizationId);

  await prisma.client.delete({ where: { id } });
  redirect("/clients");
}
