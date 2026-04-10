"use server";

import { prisma } from "@antellion/db";

const VALID_STATUSES = new Set([
  "NEW",
  "CONTACTED",
  "SNAPSHOT_SENT",
  "CONVERTED",
  "DECLINED",
]);

export async function updateLeadNotes(
  leadId: string,
  notes: string,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: { notes: notes || null },
  });
}

export async function updateLeadStatus(
  leadId: string,
  status: string,
): Promise<void> {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid lead status: ${status}`);
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });
}
