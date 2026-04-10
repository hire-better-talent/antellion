"use server";

import { prisma } from "@antellion/db";
import { validate, CreateLeadSchema } from "@antellion/core";
import type { ActionState } from "@/lib/actions";

// ── Free email providers (reject for work-email gating) ─────

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "gmx.net",
  "live.com",
  "msn.com",
  "me.com",
  "mac.com",
]);

// ── Duplicate window (24 hours) ─────────────────────────────

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

// ─── submitLead ─────────────────────────────────────────────

export async function submitLead(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { success?: boolean }> {
  // 1. Validate input
  const result = validate(CreateLeadSchema, {
    companyName: formData.get("companyName"),
    companyDomain: formData.get("companyDomain"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactTitle: formData.get("contactTitle") || undefined,
    topCompetitor: formData.get("topCompetitor") || undefined,
    primaryRole: formData.get("primaryRole") || undefined,
  });

  if (!result.success) return { errors: result.errors };

  const { contactEmail, companyDomain, ...rest } = result.data;

  // 2. Reject free email providers
  const emailDomain = contactEmail.split("@")[1]?.toLowerCase();
  if (!emailDomain || FREE_EMAIL_DOMAINS.has(emailDomain)) {
    return {
      errors: [
        {
          field: "contactEmail",
          message: "Please use your work email address.",
        },
      ],
    };
  }

  // 3. Check for duplicate submission (same email + domain within 24h)
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const existing = await prisma.lead.findFirst({
    where: {
      contactEmail,
      companyDomain,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });

  if (existing) {
    // Gracefully return success without creating a duplicate
    return { success: true };
  }

  // 4. Create the lead record
  try {
    await prisma.lead.create({
      data: {
        ...rest,
        contactEmail,
        companyDomain,
        source: "landing_page",
        status: "NEW",
      },
    });
  } catch (e) {
    console.error("submitLead failed:", e);
    return { message: "Something went wrong. Please try again." };
  }

  return { success: true };
}
