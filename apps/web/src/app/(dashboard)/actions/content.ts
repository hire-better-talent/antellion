"use server";

import { redirect } from "next/navigation";
import { prisma, Prisma } from "@antellion/db";
import {
  validate,
  CreateContentAssetSchema,
  UpdateContentAssetSchema,
} from "@antellion/core";
import type { ActionState } from "@/lib/actions";
import { optionalString } from "@/lib/actions";
import {
  getAuthContext,
  requireOrgClient,
  requireOrgContentAsset,
} from "@/lib/auth";

export async function createContentAsset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(CreateContentAssetSchema, {
    clientId: formData.get("clientId"),
    url: formData.get("url"),
    title: optionalString(formData, "title"),
    assetType: formData.get("assetType"),
    content: optionalString(formData, "content"),
  });

  if (!result.success) return { errors: result.errors };

  const { organizationId } = await getAuthContext();

  // Verify the client belongs to the current organization
  await requireOrgClient(result.data.clientId, organizationId);

  try {
    await prisma.contentAsset.create({ data: result.data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        errors: [
          {
            field: "url",
            message:
              "A content asset with this URL already exists for this client.",
          },
        ],
      };
    }
    throw e;
  }

  redirect("/content");
}

export async function updateContentAsset(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = validate(UpdateContentAssetSchema, {
    title: optionalString(formData, "title"),
    assetType: formData.get("assetType"),
    content: optionalString(formData, "content"),
  });

  if (!result.success) return { errors: result.errors };

  const { organizationId } = await getAuthContext();

  // Verify the content asset belongs to the current organization (via its client)
  await requireOrgContentAsset(id, organizationId);

  await prisma.contentAsset.update({
    where: { id },
    data: result.data,
  });

  redirect(`/content/${id}`);
}

export async function deleteContentAsset(id: string): Promise<void> {
  const { organizationId } = await getAuthContext();

  // Verify the content asset belongs to the current organization (via its client)
  await requireOrgContentAsset(id, organizationId);

  await prisma.contentAsset.delete({ where: { id } });
  redirect("/content");
}
