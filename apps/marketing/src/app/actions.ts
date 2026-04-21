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
  // 1. Validate input — all fields are required
  const result = validate(CreateLeadSchema, {
    companyName: formData.get("companyName"),
    companyDomain: formData.get("companyDomain"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactTitle: formData.get("contactTitle"),
    topCompetitor: formData.get("topCompetitor"),
    primaryRole: formData.get("primaryRole"),
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

  // 5. Notify via Slack (fire-and-forget — never block the response)
  //    PII (name, email) is intentionally excluded from the Slack payload.
  //    Full contact details live in the operator /leads dashboard where
  //    they are tenant-scoped. Slack is a signal to check the dashboard,
  //    not a data store.
  notifySlack({
    companyName: rest.companyName,
    companyDomain,
    contactTitle: rest.contactTitle,
    topCompetitor: rest.topCompetitor,
    primaryRole: rest.primaryRole,
  });

  return { success: true };
}

// ─── Slack notification ─────────────────────────────────────

function notifySlack(lead: {
  companyName: string;
  companyDomain: string;
  contactTitle: string;
  topCompetitor: string;
  primaryRole: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const fields = [
    `*Company:* ${lead.companyName} (${lead.companyDomain})`,
    `*Title:* ${lead.contactTitle}`,
    `*Top Competitor:* ${lead.topCompetitor}`,
    `*Primary Role:* ${lead.primaryRole}`,
  ].join("\n");

  const text = `🎯 *New Snapshot Lead* — contact details in the /leads dashboard\n\n${fields}`;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).catch((err) => {
    console.error("Slack notification failed:", err);
  });
}
